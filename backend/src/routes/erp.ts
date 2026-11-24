import { Router } from "express";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import ExcelJS from "exceljs";
import { prisma } from "../db";
import { HttpError } from "../errors";
import { requireAdmin } from "../auth";

export const erpRouter = Router();

/* -------------------------------------------------------------------------- */
/* Firma rekvizitlari (nakladnoy, hisob-faktura, akt sverka, kassa orderi)    */
/* -------------------------------------------------------------------------- */
const companySchema = z.object({
  name: z.string().trim().max(150).default(""),
  activity: z.string().trim().max(300).default(""),
  address: z.string().trim().max(300).default(""),
  phone: z.string().trim().max(120).default(""),
  website: z.string().trim().max(120).default(""),
  inn: z.string().trim().max(30).default(""),
  oked: z.string().trim().max(30).default(""),
  vatCode: z.string().trim().max(40).default(""),
  bankName: z.string().trim().max(200).default(""),
  mfo: z.string().trim().max(20).default(""),
  account: z.string().trim().max(40).default(""),
  director: z.string().trim().max(120).default(""),
  accountant: z.string().trim().max(120).default(""),
});
export type CompanyInfo = z.infer<typeof companySchema>;

const COMPANY_DEFAULTS: CompanyInfo = {
  name: "«MEDAX» MCHJ",
  activity: "Tibbiy asbob-uskunalar, laboratoriya reaktivlari va sarflov materiallari savdosi",
  address: "Namangan viloyati, Namangan sh., Abu Rayhon Beruniy ko'chasi, 2-uy",
  phone: "+998 91 186 66 61",
  website: "medax.uz",
  inn: "",
  oked: "",
  vatCode: "",
  bankName: "",
  mfo: "",
  account: "",
  director: "",
  accountant: "",
};

export async function getCompany(): Promise<CompanyInfo> {
  const row = await prisma.appSetting.findUnique({ where: { key: "company" } });
  const parsed = companySchema.partial().safeParse(row?.value ?? {});
  const saved = parsed.success ? Object.fromEntries(Object.entries(parsed.data).filter(([, v]) => v !== undefined)) : {};
  return { ...COMPANY_DEFAULTS, ...saved };
}

erpRouter.get("/company", async (_req, res) => {
  res.json({ company: await getCompany() });
});

erpRouter.put("/company", requireAdmin, async (req, res) => {
  const data = companySchema.parse(req.body || {});
  await prisma.appSetting.upsert({
    where: { key: "company" },
    create: { key: "company", value: data },
    update: { value: data },
  });
  res.json({ ok: true, company: await getCompany() });
});

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */
type Tx = Prisma.TransactionClient;

/**
 * Ketma-ket hujjat raqami: PR-2026-0001, PR-2026-0002 ...
 * Avval tasodifiy 4 xonali son ishlatilgan (yiliga 9000 variant) — ~100 hujjatdan keyin @unique
 * to'qnashuvi sababli hujjatlar saqlanmay qolardi. Endi mavjud eng katta raqamdan +1 olinadi.
 */
async function nextDocNumber(tx: Tx, prefix: string): Promise<string> {
  const base = `${prefix}-${new Date().getFullYear()}-`;
  const rows = await tx.erpDocument.findMany({ where: { docNumber: { startsWith: base } }, select: { docNumber: true } });
  return base + String(maxSuffix(rows.map((r) => r.docNumber), base) + 1).padStart(4, "0");
}

export async function nextCashNumber(tx: Tx): Promise<string> {
  const base = `KAS-${new Date().getFullYear()}-`;
  const rows = await tx.cashEntry.findMany({ where: { entryNumber: { startsWith: base } }, select: { entryNumber: true } });
  return base + String(maxSuffix(rows.map((r) => r.entryNumber), base) + 1).padStart(4, "0");
}

function maxSuffix(codes: string[], base: string): number {
  let max = 0;
  for (const c of codes) {
    const n = parseInt(c.slice(base.length), 10);
    if (Number.isFinite(n) && n > max) max = n;
  }
  return max;
}

/**
 * Yaroqlilik muddati matnini sanaga o'giradi: "2026-12-31", "2026-12", "31.12.2026", "12.2026", "12/2026".
 * Faqat oy berilgan bo'lsa, oyning 28-kuni olinadi.
 */
export function parseExpDate(raw: string | null | undefined): Date | null {
  if (!raw) return null;
  const parts = raw.trim().split(/[-./]/);
  let d: Date | null = null;
  if (parts.length === 3) {
    d = parts[0].length === 4 ? new Date(`${parts[0]}-${parts[1]}-${parts[2]}`) : new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
  } else if (parts.length === 2) {
    d = parts[0].length === 4 ? new Date(`${parts[0]}-${parts[1]}-28`) : new Date(`${parts[1]}-${parts[0]}-28`);
  }
  return d && !Number.isNaN(d.getTime()) ? d : null;
}

/** Muddati berilgan kun ichida tugaydi (yoki allaqachon tugagan) */
export function expiringWithin(raw: string | null | undefined, days: number): boolean {
  const d = parseExpDate(raw);
  if (!d) return false;
  const limit = new Date();
  limit.setDate(limit.getDate() + days);
  return d <= limit;
}

/** ?from=YYYY-MM-DD&to=YYYY-MM-DD ko'rinishidagi sana parametri; to — kun oxirigacha */
function dateParam(v: unknown, endOfDay = false): Date | undefined {
  if (typeof v !== "string" || !v.trim()) return undefined;
  const d = new Date(v.trim());
  if (Number.isNaN(d.getTime())) return undefined;
  if (endOfDay && /^\d{4}-\d{2}-\d{2}$/.test(v.trim())) d.setHours(23, 59, 59, 999);
  return d;
}

/**
 * Qo'lda yozilgan kassa orderining kontragent balansiga ta'siri.
 * Mijoz balansi > 0 — mijoz bizga qarzdor; ta'minotchi balansi > 0 — biz unga qarzdormiz.
 *  - mijozdan kirim: qarzi kamayadi; mijozga chiqim (pul qaytarish): qarzi oshadi (yoki avansi yopiladi)
 *  - ta'minotchiga chiqim: qarzimiz kamayadi; ta'minotchidan kirim (pul qaytardi): qarzimiz oshadi
 * direction = -1 bo'lsa, ta'sir teskari qo'llanadi (storno).
 */
async function applyCashBalance(
  tx: Tx,
  e: { type: "INCOME" | "EXPENSE"; amount: number; customerId?: number | null; supplierId?: number | null },
  direction: 1 | -1 = 1
) {
  const amt = e.amount * direction;
  if (e.customerId) {
    await tx.customer.update({
      where: { id: e.customerId },
      data: { balance: e.type === "INCOME" ? { decrement: amt } : { increment: amt } },
    });
  }
  if (e.supplierId) {
    await tx.supplier.update({
      where: { id: e.supplierId },
      data: { balance: e.type === "EXPENSE" ? { decrement: amt } : { increment: amt } },
    });
  }
}

/** Parallel so'rovlarda raqam to'qnashsa (P2002), tranzaksiyani qayta urinadi */
export async function withUniqueRetry<T>(fn: () => Promise<T>, attempts = 4): Promise<T> {
  for (let i = 0; ; i++) {
    try {
      return await fn();
    } catch (err: any) {
      if (err?.code === "P2002" && i < attempts - 1) continue;
      throw err;
    }
  }
}

/**
 * Qoldiq 0 dan oshganda avtomatik yashirilgan mahsulotni qayta ko'rsatadi.
 * Buyurtmalardagi qoida bilan bir xil: faqat qoldiq 0 bo'lgani uchun yashirilganlar qayta yoqiladi.
 */
async function incrementStock(tx: Tx, productId: number, quantity: number, extra: Prisma.ProductUncheckedUpdateInput = {}) {
  const before = await tx.product.findUnique({ where: { id: productId }, select: { stock: true, isActive: true } });
  const reactivate = before && before.stock <= 0 && !before.isActive;
  await tx.product.update({
    where: { id: productId },
    data: { ...extra, stock: { increment: quantity }, ...(reactivate ? { isActive: true } : {}) },
  });
}

/** Qoldiqni faqat yetarli bo'lsa ayiradi — ombor qoldig'i hech qachon manfiy bo'lmaydi */
async function decrementStockOrThrow(tx: Tx, productId: number, quantity: number, productName: string) {
  const r = await tx.product.updateMany({
    where: { id: productId, stock: { gte: quantity } },
    data: { stock: { decrement: quantity } },
  });
  if (r.count === 0) {
    const p = await tx.product.findUnique({ where: { id: productId }, select: { stock: true } });
    throw new HttpError(
      400,
      `"${productName}" uchun omborda yetarli qoldiq yo'q (mavjud: ${p?.stock ?? 0}, so'ralgan: ${quantity}).`
    );
  }
  // Qoldiq tugasa, mahsulot saytda yashiriladi (buyurtmalardagi kabi) — mijoz tugagan tovarga buyurtma bermaydi
  await tx.product.updateMany({ where: { id: productId, stock: 0 }, data: { isActive: false } });
}

export interface StockChange {
  productId: number;
  /** Yangi (haqiqiy) qoldiq */
  to: number;
}

/**
 * Qoldiqni qo'lda belgilash (reviziya, tezkor tahrir, mahsulot formasi) hujjatsiz bo'lmasligi uchun:
 * ortiqcha -> "Kirim" hujjati, kamomad -> "Hisobdan chiqarish" hujjati (tannarxda) yaratiladi va
 * qoldiq aynan berilgan songa o'rnatiladi. Hisobotlar va tovar aylanmasi shu hujjatlardan to'g'ri chiqadi.
 * Qaytaradi: yaratilgan hujjat raqamlari.
 */
export async function applyStockChanges(tx: Tx, changes: StockChange[], reason: string): Promise<string[]> {
  if (!changes.length) return [];
  const products = await tx.product.findMany({
    where: { id: { in: changes.map((c) => c.productId) } },
    select: { id: true, name: true, stock: true, isActive: true, costPrice: true, priceFrom: true },
  });
  const byId = new Map(products.map((p) => [p.id, p]));
  const surplus: { productId: number; productName: string; quantity: number; price: number }[] = [];
  const shortage: typeof surplus = [];

  for (const c of changes) {
    const p = byId.get(c.productId);
    if (!p) throw new HttpError(400, `Tovar topilmadi (ID: ${c.productId})`);
    const to = Math.max(0, Math.floor(c.to));
    const diff = to - p.stock;
    if (diff === 0) continue;
    const price = Number(p.costPrice) || Number(p.priceFrom) || 0;
    (diff > 0 ? surplus : shortage).push({ productId: p.id, productName: p.name, quantity: Math.abs(diff), price });
    await tx.product.update({
      where: { id: p.id },
      data: {
        stock: to,
        // 0 ga tushsa saytdan yashiriladi; faqat 0 sababli yashirilgan bo'lsa, qayta ko'rsatiladi
        ...(to === 0 ? { isActive: false } : p.stock <= 0 && !p.isActive ? { isActive: true } : {}),
      },
    });
  }

  const whId = await ensureDefaultWarehouse();
  const numbers: string[] = [];
  for (const [type, prefix, lines] of [
    ["INCOME", "PR", surplus],
    ["WRITE_OFF", "SP", shortage],
  ] as const) {
    if (!lines.length) continue;
    const docNumber = await nextDocNumber(tx, prefix);
    const totalAmount = lines.reduce((s, l) => s + l.price * l.quantity, 0);
    await tx.erpDocument.create({
      data: {
        docNumber,
        type,
        warehouseId: whId,
        totalAmount,
        paidAmount: 0,
        notes: reason === "Boshlang'ich qoldiq" ? reason : `${reason}: ${type === "INCOME" ? "ortiqcha" : "kamomad"}`,
        items: {
          create: lines.map((l) => ({
            productId: l.productId,
            productName: l.productName,
            quantity: l.quantity,
            costPrice: l.price,
            sellPrice: l.price,
            markup: 0,
            totalPrice: l.price * l.quantity,
          })),
        },
      },
    });
    numbers.push(docNumber);
  }
  return numbers;
}

