import express, { NextFunction, Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import fs from "fs";
import { ZodError } from "zod";
import { config, validateStartupConfig } from "./config";
import { HttpError } from "./errors";
import { authRouter } from "./auth";
import { publicRouter } from "./routes/public";
import { ordersRouter } from "./routes/orders";
import { adminRouter } from "./routes/admin";
import { customerRouter } from "./routes/customer";
import { contactRouter } from "./routes/contact";

// 1. Production startup tekshiruvi (xavfsiz kalitlar, SMS provayder)
validateStartupConfig();

const app = express();

// 2. Proxy sozlamasi: Cloudflare yoki Nginx orqasida ishlaganda haqiqiy mijoz IP'sini to'g'ri aniqlash
app.set("trust proxy", config.trustProxy);

// 3. Xavfsizlik sarlavhalari (Helmet + CSP + Frameguard + HSTS)
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: config.isProd
      ? {
          directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://challenges.cloudflare.com"],
            frameSrc: ["'self'", "https://challenges.cloudflare.com"],
            imgSrc: ["'self'", "data:", "https:", "blob:"],
            connectSrc: ["'self'", "https://challenges.cloudflare.com"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            fontSrc: ["'self'", "data:"],
          },
        }
      : false,
    hsts: config.isProd ? { maxAge: 31536000, includeSubDomains: true, preload: true } : false,
    frameguard: { action: "deny" },
    noSniff: true,
  })
);

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);
app.use(express.json({ limit: "1mb" }));

fs.mkdirSync(config.uploadDir, { recursive: true });
app.use("/uploads", express.static(config.uploadDir, { maxAge: "30d", immutable: true }));

app.get("/api/health", (_req, res) => res.json({ ok: true, version: "2.4.2", timestamp: new Date().toISOString() }));
app.use("/api/auth", authRouter);
app.use("/api/customer", customerRouter);
app.use("/api/orders", ordersRouter);
app.use("/api/contact", contactRouter);
app.use("/api/admin", adminRouter);
app.use("/api", publicRouter);

app.use((_req, res) => res.status(404).json({ error: "Topilmadi" }));

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof ZodError) {
    return void res.status(400).json({ error: err.issues[0]?.message || "Ma'lumot noto'g'ri" });
  }
  if (err instanceof HttpError) return void res.status(err.status).json({ error: err.message });
  const code = (err as any)?.code;
  if (code === "P2002") return void res.status(409).json({ error: "Bunday yozuv allaqachon mavjud" });
  if (code === "P2025") return void res.status(404).json({ error: "Yozuv topilmadi" });
  if ((err as any)?.name === "MulterError") return void res.status(400).json({ error: "Fayl hajmi katta yoki noto'g'ri" });
  console.error("Kutilmagan xatolik:", err);
  res.status(500).json({ error: "Serverda xatolik yuz berdi" });
});

process.on("uncaughtException", (err) => {
  console.error("CRITICAL: Uncaught Exception:", err);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("CRITICAL: Unhandled Rejection at:", promise, "reason:", reason);
});

import { seedDatabase } from "./seed";
import { startBackgroundTasks } from "./tasks";

app.listen(config.port, () => {
  console.log(`API muvaffaqiyatli ishga tushdi: http://localhost:${config.port}`);
  seedDatabase().catch((err) => console.warn("Startup seed:", err));
  startBackgroundTasks();
});
