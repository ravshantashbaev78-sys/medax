import { Router } from "express";
import { Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import ExcelJS from "exceljs";
import { z } from "zod";
import { prisma } from "../db";
import { HttpError } from "../errors";
import { requireAdmin, requireAuth } from "../auth";
import { applyFakeStrike, normalizePhone } from "../antispam";
import { memoryUpload, removeFile, saveImage, savePdf } from "../upload";
import { uniqueSlug } from "../utils";
import { sendSms } from "../sms";

export const adminRouter = Router();
adminRouter.use(requireAuth);

const id = (v: unknown) => {
  const n = Number(v);
  if (!Number.isInteger(n) || n <= 0) throw new HttpError(400, "ID noto'g'ri");
  return n;
};
const page = z.coerce.number().int().min(1).default(1);

/* ------------------------------ Dashboard ------------------------------ */

adminRouter.get("/stats", async (_req, res) => {
  const since = new Date(Date.now() - 30 * 24 * 3600 * 1000);
  const [byStatus, products, blocked, last30, fake30, unreadContacts] = await Promise.all([
    prisma.order.groupBy({ by: ["status"], _count: true }),
    prisma.product.count(),
    prisma.blocked.count(),
    prisma.order.count({ where: { createdAt: { gt: since } } }),
    prisma.order.count({ where: { createdAt: { gt: since }, status: "FAKE" } }),
    prisma.contactMessage.count({ where: { isRead: false } }),
  ]);
  const orders: Record<string, number> = { NEW: 0, CONFIRMED: 0, DONE: 0, CANCELED: 0, FAKE: 0 };
  byStatus.forEach((r) => (orders[r.status] = r._count));
  res.json({ orders, products, blocked, last30, fake30, unreadContacts });
});

/* --------------------------- Categories / Brands ------------------------- */

const catSchema = z.object({ name: z.string().trim().min(2).max(100), sortOrder: z.coerce.number().int().default(0) });
const brandSchema = z.object({ name: z.string().trim().min(2).max(100), country: z.string().trim().max(60).nullish() });

adminRouter.get("/categories", async (_req, res) => {
  const rows = await prisma.category.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }], include: { _count: { select: { products: true } } } });
  res.json(rows.map((c) => ({ id: c.id, name: c.name, slug: c.slug, sortOrder: c.sortOrder, count: c._count.products })));
});
adminRouter.post("/categories", async (req, res) => {
  const d = catSchema.parse(req.body);
  res.status(201).json(await prisma.category.create({ data: { ...d, slug: await uniqueSlug("category", d.name) } }));
});
adminRouter.put("/categories/:id", async (req, res) => {
  const d = catSchema.parse(req.body);
  res.json(await prisma.category.update({ where: { id: id(req.params.id) }, data: d }));
});
adminRouter.delete("/categories/:id", requireAdmin, async (req, res) => {
  const cid = id(req.params.id);
  if (await prisma.product.count({ where: { categoryId: cid } })) throw new HttpError(409, "Bu kategoriyada mahsulotlar bor. Avval ularni boshqa kategoriyaga o'tkazing.");
  await prisma.category.delete({ where: { id: cid } });
  res.json({ ok: true });
});

adminRouter.get("/brands", async (_req, res) => {
  const rows = await prisma.brand.findMany({ orderBy: { name: "asc" }, include: { _count: { select: { products: true } } } });
  res.json(rows.map((b) => ({ id: b.id, name: b.name, slug: b.slug, country: b.country, count: b._count.products })));
});
adminRouter.post("/brands", async (req, res) => {
  const d = brandSchema.parse(req.body);
  res.status(201).json(await prisma.brand.create({ data: { name: d.name, country: d.country || null, slug: await uniqueSlug("brand", d.name) } }));
});
adminRouter.put("/brands/:id", async (req, res) => {
  const d = brandSchema.parse(req.body);
  res.json(await prisma.brand.update({ where: { id: id(req.params.id) }, data: { name: d.name, country: d.country || null } }));
});
adminRouter.delete("/brands/:id", requireAdmin, async (req, res) => {
  const bid = id(req.params.id);
  if (await prisma.product.count({ where: { brandId: bid } })) throw new HttpError(409, "Bu brendda mahsulotlar bor.");
  await prisma.brand.delete({ where: { id: bid } });
  res.json({ ok: true });
});