/** Reviziya: sanalgan haqiqiy qoldiqlarni bitta tranzaksiyada qabul qiladi */
const countSchema = z.object({
  items: z.array(z.object({ productId: z.number().int().positive(), counted: z.number().int().min(0).max(1_000_000) })).min(1).max(2000),
  note: z.string().trim().max(200).optional(),
});

async function ensureDefaultWarehouse(): Promise<number> {
  let wh = await prisma.warehouse.findFirst({ where: { isDefault: true } });
  if (!wh) {
    wh = await prisma.warehouse.findFirst();
  }
  if (!wh) {
    wh = await prisma.warehouse.create({
      data: {
        name: "Asosiy ombor",
        address: "Namangan sh., Beruniy ko'chasi 2-uy",
        isDefault: true,
      },
    });
  }
  return wh.id;
}

/* -------------------------------------------------------------------------- */
/* 1. Overview / Dashboard Metrics                                            */
/* -------------------------------------------------------------------------- */
erpRouter.get("/overview", async (_req, res) => {
  const [
    products,
    cashEntries,
    customersWithDebt,
    suppliersWithDebt,
    recentDocs,
    warehouses,
  ] = await Promise.all([
    prisma.product.findMany({
      select: {
        id: true,
        stock: true,
        costPrice: true,
        priceFrom: true,
        minStock: true,
        expDate: true,
      },
    }),
    prisma.cashEntry.findMany({
      select: { type: true, amount: true },
    }),
    prisma.customer.aggregate({
      _sum: { balance: true },
      where: { balance: { gt: 0 } },
    }),
    prisma.supplier.aggregate({
      _sum: { balance: true },
      where: { balance: { gt: 0 } },
    }),
    prisma.erpDocument.findMany({
      take: 6,
      orderBy: { date: "desc" },
      include: {
        supplier: { select: { name: true } },
        customer: { select: { name: true } },
      },
    }),
    prisma.warehouse.findMany(),
  ]);

  let totalStockQty = 0;
  let totalStockCostValue = 0;
  let totalStockSellValue = 0;
  let lowStockCount = 0;
  let expiringCount = 0;

  for (const p of products) {
    const qty = p.stock || 0;
    totalStockQty += qty;
    const sell = Number(p.priceFrom) || 0;
    const cost = Number(p.costPrice) || (sell ? sell * 0.8 : 0);

    totalStockCostValue += cost * qty;
    totalStockSellValue += sell * qty;

    if (qty <= (p.minStock ?? 5)) {
      lowStockCount++;
    }

    if (expiringWithin(p.expDate, 90)) expiringCount++;
  }

  let totalCashIncome = 0;
  let totalCashExpense = 0;
  for (const c of cashEntries) {
    const amt = Number(c.amount) || 0;
    if (c.type === "INCOME") totalCashIncome += amt;
    else totalCashExpense += amt;
  }
  const cashBalance = totalCashIncome - totalCashExpense;

  res.json({
    totalProducts: products.length,
    totalStockQty,
    totalStockCostValue: Math.round(totalStockCostValue),
    totalStockSellValue: Math.round(totalStockSellValue),
    estimatedProfit: Math.round(totalStockSellValue - totalStockCostValue),
    cashBalance: Math.round(cashBalance),
    totalCashIncome: Math.round(totalCashIncome),
    totalCashExpense: Math.round(totalCashExpense),
    customerDebt: Number(customersWithDebt._sum.balance) || 0,
    supplierDebt: Number(suppliersWithDebt._sum.balance) || 0,
    lowStockCount,
    expiringCount,
    recentDocs,
    warehouses,
  });
});

/* -------------------------------------------------------------------------- */
/* 2. Inventory / Products Table (1C style)                                   */
/* -------------------------------------------------------------------------- */
erpRouter.get("/inventory", async (req, res) => {
  const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
  const categoryId = req.query.categoryId ? Number(req.query.categoryId) : undefined;
  const status = typeof req.query.status === "string" ? req.query.status : "all"; // all, low, expiring, out
  const limit = Math.min(Number(req.query.limit) || 100, 3000);
  const page = Math.max(Number(req.query.page) || 1, 1);

  const where: Prisma.ProductWhereInput = {};
  if (categoryId) where.categoryId = categoryId;
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { sku: { contains: search, mode: "insensitive" } },
      { shortName: { contains: search, mode: "insensitive" } },
      { mxikCode: { contains: search } },
      { batchNumber: { contains: search, mode: "insensitive" } },
    ];
  }

  if (status === "low") {
    // Har bir tovarning o'z minimal qoldig'i bilan solishtiriladi (avval hamma uchun 5 edi)
    where.stock = { lte: prisma.product.fields.minStock };
  } else if (status === "out") {
    where.stock = 0;
  } else if (status === "expiring") {
    where.expDate = { not: null };
  }

  const include = {
    category: { select: { id: true, name: true } },
    brand: { select: { id: true, name: true } },
    supplier: { select: { id: true, name: true } },
    warehouse: { select: { id: true, name: true } },
  } as const;

  if (status === "expiring") {
    // Muddat matn sifatida saqlanadi, shuning uchun 90 kunlik filtr serverda hisoblanadi
    const all = await prisma.product.findMany({ where, orderBy: [{ expDate: "asc" }, { name: "asc" }], include });
    const filtered = all.filter((p) => expiringWithin(p.expDate, 90));
    return void res.json({ items: filtered.slice((page - 1) * limit, page * limit), total: filtered.length, page, limit });
  }

  const [items, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: [{ stock: "asc" }, { updatedAt: "desc" }],
      skip: (page - 1) * limit,
      take: limit,
      include,
    }),
    prisma.product.count({ where }),
  ]);

  res.json({ items, total, page, limit });
});

/* Quick inline edit for 1C table */
erpRouter.post("/inventory/quick-update", async (req, res) => {
  const body = z
    .object({
      id: z.number().int().positive(),
      costPrice: z.number().nullish(),
      markupPercent: z.number().nullish(),
      priceFrom: z.number().nullish(),
      stock: z.number().int().min(0, "Qoldiq manfiy bo'lishi mumkin emas").max(1_000_000_000).nullish(),
      // Oyna ochilgandagi qoldiq: admin qoldiqni o'zgartirmagan bo'lsa, shu orada buyurtma bilan o'zgargan qoldiq saqlanadi
      stockBefore: z.number().int().nullish(),
      minStock: z.number().int().min(0).nullish(),
      batchNumber: z.string().nullish(),
      expDate: z.string().nullish(),
      supplierId: z.number().int().nullish(),
      warehouseId: z.number().int().nullish(),
    })
    .parse(req.body);

  let sellPrice = body.priceFrom;
  if (body.costPrice && body.markupPercent !== null && body.markupPercent !== undefined && !sellPrice) {
    sellPrice = Math.round(body.costPrice * (1 + body.markupPercent / 100));
  } else if (body.costPrice && sellPrice && (body.markupPercent === null || body.markupPercent === undefined)) {
    body.markupPercent = Math.round(((sellPrice - body.costPrice) / body.costPrice) * 100);
  }

  // Qoldiq o'zgarishi hujjat bilan yoziladi (ortiqcha/kamomad), yashirish/ko'rsatish ham shu yerda
  const updated = await withUniqueRetry(() => prisma.$transaction(async (tx) => {
    const stockEdited = body.stock !== undefined && body.stock !== null && (body.stockBefore == null || body.stock !== body.stockBefore);
    if (stockEdited) {
      await applyStockChanges(tx, [{ productId: body.id, to: body.stock! }], "Qoldiqni qo'lda tuzatish");
    }
    return tx.product.update({
    where: { id: body.id },
    data: {
      costPrice: body.costPrice !== undefined ? body.costPrice : undefined,
      markupPercent: body.markupPercent !== undefined ? body.markupPercent : undefined,
      priceFrom: sellPrice !== undefined ? sellPrice : undefined,
      minStock: body.minStock !== undefined && body.minStock !== null ? body.minStock : undefined,
      batchNumber: body.batchNumber !== undefined ? body.batchNumber : undefined,
      expDate: body.expDate !== undefined ? body.expDate : undefined,
      supplierId: body.supplierId !== undefined ? body.supplierId : undefined,
      warehouseId: body.warehouseId !== undefined ? body.warehouseId : undefined,
    },
    include: {
      category: { select: { name: true } },
      supplier: { select: { name: true } },
    },
  });
  }));

  res.json({ ok: true, product: updated });
});

erpRouter.post("/inventory/count", async (req, res) => {
  const body = countSchema.parse(req.body);
  const docs = await withUniqueRetry(() =>
    prisma.$transaction(
      (tx) => applyStockChanges(tx, body.items.map((i) => ({ productId: i.productId, to: i.counted })), body.note ? `Reviziya (${body.note})` : "Reviziya"),
      { timeout: 60_000 }
    )
  );
  res.json({ ok: true, documents: docs });
});

/* -------------------------------------------------------------------------- */
/* 3. Alerts: Low Stock & Expiring Products                                   */
/* -------------------------------------------------------------------------- */
erpRouter.get("/alerts", async (_req, res) => {
  const [lowStock, allProducts] = await Promise.all([
    prisma.product.findMany({
      where: { stock: { lte: prisma.product.fields.minStock } },
      orderBy: { stock: "asc" },
      take: 50,
      include: {
        supplier: { select: { name: true } },
        brand: { select: { name: true } },
      },
    }),
    prisma.product.findMany({
      where: { expDate: { not: null } },
      select: {
        id: true,
        name: true,
        stock: true,
        priceFrom: true,
        batchNumber: true,
        expDate: true,
        supplier: { select: { name: true } },
        brand: { select: { name: true } },
      },
    }),
  ]);

  const expiring = allProducts.filter((p) => expiringWithin(p.expDate, 90));

  res.json({
    lowStock: lowStock.map((p) => ({
      id: p.id,
      name: p.name,
      stock: p.stock,
      minStock: p.minStock || 5,
      price: p.priceFrom,
      supplier: p.supplier?.name || "—",
      brand: p.brand?.name || "—",
    })),
    expiring: expiring.map((p) => ({
      id: p.id,
      name: p.name,
      batch: p.batchNumber || "—",
      stock: p.stock,
      expDate: p.expDate,
      price: p.priceFrom,
      supplier: p.supplier?.name || "—",
    })),
  });
});

/* -------------------------------------------------------------------------- */
/* 4. Documents (Приход, Расход, Перемещение, Возврат, Списание)              */
/* -------------------------------------------------------------------------- */
erpRouter.get("/documents", async (req, res) => {
  const type = typeof req.query.type === "string" ? req.query.type : undefined;
  const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(req.query.limit) || 100, 1), 500);
  const from = dateParam(req.query.from);
  const to = dateParam(req.query.to, true);

  const where: Prisma.ErpDocumentWhereInput = {};
  if (type && type !== "ALL") {
    where.type = type as any;
  }
  if (from || to) where.date = { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) };
  if (search) {
    where.OR = [
      { docNumber: { contains: search, mode: "insensitive" } },
      { clientName: { contains: search, mode: "insensitive" } },
      { notes: { contains: search, mode: "insensitive" } },
      { supplier: { name: { contains: search, mode: "insensitive" } } },
      { customer: { name: { contains: search, mode: "insensitive" } } },
    ];
  }

  const [docs, total] = await Promise.all([
    prisma.erpDocument.findMany({
      where,
      orderBy: { date: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        supplier: { select: { id: true, name: true } },
        customer: { select: { id: true, name: true, phone: true } },
        warehouse: { select: { id: true, name: true } },
        items: {
          include: {
            product: { select: { id: true, name: true, sku: true } },
          },
        },
      },
    }),
    prisma.erpDocument.count({ where }),
  ]);

  res.json({ docs, total, page, pages: Math.max(1, Math.ceil(total / limit)) });
});

