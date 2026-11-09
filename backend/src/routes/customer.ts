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
import { avatarUpload, removeFile, saveAvatar } from "../upload";

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

function extractCustomerToken(req: Request): string {
  const h =
    req.headers.authorization ||
    (req.headers["x-authorization"] as string) ||
    (req.headers["x-customer-token"] as string) ||
    (req.headers["x-access-token"] as string) ||
    "";
  return h.startsWith("Bearer ") ? h.slice(7).trim() : h.trim();
}

/**
 * Tokenni tekshiradi va mijoz bazada hali ham mavjudligini tasdiqlaydi.
 * Hisob o'chirilgan yoki telefon olib tashlangan bo'lsa — token yaroqsiz.
 * Telefon va ism tokendan emas, bazadan olinadi (eskirgan ma'lumot ishlatilmaydi).
 */
async function resolveCustomer(token: string): Promise<CustomerAuthPayload | null> {
  let decoded: CustomerAuthPayload & { iat?: number };
  try {
    decoded = jwt.verify(token, config.customerJwtSecret) as CustomerAuthPayload & { iat?: number };
  } catch {
    return null;
  }
  if (!decoded || decoded.type !== "CUSTOMER" || !decoded.id) return null;
  const row = await prisma.customer.findUnique({
    where: { id: decoded.id },
    select: { id: true, phone: true, name: true, passwordChangedAt: true },
  });
  if (!row || !row.phone) return null;
  // Parol almashtirilgandan oldin berilgan tokenlar (masalan, o'g'irlangan telefondagi sessiya) yaroqsiz
  if (row.passwordChangedAt && (decoded.iat ?? 0) < Math.floor(row.passwordChangedAt.getTime() / 1000)) return null;
  return { id: row.id, type: "CUSTOMER", phone: row.phone, name: row.name };
}

export async function requireCustomerAuth(req: Request, _res: Response, next: NextFunction) {
  const token = extractCustomerToken(req);
  if (!token) return next(new HttpError(401, "Iltimos, tizimga kiring"));
  try {
    const c = await resolveCustomer(token);
    if (!c) return next(new HttpError(401, "Sessiya eskirgan. Qayta kiring"));
    req.customer = c;
    next();
  } catch (err) {
    next(err);
  }
}

export async function optionalCustomerAuth(req: Request, _res: Response, next: NextFunction) {
  const token = extractCustomerToken(req);
  if (!token) return next();
  try {
    const c = await resolveCustomer(token);
    if (c) req.customer = c;
    next();
  } catch (err) {
    next(err);
  }
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

// Parol bilan kirish urinishlarini cheklash (brute-force himoyasi: IP + Telefon bo'yicha)
const customerLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const rawPhone = (req.body && typeof req.body.phone === "string") ? req.body.phone.replace(/\D/g, "") : "";
    return `${getClientIp(req)}_${rawPhone}`;
  },
  message: { error: "Kirish urinishlari ko'payib ketdi. 15 daqiqadan keyin qayta urinib ko'ring." },
});

// Bitta raqamga turli IP'lardan parol tanlashni cheklash
const customerPhoneLoginLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const raw = req.body && typeof req.body.phone === "string" ? req.body.phone : "";
    return "phone:" + (normalizePhone(raw) || raw.replace(/\D/g, ""));
  },
  message: { error: "Bu raqamga juda ko'p kirish urinishi bo'ldi. 1 soatdan keyin urinib ko'ring." },
});

// Profil rasmini yuklash limiti (xotira va disk to'lishidan himoya)
const avatarLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => getClientIp(req),
  message: { error: "Rasm yuklash limiti oshdi. 15 daqiqadan keyin urinib ko'ring." },
});