/* -------------------------------- Products ------------------------------- */

const productSchema = z.object({
  name: z.string().trim().min(2).max(200),
  nameRu: z.string().trim().max(200).nullish(),
  nameEn: z.string().trim().max(200).nullish(),
  sku: z.string().trim().max(60).nullish(),
  description: z.string().max(20000).default(""),
  descriptionRu: z.string().max(20000).nullish(),
  descriptionEn: z.string().max(20000).nullish(),
  specs: z.array(z.object({ name: z.string().trim().min(1).max(100), value: z.string().trim().min(1).max(300) })).max(60).default([]),
  country: z.string().trim().max(60).nullish(),
  priceFrom: z.coerce.number().nonnegative().nullish(),
  oldPrice: z.coerce.number().nonnegative().nullish(),
  discountPercent: z.coerce.number().int().min(1).max(99).nullish(),
  unit: z.string().trim().max(30).default("dona"),
  packageQty: z.coerce.number().int().positive().default(1),
  mfdDate: z.string().trim().max(40).nullish(),
  expDate: z.string().trim().max(40).nullish(),
  isHit: z.boolean().default(false),
  isNew: z.boolean().default(false),
  isActive: z.boolean().default(true),
  categoryId: z.coerce.number().int().positive(),
  brandId: z.coerce.number().int().positive().nullish(),
});

function productData(d: z.infer<typeof productSchema>) {
  // Avtomatik skidka foizini hisoblash (agar kiritilmagan bo'lsa)
  let disc = d.discountPercent ?? null;
  if (!disc && d.oldPrice && d.priceFrom && d.oldPrice > d.priceFrom) {
    disc = Math.round(((d.oldPrice - d.priceFrom) / d.oldPrice) * 100);
  }

  return {
    name: d.name,
    nameRu: d.nameRu || null,
    nameEn: d.nameEn || null,
    sku: d.sku || null,
    description: d.description,
    descriptionRu: d.descriptionRu || null,
    descriptionEn: d.descriptionEn || null,
    specs: d.specs as Prisma.InputJsonValue,
    country: d.country || null,
    priceFrom: d.priceFrom ?? null,
    oldPrice: d.oldPrice ?? null,
    discountPercent: disc,
    unit: d.unit || "dona",
    packageQty: d.packageQty ?? 1,
    mfdDate: d.mfdDate || null,
    expDate: d.expDate || null,
    isHit: d.isHit,
    isNew: d.isNew,
    isActive: d.isActive,
    categoryId: d.categoryId,
    brandId: d.brandId ?? null,
  };
}

adminRouter.get("/products", async (req, res) => {
  const q = z.object({ q: z.string().trim().optional(), category: z.coerce.number().optional(), page, limit: z.coerce.number().int().min(1).max(100).default(30) }).parse(req.query);
  const where: Prisma.ProductWhereInput = {};
  if (q.category) where.categoryId = q.category;
  if (q.q) {
    where.OR = [
      { name: { contains: q.q, mode: "insensitive" } },
      { nameRu: { contains: q.q, mode: "insensitive" } },
      { nameEn: { contains: q.q, mode: "insensitive" } },
      { sku: { contains: q.q, mode: "insensitive" } },
    ];
  }
  const [total, items] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (q.page - 1) * q.limit,
      take: q.limit,
      include: { category: { select: { name: true } }, brand: { select: { name: true } }, images: { take: 1, orderBy: { sortOrder: "asc" } } },
    }),
  ]);
  res.json({ items, total, page: q.page, pages: Math.max(1, Math.ceil(total / q.limit)) });
});

adminRouter.get("/products/import/template", async (_req, res) => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Mahsulotlar");
  ws.columns = [
    { header: "Nomi", key: "name", width: 40 },
    { header: "Kategoriya", key: "category", width: 28 },
    { header: "Brend", key: "brand", width: 20 },
    { header: "Davlat", key: "country", width: 16 },
    { header: "Narx", key: "price", width: 16 },
    { header: "Artikul", key: "sku", width: 16 },
    { header: "Tavsif", key: "description", width: 50 },
  ];
  ws.addRow({ name: "Bemor monitori BeneVision N17", category: "Reanimatsiya", brand: "Mindray", country: "Xitoy", price: 3800000, sku: "MR-N17", description: "17 dyuymli monitor" });
  ws.getRow(1).font = { bold: true };
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", 'attachment; filename="mahsulotlar-shablon.xlsx"');
  await wb.xlsx.write(res);
  res.end();
});

