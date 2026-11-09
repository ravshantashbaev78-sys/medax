import "dotenv/config";

const isProd = process.env.NODE_ENV === "production";

// Xavfsizlik: production muhitida JWT kalitlari faqat environment'dan olinadi.
// Kodda ochiq yozilgan zaxira kalit bo'lsa, istalgan odam admin tokenini soxtalashtira oladi.
const DEV_JWT_SECRET = "dev-only-admin-jwt-secret-not-for-production-use";
const DEV_CUSTOMER_JWT_SECRET = "dev-only-customer-jwt-secret-not-for-production-use";

const jwtSecret = process.env.JWT_SECRET || (isProd ? "" : DEV_JWT_SECRET);
const customerJwtSecret = process.env.CUSTOMER_JWT_SECRET || (isProd ? "" : DEV_CUSTOMER_JWT_SECRET);

export function validateStartupConfig() {
  if (isProd) {
    const problems: string[] = [];
    if (!jwtSecret || jwtSecret.length < 32) problems.push("JWT_SECRET (kamida 32 belgi)");
    if (!customerJwtSecret || customerJwtSecret.length < 32) problems.push("CUSTOMER_JWT_SECRET (kamida 32 belgi)");
    if (jwtSecret && jwtSecret === customerJwtSecret) problems.push("JWT_SECRET va CUSTOMER_JWT_SECRET bir xil bo'lmasligi kerak");
    if (problems.length) {
      console.error(
        "XAVFSIZLIK XATOSI: quyidagi environment o'zgaruvchilari noto'g'ri yoki o'rnatilmagan: " +
          problems.join(", ") +
          ". Yaratish: openssl rand -hex 32. Server ishga tushirilmaydi."
      );
      process.exit(1);
    }
    if (config.smsProvider === "console") {
      console.warn(
        "⚠️ OGOHLANTIRISH: SMS_PROVIDER=console holatida. SMS xabarlar faqat server konsoliga chiqadi. Haqiqiy SMS yuborish uchun SMS_PROVIDER=eskiz, ESKIZ_EMAIL va ESKIZ_PASSWORD ni kiriting."
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
};

