import { Router, Request, Response, NextFunction } from "express";
import rateLimit from "express-rate-limit";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../db";
import { config } from "../config";
import { HttpError } from "../errors";
import { sendSms } from "../sms";
import {
  assertNotBlocked,
  assertSmsBudgetAvailable,
  hashCode,
  normalizePhone,
  verifyTurnstile,
} from "../antispam";
import { getClientIp } from "../ip";
import { memoryUpload, saveAvatar } from "../upload";

export interface CustomerAuthPayload {
  id: number;
  type: "CUSTOMER";
  phone: string;
  name: string;
}

declare module "express-serve-static-core" {
  interface Request {
    customer?: CustomerAuthPayload;
  }
}

export function requireCustomerAuth(req: Request, _res: Response, next: NextFunction) {
  const h =
    req.headers.authorization ||
    (req.headers["x-authorization"] as string) ||
    (req.headers["x-customer-token"] as string) ||
    (req.headers["x-access-token"] as string) ||
    (req.query.token as string) ||
    "";
  const token = h.startsWith("Bearer ") ? h.slice(7).trim() : h.trim();
  if (!token) return next(new HttpError(401, "Iltimos, tizimga kiring"));

  try {
    const decoded = jwt.verify(token, config.customerJwtSecret) as CustomerAuthPayload;
    if (decoded.type !== "CUSTOMER") throw new Error("Invalid token type");
    req.customer = decoded;
    next();
  } catch {
    next(new HttpError(401, "Sessiya eskirgan. Qayta kiring"));
  }
}

export function optionalCustomerAuth(req: Request, _res: Response, next: NextFunction) {
  const h =
    req.headers.authorization ||
    (req.headers["x-authorization"] as string) ||
    (req.headers["x-customer-token"] as string) ||
    (req.headers["x-access-token"] as string) ||
    (req.query.token as string) ||
    "";
  const token = h.startsWith("Bearer ") ? h.slice(7).trim() : h.trim();
  if (token) {
    try {
      const decoded = jwt.verify(token, config.customerJwtSecret) as CustomerAuthPayload;
      if (decoded.type === "CUSTOMER") req.customer = decoded;
    } catch {}
  }
  next();
}

export const customerRouter = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => getClientIp(req),
  message: { error: "Juda ko'p urinish. 15 daqiqadan keyin qayta urinib ko'ring." },
});

// Qat'iy SMS OTP limiter (SMS byudjetini himoya qilish)
const customerOtpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => getClientIp(req),
  message: { error: "SMS kod so'rash limiti oshdi. Iltimos, 10 daqiqadan keyin urinib ko'ring." },
});

// Parol bilan kirish urinishlarini cheklash (brute-force himoyasi)
const customerLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => getClientIp(req),
  message: { error: "Kirish urinishlari ko'payib ketdi. 15 daqiqadan keyin qayta urinib ko'ring." },
});

function createCustomerToken(c: { id: number; phone: string; name: string }) {
  const payload: CustomerAuthPayload = {
    id: c.id,
    type: "CUSTOMER",
    phone: c.phone,
    name: c.name,
  };
  return jwt.sign(payload, config.customerJwtSecret, { expiresIn: "30d" });
}