adminRouter.get("/products/:id", async (req, res) => {
  const p = await prisma.product.findUnique({
    where: { id: id(req.params.id) },
    include: { images: { orderBy: { sortOrder: "asc" } }, documents: true },
  });
  if (!p) throw new HttpError(404, "Mahsulot topilmadi");
  res.json(p);
});

adminRouter.post("/products", async (req, res) => {
  const d = productSchema.parse(req.body);
  const p = await prisma.product.create({ data: { ...productData(d), slug: await uniqueSlug("product", d.name) } });
  res.status(201).json(p);
});

// Barcha mahsulotlarni yoki tanlanganlarni yo'q qilib qo'yish (yashirish / faol qilish)
adminRouter.post("/products/bulk-status", requireAdmin, async (req, res) => {
  const schema = z.object({
    active: z.boolean(),
    ids: z.array(z.number().int()).optional(),
  });
  const { active, ids } = schema.parse(req.body);
  const where: Prisma.ProductWhereInput = ids && ids.length > 0 ? { id: { in: ids } } : {};
  const result = await prisma.product.updateMany({
    where,
    data: { isActive: active },
  });
  res.json({ ok: true, updated: result.count, active });
});

// Barcha mahsulotlarni yoki tanlanganlarni birdaniga o'chirish
adminRouter.post("/products/delete-all", requireAdmin, async (req, res) => {
  const schema = z.object({
    ids: z.array(z.number().int()).optional(),
  });
  const { ids } = schema.parse(req.body || {});
  const where: Prisma.ProductWhereInput = ids && ids.length > 0 ? { id: { in: ids } } : {};

  // O'chiriladigan mahsulotlar va ularning fayllarini olish
  const products = await prisma.product.findMany({
    where,
    include: { images: true, documents: true },
  });

  const filePromises: Promise<any>[] = [];
  for (const p of products) {
    for (const img of p.images) {
      filePromises.push(removeFile(img.url));
      filePromises.push(removeFile(img.thumbUrl));
    }
    for (const doc of p.documents) {
      filePromises.push(removeFile(doc.url));
    }
  }

  await Promise.allSettled(filePromises);

  const result = await prisma.product.deleteMany({ where });
  res.json({ ok: true, deleted: result.count });
});

adminRouter.put("/products/:id", async (req, res) => {
  const d = productSchema.parse(req.body);
  res.json(await prisma.product.update({ where: { id: id(req.params.id) }, data: productData(d) }));
});

adminRouter.delete("/products/:id", requireAdmin, async (req, res) => {
  const pid = id(req.params.id);
  if (await prisma.orderItem.count({ where: { productId: pid } })) {
    // Buyurtma tarixi saqlanishi uchun o'chirmaymiz, yashiramiz
    await prisma.product.update({ where: { id: pid }, data: { isActive: false } });
    return void res.json({ ok: true, hidden: true });
  }
  const p = await prisma.product.findUnique({ where: { id: pid }, include: { images: true, documents: true } });
  if (!p) throw new HttpError(404, "Mahsulot topilmadi");
  await prisma.product.delete({ where: { id: pid } });
  await Promise.all([...p.images.flatMap((i) => [removeFile(i.url), removeFile(i.thumbUrl)]), ...p.documents.map((d) => removeFile(d.url))]);
  res.json({ ok: true });
});

adminRouter.post("/products/:id/images", memoryUpload.array("files", 10), async (req, res) => {
  const pid = id(req.params.id);
  const files = (req.files as Express.Multer.File[]) || [];
  if (!files.length) throw new HttpError(400, "Fayl tanlanmadi");
  const last = await prisma.productImage.findFirst({ where: { productId: pid }, orderBy: { sortOrder: "desc" } });
  let order = (last?.sortOrder ?? -1) + 1;
  const created = [];
  for (const f of files) {
    const saved = await saveImage(f.buffer);
    created.push(await prisma.productImage.create({ data: { productId: pid, ...saved, sortOrder: order++ } }));
  }
  res.status(201).json(created);
});

