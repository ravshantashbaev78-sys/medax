import { Router } from "express";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import ExcelJS from "exceljs";
import { prisma } from "../db";
import { HttpError } from "../errors";

export const erpRouter = Router();

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

  const now = new Date();
  const in90Days = new Date();
  in90Days.setDate(in90Days.getDate() + 90);

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

    if (p.expDate) {
      // Parse expDate if possible: e.g. "2026-12", "12.2026", "2026-12-31"
      try {
        const parts = p.expDate.trim().split(/[-.]/);
        let expD: Date | null = null;
        if (parts.length === 3) {
          expD = parts[0].length === 4 ? new Date(p.expDate) : new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
        } else if (parts.length === 2) {
          expD = parts[0].length === 4 ? new Date(`${parts[0]}-${parts[1]}-28`) : new Date(`${parts[1]}-${parts[0]}-28`);
        }
        if (expD && !isNaN(expD.getTime()) && expD <= in90Days) {
          expingCount: expiringCount++;
        }
      } catch {}
    }
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
  const limit = Math.min(Number(req.query.limit) || 100, 500);
  const page = Math.max(Number(req.query.page) || 1, 1);

  const where: Prisma.ProductWhereInput = {};
  if (categoryId) where.categoryId = categoryId;
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { sku: { contains: search, mode: "insensitive" } },
      { batchNumber: { contains: search, mode: "insensitive" } },
    ];
  }

  if (status === "low") {
    where.stock = { lte: 5 };
  } else if (status === "out") {
    where.stock = 0;
  }

  const [items, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: [{ stock: "asc" }, { updatedAt: "desc" }],
      skip: (page - 1) * limit,
      take: limit,
      include: {
        category: { select: { id: true, name: true } },
        brand: { select: { id: true, name: true } },
        supplier: { select: { id: true, name: true } },
        warehouse: { select: { id: true, name: true } },
      },
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
      stock: z.number().int().min(0, "Qoldiq manfiy bo'lishi mumkin emas").nullish(),
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

  // Qoldiq qo'lda o'zgartirilsa: 0 -> yashirish, 0 dan oshsa (avtomatik yashirilgan bo'lsa) -> qayta ko'rsatish
  let activeChange: { isActive: boolean } | {} = {};
  if (body.stock !== undefined && body.stock !== null) {
    const before = await prisma.product.findUnique({ where: { id: body.id }, select: { stock: true, isActive: true } });
    if (body.stock === 0) activeChange = { isActive: false };
    else if (before && before.stock <= 0 && !before.isActive) activeChange = { isActive: true };
  }

  const updated = await prisma.product.update({
    where: { id: body.id },
    data: {
      ...activeChange,
      costPrice: body.costPrice !== undefined ? body.costPrice : undefined,
      markupPercent: body.markupPercent !== undefined ? body.markupPercent : undefined,
      priceFrom: sellPrice !== undefined ? sellPrice : undefined,
      stock: body.stock !== undefined && body.stock !== null ? body.stock : undefined,
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

  res.json({ ok: true, product: updated });
});

/* -------------------------------------------------------------------------- */
/* 3. Alerts: Low Stock & Expiring Products                                   */
/* -------------------------------------------------------------------------- */
erpRouter.get("/alerts", async (_req, res) => {
  const [lowStock, allProducts] = await Promise.all([
    prisma.product.findMany({
      where: {
        stock: { lte: 5 },
      },
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

  const in90Days = new Date();
  in90Days.setDate(in90Days.getDate() + 90);

  const expiring = allProducts.filter((p) => {
    if (!p.expDate) return false;
    try {
      const parts = p.expDate.trim().split(/[-.]/);
      let expD: Date | null = null;
      if (parts.length === 3) {
        expD = parts[0].length === 4 ? new Date(p.expDate) : new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
      } else if (parts.length === 2) {
        expD = parts[0].length === 4 ? new Date(`${parts[0]}-${parts[1]}-28`) : new Date(`${parts[1]}-${parts[0]}-28`);
      }
      return expD && !isNaN(expD.getTime()) && expD <= in90Days;
    } catch {
      return false;
    }
  });

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

  const where: Prisma.ErpDocumentWhereInput = {};
  if (type && type !== "ALL") {
    where.type = type as any;
  }
  if (search) {
    where.OR = [
      { docNumber: { contains: search, mode: "insensitive" } },
      { clientName: { contains: search, mode: "insensitive" } },
      { notes: { contains: search, mode: "insensitive" } },
      { supplier: { name: { contains: search, mode: "insensitive" } } },
    ];
  }

  const docs = await prisma.erpDocument.findMany({
    where,
    orderBy: { date: "desc" },
    take: 100,
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
  });

  res.json({ docs });
});

erpRouter.get("/documents/:id", async (req, res) => {
  const docId = Number(req.params.id);
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
  date: z.string().nullish(),
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
    }

    return doc;
  }));

  res.status(201).json({ ok: true, document: result });
});

/* -------------------------------------------------------------------------- */
/* 5. Cash Desk / Kassa                                                       */
/* -------------------------------------------------------------------------- */
erpRouter.get("/cash", async (req, res) => {
  const entries = await prisma.cashEntry.findMany({
    orderBy: { date: "desc" },
    take: 100,
    include: {
      customer: { select: { id: true, name: true, phone: true } },
      supplier: { select: { id: true, name: true } },
      document: { select: { id: true, docNumber: true } },
    },
  });

  const totals = await prisma.cashEntry.groupBy({
    by: ["type"],
    _sum: { amount: true },
  });

  let totalIncome = 0;
  let totalExpense = 0;
  for (const t of totals) {
    if (t.type === "INCOME") totalIncome = Number(t._sum.amount) || 0;
    if (t.type === "EXPENSE") totalExpense = Number(t._sum.amount) || 0;
  }

  res.json({
    entries,
    totalIncome,
    totalExpense,
    balance: totalIncome - totalExpense,
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
      },
    });

    // If client paid -> reduce client's debt
    if (body.type === "INCOME" && body.customerId) {
      await tx.customer.update({
        where: { id: body.customerId },
        data: { balance: { decrement: body.amount } },
      });
    }

    // If paid to supplier -> reduce supplier's balance (we owe less)
    if (body.type === "EXPENSE" && body.supplierId) {
      await tx.supplier.update({
        where: { id: body.supplierId },
        data: { balance: { decrement: body.amount } },
      });
    }

    return created;
  }));

  res.status(201).json({ ok: true, entry });
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
erpRouter.get("/reports/act-sverka", async (req, res) => {
  const entityType = String(req.query.type || "customer"); // "customer" or "supplier"
  const entityId = Number(req.query.id);
  if (!entityId) throw new HttpError(400, "Kontragent tanlanmagan");

  const dateFrom = req.query.from ? new Date(String(req.query.from)) : new Date(Date.now() - 60 * 24 * 3600 * 1000);
  const dateTo = req.query.to ? new Date(String(req.query.to)) : new Date();

  if (entityType === "supplier") {
    const supplier = await prisma.supplier.findUnique({ where: { id: entityId } });
    if (!supplier) throw new HttpError(404, "Yetkazib beruvchi topilmadi");

    const [docs, cash] = await Promise.all([
      prisma.erpDocument.findMany({
        where: {
          supplierId: entityId,
          date: { gte: dateFrom, lte: dateTo },
        },
        orderBy: { date: "asc" },
      }),
      prisma.cashEntry.findMany({
        where: {
          supplierId: entityId,
          date: { gte: dateFrom, lte: dateTo },
        },
        orderBy: { date: "asc" },
      }),
    ]);

    // Build timeline
    const timeline: {
      date: string;
      docNumber: string;
      description: string;
      debit: number; // to'lovlarimiz (we paid)
      credit: number; // yetkazilgan tovarlar (they delivered)
    }[] = [];

    docs.forEach((d) => {
      timeline.push({
        date: d.date.toISOString(),
        docNumber: d.docNumber,
        description: `Tovar kirimi #${d.docNumber}`,
        debit: 0,
        credit: Number(d.totalAmount),
      });
    });

    cash.forEach((c) => {
      timeline.push({
        date: c.date.toISOString(),
        docNumber: c.entryNumber,
        description: c.description || "Ta'minotchiga to'lov",
        debit: Number(c.amount),
        credit: 0,
      });
    });

    timeline.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    res.json({
      entity: {
        type: "supplier",
        id: supplier.id,
        name: supplier.name,
        company: supplier.company,
        phone: supplier.phone,
        inn: supplier.inn,
        balance: Number(supplier.balance),
      },
      dateFrom: dateFrom.toISOString(),
      dateTo: dateTo.toISOString(),
      timeline,
    });
  } else {
    const customer = await prisma.customer.findUnique({ where: { id: entityId } });
    if (!customer) throw new HttpError(404, "Mijoz topilmadi");

    const [docs, cash, orders] = await Promise.all([
      prisma.erpDocument.findMany({
        where: {
          customerId: entityId,
          date: { gte: dateFrom, lte: dateTo },
        },
        orderBy: { date: "asc" },
      }),
      prisma.cashEntry.findMany({
        where: {
          customerId: entityId,
          date: { gte: dateFrom, lte: dateTo },
        },
        orderBy: { date: "asc" },
      }),
      prisma.order.findMany({
        where: {
          customerId: entityId,
          createdAt: { gte: dateFrom, lte: dateTo },
          status: { in: ["CONFIRMED", "READY", "DONE"] },
        },
      }),
    ]);

    const timeline: {
      date: string;
      docNumber: string;
      description: string;
      debit: number; // tovar sotildi (client debt increased)
      credit: number; // to'lov tushdi (client paid)
    }[] = [];

    docs.forEach((d) => {
      timeline.push({
        date: d.date.toISOString(),
        docNumber: d.docNumber,
        description: `Tovar sotuvi #${d.docNumber}`,
        debit: Number(d.totalAmount),
        credit: 0,
      });
    });

    orders.forEach((o) => {
      timeline.push({
        date: o.createdAt.toISOString(),
        docNumber: `#${o.code}`,
        description: `Sayt buyurtmasi #${o.code}`,
        debit: Number(o.totalAmount || 0),
        credit: o.isPaid ? Number(o.totalAmount || 0) : 0,
      });
    });

    cash.forEach((c) => {
      timeline.push({
        date: c.date.toISOString(),
        docNumber: c.entryNumber,
        description: c.description || "Mijozdan to'lov qabul qilindi",
        debit: 0,
        credit: Number(c.amount),
      });
    });

    timeline.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    res.json({
      entity: {
        type: "customer",
        id: customer.id,
        name: customer.name,
        organization: customer.organization,
        phone: customer.phone,
        inn: customer.inn,
        balance: Number(customer.balance),
      },
      dateFrom: dateFrom.toISOString(),
      dateTo: dateTo.toISOString(),
      timeline,
    });
  }
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

  ws.mergeCells("A1:H1");
  const titleCell = ws.getCell("A1");
  titleCell.value = "MEDAX MCHJ — TIBBIY ASBOBLAR VA REAKTIVLAR RASMIY PRAYS-LISTI";
  titleCell.font = { name: "Segoe UI", size: 14, bold: true, color: { argb: "FF0F766E" } };
  titleCell.alignment = { vertical: "middle", horizontal: "left" };
  ws.getRow(1).height = 28;

  ws.mergeCells("A2:H2");
  const subCell = ws.getCell("A2");
  subCell.value = `Sana: ${new Date().toLocaleDateString("ru-RU")} | Aloqa: +998 (71) 200-00-00, +998 (90) 123-45-67 | Veb-sayt: medax.uz`;
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
  const dateFrom = req.query.from ? new Date(String(req.query.from)) : new Date(Date.now() - 90 * 24 * 3600 * 1000);
  const dateTo = req.query.to ? new Date(String(req.query.to)) : new Date();

  if (!entityId) {
    throw new HttpError(400, "Kontragent ID kiritilmadi");
  }

  let entityName = "";
  let entityInn = "";
  let currentBalance = 0;

  const timeline: {
    date: string;
    docNumber: string;
    description: string;
    debit: number;
    credit: number;
  }[] = [];

  if (type === "supplier") {
    const sup = await prisma.supplier.findUnique({ where: { id: entityId } });
    if (!sup) throw new HttpError(404, "Yetkazib beruvchi topilmadi");
    entityName = sup.name + (sup.company ? ` (${sup.company})` : "");
    entityInn = sup.inn || "—";
    currentBalance = Number(sup.balance);

    const [docs, cash] = await Promise.all([
      prisma.erpDocument.findMany({
        where: { supplierId: entityId, date: { gte: dateFrom, lte: dateTo } },
        orderBy: { date: "asc" },
      }),
      prisma.cashEntry.findMany({
        where: { supplierId: entityId, date: { gte: dateFrom, lte: dateTo } },
        orderBy: { date: "asc" },
      }),
    ]);

    docs.forEach((d) => {
      timeline.push({
        date: d.date.toISOString().slice(0, 10),
        docNumber: d.docNumber,
        description: `Tovar kirimi #${d.docNumber}`,
        debit: 0,
        credit: Number(d.totalAmount),
      });
    });

    cash.forEach((c) => {
      timeline.push({
        date: c.date.toISOString().slice(0, 10),
        docNumber: c.entryNumber,
        description: c.description || "Yetkazib beruvchiga to'lov",
        debit: Number(c.amount),
        credit: 0,
      });
    });
  } else {
    const cust = await prisma.customer.findUnique({ where: { id: entityId } });
    if (!cust) throw new HttpError(404, "Mijoz topilmadi");
    entityName = cust.name + (cust.organization ? ` (${cust.organization})` : "");
    entityInn = cust.inn || "—";
    currentBalance = Number(cust.balance);

    const [docs, cash] = await Promise.all([
      prisma.erpDocument.findMany({
        where: { customerId: entityId, date: { gte: dateFrom, lte: dateTo } },
        orderBy: { date: "asc" },
      }),
      prisma.cashEntry.findMany({
        where: { customerId: entityId, date: { gte: dateFrom, lte: dateTo } },
        orderBy: { date: "asc" },
      }),
    ]);

    docs.forEach((d) => {
      timeline.push({
        date: d.date.toISOString().slice(0, 10),
        docNumber: d.docNumber,
        description: `Tovar sotuvi #${d.docNumber}`,
        debit: Number(d.totalAmount),
        credit: 0,
      });
    });

    cash.forEach((c) => {
      timeline.push({
        date: c.date.toISOString().slice(0, 10),
        docNumber: c.entryNumber,
        description: c.description || "Mijozdan to'lov",
        debit: 0,
        credit: Number(c.amount),
      });
    });
  }

  timeline.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

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