erpRouter.get("/documents/:id", async (req, res) => {
  const docId = Number(req.params.id);
  if (!Number.isInteger(docId) || docId <= 0) throw new HttpError(400, "ID noto'g'ri");
  const doc = await prisma.erpDocument.findUnique({
    where: { id: docId },
    include: {
      supplier: true,
      customer: true,
      warehouse: true,
      targetWarehouse: true,
      items: {
        include: {
          product: true,
        },
      },
      cashEntries: true,
    },
  });
  if (!doc) throw new HttpError(404, "Hujjat topilmadi");
  res.json({ doc });
});

/**
 * Sotuv hujjatidan oldin tekshiruv: shu mijozning so'nggi 7 kundagi sayt buyurtmalari qoldiqni allaqachon
 * kamaytirgan bo'lsa (tasdiqlangan), xuddi shu tovarlar uchun ikkinchi marta "Sotuv" yozilmasin.
 */
erpRouter.get("/site-orders-check", async (req, res) => {
  const customerId = Number(req.query.customerId);
  const productIds = String(req.query.productIds || "")
    .split(",")
    .map(Number)
    .filter((n) => Number.isInteger(n) && n > 0)
    .slice(0, 200);
  if (!customerId || !productIds.length) return void res.json({ orders: [] });
  const since = new Date(Date.now() - 7 * 24 * 3600 * 1000);
  const orders = await prisma.order.findMany({
    where: { customerId, stockDeducted: true, createdAt: { gte: since }, items: { some: { productId: { in: productIds } } } },
    select: { code: true, status: true, items: { where: { productId: { in: productIds } }, select: { productName: true, quantity: true } } },
    take: 10,
  });
  res.json({ orders });
});

/* Create new Document */
const docItemSchema = z.object({
  productId: z.number().int().positive(),
  quantity: z.number().int().positive(),
  costPrice: z.number().min(0).nullish(),
  markup: z.number().nullish(),
  sellPrice: z.number().min(0).nullish(),
  batchNumber: z.string().trim().nullish(),
  expDate: z.string().trim().nullish(),
});

const createDocSchema = z.object({
  type: z.enum(["INCOME", "OUTCOME", "TRANSFER", "RETURN_CUSTOMER", "RETURN_SUPPLIER", "WRITE_OFF"]),
  date: z
    .string()
    .nullish()
    .refine((v) => !v || !Number.isNaN(new Date(v).getTime()), "Hujjat sanasi noto'g'ri"),
  supplierId: z.number().int().nullish(),
  customerId: z.number().int().nullish(),
  clientName: z.string().trim().nullish(),
  warehouseId: z.number().int().nullish(),
  targetWarehouseId: z.number().int().nullish(),
  paidAmount: z.number().min(0).default(0),
  paymentType: z.enum(["CASH", "CARD", "BANK_TRANSFER"]).default("CASH"),
  notes: z.string().trim().nullish(),
  items: z.array(docItemSchema).min(1, "Kamida 1 ta tovar kiritilishi shart"),
});

erpRouter.post("/documents", async (req, res) => {
  const body = createDocSchema.parse(req.body);

  const defaultWhId = await ensureDefaultWarehouse();
  const whId = body.warehouseId || defaultWhId;

  // Prefix by type
  const prefixMap: Record<string, string> = {
    INCOME: "PR", // Приход
    OUTCOME: "RS", // Расход
    TRANSFER: "TR", // Перемещение
    RETURN_CUSTOMER: "VK", // Возврат от клиента
    RETURN_SUPPLIER: "VP", // Возврат поставщику
    WRITE_OFF: "SP", // Списание
  };
  const docPrefix = prefixMap[body.type] || "DOC";

  // Calculate totals and verify products
  const productIds = body.items.map((i) => i.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
  });
  const pMap = new Map(products.map((p) => [p.id, p]));

  let totalAmount = 0;
  const itemsData: {
    productId: number;
    productName: string;
    quantity: number;
    costPrice?: number;
    markup?: number;
    sellPrice?: number;
    totalPrice: number;
    batchNumber?: string;
    expDate?: string;
  }[] = [];

  for (const item of body.items) {
    const prod = pMap.get(item.productId);
    if (!prod) throw new HttpError(400, `Tovar topilmadi (ID: ${item.productId})`);

    const cost = item.costPrice ?? (prod.costPrice ? Number(prod.costPrice) : 0);
    let sell = item.sellPrice ?? (prod.priceFrom ? Number(prod.priceFrom) : 0);
    const markup = item.markup ?? (cost && sell ? Math.round(((sell - cost) / cost) * 100) : 0);

    // Kirim, ta'minotchiga qaytarish va hisobdan chiqarish tannarxda; sotuv va mijoz qaytimi sotuv narxida
    const costBasis = body.type === "INCOME" || body.type === "RETURN_SUPPLIER" || body.type === "WRITE_OFF";
    const unitPrice = costBasis ? (cost || sell) : (sell || cost);
    const lineTotal = unitPrice * item.quantity;
    totalAmount += lineTotal;

    itemsData.push({
      productId: item.productId,
      productName: prod.name,
      quantity: item.quantity,
      costPrice: cost,
      markup,
      sellPrice: sell,
      totalPrice: lineTotal,
      batchNumber: item.batchNumber || prod.batchNumber || undefined,
      expDate: item.expDate || prod.expDate || undefined,
    });
  }

  // To'lov faqat kirim va sotuv hujjatlarida kassaga yoziladi; boshqalarida saqlansa, hisobot yolg'on bo'ladi
  const hasPayment = body.type === "INCOME" || body.type === "OUTCOME";
  if (!hasPayment) body.paidAmount = 0;
  if (body.paidAmount > totalAmount + 0.01) {
    throw new HttpError(400, "To'langan summa hujjat summasidan oshmasligi kerak.");
  }

  // Execute in Prisma Transaction for absolute consistency
  const result = await withUniqueRetry(() => prisma.$transaction(async (tx) => {
    const docNumber = await nextDocNumber(tx, docPrefix);
    // 1. Create Document
    const doc = await tx.erpDocument.create({
      data: {
        docNumber,
        type: body.type,
        date: body.date ? new Date(body.date) : new Date(),
        warehouseId: whId,
        targetWarehouseId: body.targetWarehouseId || null,
        supplierId: body.supplierId || null,
        customerId: body.customerId || null,
        clientName: body.clientName || null,
        totalAmount,
        paidAmount: body.paidAmount,
        notes: body.notes || null,
        createdBy: req.user?.name || null,
        items: {
          create: itemsData.map((it) => ({
            productId: it.productId,
            productName: it.productName,
            quantity: it.quantity,
            costPrice: it.costPrice,
            markup: it.markup,
            sellPrice: it.sellPrice,
            totalPrice: it.totalPrice,
            batchNumber: it.batchNumber,
            expDate: it.expDate,
          })),
        },
      },
    });

    // 2. Adjust Stock and Product Details
    for (const item of itemsData) {
      if (body.type === "INCOME") {
        // Increase stock, update prices and batch info
        await incrementStock(tx, item.productId, item.quantity, {
            costPrice: item.costPrice ? item.costPrice : undefined,
            markupPercent: item.markup ? item.markup : undefined,
            priceFrom: item.sellPrice ? item.sellPrice : undefined,
            batchNumber: item.batchNumber || undefined,
            expDate: item.expDate || undefined,
            supplierId: body.supplierId || undefined,
            warehouseId: whId,
        });
      } else if (body.type === "OUTCOME" || body.type === "WRITE_OFF") {
        // Decrease stock (faqat qoldiq yetarli bo'lsa)
        await decrementStockOrThrow(tx, item.productId, item.quantity, item.productName);
      } else if (body.type === "RETURN_CUSTOMER") {
        // Customer returned item -> return to stock
        await incrementStock(tx, item.productId, item.quantity);
      } else if (body.type === "RETURN_SUPPLIER") {
        // Return to supplier -> decrement stock (faqat qoldiq yetarli bo'lsa)
        await decrementStockOrThrow(tx, item.productId, item.quantity, item.productName);
      }
    }

    // 3. Cash & Debt settlement
    if (body.type === "INCOME") {
      // Payment to supplier
      if (body.paidAmount > 0) {
        await tx.cashEntry.create({
          data: {
            entryNumber: await nextCashNumber(tx),
            type: "EXPENSE",
            category: "TAMINOTCHI_TOLOV",
            amount: body.paidAmount,
            paymentType: body.paymentType,
            description: `Hujjat #${docNumber} bo'yicha ta'minotchiga to'lov`,
            supplierId: body.supplierId || null,
            documentId: doc.id,
            createdBy: req.user?.name || null,
          },
        });
      }
      const unpaid = totalAmount - body.paidAmount;
      if (unpaid > 0 && body.supplierId) {
        await tx.supplier.update({
          where: { id: body.supplierId },
          data: { balance: { increment: unpaid } },
        });
      }
    } else if (body.type === "OUTCOME") {
      // Receipt from customer
      if (body.paidAmount > 0) {
        await tx.cashEntry.create({
          data: {
            entryNumber: await nextCashNumber(tx),
            type: "INCOME",
            category: "MIJOZ_TOLOV",
            amount: body.paidAmount,
            paymentType: body.paymentType,
            description: `Hujjat #${docNumber} bo'yicha sotuv tushumi`,
            customerId: body.customerId || null,
            documentId: doc.id,
            createdBy: req.user?.name || null,
          },
        });
      }
      const unpaid = totalAmount - body.paidAmount;
      if (unpaid > 0 && body.customerId) {
        await tx.customer.update({
          where: { id: body.customerId },
          data: { balance: { increment: unpaid } },
        });
      }
    } else if (body.type === "RETURN_CUSTOMER" && body.customerId) {
      // Mijoz tovar qaytardi: qarzi shu summaga kamayadi. To'lab bo'lgan bo'lsa, balans manfiy bo'ladi
      // (biz unga qarzdormiz) va Kassa bo'limida "Mijozga pul qaytarish" chiqimi bilan yopiladi.
      await tx.customer.update({ where: { id: body.customerId }, data: { balance: { decrement: totalAmount } } });
    } else if (body.type === "RETURN_SUPPLIER" && body.supplierId) {
      // Ta'minotchiga qaytardik: unga qarzimiz shu summaga kamayadi (yoki u bizga qarzdor bo'lib qoladi)
      await tx.supplier.update({ where: { id: body.supplierId }, data: { balance: { decrement: totalAmount } } });
    }

    return doc;
  }));

  res.status(201).json({ ok: true, document: result });
});

/**
 * Hujjatni bekor qilish (1C dagi "отмена проведения"): ombor harakati, kontragent qarzi va
 * kassa orderlari teskari yoziladi, hujjat CANCELED holatiga o'tadi. Tarix o'chirilmaydi.
 */
