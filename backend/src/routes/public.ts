import { Router } from "express";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../db";
import { HttpError } from "../errors";

export const publicRouter = Router();

const listInclude = {
  brand: { select: { name: true, slug: true } },
  category: { select: { name: true, slug: true } },
  images: { orderBy: { sortOrder: "asc" as const }, take: 1, select: { thumbUrl: true, url: true } },
};

publicRouter.get("/categories", async (_req, res) => {
  const rows = await prisma.category.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: { _count: { select: { products: { where: { isActive: true } } } } },
  });
  res.json(rows.map((c) => ({ id: c.id, name: c.name, slug: c.slug, count: c._count.products })));
});

publicRouter.get("/brands", async (_req, res) => {
  const rows = await prisma.brand.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { products: { where: { isActive: true } } } } },
  });
  res.json(rows.map((b) => ({ id: b.id, name: b.name, slug: b.slug, count: b._count.products })));
});

publicRouter.get("/home", async (_req, res) => {
  const where = { isActive: true };
  const [categories, hits, news, latest, total, brands] = await Promise.all([
    prisma.category.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: { _count: { select: { products: { where } } } },
    }),
    prisma.product.findMany({ where: { ...where, isHit: true }, orderBy: { updatedAt: "desc" }, take: 8, include: listInclude }),
    prisma.product.findMany({ where: { ...where, isNew: true }, orderBy: { updatedAt: "desc" }, take: 8, include: listInclude }),
    prisma.product.findMany({ where, orderBy: { createdAt: "desc" }, take: 8, include: listInclude }),
    prisma.product.count({ where }),
    prisma.brand.findMany({ orderBy: { name: "asc" }, take: 12 }),
  ]);
  res.json({
    total,
    categories: categories.map((c) => ({ id: c.id, name: c.name, slug: c.slug, count: c._count.products })),
    brands,
    hits,
    news,
    latest,
  });
});

const listQuery = z.object({
  q: z.string().trim().max(100).optional(),
  search: z.string().trim().max(100).optional(),
  category: z.string().optional(),
  categoryId: z.coerce.number().optional(),
  brand: z.string().optional(),
  flag: z.enum(["hit", "new", "discount"]).optional(),
  minPrice: z.coerce.number().optional(),
  maxPrice: z.coerce.number().optional(),
  sort: z.enum(["new", "name", "price_asc", "price_desc"]).default("new"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(48).default(24),
});

publicRouter.get("/products", async (req, res) => {
  const q = listQuery.parse(req.query);
  const where: Prisma.ProductWhereInput = { isActive: true };
  if (q.category) where.category = { slug: q.category };
  if (q.categoryId) where.categoryId = q.categoryId;
  if (q.brand) where.brand = { slug: q.brand };
  if (q.flag === "hit") where.isHit = true;
  if (q.flag === "new") where.isNew = true;
  if (q.flag === "discount") where.oldPrice = { gt: 0 };

  if (q.minPrice !== undefined || q.maxPrice !== undefined) {
    where.priceFrom = {};
    if (q.minPrice !== undefined && q.minPrice > 0) where.priceFrom.gte = new Prisma.Decimal(q.minPrice);
    if (q.maxPrice !== undefined && q.maxPrice > 0) where.priceFrom.lte = new Prisma.Decimal(q.maxPrice);
  }

  const searchText = q.q || q.search;
  if (searchText) {
    where.OR = [
      { name: { contains: searchText, mode: "insensitive" } },
      { nameRu: { contains: searchText, mode: "insensitive" } },
      { nameEn: { contains: searchText, mode: "insensitive" } },
      { sku: { contains: searchText, mode: "insensitive" } },
      { brand: { name: { contains: searchText, mode: "insensitive" } } },
    ];
  }
  const orderBy: Prisma.ProductOrderByWithRelationInput =
    q.sort === "name" ? { name: "asc" }
    : q.sort === "price_asc" ? { priceFrom: { sort: "asc", nulls: "last" } }
    : q.sort === "price_desc" ? { priceFrom: { sort: "desc", nulls: "last" } }
    : { createdAt: "desc" };

  const [total, items] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({ where, orderBy, skip: (q.page - 1) * q.limit, take: q.limit, include: listInclude }),
  ]);
  res.json({ items, total, page: q.page, pages: Math.max(1, Math.ceil(total / q.limit)) });
});

publicRouter.get("/products/:slug", async (req, res) => {
  const p = await prisma.product.findFirst({
    where: { slug: String(req.params.slug), isActive: true },
    include: {
      brand: true,
      category: true,
      images: { orderBy: { sortOrder: "asc" } },
      documents: true,
    },
  });
  if (!p) throw new HttpError(404, "Mahsulot topilmadi");
  const related = await prisma.product.findMany({
    where: { isActive: true, categoryId: p.categoryId, id: { not: p.id } },
    take: 4,
    orderBy: { createdAt: "desc" },
    include: listInclude,
  });
  res.json({ ...p, related });
});

publicRouter.get("/sitemap.xml", async (_req, res) => {
  const [products, categories] = await Promise.all([
    prisma.product.findMany({
      where: { isActive: true },
      select: { id: true, slug: true, updatedAt: true },
    }),
    prisma.category.findMany({
      select: { slug: true },
    }),
  ]);

  const baseUrl = "https://medax.uz";
  const staticUrls = [
    { loc: `${baseUrl}/`, priority: "1.0", changefreq: "daily" },
    { loc: `${baseUrl}/catalog`, priority: "0.9", changefreq: "daily" },
    { loc: `${baseUrl}/contact`, priority: "0.7", changefreq: "monthly" },
    { loc: `${baseUrl}/delivery`, priority: "0.6", changefreq: "monthly" },
    { loc: `${baseUrl}/faq`, priority: "0.6", changefreq: "monthly" },
  ];

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

  const todayStr = new Date().toISOString().split("T")[0];

  for (const s of staticUrls) {
    xml += `  <url>\n    <loc>${s.loc}</loc>\n    <lastmod>${todayStr}</lastmod>\n    <changefreq>${s.changefreq}</changefreq>\n    <priority>${s.priority}</priority>\n  </url>\n`;
  }

  for (const c of categories) {
    xml += `  <url>\n    <loc>${baseUrl}/catalog?category=${encodeURIComponent(c.slug)}</loc>\n    <lastmod>${todayStr}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n  </url>\n`;
  }

  for (const p of products) {
    const pDate = p.updatedAt ? p.updatedAt.toISOString().split("T")[0] : todayStr;
    xml += `  <url>\n    <loc>${baseUrl}/product/${p.slug || p.id}</loc>\n    <lastmod>${pDate}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n  </url>\n`;
  }

  xml += `</urlset>`;

  res.header("Content-Type", "application/xml; charset=utf-8");
  res.send(xml);
});