adminRouter.delete("/images/:imageId", async (req, res) => {
  const img = await prisma.productImage.findUnique({ where: { id: id(req.params.imageId) } });
  if (!img) throw new HttpError(404, "Rasm topilmadi");
  await prisma.productImage.delete({ where: { id: img.id } });
  await Promise.all([removeFile(img.url), removeFile(img.thumbUrl)]);
  res.json({ ok: true });
});

adminRouter.post("/products/:id/documents", memoryUpload.single("file"), async (req, res) => {
  const pid = id(req.params.id);
  if (!req.file) throw new HttpError(400, "Fayl tanlanmadi");
  const title = z.string().trim().min(1).max(120).parse(req.body.title || req.file.originalname.replace(/\.pdf$/i, ""));
  const url = await savePdf(req.file.buffer);
  res.status(201).json(await prisma.productDocument.create({ data: { productId: pid, title, url } }));
});

adminRouter.delete("/documents/:docId", async (req, res) => {
  const doc = await prisma.productDocument.findUnique({ where: { id: id(req.params.docId) } });
  if (!doc) throw new HttpError(404, "Hujjat topilmadi");
  await prisma.productDocument.delete({ where: { id: doc.id } });
  await removeFile(doc.url);
  res.json({ ok: true });
});

/* Excel orqali ommaviy yuklash */
adminRouter.post("/products/import", requireAdmin, memoryUpload.single("file"), async (req, res) => {
  if (!req.file) throw new HttpError(400, "Excel fayl tanlanmadi");
  const wb = new ExcelJS.Workbook();
  try {
    await wb.xlsx.load(req.file.buffer as any);
  } catch {
    throw new HttpError(400, "Fayl .xlsx formatida emas");
  }
  const ws = wb.worksheets[0];
  if (!ws) throw new HttpError(400, "Varaq topilmadi");

  if (ws.rowCount > 1001) {
    throw new HttpError(400, "Bitta faylda ko'pi bilan 1000 ta mahsulot yuklash mumkin.");
  }

  const head: Record<string, number> = {};
  ws.getRow(1).eachCell((c, col) => (head[c.text.trim().toLowerCase()] = col));
  const col = (...names: string[]) => names.map((n) => head[n]).find(Boolean);
  const cName = col("nomi", "name", "nom");
  const cCat = col("kategoriya", "category");
  if (!cName || !cCat) throw new HttpError(400, "Ustunlar: Nomi va Kategoriya majburiy (shablonni yuklab oling)");
  const cBrand = col("brend", "brand");
  const cCountry = col("davlat", "country");
  const cPrice = col("narx", "price");
  const cSku = col("artikul", "sku");
  const cDesc = col("tavsif", "description");

  const cats = new Map((await prisma.category.findMany()).map((c) => [c.name.toLowerCase(), c.id]));
  const brands = new Map((await prisma.brand.findMany()).map((b) => [b.name.toLowerCase(), b.id]));
  const text = (row: ExcelJS.Row, c?: number) => (c ? row.getCell(c).text.trim() : "");

  let created = 0, updated = 0, skipped = 0;
  const errors: { row: number; message: string }[] = [];

  for (let r = 2; r <= ws.rowCount && r <= 1001; r++) {
    const row = ws.getRow(r);
    const name = text(row, cName);
    if (!name) { skipped++; continue; }
    try {
      const catName = text(row, cCat);
      if (!catName) throw new Error("Kategoriya bo'sh");
      let categoryId = cats.get(catName.toLowerCase());
      if (!categoryId) {
        categoryId = (await prisma.category.create({ data: { name: catName, slug: await uniqueSlug("category", catName) } })).id;
        cats.set(catName.toLowerCase(), categoryId);
      }
      let brandId: number | null = null;
      const brandName = text(row, cBrand);
      if (brandName) {
        brandId = brands.get(brandName.toLowerCase()) ?? null;
        if (!brandId) {
          brandId = (await prisma.brand.create({ data: { name: brandName, slug: await uniqueSlug("brand", brandName) } })).id;
          brands.set(brandName.toLowerCase(), brandId);
        }
      }
      const priceRaw = text(row, cPrice).replace(/[\s,]/g, "");
      const price = priceRaw ? Number(priceRaw) : null;
      if (price !== null && Number.isNaN(price)) throw new Error("Narx raqam emas");
      const sku = text(row, cSku) || null;
      const data = { name, categoryId, brandId, country: text(row, cCountry) || null, priceFrom: price, sku, description: text(row, cDesc) };

      const existing = sku ? await prisma.product.findUnique({ where: { sku } }) : null;
      if (existing) {
        await prisma.product.update({ where: { id: existing.id }, data });
        updated++;
      } else {
        await prisma.product.create({ data: { ...data, slug: await uniqueSlug("product", name) } });
        created++;
      }
    } catch (e: any) {
      errors.push({ row: r, message: e.message || "Xato" });
    }
  }
  res.json({ created, updated, skipped, errors: errors.slice(0, 50), errorCount: errors.length });
});