erpRouter.post("/documents/:id/cancel", requireAdmin, async (req, res) => {
  const docId = Number(req.params.id);
  if (!Number.isInteger(docId) || docId <= 0) throw new HttpError(400, "ID noto'g'ri");
  const { reason } = z.object({ reason: z.string().trim().max(300).default("") }).parse(req.body || {});

  const doc = await prisma.erpDocument.findUnique({ where: { id: docId }, include: { items: true, cashEntries: true } });
  if (!doc) throw new HttpError(404, "Hujjat topilmadi");
  if (doc.status === "CANCELED") throw new HttpError(400, "Hujjat allaqachon bekor qilingan");

  const total = Number(doc.totalAmount) || 0;
  const unpaid = total - (Number(doc.paidAmount) || 0);
  // Qaytim hujjatlarining balansga ta'siri shu versiyadan boshlab yoziladi (createdBy bo'lganlarda)
  const returnsTouchBalance = Boolean(doc.createdBy);

  await withUniqueRetry(() =>
    prisma.$transaction(async (tx) => {
      // 1. Ombor: kirgan tovar qaytib chiqadi (sotilib ketgan bo'lsa, bekor qilib bo'lmaydi), chiqqan tovar qaytadi
      for (const it of doc.items) {
        if (doc.type === "INCOME" || doc.type === "RETURN_CUSTOMER") {
          await decrementStockOrThrow(tx, it.productId, it.quantity, it.productName);
        } else if (doc.type === "OUTCOME" || doc.type === "WRITE_OFF" || doc.type === "RETURN_SUPPLIER") {
          await incrementStock(tx, it.productId, it.quantity);
        }
      }

      // 1a. Kirim bekor qilinsa, mahsulot kartasidagi narx va partiya oldingi kirimdagi qiymatga qaytadi
      if (doc.type === "INCOME") {
        for (const it of doc.items) {
          const prev = await tx.erpDocumentItem.findFirst({
            where: { productId: it.productId, documentId: { not: doc.id }, document: { type: "INCOME", status: "CONFIRMED" } },
            orderBy: { document: { date: "desc" } },
          });
          if (!prev) continue;
          await tx.product.update({
            where: { id: it.productId },
            data: {
              costPrice: prev.costPrice ?? undefined,
              priceFrom: prev.sellPrice && Number(prev.sellPrice) > 0 ? prev.sellPrice : undefined,
              markupPercent: prev.markup ?? undefined,
              batchNumber: prev.batchNumber ?? undefined,
              expDate: prev.expDate ?? undefined,
            },
          });
        }
      }

      // 2. Kontragent qarzi
      if (doc.type === "INCOME" && unpaid > 0 && doc.supplierId) {
        await tx.supplier.update({ where: { id: doc.supplierId }, data: { balance: { decrement: unpaid } } });
      } else if (doc.type === "OUTCOME" && unpaid > 0 && doc.customerId) {
        await tx.customer.update({ where: { id: doc.customerId }, data: { balance: { decrement: unpaid } } });
      } else if (doc.type === "RETURN_CUSTOMER" && doc.customerId && returnsTouchBalance) {
        await tx.customer.update({ where: { id: doc.customerId }, data: { balance: { increment: total } } });
      } else if (doc.type === "RETURN_SUPPLIER" && doc.supplierId && returnsTouchBalance) {
        await tx.supplier.update({ where: { id: doc.supplierId }, data: { balance: { increment: total } } });
      }

      // 3. Kassa: hujjat bilan kirgan/chiqqan pul storno orderi bilan qaytariladi
      for (const ce of doc.cashEntries) {
        if (ce.canceledAt || ce.stornoOfId) continue;
        await tx.cashEntry.create({
          data: {
            entryNumber: await nextCashNumber(tx),
            type: ce.type === "INCOME" ? "EXPENSE" : "INCOME",
            category: ce.category,
            amount: ce.amount,
            paymentType: ce.paymentType,
            description: `Storno ${ce.entryNumber}: hujjat ${doc.docNumber} bekor qilindi`,
            customerId: ce.customerId,
            supplierId: ce.supplierId,
            documentId: doc.id,
            stornoOfId: ce.id,
            createdBy: req.user?.name || null,
          },
        });
        await tx.cashEntry.update({ where: { id: ce.id }, data: { canceledAt: new Date() } });
      }

      const stamp = `Bekor qilindi ${new Date().toISOString().slice(0, 10)}${req.user?.name ? ` (${req.user.name})` : ""}${reason ? `: ${reason}` : ""}`;
      await tx.erpDocument.update({
        where: { id: doc.id },
        data: { status: "CANCELED", canceledAt: new Date(), notes: doc.notes ? `${doc.notes}\n${stamp}` : stamp },
      });
    })
  );

  res.json({ ok: true });
});

/* -------------------------------------------------------------------------- */
/* 5. Cash Desk / Kassa                                                       */
/* -------------------------------------------------------------------------- */
erpRouter.get("/cash", async (req, res) => {
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(req.query.limit) || 100, 1), 500);
  const from = dateParam(req.query.from);
  const to = dateParam(req.query.to, true);
  const where: Prisma.CashEntryWhereInput = {};
  if (from || to) where.date = { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) };

  const [entries, total, totals, periodTotals] = await Promise.all([
    prisma.cashEntry.findMany({
      where,
      orderBy: { date: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        customer: { select: { id: true, name: true, phone: true } },
        supplier: { select: { id: true, name: true } },
        document: { select: { id: true, docNumber: true } },
      },
    }),
    prisma.cashEntry.count({ where }),
    // Kassa balansi doim butun tarix bo'yicha
    prisma.cashEntry.groupBy({ by: ["type"], _sum: { amount: true } }),
    from || to ? prisma.cashEntry.groupBy({ by: ["type"], where, _sum: { amount: true } }) : Promise.resolve(null),
  ]);

  const sum = (rows: { type: string; _sum: { amount: unknown } }[] | null, type: string) =>
    Number(rows?.find((r) => r.type === type)?._sum.amount) || 0;
  const totalIncome = sum(totals, "INCOME");
  const totalExpense = sum(totals, "EXPENSE");

  res.json({
    entries,
    total,
    page,
    pages: Math.max(1, Math.ceil(total / limit)),
    totalIncome,
    totalExpense,
    balance: totalIncome - totalExpense,
    periodIncome: periodTotals ? sum(periodTotals, "INCOME") : null,
    periodExpense: periodTotals ? sum(periodTotals, "EXPENSE") : null,
  });
});

erpRouter.post("/cash", async (req, res) => {
  const body = z
    .object({
      type: z.enum(["INCOME", "EXPENSE"]),
      category: z.string().trim().min(2),
      amount: z.number().positive("Summa musbat bo'lishi kerak"),
      paymentType: z.enum(["CASH", "CARD", "BANK_TRANSFER"]).default("CASH"),
      description: z.string().trim().nullish(),
      customerId: z.number().int().nullish(),
      supplierId: z.number().int().nullish(),
    })
    .parse(req.body);

  const entry = await withUniqueRetry(() => prisma.$transaction(async (tx) => {
    const entryNumber = await nextCashNumber(tx);
    const created = await tx.cashEntry.create({
      data: {
        entryNumber,
        type: body.type,
        category: body.category,
        amount: body.amount,
        paymentType: body.paymentType,
        description: body.description || null,
        customerId: body.customerId || null,
        supplierId: body.supplierId || null,
        createdBy: req.user?.name || null,
      },
    });

    // Kontragent qarzi: mijozdan kirim / mijozga qaytarish, ta'minotchiga to'lov / ta'minotchidan qaytim
    await applyCashBalance(tx, { type: body.type, amount: body.amount, customerId: body.customerId, supplierId: body.supplierId });

    return created;
  }));

  res.status(201).json({ ok: true, entry });
});

/**
 * Kassa orderini bekor qilish: o'chirilmaydi, teskari (storno) order yoziladi va kontragent balansi tiklanadi.
 * Hujjatga yoki sayt buyurtmasiga bog'langan orderlar o'z joyidan (hujjat / buyurtma) bekor qilinadi.
 */
erpRouter.post("/cash/:id/cancel", requireAdmin, async (req, res) => {
  const entryId = Number(req.params.id);
  if (!Number.isInteger(entryId) || entryId <= 0) throw new HttpError(400, "ID noto'g'ri");
  const { reason } = z.object({ reason: z.string().trim().max(300).default("") }).parse(req.body || {});

  const entry = await prisma.cashEntry.findUnique({ where: { id: entryId } });
  if (!entry) throw new HttpError(404, "Kassa orderi topilmadi");
  if (entry.canceledAt) throw new HttpError(400, "Bu order allaqachon bekor qilingan");
  if (entry.stornoOfId) throw new HttpError(400, "Storno orderini bekor qilib bo'lmaydi");
  if (entry.documentId) throw new HttpError(400, "Bu order hujjatga bog'langan: Hujjatlar bo'limida hujjatning o'zini bekor qiling.");
  if (entry.orderId || entry.category === "SAYT_BUYURTMA") {
    throw new HttpError(400, "Sayt buyurtmasi to'lovi Buyurtmalar bo'limida boshqariladi (to'lov belgisini olib tashlang).");
  }

  const storno = await withUniqueRetry(() =>
    prisma.$transaction(async (tx) => {
      const created = await tx.cashEntry.create({
        data: {
          entryNumber: await nextCashNumber(tx),
          type: entry.type === "INCOME" ? "EXPENSE" : "INCOME",
          category: entry.category,
          amount: entry.amount,
          paymentType: entry.paymentType,
          description: `Storno ${entry.entryNumber}${reason ? `: ${reason}` : ""}`,
          customerId: entry.customerId,
          supplierId: entry.supplierId,
          stornoOfId: entry.id,
          createdBy: req.user?.name || null,
        },
      });
      await applyCashBalance(
        tx,
        { type: entry.type, amount: Number(entry.amount), customerId: entry.customerId, supplierId: entry.supplierId },
        -1
      );
      await tx.cashEntry.update({ where: { id: entry.id }, data: { canceledAt: new Date() } });
      return created;
    })
  );

  res.status(201).json({ ok: true, entry: storno });
});

/* -------------------------------------------------------------------------- */
/* 6. Suppliers (Поставщики)                                                 */
/* -------------------------------------------------------------------------- */
erpRouter.get("/suppliers", async (_req, res) => {
  const suppliers = await prisma.supplier.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: { select: { documents: true, products: true } },
    },
  });
  res.json({ suppliers });
});

erpRouter.post("/suppliers", async (req, res) => {
  const body = z
    .object({
      name: z.string().trim().min(2, "Nom kamida 2 ta belgi bo'lsin"),
      company: z.string().trim().nullish(),
      phone: z.string().trim().nullish(),
      inn: z.string().trim().nullish(),
      address: z.string().trim().nullish(),
      notes: z.string().trim().nullish(),
    })
    .parse(req.body);

  const supplier = await prisma.supplier.create({ data: body });
  res.status(201).json({ ok: true, supplier });
});

erpRouter.put("/suppliers/:id", async (req, res) => {
  const supId = Number(req.params.id);
  if (!Number.isInteger(supId) || supId <= 0) throw new HttpError(400, "ID noto'g'ri");
  const body = z
    .object({
      name: z.string().trim().min(2),
      company: z.string().trim().nullish(),
      phone: z.string().trim().nullish(),
      inn: z.string().trim().nullish(),
      address: z.string().trim().nullish(),
      notes: z.string().trim().nullish(),
    })
    .parse(req.body);

  const updated = await prisma.supplier.update({
    where: { id: supId },
    data: body,
  });
  res.json({ ok: true, supplier: updated });
});

