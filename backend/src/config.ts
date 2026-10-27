import "dotenv/config";
import crypto from "crypto";

const isProd = process.env.NODE_ENV === "production";

// Xavfsizlik: ishlab chiqarish muhitida kuchli sirlar ta'minlanadi
const jwtSecret =
  process.env.JWT_SECRET && process.env.JWT_SECRET.length >= 32
    ? process.env.JWT_SECRET
    : isProd
    ? crypto.randomBytes(32).toString("hex")
    : "dev-admin-jwt-secret-key-32charsmin!!";

const customerJwtSecret =
  process.env.CUSTOMER_JWT_SECRET && process.env.CUSTOMER_JWT_SECRET.length >= 32
    ? process.env.CUSTOMER_JWT_SECRET
    : isProd
    ? crypto.randomBytes(32).toString("hex")
    : "dev-customer-jwt-secret-key-32chars!!";

export function validateStartupConfig() {
  if (isProd) {
    if (!process.env.JWT_SECRET) {
      console.error(
        "XAVFSIZLIK XATOSI: Production muhitida JWT_SECRET environment o'zgaruvchisi o'rnatilmagan! Doimiy maxfiy kalit o'rnating."
      );
    }
    if (!process.env.CUSTOMER_JWT_SECRET) {
      console.error(
        "XAVFSIZLIK XATOSI: Production muhitida CUSTOMER_JWT_SECRET environment o'zgaruvchisi o'rnatilmagan! Doimiy maxfiy kalit o'rnating."
      );
    }
    if (config.smsProvider === "console") {
      console.warn(
        "⚠️ OGOHLANTIRISH: SMS_PROVIDER=console holatida. SMS xabarlar faqat server konsoliga chiqadi. Haqiqiy SMS yuborish uchun Render Environment sozlamalarida SMS_PROVIDER=eskiz, ESKIZ_EMAIL va ESKIZ_PASSWORD ni kiriting."
      );
    }
  }
}

const smsProvider = process.env.SMS_PROVIDER || (isProd ? "eskiz" : "console");

export const config = {
  isProd,
  port: Number(process.env.PORT || 4000),
  jwtSecret,
  customerJwtSecret,
  corsOrigin: (process.env.CORS_ORIGIN || "http://localhost:5173").split(",").map((s) => s.trim()),
  uploadDir: process.env.UPLOAD_DIR || "./uploads",
  smsProvider,
  eskiz: {
    email: process.env.ESKIZ_EMAIL || "",
    password: process.env.ESKIZ_PASSWORD || "",
    from: process.env.ESKIZ_FROM || "4546",
  },
  otpTtlMin: 5,
  fakeStrikeLimit: Number(process.env.FAKE_STRIKE_LIMIT || 2),

  // Xavfsizlik va limitlar
  behindCloudflare: process.env.BEHIND_CLOUDFLARE === "true",
  trustProxy: process.env.TRUST_PROXY || (isProd ? "loopback, linklocal, uniquelocal" : "1"),
  turnstileSecretKey: process.env.TURNSTILE_SECRET_KEY || "",
  dailySmsBudget: Number(process.env.DAILY_SMS_BUDGET || 250), // butun server bo'yicha kunlik max SMS
  dailyIpSmsLimit: Number(process.env.DAILY_IP_SMS_LIMIT || 8), // 1 ta IP dan kunlik max SMS
  hourlyPhoneOtpLimit: Number(process.env.HOURLY_PHONE_OTP_LIMIT || 4), // 1 ta raqamga soatlik max OTP

  // inPAY to'lov tizimi sozlamalari
  inpay: {
    merchantId: process.env.INPAY_MERCHANT_ID || "",
    merchantToken: process.env.INPAY_MERCHANT_TOKEN || "",
    baseUrl: process.env.INPAY_BASE_URL || "https://inpay.uz/api/v1",
    callbackUrl: process.env.INPAY_CALLBACK_URL || "https://medax.uz/api/orders/inpay/callback",
  },

  // Telegram Bot sozlamalari
  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN || "",
    botUsername: process.env.TELEGRAM_BOT_USERNAME || "MedaxAuthbot",
  },
};