/* --------------------------------- Orders -------------------------------- */

adminRouter.get("/orders", async (req, res) => {
  const q = z.object({
    status: z.enum(["NEW", "CONFIRMED", "READY", "DONE", "CANCELED", "FAKE"]).optional(),
    q: z.string().trim().optional(),
    page,
  }).parse(req.query);
  const where: Prisma.OrderWhereInput = {};
  if (q.status) where.status = q.status;
  if (q.q) {
    where.OR = [
      { code: { contains: q.q, mode: "insensitive" } },
      { customerName: { contains: q.q, mode: "insensitive" } },
      { phone: { contains: q.q.replace(/[^\d+]/g, "") || "~~" } },
    ];
  }
  const [total, items] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({ where, orderBy: { createdAt: "desc" }, skip: (q.page - 1) * 30, take: 30, include: { items: true } }),
  ]);
  res.json({ items, total, page: q.page, pages: Math.max(1, Math.ceil(total / 30)) });
});

adminRouter.patch("/orders/:id", async (req, res) => {
  const d = z.object({
    status: z.enum(["NEW", "CONFIRMED", "READY", "DONE", "CANCELED", "FAKE"]).optional(),
    managerNote: z.string().max(2000).optional(),
    isPaid: z.boolean().optional(),
  }).parse(req.body);

  const prevOrder = await prisma.order.findUnique({ where: { id: id(req.params.id) } });
  if (!prevOrder) throw new HttpError(404, "Buyurtma topilmadi");

  const order = await prisma.order.update({
    where: { id: prevOrder.id },
    data: {
      ...d,
      ...(d.isPaid !== undefined && d.isPaid && !prevOrder.isPaid ? { paidAt: new Date() } : {}),
    },
    include: { items: true },
  });

  let blocked = false;
  if (d.status === "FAKE") blocked = await applyFakeStrike(order.phone);

  // Agar holat "READY" ga o'zgargan bo'lsa va avval READY bo'lmagan bo'lsa, mijozga avtomatik SMS yuboramiz
  if (d.status === "READY" && prevOrder.status !== "READY") {
    try {
      const smsText = order.isPaid
        ? `Medax: ${order.code} buyurtmangiz tayyor. To'lov qabul qilingan, olib ketishingiz mumkin. Manzil: Namangan, Beruniy 2. Kodni ko'rsating.`
        : `Medax: ${order.code} buyurtmangiz tayyor. To'lovni do'konda qilasiz. 3 kun ichida olib keting.`;
      await sendSms(order.phone, smsText);
      console.log(`[Order READY SMS sent] ${order.phone} -> ${smsText}`);
    } catch (smsErr) {
      console.error("[Order READY SMS error]:", smsErr);
    }
  }

  res.json({ order, blocked });
});


/* -------------------------------- Blocklist ------------------------------ */

adminRouter.get("/blocklist", async (_req, res) => {
  res.json(await prisma.blocked.findMany({ orderBy: { createdAt: "desc" }, take: 500 }));
});
adminRouter.post("/blocklist", requireAdmin, async (req, res) => {
  const d = z.object({ type: z.enum(["PHONE", "IP"]), value: z.string().trim().min(3).max(60), reason: z.string().max(200).default("") }).parse(req.body);
  const value = d.type === "PHONE" ? normalizePhone(d.value) : d.value;
  if (!value) throw new HttpError(400, "Telefon raqami noto'g'ri");
  const row = await prisma.blocked.upsert({
    where: { type_value: { type: d.type, value } },
    create: { type: d.type, value, reason: d.reason },
    update: { reason: d.reason },
  });
  res.status(201).json(row);
});
adminRouter.delete("/blocklist/:id", requireAdmin, async (req, res) => {
  await prisma.blocked.delete({ where: { id: id(req.params.id) } });
  res.json({ ok: true });
});