/* -------------------------------------------------------------------------- */
/* 7. Warehouses (Склады)                                                     */
/* -------------------------------------------------------------------------- */
erpRouter.get("/warehouses", async (_req, res) => {
  await ensureDefaultWarehouse();
  const warehouses = await prisma.warehouse.findMany({
    orderBy: { id: "asc" },
    include: {
      _count: { select: { products: true } },
    },
  });
  res.json({ warehouses });
});

erpRouter.post("/warehouses", async (req, res) => {
  const body = z
    .object({
      name: z.string().trim().min(2),
      address: z.string().trim().nullish(),
      isDefault: z.boolean().default(false),
    })
    .parse(req.body);

  if (body.isDefault) {
    await prisma.warehouse.updateMany({ data: { isDefault: false } });
  }

  const wh = await prisma.warehouse.create({ data: body });
  res.status(201).json({ ok: true, warehouse: wh });
});

/* -------------------------------------------------------------------------- */
/* 8. Reports: Turnover Sheet (Товарная оборотка) & Akt Sverka                */
/* -------------------------------------------------------------------------- */
erpRouter.get("/reports/turnover", async (req, res) => {
  const dateFrom = req.query.from ? new Date(String(req.query.from)) : new Date(Date.now() - 30 * 24 * 3600 * 1000);
  const dateTo = req.query.to ? new Date(String(req.query.to)) : new Date();

  const [products, docItems] = await Promise.all([
    prisma.product.findMany({
      select: {
        id: true,
        name: true,
        sku: true,
        unit: true,
        stock: true,
        costPrice: true,
        priceFrom: true,
      },
      orderBy: { name: "asc" },
    }),
    prisma.erpDocumentItem.findMany({
      where: {
        document: {
          date: { gte: dateFrom, lte: dateTo },
          status: "CONFIRMED",
        },
      },
      include: {
        document: { select: { type: true, date: true } },
      },
    }),
  ]);

  // Saytdagi buyurtmalar ham ombordan ayiriladi (admin tasdiqlaganda), ular ham chiqim sifatida sanaladi
  const orderItems = await prisma.orderItem.findMany({
    where: {
      productId: { not: null },
      order: { stockDeducted: true, createdAt: { gte: dateFrom, lte: dateTo } },
    },
    select: { productId: true, quantity: true, price: true },
  });

  const pStats = new Map<
    number,
    { incomeQty: number; incomeSum: number; outcomeQty: number; outcomeSum: number }
  >();

  for (const it of orderItems) {
    const pid = it.productId!;
    if (!pStats.has(pid)) pStats.set(pid, { incomeQty: 0, incomeSum: 0, outcomeQty: 0, outcomeSum: 0 });
    const st = pStats.get(pid)!;
    st.outcomeQty += it.quantity;
    st.outcomeSum += (Number(it.price) || 0) * it.quantity;
  }

  for (const it of docItems) {
    if (!pStats.has(it.productId)) {
      pStats.set(it.productId, { incomeQty: 0, incomeSum: 0, outcomeQty: 0, outcomeSum: 0 });
    }
    const st = pStats.get(it.productId)!;
    const type = it.document.type;
    const lineTotal = Number(it.totalPrice) || 0;

    if (type === "INCOME" || type === "RETURN_CUSTOMER") {
      st.incomeQty += it.quantity;
      st.incomeSum += lineTotal;
    } else if (type === "OUTCOME" || type === "RETURN_SUPPLIER" || type === "WRITE_OFF") {
      st.outcomeQty += it.quantity;
      st.outcomeSum += lineTotal;
    }
  }

  const rows = products.map((p) => {
    const st = pStats.get(p.id) || { incomeQty: 0, incomeSum: 0, outcomeQty: 0, outcomeSum: 0 };
    const currentStock = p.stock || 0;
    // Estimated opening = current - income + outcome
    const openingStock = Math.max(0, currentStock - st.incomeQty + st.outcomeQty);

    return {
      id: p.id,
      name: p.name,
      sku: p.sku || "—",
      unit: p.unit || "dona",
      costPrice: Number(p.costPrice) || 0,
      sellPrice: Number(p.priceFrom) || 0,
      openingStock,
      incomeQty: st.incomeQty,
      incomeSum: st.incomeSum,
      outcomeQty: st.outcomeQty,
      outcomeSum: st.outcomeSum,
      closingStock: currentStock,
    };
  });

  res.json({
    dateFrom: dateFrom.toISOString(),
    dateTo: dateTo.toISOString(),
    rows,
  });
});

/* Reconciliation Statement (Акт сверки) */
interface SverkaLine {
  date: string;
  docNumber: string;
  description: string;
  debit: number;
  credit: number;
}

/**
 * Kontragent bilan o'zaro hisob-kitob jadvali (JSON hisobot va Excel eksport uchun bitta manba).
 * Mijoz: Debet — mijoz qarzi oshadi (sotuv, sayt buyurtmasi, unga qaytarilgan pul);
 *        Kredit — mijoz to'ladi yoki tovar qaytardi.
 * Ta'minotchi: Debet — bizning foydamizga (to'lovimiz, qaytargan tovarimiz);
 *              Kredit — ta'minotchi foydasiga (yetkazgan tovari, bizga qaytargan puli).
 * Sayt buyurtmasi to'lovi faqat kassa orderi orqali hisoblanadi (avval buyurtma ham, kassa ham
 * kredit sifatida yozilib, to'lov ikki marta ko'rinardi). Bekor qilingan hujjatlar kirmaydi.
 */
async function buildSverka(entityType: "customer" | "supplier", entityId: number, dateFrom: Date, dateTo: Date) {
  // Davr boshigacha bo'lgan barcha harakatlar boshlang'ich saldoni beradi (1C: "Сальдо на начало")
  const upTo = { lte: dateTo };
  const lines: SverkaLine[] = [];

  if (entityType === "supplier") {
    const supplier = await prisma.supplier.findUnique({ where: { id: entityId } });
    if (!supplier) throw new HttpError(404, "Yetkazib beruvchi topilmadi");
    const [docs, cash] = await Promise.all([
      prisma.erpDocument.findMany({ where: { supplierId: entityId, status: "CONFIRMED", date: upTo }, orderBy: { date: "asc" } }),
      prisma.cashEntry.findMany({ where: { supplierId: entityId, date: upTo }, orderBy: { date: "asc" } }),
    ]);
    for (const d of docs) {
      const total = Number(d.totalAmount) || 0;
      if (d.type === "INCOME") {
        lines.push({ date: d.date.toISOString(), docNumber: d.docNumber, description: `Tovar kirimi #${d.docNumber}`, debit: 0, credit: total });
      } else if (d.type === "RETURN_SUPPLIER") {
        lines.push({ date: d.date.toISOString(), docNumber: d.docNumber, description: `Ta'minotchiga qaytarish #${d.docNumber}`, debit: total, credit: 0 });
      }
    }
    for (const c of cash) {
      const amt = Number(c.amount) || 0;
      lines.push({
        date: c.date.toISOString(),
        docNumber: c.entryNumber,
        description: c.description || (c.type === "EXPENSE" ? "Ta'minotchiga to'lov" : "Ta'minotchidan pul qaytdi"),
        debit: c.type === "EXPENSE" ? amt : 0,
        credit: c.type === "INCOME" ? amt : 0,
      });
    }
    return splitSverka(
      {
        type: "supplier" as const,
        id: supplier.id,
        name: supplier.name,
        company: supplier.company,
        organization: supplier.company,
        phone: supplier.phone,
        inn: supplier.inn,
        balance: Number(supplier.balance),
      },
      lines,
      dateFrom,
      // Ta'minotchi: saldo = kredit - debet (biz qarzdormiz, agar musbat)
      (l) => l.credit - l.debit
    );
  }

  const customer = await prisma.customer.findUnique({ where: { id: entityId } });
  if (!customer) throw new HttpError(404, "Mijoz topilmadi");
  const [docs, cash, orders] = await Promise.all([
    prisma.erpDocument.findMany({ where: { customerId: entityId, status: "CONFIRMED", date: upTo }, orderBy: { date: "asc" } }),
    prisma.cashEntry.findMany({ where: { customerId: entityId, date: upTo }, orderBy: { date: "asc" } }),
    prisma.order.findMany({
      where: { customerId: entityId, createdAt: upTo, status: { in: ["CONFIRMED", "READY", "DONE"] } },
      orderBy: { createdAt: "asc" },
      select: { id: true, code: true, createdAt: true, totalAmount: true, isPaid: true },
    }),
  ]);
  for (const d of docs) {
    const total = Number(d.totalAmount) || 0;
    if (d.type === "OUTCOME") {
      lines.push({ date: d.date.toISOString(), docNumber: d.docNumber, description: `Tovar sotuvi #${d.docNumber}`, debit: total, credit: 0 });
    } else if (d.type === "RETURN_CUSTOMER") {
      lines.push({ date: d.date.toISOString(), docNumber: d.docNumber, description: `Mijozdan qaytim #${d.docNumber}`, debit: 0, credit: total });
    }
  }
  // Sayt buyurtmasi do'konda olib ketishda to'lanadi va mijoz qarziga yozilmaydi: sverkada uning summasi
  // kassaga tushgan pulga teng debet bo'lib chiqadi (to'lov krediti bilan yopiladi). To'lanmaganlari qarz emas.
  const siteCash = new Map<number, number>();
  for (const c of cash) {
    if (c.category !== "SAYT_BUYURTMA") continue;
    const order = c.orderId ? orders.find((o) => o.id === c.orderId) : orders.find((o) => (c.description || "").startsWith(`Buyurtma ${o.code} `));
    if (!order) continue;
    siteCash.set(order.id, (siteCash.get(order.id) || 0) + (c.type === "INCOME" ? 1 : -1) * (Number(c.amount) || 0));
  }
  for (const o of orders) {
    const paid = siteCash.get(o.id) || 0;
    if (paid <= 0) continue;
    // Bitta qator: tovar berildi (debet) va shu zahoti to'landi (kredit) — saldoga ta'sir qilmaydi
    lines.push({ date: o.createdAt.toISOString(), docNumber: `#${o.code}`, description: `Sayt buyurtmasi #${o.code} (to'langan)`, debit: paid, credit: paid });
  }
  for (const c of cash) {
    if (c.category === "SAYT_BUYURTMA") continue; // yuqoridagi buyurtma qatorida hisoblangan
    const amt = Number(c.amount) || 0;
    lines.push({
      date: c.date.toISOString(),
      docNumber: c.entryNumber,
      description: c.description || (c.type === "INCOME" ? "Mijozdan to'lov qabul qilindi" : "Mijozga pul qaytarildi"),
      debit: c.type === "EXPENSE" ? amt : 0,
      credit: c.type === "INCOME" ? amt : 0,
    });
  }
  return splitSverka(
    {
      type: "customer" as const,
      id: customer.id,
      name: customer.name,
      company: customer.organization,
      organization: customer.organization,
      phone: customer.phone,
      inn: customer.inn,
      balance: Number(customer.balance),
    },
    lines,
    dateFrom,
    // Mijoz: saldo = debet - kredit (mijoz bizga qarzdor, agar musbat)
    (l) => l.debit - l.credit
  );
}

/** Davr boshigacha bo'lgan qatorlar boshlang'ich saldoga yig'iladi, qolganlari davr harakati */
function splitSverka<T>(entity: T, all: SverkaLine[], dateFrom: Date, sign: (l: SverkaLine) => number) {
  all.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const before = all.filter((l) => new Date(l.date) < dateFrom);
  const timeline = all.filter((l) => new Date(l.date) >= dateFrom);
  const opening = before.reduce((s, l) => s + sign(l), 0);
  const totalDebit = timeline.reduce((s, l) => s + l.debit, 0);
  const totalCredit = timeline.reduce((s, l) => s + l.credit, 0);
  const closing = opening + timeline.reduce((s, l) => s + sign(l), 0);
  return { entity, timeline, opening, closing, totalDebit, totalCredit };
}

