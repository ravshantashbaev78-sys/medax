import { Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { prisma } from "../db";
import { HttpError } from "../errors";
import { assertNotBlocked, hasLink, normalizePhone } from "../antispam";
import { getClientIp } from "../ip";
import { sendContactEmail } from "../email";

export const contactRouter = Router();

const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => getClientIp(req),
  message: { error: "Xabarlar yuborish limiti oshdi. Iltimos, 15 daqiqadan keyin urinib ko'ring." },
});

const contactSchema = z.object({
  name: z.string().trim().min(2, "Ismingizni kiriting").max(80),
  phone: z.string().max(30),
  email: z.string().trim().email().nullish(),
  subject: z.string().trim().max(120).default(""),
  message: z.string().trim().min(5, "Xabar matnini kiriting").max(2000),
  website: z.string().default(""), // bot tuzog'i
});

contactRouter.post("/", contactLimiter, async (req, res) => {
  const body = contactSchema.parse(req.body);

  // Honeypot: botlar uchun soxta muvaffaqiyat
  if (body.website) {
    return void res.json({ ok: true, message: "Xabaringiz qabul qilindi" });
  }

  const phone = normalizePhone(body.phone);
  if (!phone) {
    throw new HttpError(400, "Telefon raqami noto'g'ri. Misol: +998 90 123 45 67");
  }

  const ip = getClientIp(req);
  await assertNotBlocked(phone, ip);

  if (hasLink(body.name) || hasLink(body.subject)) {
    throw new HttpError(400, "Ism yoki mavzuda havola bo'lishi mumkin emas.");
  }

  const fullMessage = body.email ? `[Email: ${body.email}]\n\n${body.message}` : body.message;

  const saved = await prisma.contactMessage.create({
    data: {
      name: body.name,
      phone,
      subject: body.subject,
      message: fullMessage,
      ip,
    },
  });

  // medaxuz@gmail.com ga real elektron pochta yuborish
  sendContactEmail({
    name: body.name,
    phone,
    email: body.email || undefined,
    subject: body.subject,
    message: body.message,
    ip,
  }).catch((err) => console.error("[Contact Email Error]", err));

  res.status(201).json({
    ok: true,
    message: "Xabaringiz muvaffaqiyatli qabul qilindi. Tez orada siz bilan bog'lanamiz!",
    id: saved.id,
  });
});
