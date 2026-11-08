import { Router } from "express";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../db";
import { HttpError } from "../errors";

export const erpRouter = Router();

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */
function generateDocCode(prefix: string): string {
  const year = new Date().getFullYear();
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${year}-${rand}`;
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
      stock: z.number().int().nullish(),
      minStock: z.number().int().nullish(),
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

  const updated = await prisma.product.update({
    where: { id: body.id },
    data: {
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
  const docNumber = generateDocCode(prefixMap[body.type] || "DOC");

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

    // If INCOME, price basis is cost; if OUTCOME, price basis is sell
    const unitPrice = body.type === "INCOME" ? (cost || sell) : (sell || cost);
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

  // Execute in Prisma Transaction for absolute consistency
  const result = await prisma.$transaction(async (tx) => {
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
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stock: { increment: item.quantity },
            costPrice: item.costPrice ? item.costPrice : undefined,
            markupPercent: item.markup ? item.markup : undefined,
            priceFrom: item.sellPrice ? item.sellPrice : undefined,
            batchNumber: item.batchNumber || undefined,
            expDate: item.expDate || undefined,
            supplierId: body.supplierId || undefined,
            warehouseId: whId,
          },
        });
      } else if (body.type === "OUTCOME" || body.type === "WRITE_OFF") {
        // Decrease stock
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stock: { decrement: item.quantity },
          },
        });
      } else if (body.type === "RETURN_CUSTOMER") {
        // Customer returned item -> return to stock
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stock: { increment: item.quantity },
          },
        });
      } else if (body.type === "RETURN_SUPPLIER") {
        // Return to supplier -> decrement stock
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stock: { decrement: item.quantity },
          },
        });
      }
    }

    // 3. Cash & Debt settlement
    if (body.type === "INCOME") {
      // Payment to supplier
      if (body.paidAmount > 0) {
        await tx.cashEntry.create({
          data: {
            entryNumber: generateDocCode("KAS"),
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
            entryNumber: generateDocCode("KAS"),
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
  });

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

  const entryNumber = generateDocCode("KAS");

  const entry = await prisma.$transaction(async (tx) => {
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
  });

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

  const pStats = new Map<
    number,
    { incomeQty: number; incomeSum: number; outcomeQty: number; outcomeSum: number }
  >();

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