erpRouter.get("/reports/act-sverka", async (req, res) => {
  const entityType = req.query.type === "supplier" ? "supplier" : "customer";
  const entityId = Number(req.query.id);
  if (!entityId) throw new HttpError(400, "Kontragent tanlanmagan");

  const dateFrom = dateParam(req.query.from) || new Date(Date.now() - 60 * 24 * 3600 * 1000);
  const dateTo = dateParam(req.query.to, true) || new Date();

  const sv = await buildSverka(entityType, entityId, dateFrom, dateTo);
  res.json({ ...sv, dateFrom: dateFrom.toISOString(), dateTo: dateTo.toISOString() });
});

/* -------------------------------------------------------------------------- */
/* 9. Excel Export Services (1C / ERP Hisobotlarni Excelga yuklash)          */
/* -------------------------------------------------------------------------- */

function applyExcelTableStyles(
  ws: ExcelJS.Worksheet,
  headerRowIdx: number,
  accentColor: string = "0D9488"
) {
  const headerRow = ws.getRow(headerRowIdx);
  headerRow.height = 26;
  headerRow.eachCell((cell) => {
    cell.font = { name: "Segoe UI", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF" + accentColor },
    };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    cell.border = {
      top: { style: "thin", color: { argb: "FF0B7269" } },
      left: { style: "thin", color: { argb: "FF0B7269" } },
      bottom: { style: "medium", color: { argb: "FF0B7269" } },
      right: { style: "thin", color: { argb: "FF0B7269" } },
    };
  });

  for (let r = headerRowIdx + 1; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    row.height = 22;
    const firstCellText = row.getCell(1).text.trim().toLowerCase();
    const isTotalRow = firstCellText.startsWith("jami") || firstCellText.startsWith("itogo");

    row.eachCell({ includeEmpty: true }, (cell) => {
      cell.font = {
        name: "Segoe UI",
        size: 10,
        bold: isTotalRow,
        color: isTotalRow ? { argb: "FF0F172A" } : undefined,
      };
      if (isTotalRow) {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFF1F5F9" },
        };
      }
      cell.border = {
        top: { style: isTotalRow ? "medium" : "thin", color: { argb: isTotalRow ? "FF0D9488" : "FFE2E8F0" } },
        left: { style: "thin", color: { argb: "FFE2E8F0" } },
        bottom: { style: isTotalRow ? "double" : "thin", color: { argb: isTotalRow ? "FF0D9488" : "FFE2E8F0" } },
        right: { style: "thin", color: { argb: "FFE2E8F0" } },
      };
      cell.alignment = { vertical: "middle" };
    });
  }

  // Auto-fit column widths
  ws.columns.forEach((col) => {
    let maxLen = 10;
    col.eachCell?.({ includeEmpty: false }, (cell) => {
      const val = cell.value ? String(cell.value) : "";
      if (val.length > maxLen) maxLen = val.length;
    });
    col.width = Math.min(Math.max(maxLen + 3, 10), 45);
  });
}

// 9.1: Ombor qoldiqlari va narxlar (Инвентаризация / Остатки)
erpRouter.get("/export/inventory", async (_req, res) => {
  const products = await prisma.product.findMany({
    orderBy: { name: "asc" },
    include: {
      category: { select: { name: true } },
      brand: { select: { name: true } },
      supplier: { select: { name: true } },
      warehouse: { select: { name: true } },
    },
  });

  const wb = new ExcelJS.Workbook();
  wb.creator = "MEDAX ERP";
  wb.created = new Date();
  const ws = wb.addWorksheet("Ombor qoldiqlari", {
    views: [{ state: "frozen", ySplit: 4 }],
  });

  // Title rows
  ws.mergeCells("A1:R1");
  const titleCell = ws.getCell("A1");
  titleCell.value = "MEDAX TIBBIY USKUNA VA REAKTIVLAR — OMBOR VA TOVAR QOLDIQLARI";
  titleCell.font = { name: "Segoe UI", size: 14, bold: true, color: { argb: "FF0F766E" } };
  titleCell.alignment = { vertical: "middle", horizontal: "left" };
  ws.getRow(1).height = 30;

  ws.mergeCells("A2:R2");
  const subCell = ws.getCell("A2");
  subCell.value = `Hisobot sanasi: ${new Date().toLocaleDateString("ru-RU")} ${new Date().toLocaleTimeString("ru-RU")} | Jami tovarlar: ${products.length} ta`;
  subCell.font = { name: "Segoe UI", size: 10, italic: true, color: { argb: "FF64748B" } };
  ws.getRow(2).height = 20;

  ws.getRow(3).height = 10;

  const colDefinitions = [
    { header: "№", key: "index", width: 6 },
    { header: "Artikul (SKU)", key: "sku", width: 15 },
    { header: "Mahsulot nomi", key: "name", width: 36 },
    { header: "Kategoriya", key: "category", width: 22 },
    { header: "Brend", key: "brand", width: 18 },
    { header: "Qoldiq", key: "stock", width: 12 },
    { header: "Birlik", key: "unit", width: 10 },
    { header: "Kirim narxi (so'm)", key: "costPrice", width: 18 },
    { header: "Ustama %", key: "markup", width: 12 },
    { header: "Sotuv narxi (so'm)", key: "sellPrice", width: 18 },
    { header: "Jami tannarx (so'm)", key: "totalCost", width: 20 },
    { header: "Jami sotuv qiymati (so'm)", key: "totalSell", width: 22 },
    { header: "Kutilayotgan foyda (so'm)", key: "profit", width: 22 },
    { header: "Partiya raqami", key: "batch", width: 16 },
    { header: "Yaroqlilik muddati", key: "expDate", width: 16 },
    { header: "Min qoldiq", key: "minStock", width: 12 },
    { header: "Holat", key: "status", width: 14 },
    { header: "Yetkazib beruvchi", key: "supplier", width: 22 },
  ];

  const headerRow = ws.getRow(4);
  headerRow.values = colDefinitions.map((c) => c.header);
  headerRow.height = 26;

  let totalStock = 0;
  let grandTotalCost = 0;
  let grandTotalSell = 0;
  let grandTotalProfit = 0;

  products.forEach((p, idx) => {
    const cost = Number(p.costPrice) || 0;
    const markup = Number(p.markupPercent) || 0;
    const sell = Number(p.priceFrom) || 0;
    const stock = p.stock || 0;
    const totalCost = stock * cost;
    const totalSell = stock * sell;
    const profit = Math.max(0, totalSell - totalCost);

    totalStock += stock;
    grandTotalCost += totalCost;
    grandTotalSell += totalSell;
    grandTotalProfit += profit;

    let status = "Yetarli";
    if (stock <= 0) status = "Tugagan";
    else if (stock <= (p.minStock ?? 5)) status = "Kam qolgan";

    const r = ws.addRow([
      idx + 1,
      p.sku || "—",
      p.name,
      p.category?.name || "—",
      p.brand?.name || "—",
      stock,
      p.unit || "dona",
      cost,
      markup ? `${markup}%` : "—",
      sell,
      totalCost,
      totalSell,
      profit,
      p.batchNumber || "—",
      p.expDate || "—",
      p.minStock ?? 5,
      status,
      p.supplier?.name || "—",
    ]);

    r.getCell(6).numFmt = "#,##0";
    r.getCell(8).numFmt = "#,##0";
    r.getCell(10).numFmt = "#,##0";
    r.getCell(11).numFmt = "#,##0";
    r.getCell(12).numFmt = "#,##0";
    r.getCell(13).numFmt = "#,##0";
  });

  const totalRow = ws.addRow([
    "JAMI:",
    "",
    "",
    "",
    "",
    totalStock,
    "",
    "",
    "",
    "",
    grandTotalCost,
    grandTotalSell,
    grandTotalProfit,
    "",
    "",
    "",
    "",
    "",
  ]);
  totalRow.getCell(6).numFmt = "#,##0";
  totalRow.getCell(11).numFmt = "#,##0";
  totalRow.getCell(12).numFmt = "#,##0";
  totalRow.getCell(13).numFmt = "#,##0";

  applyExcelTableStyles(ws, 4, "0D9488");

  colDefinitions.forEach((col, i) => {
    const c = ws.getColumn(i + 1);
    c.width = Math.max(c.width || 12, col.width);
  });

  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename="medax-ombor-qoldiqlari-${new Date().toISOString().slice(0, 10)}.xlsx"`);
  await wb.xlsx.write(res);
  res.end();
});

// 9.2: Tovar aylanmasi hisoboti (Товарная оборотка)
erpRouter.get("/export/turnover", async (req, res) => {
  const dateFrom = req.query.from ? new Date(String(req.query.from)) : new Date(Date.now() - 30 * 24 * 3600 * 1000);
  const dateTo = req.query.to ? new Date(String(req.query.to)) : new Date();

  const [products, docItems] = await Promise.all([
    prisma.product.findMany({
      select: {
        id: true,
        name: true,
        sku: true,
        unit: true,
        stock: true,
        costPrice: true,
        priceFrom: true,
      },
      orderBy: { name: "asc" },
    }),
    prisma.erpDocumentItem.findMany({
      where: {
        document: {
          date: { gte: dateFrom, lte: dateTo },
          status: "CONFIRMED",
        },
      },
      include: {
        document: { select: { type: true, date: true } },
      },
    }),
  ]);

  // Saytdagi buyurtmalar ham ombordan ayiriladi (admin tasdiqlaganda), ular ham chiqim sifatida sanaladi
  const orderItems = await prisma.orderItem.findMany({
    where: {
      productId: { not: null },
      order: { stockDeducted: true, createdAt: { gte: dateFrom, lte: dateTo } },
    },
    select: { productId: true, quantity: true, price: true },
  });

  const pStats = new Map<
    number,
    { incomeQty: number; incomeSum: number; outcomeQty: number; outcomeSum: number }
  >();

  for (const it of orderItems) {
    const pid = it.productId!;
    if (!pStats.has(pid)) pStats.set(pid, { incomeQty: 0, incomeSum: 0, outcomeQty: 0, outcomeSum: 0 });
    const st = pStats.get(pid)!;
    st.outcomeQty += it.quantity;
    st.outcomeSum += (Number(it.price) || 0) * it.quantity;
  }

  for (const it of docItems) {
    if (!pStats.has(it.productId)) {
      pStats.set(it.productId, { incomeQty: 0, incomeSum: 0, outcomeQty: 0, outcomeSum: 0 });
    }
    const st = pStats.get(it.productId)!;
    const type = it.document.type;
    const lineTotal = Number(it.totalPrice) || 0;

    if (type === "INCOME" || type === "RETURN_CUSTOMER") {
      st.incomeQty += it.quantity;
      st.incomeSum += lineTotal;
    } else if (type === "OUTCOME" || type === "RETURN_SUPPLIER" || type === "WRITE_OFF") {
      st.outcomeQty += it.quantity;
      st.outcomeSum += lineTotal;
    }
  }

  const wb = new ExcelJS.Workbook();
  wb.creator = "MEDAX ERP";
  const ws = wb.addWorksheet("Oborotka", { views: [{ state: "frozen", ySplit: 4 }] });

  ws.mergeCells("A1:K1");
  const titleCell = ws.getCell("A1");
  titleCell.value = "MEDAX — TOVAR AYLANMASI VA QOLDIQLAR HISOBOTI (ТОВАРНАЯ ОБОРОТКА)";
  titleCell.font = { name: "Segoe UI", size: 13, bold: true, color: { argb: "FF0F766E" } };
  titleCell.alignment = { vertical: "middle", horizontal: "left" };
  ws.getRow(1).height = 28;

  ws.mergeCells("A2:K2");
  const subCell = ws.getCell("A2");
  subCell.value = `Davr: ${dateFrom.toISOString().slice(0, 10)} dan ${dateTo.toISOString().slice(0, 10)} gacha`;
  subCell.font = { name: "Segoe UI", size: 10, italic: true, color: { argb: "FF64748B" } };
  ws.getRow(2).height = 20;

  ws.getRow(3).height = 10;

  const cols = [
    { header: "№", width: 6 },
    { header: "Artikul", width: 14 },
    { header: "Mahsulot nomi", width: 36 },
    { header: "Birlik", width: 10 },
    { header: "Boshlang'ich qoldiq", width: 18 },
    { header: "Kirim (dona)", width: 14 },
    { header: "Kirim summasi (so'm)", width: 20 },
    { header: "Chiqim (dona)", width: 14 },
    { header: "Chiqim summasi (so'm)", width: 20 },
    { header: "Yakuniy qoldiq", width: 16 },
    { header: "Yakuniy summa (so'm)", width: 22 },
  ];

  const headerRow = ws.getRow(4);
  headerRow.values = cols.map((c) => c.header);
  headerRow.height = 26;

  let totIncomeQty = 0;
  let totIncomeSum = 0;
  let totOutcomeQty = 0;
  let totOutcomeSum = 0;
  let totClosingQty = 0;
  let totClosingSum = 0;

  products.forEach((p, idx) => {
    const st = pStats.get(p.id) || { incomeQty: 0, incomeSum: 0, outcomeQty: 0, outcomeSum: 0 };
    const currentStock = p.stock || 0;
    const openingStock = Math.max(0, currentStock - st.incomeQty + st.outcomeQty);
    const cost = Number(p.costPrice) || 0;
    const closingVal = currentStock * cost;

    totIncomeQty += st.incomeQty;
    totIncomeSum += st.incomeSum;
    totOutcomeQty += st.outcomeQty;
    totOutcomeSum += st.outcomeSum;
    totClosingQty += currentStock;
    totClosingSum += closingVal;

    const r = ws.addRow([
      idx + 1,
      p.sku || "—",
      p.name,
      p.unit || "dona",
      openingStock,
      st.incomeQty,
      st.incomeSum,
      st.outcomeQty,
      st.outcomeSum,
      currentStock,
      closingVal,
    ]);

    r.getCell(5).numFmt = "#,##0";
    r.getCell(6).numFmt = "#,##0";
    r.getCell(7).numFmt = "#,##0";
    r.getCell(8).numFmt = "#,##0";
    r.getCell(9).numFmt = "#,##0";
    r.getCell(10).numFmt = "#,##0";
    r.getCell(11).numFmt = "#,##0";
  });

  const totalRow = ws.addRow([
    "JAMI:",
    "",
    "",
    "",
    "",
    totIncomeQty,
    totIncomeSum,
    totOutcomeQty,
    totOutcomeSum,
    totClosingQty,
    totClosingSum,
  ]);
  totalRow.getCell(6).numFmt = "#,##0";
  totalRow.getCell(7).numFmt = "#,##0";
  totalRow.getCell(8).numFmt = "#,##0";
  totalRow.getCell(9).numFmt = "#,##0";
  totalRow.getCell(10).numFmt = "#,##0";
  totalRow.getCell(11).numFmt = "#,##0";

  applyExcelTableStyles(ws, 4, "0D9488");

  cols.forEach((col, i) => {
    const c = ws.getColumn(i + 1);
    c.width = Math.max(c.width || 12, col.width);
  });

  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename="medax-tovar-oborotkasi-${dateTo.toISOString().slice(0, 10)}.xlsx"`);
  await wb.xlsx.write(res);
  res.end();
});

