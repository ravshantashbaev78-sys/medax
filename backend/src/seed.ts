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
    // Faqat yo'q bo'lsa yaratiladi: admin qayta nomlagan toifa har deployda eski nomiga qaytmasin
    const row = await prisma.category.upsert({
      where: { slug: c.slug },
      create: { name: c.name, slug: c.slug, sortOrder: c.sortOrder },
      update: {},
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
    if (
      process.env.NODE_ENV === "production" &&
      (!process.env.ADMIN_PASSWORD || process.env.ADMIN_PASSWORD === "ChangeMe123!")
    ) {
      throw new Error(
        "XAVFSIZLIK XATOSI: Production muhitida xavfsiz ADMIN_PASSWORD berilishi shart! Standart 'ChangeMe123!' parolidan foydalanish taqiqlanadi."
      );
    }
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

  // 2. Boshlang'ich toifalar va brendlar faqat birinchi o'rnatishda (jadval bo'sh bo'lsa) yaratiladi.
  // Har deployda qayta yaratilsa, admin o'chirgan brend qaytib kelar, o'zgartirilgan nomlar eskisiga qaytardi.
  if ((await prisma.category.count()) === 0) await syncCategories();

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

  if ((await prisma.brand.count()) === 0) {
    for (const [name, country] of brands) {
      const slug = slugify(name);
      await prisma.brand.upsert({ where: { slug }, create: { name, slug, country }, update: {} });
    }
  }

  // Mahsulot ID hisoblagichi qayta boshlanmaydi: mijoz savatida (brauzer/ilova) eski ID saqlanib qolgan
  // bo'lsa, u boshqa yangi mahsulotga tegishli bo'lib qolardi.

  // Mahsulotlar 0 ta saqlanadi: do'kon egasi o'zi admin panel orqali 0 dan kiritadi
  console.log("[Seed] Tizim tayyor: Mahsulotlar to'liq do'kon egasi tomonidan boshqariladi.");
}

if (process.argv[1] && (process.argv[1].endsWith("seed.ts") || process.argv[1].endsWith("seed.js"))) {
  seedDatabase().finally(() => prisma.$disconnect());
}