function validatePasswordStrength(pwd: string) {
  if (pwd.length < 6) {
    throw new HttpError(400, "Parol kamida 6 belgidan iborat bo'lishi kerak.");
  }
  const weakPasswords = ["123456", "12345678", "111111", "000000", "password", "qwerty", "medax123"];
  if (weakPasswords.includes(pwd.toLowerCase())) {
    throw new HttpError(400, "Bu parol juda oddiy. Iltimos, xavfsizroq parol tanlang.");
  }
}

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

  // Agar mijoz allaqachon ro'yxatdan o'tgan bo'lsa, qayta ro'yxatdan o'tish uchun kod yuborilmaydi!
  const existing = await prisma.customer.findUnique({ where: { phone } });
  if (existing) {
    if (existing.passwordHash) {
      throw new HttpError(
        400,
        "Ushbu telefon raqami allaqachon ro'yxatdan o'tgan. Iltimos, 'Kirish' bo'limi orqali parolingiz bilan kiring."
      );
    } else {
      throw new HttpError(
        400,
        "Ushbu telefon raqami allaqachon ro'yxatdan o'tgan. Iltimos, 'Kirish' bo'limi orqali kiring (parol o'rnatish uchun 'Parolni unutdim' tugmasidan foydalaning)."
      );
    }
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
      purpose: "AUTH",
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
    where: { phone, purpose: "AUTH", usedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });

  if (!otp) throw new HttpError(400, "Tasdiqlash kodi eskirgan yoki topilmadi. Yangi kod so'rang.");
  if (otp.attempts >= 5) throw new HttpError(429, "Kod ko'p marta noto'g'ri kiritildi. Yangi kod so'rang.");
  if (otp.codeHash !== hashCode(phone, code)) {
    await prisma.otpCode.update({ where: { id: otp.id }, data: { attempts: { increment: 1 } } });
    throw new HttpError(400, "Tasdiqlash kodi noto'g'ri.");
  }

  await prisma.otpCode.update({ where: { id: otp.id }, data: { usedAt: new Date() } });

  if (password) {
    validatePasswordStrength(password);
  }
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
        ...(passwordHash ? { passwordHash, passwordChangedAt: new Date() } : {}),
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
customerRouter.post("/auth/login", customerLoginLimiter, customerPhoneLoginLimiter, async (req, res) => {
  const { phone: raw, password } = z
    .object({
      phone: z.string().trim().min(3, "Telefon raqamini kiriting").max(30),
      password: z.string().min(1, "Parolni kiriting"),
    })
    .parse(req.body);

  const phone = normalizePhone(raw);
  if (!phone) throw new HttpError(400, "Telefon raqami noto'g'ri formatda.");

  const customer = await prisma.customer.findUnique({ where: { phone } });
  if (!customer || !customer.passwordHash) {
    throw new HttpError(400, "Telefon raqam yoki parol noto'g'ri.");
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
customerRouter.post("/auth/check-phone", authLimiter, async (req, res) => {
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

  // Qisqa takroriy so'rovlardan himoya (60 soniya kutish vaqti):
  const COOLDOWN_MS = 60 * 1000;
  if (customer.resetPasswordOtpSentAt) {
    const elapsed = Date.now() - customer.resetPasswordOtpSentAt.getTime();
    if (elapsed < COOLDOWN_MS) {
      const remainingSec = Math.ceil((COOLDOWN_MS - elapsed) / 1000);
      throw new HttpError(
        429,
        `Yangi tasdiqlash kodi so'rash uchun ${remainingSec} soniya kuting.`
      );
    }
  }

  // Eskiz SMS balansi va limitlar
  await assertSmsBudgetAvailable(ip);

  // Bitta raqamga soatlik SMS limiti (SMS-bombing himoyasi)
  const hourlyReset = await prisma.otpCode.count({
    where: { phone, createdAt: { gt: new Date(Date.now() - 3600_000) } },
  });
  if (hourlyReset >= config.hourlyPhoneOtpLimit) {
    throw new HttpError(429, `Bir soatda ${config.hourlyPhoneOtpLimit} tadan ortiq kod so'rab bo'lmaydi. Keyinroq urinib ko'ring.`);
  }

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
      purpose: "RESET_PASSWORD",
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
    where: { phone, purpose: "RESET_PASSWORD", usedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });

  if (!otp) throw new HttpError(400, "Tasdiqlash kodi eskirgan yoki topilmadi. Yangi kod so'rang.");
  if (otp.attempts >= 5) throw new HttpError(429, "Kod ko'p marta noto'g'ri kiritildi. Qayta urinib ko'ring.");
  if (otp.codeHash !== hashCode(phone, code)) {
    await prisma.otpCode.update({ where: { id: otp.id }, data: { attempts: { increment: 1 } } });
    throw new HttpError(400, "Tasdiqlash kodi noto'g'ri.");
  }

  await prisma.otpCode.update({ where: { id: otp.id }, data: { usedAt: new Date() } });

  validatePasswordStrength(newPassword);
  const passwordHash = await bcrypt.hash(newPassword, 10);
  const updated = await prisma.customer.update({
    where: { id: customer.id },
    data: { passwordHash, passwordChangedAt: new Date() },
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
      // Xavfsizlik: avatar faqat /auth/avatar orqali yuklanadi. Bu yerda faqat o'chirish (null/"") mumkin,
      // aks holda mijoz istalgan /uploads/... yo'lini yozib, keyin uni serverdan o'chirtira oladi.
      avatar: z.union([z.literal(""), z.null()]).optional(),
    })
    .parse(req.body);

  if (avatar !== undefined) {
    const prev = await prisma.customer.findUnique({ where: { id: req.customer!.id }, select: { avatar: true } });
    if (prev?.avatar && prev.avatar.startsWith("/uploads/avatars/")) {
      await removeFile(prev.avatar).catch(() => {});
    }
  }

  const updated = await prisma.customer.update({
    where: { id: req.customer!.id },
    data: {
      name,
      organization: organization || "",
      ...(avatar !== undefined ? { avatar: null } : {}),
    },
    select: { id: true, name: true, phone: true, organization: true, avatar: true, passwordHash: true },
  });

  const { passwordHash, ...rest } = updated;
  res.json({ ok: true, customer: { ...rest, hasPassword: Boolean(passwordHash) } });
});

// 5b. Profil rasmini (avatar) yuklash
customerRouter.post("/auth/avatar", requireCustomerAuth, avatarLimiter, avatarUpload.single("avatar"), async (req, res) => {
  if (!req.file) throw new HttpError(400, "Rasm tanlanmagan");

  const existing = await prisma.customer.findUnique({
    where: { id: req.customer!.id },
    select: { avatar: true },
  });

  const avatarUrl = await saveAvatar(req.file.buffer);

  // Oldingi rasmni diskdan o'chirib, disk to'lib ketishini oldini olamiz
  if (existing?.avatar && existing.avatar.startsWith("/uploads/avatars/")) {
    await removeFile(existing.avatar).catch(() => {});
  }

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

  validatePasswordStrength(newPassword);
  const passwordHash = await bcrypt.hash(newPassword, 10);
  const changed = await prisma.customer.update({
    where: { id: customer.id },
    data: { passwordHash, passwordChangedAt: new Date() },
  });

  // Boshqa qurilmalardagi sessiyalar yopiladi, joriy qurilma uchun yangi token beriladi
  const token = createCustomerToken({ id: changed.id, phone: changed.phone || "", name: changed.name });
  res.json({ ok: true, token, message: "Parol muvaffaqiyatli saqlandi" });
});

// 6b. Hisobni butunlay o'chirish (Google Play / App Store talabi: ilova ichidan hisobni o'chirish)
customerRouter.delete("/auth/account", requireCustomerAuth, authLimiter, async (req, res) => {
  const { password } = z.object({ password: z.string().max(100).optional() }).parse(req.body || {});

  const customer = await prisma.customer.findUnique({
    where: { id: req.customer!.id },
    include: { _count: { select: { erpDocuments: true, cashEntries: true } } },
  });
  if (!customer) throw new HttpError(404, "Mijoz topilmadi");

  // Parol o'rnatilgan bo'lsa, o'chirishdan oldin tasdiqlash shart (o'g'irlangan telefon/token himoyasi)
  if (customer.passwordHash) {
    if (!password) throw new HttpError(400, "Hisobni o'chirish uchun parolingizni kiriting.");
    const ok = await bcrypt.compare(password, customer.passwordHash);
    if (!ok) throw new HttpError(400, "Parol noto'g'ri.");
  }

  if (customer.avatar && customer.avatar.startsWith("/uploads/avatars/")) {
    await removeFile(customer.avatar).catch(() => {});
  }

  const hasAccounting =
    customer._count.erpDocuments > 0 || customer._count.cashEntries > 0 || Number(customer.balance) !== 0;

  if (hasAccounting) {
    // Buxgalteriya hujjatlari qonun bo'yicha saqlanadi: kirish ma'lumotlari va shaxsiy kontaktlar o'chiriladi
    await prisma.$transaction([
      prisma.notification.deleteMany({ where: { customerId: customer.id } }),
      prisma.customer.update({
        where: { id: customer.id },
        data: {
          phone: null,
          passwordHash: null,
          avatar: null,
          pushToken: null,
          hasApp: false,
          resetPasswordOtpSentAt: null,
        },
      }),
    ]);
  } else {
    // Buyurtmalar tarixida customerId avtomatik NULL bo'ladi (onDelete: SetNull), bildirishnomalar o'chadi (Cascade)
    await prisma.customer.delete({ where: { id: customer.id } });
  }

  res.json({ ok: true, message: "Hisobingiz o'chirildi." });
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
            select: { id: true, name: true, slug: true, images: { take: 1, select: { url: true, thumbUrl: true } } },
          },
        },
      },
    },
  });

  // Faqat mijozga tegishli maydonlar: menejer izohi, IP, ichki belgilar (flags) tashqariga chiqmaydi.
  // "FAKE" — ichki belgi, mijozga oddiy "bekor qilindi" sifatida ko'rinadi.
  const mapped = orders.map((o) => ({
    id: o.id,
    code: o.code,
    status: o.status === "FAKE" ? "CANCELED" : o.status,
    customerName: o.customerName,
    organization: o.organization,
    deliveryAddress: o.deliveryAddress,
    paymentMethod: o.paymentMethod,
    comment: o.comment,
    totalAmount: o.totalAmount,
    isPaid: o.isPaid,
    paidAt: o.paidAt,
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
    items: o.items.map((it) => ({
      id: it.id,
      productId: it.productId,
      productName: it.productName,
      quantity: it.quantity,
      price: it.price,
      product: it.product,
    })),
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

  res.json({ ok: true, order: { id: updated.id, code: updated.code, status: updated.status } });
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

// 7b. Chiqishda Push Tokenini tozalash (oldingi akkauntga boshqa odamning xabarlari bormasligi uchun)
customerRouter.delete("/auth/push-token", requireCustomerAuth, async (req, res) => {
  await prisma.customer.update({
    where: { id: req.customer!.id },
    data: {
      pushToken: null,
    },
  });
  res.json({ ok: true, message: "Push token o'chirildi" });
});

// 8. Mijozning bildirishnomalari ro'yxati
customerRouter.get("/notifications", requireCustomerAuth, async (req, res) => {
  const customerId = req.customer!.id;
  const phone = req.customer!.phone;
  const cleanDigits = phone ? phone.replace(/\D/g, "") : "";
  const last9 = cleanDigits.slice(-9);

  const notifications = await prisma.notification.findMany({
    where: {
      OR: [
        { customerId },
        ...(phone ? [{ phone }] : []),
        ...(cleanDigits ? [{ phone: cleanDigits }, { phone: `+${cleanDigits}` }] : []),
        ...(last9 ? [{ phone: { endsWith: last9 } }] : []),
      ],
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
