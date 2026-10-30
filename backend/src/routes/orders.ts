import { Router } from "express";
import { Prisma } from "@prisma/client";
import rateLimit from "express-rate-limit";
import crypto from "crypto";
import { z } from "zod";
import { prisma } from "../db";
import { config } from "../config";
import { HttpError } from "../errors";
import { sendSms } from "../sms";
import {
  assertNotBlocked,
  assertSmsBudgetAvailable,
  checkOrderLimits,
  customerFlags,
  hashCode,
  hasLink,
  normalizePhone,
  verifyTurnstile,
} from "../antispam";
import { optionalCustomerAuth } from "./customer";
import { getClientIp } from "../ip";

export const ordersRouter = Router();

const limitMsg = { error: "Juda koʻp urinish. Birozdan keyin qayta urinib koʻring." };
const otpIpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 6,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => getClientIp(req),
  message: limitMsg,
});
const orderIpLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 15,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => getClientIp(req),
  message: limitMsg,
});

const PHONE_ERR = "Telefon raqami notoʻgʻri. Misol: +998 90 123 45 67";

// 1-qadam: telefonga tasdiqlash kodi yuborish
ordersRouter.post("/otp", otpIpLimiter, async (req, res) => {
  const { phone: raw, captchaToken } = z
    .object({
      phone: z.string().max(30),
      captchaToken: z.string().optional(),
    })
    .parse(req.body);

  const phone = normalizePhone(raw);
  if (!phone) throw new HttpError(400, PHONE_ERR);

  const ip = getClientIp(req);
  await assertNotBlocked(phone, ip);

  // 1. Cloudflare Turnstile captcha (agar sozlangan bo'lsa)
  await verifyTurnstile(captchaToken, ip);

  // 2. Eskiz SMS balansi va IP kunlik limiti
  await assertSmsBudgetAvailable(ip);

  // 3. Daqiqalik va soatlik limitlar
  const last = await prisma.otpCode.findFirst({ where: { phone }, orderBy: { createdAt: "desc" } });
  if (last && Date.now() - last.createdAt.getTime() < 60_000) {
    throw new HttpError(429, "Kodni qayta yuborish uchun 1 daqiqa kuting.");
  }
  const hourly = await prisma.otpCode.count({
    where: { phone, createdAt: { gt: new Date(Date.now() - 3600_000) } },
  });
  if (hourly >= config.hourlyPhoneOtpLimit) {
    throw new HttpError(429, `Bir soatda ${config.hourlyPhoneOtpLimit} tadan ortiq kod soʻrab boʻlmaydi.`);
  }

  const code = String(crypto.randomInt(100000, 1000000));

  // SMS jo'natish (Eskiz rasmiy tasdiqlangan buyurtma shabloni bo'yicha)
  try {
    await sendSms(phone, `Medax saytida buyurtmani tasdiqlash uchun tasdiqlash kodi: ${code}. Kodni hech kimga bermang.`);
  } catch (err: any) {
    console.error("SMS yuborishda xatolik:", err);
    if (config.smsProvider === "eskiz") {
      throw new HttpError(503, "SMS xizmatida vaqtinchalik nosozlik. Iltimos, keyinroq urinib ko'ring.");
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

const orderSchema = z.object({
  name: z.string().trim().min(2, "Ismni kiriting").max(80),
  phone: z.string().max(30),
  organization: z.string().trim().max(120).default(""),
  deliveryAddress: z.string().trim().max(300).default(""),
  paymentMethod: z.string().trim().max(60).default(""),
  comment: z.string().trim().max(1000).default(""),
  items: z
    .array(z.object({ productId: z.number().int().positive(), quantity: z.number().int().min(1).max(100) }))
    .min(1, "Roʻyxat boʻsh")
    .max(20, "Bitta buyurtmada 20 tagacha mahsulot boʻlishi mumkin"),
  code: z.string().regex(/^\d{6}$/, "Kod 6 ta raqamdan iborat").optional(),
  website: z.string().default(""), // honeypot
  elapsedMs: z.number().default(0),
});

// 2-qadam: buyurtmani tasdiqlash (Atomar tranzaksiya bilan)
ordersRouter.post("/", orderIpLimiter, optionalCustomerAuth, async (req, res) => {
  const body = orderSchema.parse(req.body);

  // Bot tuzogʻi: jim muvaffaqiyat koʻrsatamiz
  if (body.website) return void res.json({ ok: true, code: "MDX-" + crypto.randomBytes(3).toString("hex").toUpperCase() });
  if (body.elapsedMs < 2000) throw new HttpError(400, "Soʻrov juda tez yuborildi. Qayta urinib koʻring.");

  // Xavfsizlik: agar mijoz tizimga kirgan bo'lsa, uning tasdiqlangan telefon raqami qat'iy ishlatiladi
  let phone: string;
  if (req.customer) {
    if (!req.customer.phone) {
      throw new HttpError(400, "Profilga telefon raqam biriktirilmagan.");
    }
    phone = req.customer.phone;
  } else {
    const norm = normalizePhone(body.phone);
    if (!norm) throw new HttpError(400, PHONE_ERR);
    phone = norm;
  }

  const ip = getClientIp(req);
  await assertNotBlocked(phone, ip);

  if (hasLink(body.comment) || hasLink(body.name) || hasLink(body.organization) || hasLink(body.deliveryAddress)) {
    throw new HttpError(400, "Matnda havola boʻlishi mumkin emas.");
  }

  // Bir xil mahsulotlarni birlashtiramiz
  const merged = new Map<number, number>();
  for (const i of body.items) merged.set(i.productId, Math.min(100, (merged.get(i.productId) || 0) + i.quantity));
  const items = [...merged].map(([productId, quantity]) => ({ productId, quantity }));

  // Mahsulotlar mavjudligini tekshiramiz (narxlari va ombordagi qoldiqlari bilan birga)
  const products = await prisma.product.findMany({
    where: { id: { in: items.map((i) => i.productId) }, isActive: true },
    select: { id: true, name: true, priceFrom: true, stock: true },
  });
  if (products.length !== items.length) throw new HttpError(400, "Baʻzi mahsulotlar endi mavjud emas. Roʻyxatni yangilang.");

  // Ombordagi qoldiq yetarliligini tekshiramiz (masalan, 2 kishi 1 ta mahsulotga buyurtma berganda)
  for (const item of items) {
    const prod = products.find((p) => p.id === item.productId);
    if (!prod) continue;
    if (prod.stock < item.quantity) {
      if (prod.stock <= 0) {
        throw new HttpError(400, `"${prod.name}" mahsuloti omborda qolmagan (tugagan).`);
      } else {
        throw new HttpError(
          400,
          `"${prod.name}" mahsulotidan omborda faqat ${prod.stock} dona mavjud. Iltimos, buyurtma miqdorini kamaytiring.`
        );
      }
    }
  }

  const names = new Map(products.map((p) => [p.id, p.name]));
  const prices = new Map(products.map((p) => [p.id, p.priceFrom ? Number(p.priceFrom) : 0]));

  // Jami buyurtma summasini hisoblaymiz
  const totalAmount = items.reduce((sum, item) => sum + (prices.get(item.productId) || 0) * item.quantity, 0);

  // Mehmon bo'lsa, OTP kodini tekshiramiz (hech qanday master kodlarsiz!)
  let otpRecordId: number | null = null;
  if (!req.customer) {
    if (!body.code) throw new HttpError(400, "SMS tasdiqlash kodini kiriting.");
    const otp = await prisma.otpCode.findFirst({
      where: { phone, usedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
    });
    if (!otp) throw new HttpError(400, "Tasdiqlash kodi eskirgan yoki topilmadi. Yangi kod soʻrang.");
    if (otp.attempts >= 5) throw new HttpError(429, "Kod koʻp marta notoʻgʻri kiritildi. Yangi kod soʻrang.");
    if (otp.codeHash !== hashCode(phone, body.code)) {
      await prisma.otpCode.update({ where: { id: otp.id }, data: { attempts: { increment: 1 } } });
      throw new HttpError(400, "Tasdiqlash kodi notoʻgʻri.");
    }
    otpRecordId = otp.id;
  }

  const orderCode = "MDX-" + crypto.randomBytes(3).toString("hex").toUpperCase();

  // LIMITLARNI VA BUYURTMANI BAZADA SAQLAYMIZ
  let createdOrderId: number;
  await prisma.$transaction(async (tx) => {
    // Atomar limit tekshiruvi
    await checkOrderLimits(phone, items, tx);

    let customerId = req.customer?.id || null;

    if (!customerId) {
      let cust = await tx.customer.findUnique({ where: { phone } });
      if (!cust) {
        cust = await tx.customer.create({
          data: {
            phone,
            name: body.name,
            organization: body.organization || "",
          },
        });
      }
      customerId = cust.id;
    }

    if (otpRecordId) {
      await tx.otpCode.update({ where: { id: otpRecordId }, data: { usedAt: new Date() } });
    }

    const flags = await customerFlags(phone, tx);
    if (otpRecordId || req.customer) {
      flags.push("OTP_VERIFIED");
    }

    const ord = await tx.order.create({
      data: {
        code: orderCode,
        customerName: body.name,
        phone,
        status: "NEW",
        organization: body.organization,
        deliveryAddress: body.deliveryAddress,
        paymentMethod: body.paymentMethod || "Do'konda to'lash (Olib ketishda)",
        comment: body.comment,
        ip,
        flags,
        customerId,
        totalAmount,
        isPaid: false,
        items: {
          create: items.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
            productName: names.get(i.productId)!,
            price: prices.get(i.productId) ? new Prisma.Decimal(prices.get(i.productId)!) : null,
          })),
        },
      },
    });
    createdOrderId = ord.id;
  });

  res.status(201).json({ ok: true, code: orderCode, orderId: createdOrderId! });
});

// Buyurtma holatini ko'rish
ordersRouter.get("/status/:code", orderIpLimiter, async (req, res) => {
  const code = String(req.params.code);
  const order = await prisma.order.findUnique({
    where: { code },
    select: {
      id: true,
      code: true,
      status: true,
      isPaid: true,
      paidAt: true,
      totalAmount: true,
      createdAt: true,
    },
  });

  if (!order) throw new HttpError(404, "Buyurtma topilmadi");
  res.json({ ok: true, order });
});