/* --------------------------------- Users --------------------------------- */

adminRouter.get("/users", requireAdmin, async (_req, res) => {
  res.json(await prisma.user.findMany({ select: { id: true, email: true, name: true, role: true, createdAt: true }, orderBy: { id: "asc" } }));
});
adminRouter.post("/users", requireAdmin, async (req, res) => {
  const d = z.object({
    email: z.string().email(),
    name: z.string().trim().min(2).max(80),
    password: z.string().min(8, "Parol kamida 8 belgi"),
    role: z.enum(["OWNER", "ADMIN", "MANAGER"]).default("MANAGER"),
  }).parse(req.body);

  if ((d.role === "ADMIN" || d.role === "OWNER") && req.user!.role !== "OWNER") {
    throw new HttpError(403, "Faqat tizim Egasi (Owner) yangi Admin yoki Ega qo'sha oladi");
  }

  const exists = await prisma.user.findUnique({ where: { email: d.email.toLowerCase() } });
  if (exists) throw new HttpError(409, "Bu email band");
  const u = await prisma.user.create({
    data: { email: d.email.toLowerCase(), name: d.name, role: d.role, passwordHash: await bcrypt.hash(d.password, 10) },
    select: { id: true, email: true, name: true, role: true },
  });
  res.status(201).json(u);
});
adminRouter.delete("/users/:id", requireAdmin, async (req, res) => {
  const uid = id(req.params.id);
  if (uid === req.user!.id) throw new HttpError(400, "O'zingizni o'chira olmaysiz");

  const target = await prisma.user.findUnique({ where: { id: uid } });
  if (!target) throw new HttpError(404, "Xodim topilmadi");
  if (target.role === "OWNER") throw new HttpError(403, "Tizim Egasini (Owner) o'chirib bo'lmaydi");
  if (target.role === "ADMIN" && req.user!.role !== "OWNER") {
    throw new HttpError(403, "Faqat tizim Egasi Adminlarni o'chira oladi");
  }

  await prisma.user.delete({ where: { id: uid } });
  res.json({ ok: true });
});

/* --------------------------- Contact Messages --------------------------- */

adminRouter.get("/contact-messages", async (req, res) => {
  const q = z
    .object({
      isRead: z.enum(["true", "false"]).optional(),
      page,
    })
    .parse(req.query);

  const where: Prisma.ContactMessageWhereInput = {};
  if (q.isRead !== undefined) {
    where.isRead = q.isRead === "true";
  }

  const [total, items, unreadCount] = await Promise.all([
    prisma.contactMessage.count({ where }),
    prisma.contactMessage.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (q.page - 1) * 30,
      take: 30,
    }),
    prisma.contactMessage.count({ where: { isRead: false } }),
  ]);

  res.json({ items, total, unreadCount, page: q.page, pages: Math.max(1, Math.ceil(total / 30)) });
});

adminRouter.patch("/contact-messages/:id", async (req, res) => {
  const d = z.object({ isRead: z.boolean() }).parse(req.body);
  const updated = await prisma.contactMessage.update({
    where: { id: id(req.params.id) },
    data: { isRead: d.isRead },
  });
  res.json(updated);
});

adminRouter.delete("/contact-messages/:id", async (req, res) => {
  await prisma.contactMessage.delete({ where: { id: id(req.params.id) } });
  res.json({ ok: true });
});

/* --------------------------- Mijozlar (Customers) --------------------------- */

adminRouter.get("/customers", async (req, res) => {
  const q = z
    .object({
      search: z.string().trim().optional(),
      page,
    })
    .parse(req.query);

  const where: Prisma.CustomerWhereInput = {};
  if (q.search) {
    where.OR = [
      { name: { contains: q.search, mode: "insensitive" } },
      { phone: { contains: q.search, mode: "insensitive" } },
      { organization: { contains: q.search, mode: "insensitive" } },
    ];
  }

  const [total, items] = await Promise.all([
    prisma.customer.count({ where }),
    prisma.customer.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (q.page - 1) * 30,
      take: 30,
      select: {
        id: true,
        name: true,
        phone: true,
        organization: true,
        createdAt: true,
        _count: { select: { orders: true } },
      },
    }),
  ]);

  res.json({ items, total, page: q.page, pages: Math.max(1, Math.ceil(total / 30)) });
});