// 1. Telefon raqamiga OTP SMS yuborish
customerRouter.post("/auth/send-otp", customerOtpLimiter, async (req, res) => {
  const { phone: raw, captchaToken } = z
    .object({
      phone: z.string().max(30),
      captchaToken: z.string().optional(),
    })
    .parse(req.body);

  const phone = normalizePhone(raw);
  if (!phone) throw new HttpError(400, "Telefon raqami noto'g'ri. Misol: +998 90 123 45 67");

  // Agar mijoz allaqachon ro'yxatdan o'tgan bo'lsa va paroli bo'lsa, ro'yxatdan o'tish uchun SMS yuborilmaydi!
  const existing = await prisma.customer.findUnique({ where: { phone } });
  if (existing && existing.passwordHash) {
    throw new HttpError(
      400,
      "Ushbu telefon raqami allaqachon ro'yxatdan o'tgan. Iltimos, 'Kirish' bo'limi orqali parolingiz bilan kiring."
    );
  }

  const ip = getClientIp(req);
  await assertNotBlocked(phone, ip);

  // 1. Cloudflare Turnstile captcha (agar sozlangan bo'lsa)
  await verifyTurnstile(captchaToken, ip);

  // 2. Eskiz SMS balansi va IP kunlik limiti
  await assertSmsBudgetAvailable(ip);

  // 3. Qayta yuborish oralig'i (60s) va 1 soatlik telefon limiti
  const last = await prisma.otpCode.findFirst({ where: { phone }, orderBy: { createdAt: "desc" } });
  if (last && Date.now() - last.createdAt.getTime() < 60_000) {
    throw new HttpError(429, "Kodni qayta yuborish uchun 1 daqiqa kuting.");
  }

  const hourly = await prisma.otpCode.count({
    where: { phone, createdAt: { gt: new Date(Date.now() - 3600_000) } },
  });
  if (hourly >= config.hourlyPhoneOtpLimit) {
    throw new HttpError(
      429,
      `Bir soatda ${config.hourlyPhoneOtpLimit} tadan ortiq kod so'rab bo'lmaydi. Keyinroq urinib ko'ring.`
    );
  }

  const code = String(crypto.randomInt(100000, 1000000));

  // SMS jo'natish (Eskiz rasmiy tasdiqlangan shabloni bo'yicha)
  try {
    await sendSms(phone, `Kodni hech kimga bermang! Medax saytiga kirish uchun tasdiqlash kodi: ${code}`);
  } catch (err: any) {
    console.error("SMS jo'natishda xatolik:", err);
    if (config.smsProvider === "eskiz") {
      throw new HttpError(503, "SMS xizmatida vaqtinchalik nosozlik. Iltimos, birozdan so'ng qayta urinib ko'ring.");
    }
  }

  await prisma.otpCode.create({
    data: {
      phone,
      codeHash: hashCode(phone, code),
      ip,
      expiresAt: new Date(Date.now() + config.otpTtlMin * 60_000),
    },
  });

  res.json({ ok: true, resendIn: 60 });
});