// 9.3: Mijozlar uchun rasmiy Prays-list
erpRouter.get("/export/price-list", async (_req, res) => {
  const products = await prisma.product.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    include: {
      category: { select: { name: true } },
      brand: { select: { name: true } },
    },
  });

  const wb = new ExcelJS.Workbook();
  wb.creator = "MEDAX";
  const ws = wb.addWorksheet("Prays-list", { views: [{ state: "frozen", ySplit: 5 }] });

  const company = await getCompany();
  ws.mergeCells("A1:H1");
  const titleCell = ws.getCell("A1");
  titleCell.value = `${company.name} — TIBBIY ASBOBLAR VA REAKTIVLAR RASMIY PRAYS-LISTI`;
  titleCell.font = { name: "Segoe UI", size: 14, bold: true, color: { argb: "FF0F766E" } };
  titleCell.alignment = { vertical: "middle", horizontal: "left" };
  ws.getRow(1).height = 28;

  ws.mergeCells("A2:H2");
  const subCell = ws.getCell("A2");
  subCell.value = `Sana: ${new Date().toLocaleDateString("ru-RU")} | Aloqa: ${company.phone || "—"} | Veb-sayt: ${company.website || "medax.uz"}`;
  subCell.font = { name: "Segoe UI", size: 10, italic: true, color: { argb: "FF475569" } };
  ws.getRow(2).height = 20;

  ws.mergeCells("A3:H3");
  const noteCell = ws.getCell("A3");
  noteCell.value = "Barcha narxlar milliy valyutada (so'm) ko'rsatilgan. To'lov turi: Naqd / Pul o'tkazish / Korporativ karta.";
  noteCell.font = { name: "Segoe UI", size: 9, color: { argb: "FF64748B" } };
  ws.getRow(3).height = 18;

  ws.getRow(4).height = 8;

  const cols = [
    { header: "№", width: 6 },
    { header: "Artikul", width: 14 },
    { header: "Mahsulot nomi", width: 38 },
    { header: "Kategoriya", width: 22 },
    { header: "Ishlab chiqaruvchi / Brend", width: 22 },
    { header: "Davlat", width: 14 },
    { header: "O'lchov birligi", width: 12 },
    { header: "Chakana sotuv narxi (so'm)", width: 24 },
  ];

  const headerRow = ws.getRow(5);
  headerRow.values = cols.map((c) => c.header);
  headerRow.height = 26;

  products.forEach((p, idx) => {
    const sell = Number(p.priceFrom) || 0;
    const r = ws.addRow([
      idx + 1,
      p.sku || "—",
      p.name,
      p.category?.name || "—",
      p.brand?.name || "—",
      p.country || "—",
      p.unit || "dona",
      sell,
    ]);
    r.getCell(8).numFmt = "#,##0";
  });

  applyExcelTableStyles(ws, 5, "0D9488");

  cols.forEach((col, i) => {
    const c = ws.getColumn(i + 1);
    c.width = Math.max(c.width || 12, col.width);
  });

  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename="medax-prays-list-${new Date().toISOString().slice(0, 10)}.xlsx"`);
  await wb.xlsx.write(res);
  res.end();
});

// 9.4: Kassa kitobi (Кассовая книга)
erpRouter.get("/export/cash", async (_req, res) => {
  const entries = await prisma.cashEntry.findMany({
    orderBy: { date: "desc" },
    include: {
      customer: { select: { name: true } },
      supplier: { select: { name: true } },
      document: { select: { docNumber: true } },
    },
  });

  const wb = new ExcelJS.Workbook();
  wb.creator = "MEDAX ERP";
  const ws = wb.addWorksheet("Kassa kitobi", { views: [{ state: "frozen", ySplit: 4 }] });

  ws.mergeCells("A1:I1");
  const titleCell = ws.getCell("A1");
  titleCell.value = "MEDAX — KASSA VA MOLIYAVIY HARAKATLAR KITOBI (ПКО / РКО)";
  titleCell.font = { name: "Segoe UI", size: 13, bold: true, color: { argb: "FF0F766E" } };
  titleCell.alignment = { vertical: "middle", horizontal: "left" };
  ws.getRow(1).height = 28;

  ws.mergeCells("A2:I2");
  const subCell = ws.getCell("A2");
  subCell.value = `Sana: ${new Date().toLocaleDateString("ru-RU")} | Jami operatsiyalar: ${entries.length} ta`;
  subCell.font = { name: "Segoe UI", size: 10, italic: true, color: { argb: "FF64748B" } };
  ws.getRow(2).height = 20;

  ws.getRow(3).height = 10;

  const cols = [
    { header: "№", width: 6 },
    { header: "Kassa order №", width: 16 },
    { header: "Sana", width: 18 },
    { header: "Operatsiya turi", width: 16 },
    { header: "To'lov shakli", width: 14 },
    { header: "Summa (so'm)", width: 20 },
    { header: "Kontragent", width: 24 },
    { header: "Kategoriya / Modda", width: 20 },
    { header: "Tavsif / Asos", width: 30 },
  ];

  const headerRow = ws.getRow(4);
  headerRow.values = cols.map((c) => c.header);
  headerRow.height = 26;

  let totalIncome = 0;
  let totalExpense = 0;

  entries.forEach((e, idx) => {
    const amt = Number(e.amount);
    if (e.type === "INCOME") totalIncome += amt;
    else totalExpense += amt;

    const opLabel = e.type === "INCOME" ? "Kirim (ПКО)" : "Chiqim (РКО)";
    const payLabel = e.paymentType === "CASH" ? "Naqd pul" : e.paymentType === "CARD" ? "Karta" : "Bank o'tkazmasi";
    const party = e.customer?.name || e.supplier?.name || "—";

    const r = ws.addRow([
      idx + 1,
      e.entryNumber,
      e.date.toISOString().replace("T", " ").slice(0, 16),
      opLabel,
      payLabel,
      amt,
      party,
      e.category,
      e.description || "—",
    ]);

    r.getCell(6).numFmt = "#,##0";
  });

  const totalRow = ws.addRow([
    "JAMI KIRIM:",
    "",
    "",
    "",
    "",
    totalIncome,
    "",
    "",
    "",
  ]);
  totalRow.getCell(6).numFmt = "#,##0";

  const totalExpenseRow = ws.addRow([
    "JAMI CHIQIM:",
    "",
    "",
    "",
    "",
    totalExpense,
    "",
    "",
    "",
  ]);
  totalExpenseRow.getCell(6).numFmt = "#,##0";

  const balanceRow = ws.addRow([
    "KASSA BALANSI:",
    "",
    "",
    "",
    "",
    totalIncome - totalExpense,
    "",
    "",
    "",
  ]);
  balanceRow.getCell(6).numFmt = "#,##0";

  applyExcelTableStyles(ws, 4, "0D9488");

  cols.forEach((col, i) => {
    const c = ws.getColumn(i + 1);
    c.width = Math.max(c.width || 12, col.width);
  });

  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename="medax-kassa-kitobi-${new Date().toISOString().slice(0, 10)}.xlsx"`);
  await wb.xlsx.write(res);
  res.end();
});

