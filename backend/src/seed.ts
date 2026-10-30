import bcrypt from "bcryptjs";
import { prisma } from "./db";
import { slugify } from "./utils";

export const TARGET_CATEGORIES = [
  { name: "Tibbiy buyumlar", slug: "tibbiy-buyumlar", sortOrder: 0 },
  { name: "Tibbiy apparaturalar", slug: "tibbiy-apparaturalar", sortOrder: 1 },
  { name: "Tibbiy jihozlar", slug: "tibbiy-jihozlar", sortOrder: 2 },
  { name: "Laboratoriya reagentlari", slug: "laboratoriya-reagentlari", sortOrder: 3 },
  { name: "Ortopedik mahsulotlar", slug: "ortopedik-mahsulotlar", sortOrder: 4 },
];

export async function syncCategories(): Promise<Record<string, number>> {
  const catMap: Record<string, number> = {};
  for (const c of TARGET_CATEGORIES) {
    const row = await prisma.category.upsert({
      where: { slug: c.slug },
      create: { name: c.name, slug: c.slug, sortOrder: c.sortOrder },
      update: { name: c.name, sortOrder: c.sortOrder },
    });
    catMap[c.slug] = row.id;
    catMap[c.name] = row.id;
  }
  return catMap;
}

export async function seedDatabase() {
  // 1. Admin hisobini faqat bazada umuman admin bo'lmaganda yaratamiz (Mavjud admin parolini hech qachon o'chirib yubormaydi!)
  const adminCount = await prisma.user.count({ where: { role: { in: ["OWNER", "ADMIN"] } } });
  if (adminCount === 0) {
    const primaryEmail = (process.env.ADMIN_EMAIL || "admin@medax.uz").toLowerCase();
    const password = process.env.ADMIN_PASSWORD || "ChangeMe123!";
    const hash = await bcrypt.hash(password, 10);
    await prisma.user.create({
      data: {
        email: primaryEmail,
        name: "Loyiha Egasi",
        role: "OWNER",
        passwordHash: hash,
      },
    });
    console.log(`[Seed] Birlamchi admin yaratildi: ${primaryEmail}`);
  }

  // 2. Kategoriyalarni faqat mavjudligini ta'minlaymiz (mavjud toifalarni yoki tovarlarni o'chirmaydi!)
  await syncCategories();

  // 3. Brendlar ro'yxatini shakllantirish
  const brands: [string, string][] = [
    ["Dirui", "Xitoy"],
    ["Rayto", "Xitoy"],
    ["Chison", "Xitoy"],
    ["Human", "Germaniya"],
    ["Cypress", "Belgiya"],
    ["Mindray", "Xitoy"],
    ["Philips", "Niderlandiya"],
    ["Siemens", "Germaniya"],
    ["Dräger", "Germaniya"],
    ["GE Healthcare", "AQSH"],
    ["Samsung", "Janubiy Koreya"],
    ["Olympus", "Yaponiya"],
    ["Nihon Kohden", "Yaponiya"],
  ];

  for (const [name, country] of brands) {
    const slug = slugify(name);
    await prisma.brand.upsert({
      where: { slug },
      create: { name, slug, country },
      update: { name, country },
    });
  }

  // 4. Mahsulotlar ID ketma-ketligini (Sequence) sozlash:
  // Agar bazada 0 ta mahsulot bo'lsa, keyingi qo'shiladigan mahsulot 1-ID dan boshlanadi.
  const productCount = await prisma.product.count();
  if (productCount === 0) {
    try {
      await prisma.$executeRawUnsafe(`ALTER SEQUENCE "Product_id_seq" RESTART WITH 1;`);
      console.log("[Seed] Mahsulotlar ID hisoblagichi 1 ga qaytarildi (restart with 1).");
    } catch (e: any) {
      console.warn("[Seed] Sequence qayta sozlashda e'tibor:", e?.message);
    }
  }

  // Mahsulotlar 0 ta saqlanadi: do'kon egasi o'zi admin panel orqali 0 dan kiritadi
  console.log("[Seed] Tizim tayyor: Mahsulotlar to'liq do'kon egasi tomonidan boshqariladi.");
}

if (process.argv[1] && (process.argv[1].endsWith("seed.ts") || process.argv[1].endsWith("seed.js"))) {
  seedDatabase().finally(() => prisma.$disconnect());
}