// 2. Telefon raqam + OTP orqali kirish / ro'yxatdan o'tish (parol bilan yoki parolsiz)
customerRouter.post("/auth/verify-otp", authLimiter, async (req, res) => {
  const { phone: raw, code, name, organization, password } = z
    .object({
      phone: z.string().max(30),
      code: z.string().regex(/^\d{6}$/, "Kod 6 ta raqamdan iborat"),
      name: z.string().trim().max(80).optional(),
      organization: z.string().trim().max(120).optional(),
      password: z.string().min(6, "Parol kamida 6 belgidan iborat bo'lishi kerak").max(100).optional(),
    })
    .parse(req.body);

  const phone = normalizePhone(raw);
  if (!phone) throw new HttpError(400, "Telefon raqami noto'g'ri.");

  const otp = await prisma.otpCode.findFirst({
    where: { phone, usedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });

  if (!otp) throw new HttpError(400, "Tasdiqlash kodi eskirgan yoki topilmadi. Yangi kod so'rang.");
  if (otp.attempts >= 5) throw new HttpError(429, "Kod ko'p marta noto'g'ri kiritildi. Yangi kod so'rang.");
  if (otp.codeHash !== hashCode(phone, code)) {
    await prisma.otpCode.update({ where: { id: otp.id }, data: { attempts: { increment: 1 } } });
    throw new HttpError(400, "Tasdiqlash kodi noto'g'ri.");
  }

  await prisma.otpCode.update({ where: { id: otp.id }, data: { usedAt: new Date() } });

  const passwordHash = password ? await bcrypt.hash(password, 10) : undefined;

  // Mijozni topamiz yoki yangi ro'yxatdan o'tkazamiz
  let customer = await prisma.customer.findUnique({ where: { phone } });
  if (!customer) {
    customer = await prisma.customer.create({
      data: {
        phone,
        name: name || `Mijoz (${phone.slice(-4)})`,
        organization: organization || "",
        ...(passwordHash ? { passwordHash } : {}),
      },
    });
  } else if (passwordHash || name || organization) {
    customer = await prisma.customer.update({
      where: { id: customer.id },
      data: {
        ...(passwordHash ? { passwordHash } : {}),
        ...(name ? { name } : {}),
        ...(organization !== undefined ? { organization } : {}),
      },
    });
  }

  const token = createCustomerToken({ id: customer.id, phone: customer.phone || phone, name: customer.name });
  res.json({
    ok: true,
    token,
    customer: {
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      organization: customer.organization,
      avatar: customer.avatar,
      hasPassword: Boolean(customer.passwordHash),
    },
  });
});

// 3. Telefon raqam + Parol orqali kirish (SMS siz tezkor kirish)
customerRouter.post("/auth/login", customerLoginLimiter, async (req, res) => {
  const { phone: raw, password } = z
    .object({
      phone: z.string().trim().min(3, "Telefon raqamini kiriting").max(30),
      password: z.string().min(1, "Parolni kiriting"),
    })
    .parse(req.body);

  const phone = normalizePhone(raw);
  if (!phone) throw new HttpError(400, "Telefon raqami noto'g'ri formatda.");

  const customer = await prisma.customer.findUnique({ where: { phone } });
  if (!customer) {
    throw new HttpError(400, "Ushbu telefon raqamiga ega mijoz topilmadi. Iltimos, ro'yxatdan o'ting.");
  }

  if (!customer.passwordHash) {
    throw new HttpError(
      400,
      "Ushbu akkauntda hali parol o'rnatilmagan. Iltimos, 'SMS orqali kirish' tugmasidan foydalaning va parolingizni belgilang."
    );
  }

  const valid = await bcrypt.compare(password, customer.passwordHash);
  if (!valid) {
    throw new HttpError(400, "Telefon raqam yoki parol noto'g'ri.");
  }

  const token = createCustomerToken({ id: customer.id, phone: customer.phone || phone, name: customer.name });
  res.json({
    ok: true,
    token,
    customer: {
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      organization: customer.organization,
      avatar: customer.avatar,
      hasPassword: true,
    },
  });
});

// 3a. Telefon raqam holatini tekshirish
customerRouter.post("/auth/check-phone", async (req, res) => {
  const { phone: raw } = z.object({ phone: z.string().max(30) }).parse(req.body);
  const phone = normalizePhone(raw);
  if (!phone) throw new HttpError(400, "Telefon raqami noto'g'ri.");
  const customer = await prisma.customer.findUnique({ where: { phone } });
  res.json({
    exists: Boolean(customer),
    hasPassword: Boolean(customer?.passwordHash),
  });
});

// 3b. Parolni unutganda SMS kod yuborish (12 soatda 1 marta limit bilan)
customerRouter.post("/auth/forgot-password-otp", customerOtpLimiter, async (req, res) => {
  const { phone: raw, captchaToken } = z
    .object({
      phone: z.string().max(30),
      captchaToken: z.string().optional(),
    })
    .parse(req.body);

  const phone = normalizePhone(raw);
  if (!phone) throw new HttpError(400, "Telefon raqami noto'g'ri formatda.");

  const customer = await prisma.customer.findUnique({ where: { phone } });
  if (!customer) {
    throw new HttpError(404, "Ushbu telefon raqamiga ega mijoz topilmadi. Iltimos, ro'yxatdan o'ting.");
  }

  const ip = getClientIp(req);
  await assertNotBlocked(phone, ip);
  await verifyTurnstile(captchaToken, ip);

  // 12 soatda 1 marta urinish qoidasi:
  const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;
  if (customer.resetPasswordOtpSentAt) {
    const elapsed = Date.now() - customer.resetPasswordOtpSentAt.getTime();
    if (elapsed < TWELVE_HOURS_MS) {
      const remainingMs = TWELVE_HOURS_MS - elapsed;
      const hours = Math.floor(remainingMs / (60 * 60 * 1000));
      const minutes = Math.ceil((remainingMs % (60 * 60 * 1000)) / (60 * 1000));
      const timeText = hours > 0 ? `${hours} soat ${minutes} daqiqa` : `${minutes} daqiqa`;
      throw new HttpError(
        429,
        `Parolni tiklash uchun SMS 12 soatda faqat 1 marta yuboriladi. Iltimos, ${timeText}dan so'ng qayta urinib ko'ring.`
      );
    }
  }

  // Eskiz SMS balansi va limitlar
  await assertSmsBudgetAvailable(ip);

  const code = String(crypto.randomInt(100000, 1000000));

  try {
    await sendSms(phone, `Kodni hech kimga bermang! Medax saytiga kirish uchun tasdiqlash kodi: ${code}`);
  } catch (err: any) {
    console.error("SMS jo'natishda xatolik:", err);
    if (config.smsProvider === "eskiz") {
      throw new HttpError(503, "SMS xizmatida vaqtinchalik nosozlik. Iltimos, birozdan so'ng qayta urinib ko'ring.");
    }
  }

  await prisma.otpCode.create({
    data: {
      phone,
      codeHash: hashCode(phone, code),
      ip,
      expiresAt: new Date(Date.now() + config.otpTtlMin * 60_000),
    },
  });

  await prisma.customer.update({
    where: { id: customer.id },
    data: { resetPasswordOtpSentAt: new Date() },
  });

  res.json({ ok: true, message: "Tasdiqlash kodi telefoningizga yuborildi." });
});

// 3c. SMS kod orqali parolni tiklash va yangilash
customerRouter.post("/auth/reset-password", authLimiter, async (req, res) => {
  const { phone: raw, code, newPassword } = z
    .object({
      phone: z.string().max(30),
      code: z.string().regex(/^\d{6}$/, "Kod 6 ta raqamdan iborat"),
      newPassword: z.string().min(6, "Parol kamida 6 belgidan iborat bo'lishi kerak").max(100),
    })
    .parse(req.body);

  const phone = normalizePhone(raw);
  if (!phone) throw new HttpError(400, "Telefon raqami noto'g'ri.");

  const customer = await prisma.customer.findUnique({ where: { phone } });
  if (!customer) throw new HttpError(404, "Mijoz topilmadi.");

  const otp = await prisma.otpCode.findFirst({
    where: { phone, usedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });

  if (!otp) throw new HttpError(400, "Tasdiqlash kodi eskirgan yoki topilmadi. Yangi kod so'rang.");
  if (otp.attempts >= 5) throw new HttpError(429, "Kod ko'p marta noto'g'ri kiritildi. Qayta urinib ko'ring.");
  if (otp.codeHash !== hashCode(phone, code)) {
    await prisma.otpCode.update({ where: { id: otp.id }, data: { attempts: { increment: 1 } } });
    throw new HttpError(400, "Tasdiqlash kodi noto'g'ri.");
  }

  await prisma.otpCode.update({ where: { id: otp.id }, data: { usedAt: new Date() } });

  const passwordHash = await bcrypt.hash(newPassword, 10);
  const updated = await prisma.customer.update({
    where: { id: customer.id },
    data: { passwordHash },
  });

  const token = createCustomerToken({ id: updated.id, phone: updated.phone || phone, name: updated.name });
  res.json({
    ok: true,
    token,
    customer: {
      id: updated.id,
      name: updated.name,
      phone: updated.phone,
      organization: updated.organization,
      avatar: updated.avatar,
      hasPassword: true,
    },
  });
});

// 4. Joriy mijoz ma'lumotlari
customerRouter.get("/auth/me", requireCustomerAuth, async (req, res) => {
  const customer = await prisma.customer.findUnique({
    where: { id: req.customer!.id },
    select: {
      id: true,
      name: true,
      phone: true,
      organization: true,
      avatar: true,
      passwordHash: true,
      createdAt: true,
    },
  });
  if (!customer) throw new HttpError(404, "Mijoz topilmadi");

  const { passwordHash, ...rest } = customer;
  res.json({ customer: { ...rest, hasPassword: Boolean(passwordHash) } });
});

// 5. Profilni tahrirlash (Ism, tashkilot, avatar)
customerRouter.put("/auth/profile", requireCustomerAuth, async (req, res) => {
  const { name, organization, avatar } = z
    .object({
      name: z.string().trim().min(2, "Ismni kiriting").max(80),
      organization: z.string().trim().max(120).optional(),
      avatar: z.string().max(2000000).optional(),
    })
    .parse(req.body);

  const updated = await prisma.customer.update({
    where: { id: req.customer!.id },
    data: {
      name,
      organization: organization || "",
      ...(avatar !== undefined ? { avatar: avatar || null } : {}),
    },
    select: { id: true, name: true, phone: true, organization: true, avatar: true, passwordHash: true },
  });

  const { passwordHash, ...rest } = updated;
  res.json({ ok: true, customer: { ...rest, hasPassword: Boolean(passwordHash) } });
});

// 5b. Profil rasmini (avatar) yuklash
customerRouter.post("/auth/avatar", requireCustomerAuth, memoryUpload.single("avatar"), async (req, res) => {
  if (!req.file) throw new HttpError(400, "Rasm tanlanmagan");
  const avatarUrl = await saveAvatar(req.file.buffer);
  const updated = await prisma.customer.update({
    where: { id: req.customer!.id },
    data: { avatar: avatarUrl },
    select: { id: true, name: true, phone: true, organization: true, avatar: true },
  });
  res.json({ ok: true, avatar: avatarUrl, customer: updated });
});

// 6. Parolni o'zgartirish yoki yangi parol o'rnatish
customerRouter.put("/auth/password", requireCustomerAuth, async (req, res) => {
  const { currentPassword, newPassword } = z
    .object({
      currentPassword: z.string().optional(),
      newPassword: z.string().min(6, "Yangi parol kamida 6 belgidan iborat bo'lishi kerak").max(100),
    })
    .parse(req.body);

  const customer = await prisma.customer.findUnique({ where: { id: req.customer!.id } });
  if (!customer) throw new HttpError(404, "Mijoz topilmadi");

  if (customer.passwordHash) {
    if (!currentPassword) {
      throw new HttpError(400, "Joriy parolingizni kiriting.");
    }
    const match = await bcrypt.compare(currentPassword, customer.passwordHash);
    if (!match) throw new HttpError(400, "Joriy parol noto'g'ri.");
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await prisma.customer.update({
    where: { id: customer.id },
    data: { passwordHash },
  });

  res.json({ ok: true, message: "Parol muvaffaqiyatli saqlandi ✓" });
});

// 5. Mijozning buyurtmalar tarixi (Faqat o'zining tasdiqlangan ID va telefon raqami bo'yicha)
customerRouter.get("/orders", requireCustomerAuth, async (req, res) => {
  const customerId = req.customer!.id;
  const phone = req.customer!.phone;

  const orders = await prisma.order.findMany({
    where: {
      OR: [{ customerId }, ...(phone ? [{ phone }] : [])],
    },
    orderBy: { createdAt: "desc" },
    include: {
      items: {
        include: {
          product: {
            select: { id: true, name: true, slug: true, images: { take: 1, select: { thumbUrl: true } } },
          },
        },
      },
    },
  });

  const mapped = orders.map((o) => ({
    ...o,
    cancelReason: o.status === "CANCELED" ? o.managerNote : undefined,
  }));

  res.json({ orders: mapped });
});

// 6. Mijoz o'zining yangi buyurtmasini bekor qilishi
customerRouter.post("/orders/:id/cancel", requireCustomerAuth, async (req, res) => {
  const orderId = Number(req.params.id);
  if (!orderId || isNaN(orderId)) throw new HttpError(400, "Noto'g'ri buyurtma ID");

  const { reason } = z
    .object({
      reason: z.string().trim().min(3, "Bekor qilish sababini yozing").max(500),
    })
    .parse(req.body);

  const customerId = req.customer!.id;
  const phone = req.customer!.phone;

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw new HttpError(404, "Buyurtma topilmadi");

  // Faqat buyurtma egasi bekor qila oladi
  const isOwner = order.customerId === customerId || (phone && order.phone === phone);
  if (!isOwner) throw new HttpError(403, "Bu buyurtmaga kirish huquqingiz yo'q");

  if (order.status !== "NEW") {
    throw new HttpError(
      400,
      "Faqat yangi (kutilayotgan) buyurtmani bekor qilish mumkin. Ko'rib chiqilgan buyurtma bo'yicha qo'llab-quvvatlash xizmatiga bog'laning."
    );
  }

  const updated = await prisma.order.update({
    where: { id: orderId },
    data: {
      status: "CANCELED",
      managerNote: `Mijoz tomonidan bekor qilindi. Sababi: ${reason}`,
    },
  });

  res.json({ ok: true, order: updated });
});

// 7. Mobil ilova Push Tokenini saqlash
customerRouter.post("/auth/push-token", requireCustomerAuth, async (req, res) => {
  const { pushToken } = z.object({ pushToken: z.string().trim().min(5).max(255) }).parse(req.body);
  await prisma.customer.update({
    where: { id: req.customer!.id },
    data: {
      pushToken,
      hasApp: true,
    },
  });
  res.json({ ok: true, message: "Push token saqlandi" });
});

// 8. Mijozning bildirishnomalari ro'yxati
customerRouter.get("/notifications", requireCustomerAuth, async (req, res) => {
  const customerId = req.customer!.id;
  const phone = req.customer!.phone;

  const notifications = await prisma.notification.findMany({
    where: {
      OR: [{ customerId }, ...(phone ? [{ phone }] : [])],
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const unreadCount = notifications.filter((n) => !n.isRead).length;
  res.json({ notifications, unreadCount });
});

// 9. Barcha bildirishnomalarni o'qilgan deb belgilash
customerRouter.post("/notifications/read-all", requireCustomerAuth, async (req, res) => {
  const customerId = req.customer!.id;
  const phone = req.customer!.phone;

  await prisma.notification.updateMany({
    where: {
      OR: [{ customerId }, ...(phone ? [{ phone }] : [])],
      isRead: false,
    },
    data: { isRead: true },
  });

  res.json({ ok: true });
});