// 9.5: Akt sverka eksporti (Акт сверки взаиморасчетов в Excel)
erpRouter.get("/export/act-sverka", async (req, res) => {
  const type = req.query.type === "customer" ? "customer" : "supplier";
  const entityId = Number(req.query.id);
  const dateFrom = dateParam(req.query.from) || new Date(Date.now() - 60 * 24 * 3600 * 1000);
  const dateTo = dateParam(req.query.to, true) || new Date();

  if (!entityId) {
    throw new HttpError(400, "Kontragent ID kiritilmadi");
  }

  const sv = await buildSverka(type, entityId, dateFrom, dateTo);
  const entityName = sv.entity.name + (sv.entity.company ? ` (${sv.entity.company})` : "");
  const entityInn = sv.entity.inn || "—";
  const currentBalance = sv.entity.balance;
  const timeline = sv.timeline.map((l) => ({ ...l, date: l.date.slice(0, 10) }));

  const wb = new ExcelJS.Workbook();
  wb.creator = "MEDAX ERP";
  const ws = wb.addWorksheet("Akt Sverka", { views: [{ state: "frozen", ySplit: 5 }] });

  ws.mergeCells("A1:F1");
  const titleCell = ws.getCell("A1");
  titleCell.value = "AKT SVERKI VZAIMORASCHETOV / O'ZARO HISOB-KITOBLAR SVERKASI";
  titleCell.font = { name: "Segoe UI", size: 13, bold: true, color: { argb: "FF0F766E" } };
  titleCell.alignment = { vertical: "middle", horizontal: "left" };
  ws.getRow(1).height = 28;

  ws.mergeCells("A2:F2");
  const subCell = ws.getCell("A2");
  subCell.value = `Kontragent: ${entityName} | INN: ${entityInn} | Davr: ${dateFrom.toISOString().slice(0, 10)} dan ${dateTo.toISOString().slice(0, 10)} gacha`;
  subCell.font = { name: "Segoe UI", size: 10, italic: true, color: { argb: "FF475569" } };
  ws.getRow(2).height = 20;

  ws.mergeCells("A3:F3");
  const balCell = ws.getCell("A3");
  balCell.value = `Joriy qarz balansi: ${currentBalance.toLocaleString("ru-RU")} so'm (${currentBalance > 0 ? "Mijoz qarzdor / Bizga to'lashi kerak" : currentBalance < 0 ? "Biz qarzdormiz" : "Qarzdorlik yo'q"})`;
  balCell.font = { name: "Segoe UI", size: 10, bold: true, color: { argb: currentBalance > 0 ? "FFDC2626" : "FF059669" } };
  ws.getRow(3).height = 20;

  ws.getRow(4).height = 8;

  const cols = [
    { header: "№", width: 6 },
    { header: "Sana", width: 14 },
    { header: "Hujjat №", width: 18 },
    { header: "Operatsiya / Tavsif", width: 34 },
    { header: "Debet (so'm)", width: 20 },
    { header: "Kredit (so'm)", width: 20 },
  ];

  const headerRow = ws.getRow(5);
  headerRow.values = cols.map((c) => c.header);
  headerRow.height = 26;

  let totalDebit = 0;
  let totalCredit = 0;
  // Saldo ustuni: mijoz qarzi debetda, bizning ta'minotchiga qarzimiz kreditda
  const saldoCells = (v: number): [number | string, number | string] =>
    type === "customer" ? (v >= 0 ? [v, ""] : ["", -v]) : v >= 0 ? ["", v] : [-v, ""];
  const openRow = ws.addRow(["JAMI SALDO (davr boshiga):", dateFrom.toISOString().slice(0, 10), "", "Boshlang'ich saldo", ...saldoCells(sv.opening)]);
  openRow.getCell(5).numFmt = "#,##0";
  openRow.getCell(6).numFmt = "#,##0";

  timeline.forEach((item, idx) => {
    totalDebit += item.debit;
    totalCredit += item.credit;

    const r = ws.addRow([
      idx + 1,
      item.date,
      item.docNumber,
      item.description,
      item.debit,
      item.credit,
    ]);

    r.getCell(5).numFmt = "#,##0";
    r.getCell(6).numFmt = "#,##0";
  });

  const totalRow = ws.addRow([
    "JAMI AYLANMA:",
    "",
    "",
    "",
    totalDebit,
    totalCredit,
  ]);
  totalRow.getCell(5).numFmt = "#,##0";
  totalRow.getCell(6).numFmt = "#,##0";
  const closeRow = ws.addRow(["JAMI SALDO (davr oxiriga):", dateTo.toISOString().slice(0, 10), "", "Yakuniy saldo", ...saldoCells(sv.closing)]);
  closeRow.getCell(5).numFmt = "#,##0";
  closeRow.getCell(6).numFmt = "#,##0";

  applyExcelTableStyles(ws, 5, "0D9488");

  cols.forEach((col, i) => {
    const c = ws.getColumn(i + 1);
    c.width = Math.max(c.width || 12, col.width);
  });

  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename="medax-akt-sverka-${dateTo.toISOString().slice(0, 10)}.xlsx"`);
  await wb.xlsx.write(res);
  res.end();
});


/* -------------------------------------------------------------------------- */
/* 9.6: Bitta hujjatning nakladnoyi Excel'da (Накладная)                      */
/* -------------------------------------------------------------------------- */
const DOC_TITLES: Record<string, string> = {
  INCOME: "TOVAR KIRIMI (ПРИХОДНАЯ НАКЛАДНАЯ)",
  OUTCOME: "YUK XATI (РАСХОДНАЯ НАКЛАДНАЯ)",
  TRANSFER: "OMBORLARARO KO'CHIRISH",
  RETURN_CUSTOMER: "MIJOZDAN QAYTARISH DALOLATNOMASI",
  RETURN_SUPPLIER: "TA'MINOTCHIGA QAYTARISH",
  WRITE_OFF: "HISOBDAN CHIQARISH (СПИСАНИЕ)",
};

erpRouter.get("/export/document/:id", async (req, res) => {
  const docId = Number(req.params.id);
  if (!Number.isInteger(docId) || docId <= 0) throw new HttpError(400, "ID noto'g'ri");
  const doc = await prisma.erpDocument.findUnique({
    where: { id: docId },
    include: { supplier: true, customer: true, warehouse: true, items: { include: { product: { select: { sku: true, unit: true, mxikCode: true } } } } },
  });
  if (!doc) throw new HttpError(404, "Hujjat topilmadi");
  const company = await getCompany();
  const costBasis = doc.type === "INCOME" || doc.type === "RETURN_SUPPLIER" || doc.type === "WRITE_OFF";
  const blank = (v: string) => v || "________________";

  const ourSide = [
    company.name,
    company.address,
    company.phone ? `Tel: ${company.phone}` : "",
    `STIR: ${blank(company.inn)}${company.oked ? `, OKED: ${company.oked}` : ""}`,
    `H/r: ${blank(company.account)}`,
    `Bank: ${blank(company.bankName)}, MFO: ${blank(company.mfo)}`,
  ].filter(Boolean).join("\n");
  const otherName =
    doc.type === "INCOME" || doc.type === "RETURN_SUPPLIER"
      ? [doc.supplier?.name, doc.supplier?.company].filter(Boolean).join(" / ") || "Ta'minotchi"
      : doc.customer?.organization || doc.customer?.name || doc.clientName || "Xaridor";
  const otherInn = doc.supplier?.inn || doc.customer?.inn || "";
  const otherPhone = doc.supplier?.phone || doc.customer?.phone || "";
  const otherAddr = doc.supplier?.address || "";
  const otherSide = [otherName, otherAddr, otherInn ? `STIR: ${otherInn}` : "", otherPhone ? `Tel: ${otherPhone}` : ""].filter(Boolean).join("\n");
  // Kirim va mijoz qaytimida tovar bizga keladi: jo'natuvchi — kontragent
  const weSend = !(doc.type === "INCOME" || doc.type === "RETURN_CUSTOMER");

  const wb = new ExcelJS.Workbook();
  wb.creator = "MEDAX ERP";
  const ws = wb.addWorksheet("Nakladnoy", {
    pageSetup: { paperSize: 9, orientation: "portrait", fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  });
  ws.columns = [{ width: 5 }, { width: 19 }, { width: 40 }, { width: 12 }, { width: 12 }, { width: 8 }, { width: 9 }, { width: 14 }, { width: 16 }];
  const bold = { name: "Arial", size: 10, bold: true };
  const normal = { name: "Arial", size: 10 };

  ws.mergeCells("A1:I1");
  ws.getCell("A1").value = `${DOC_TITLES[doc.type] || "HUJJAT"} № ${doc.docNumber}`;
  ws.getCell("A1").font = { name: "Arial", size: 14, bold: true };
  ws.getCell("A1").alignment = { horizontal: "center" };
  ws.mergeCells("A2:I2");
  ws.getCell("A2").value = `Sana: ${doc.date.toLocaleDateString("ru-RU")}${doc.status === "CANCELED" ? "   (BEKOR QILINGAN)" : ""}`;
  ws.getCell("A2").alignment = { horizontal: "center" };
  ws.getCell("A2").font = normal;

  ws.mergeCells("A4:D4");
  ws.getCell("A4").value = "Jo'natuvchi (Отправитель):";
  ws.getCell("A4").font = bold;
  ws.mergeCells("E4:I4");
  ws.getCell("E4").value = "Qabul qiluvchi (Получатель):";
  ws.getCell("E4").font = bold;
  ws.mergeCells("A5:D10");
  ws.getCell("A5").value = weSend ? ourSide : otherSide;
  ws.mergeCells("E5:I10");
  ws.getCell("E5").value = weSend ? otherSide : ourSide;
  for (const c of ["A5", "E5"]) {
    ws.getCell(c).alignment = { wrapText: true, vertical: "top" };
    ws.getCell(c).font = normal;
  }

  const head = ws.getRow(12);
  head.values = ["№", "MXIK kodi", "Mahsulot nomi", "Partiya", "Muddat", "Birlik", "Miqdor", "Narx (so'm)", "Summa (so'm)"];
  head.font = bold;
  head.height = 22;
  head.eachCell((c) => {
    c.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE2E8F0" } };
  });

  let total = 0;
  doc.items.forEach((it, idx) => {
    const price = costBasis ? Number(it.costPrice) || Number(it.sellPrice) || 0 : Number(it.sellPrice) || Number(it.costPrice) || 0;
    const sum = Number(it.totalPrice) || price * it.quantity;
    total += sum;
    const r = ws.addRow([idx + 1, it.product?.mxikCode || "", it.productName, it.batchNumber || "", it.expDate || "", it.product?.unit || "dona", it.quantity, price, sum]);
    r.font = normal;
    r.getCell(2).numFmt = "@";
    r.getCell(3).alignment = { wrapText: true, vertical: "middle" };
    r.getCell(8).numFmt = "#,##0";
    r.getCell(9).numFmt = "#,##0";
  });
  const totalRow = ws.addRow(["", "", "JAMI:", "", "", "", doc.items.reduce((s, i) => s + i.quantity, 0), "", total]);
  totalRow.font = bold;
  totalRow.getCell(9).numFmt = "#,##0";

  for (let r = 12; r <= ws.rowCount; r++) {
    for (let c = 1; c <= 9; c++) {
      ws.getRow(r).getCell(c).border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
    }
  }

  ws.addRow([]);
  if (doc.type === "INCOME" || doc.type === "OUTCOME") {
    const paid = Number(doc.paidAmount) || 0;
    ws.addRow(["", "", `To'langan: ${paid.toLocaleString("ru-RU")} so'm,  qoldiq qarz: ${(total - paid).toLocaleString("ru-RU")} so'm`]).font = normal;
  }
  if (doc.notes) ws.addRow(["", "", `Izoh: ${doc.notes}`]).font = normal;
  ws.addRow([]);
  ws.addRow(["", "", `Topshirdi: ____________________ ${weSend ? company.director : ""}`, "", "", "Qabul qildi: ____________________"]).font = normal;
  ws.addRow(["", "", "M.O'.", "", "", "M.O'."]).font = normal;
  if (company.accountant) ws.addRow(["", "", `Bosh hisobchi: ${company.accountant}`]).font = normal;

  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename="nakladnoy-${doc.docNumber}.xlsx"`);
  await wb.xlsx.write(res);
  res.end();
});
