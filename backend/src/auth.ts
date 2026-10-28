import { Router, Request, Response, NextFunction } from "express";
import rateLimit from "express-rate-limit";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { prisma } from "./db";
import { config } from "./config";
import { HttpError } from "./errors";
import { getClientIp } from "./ip";

export interface AuthUser {
  id: number;
  role: "OWNER" | "ADMIN" | "MANAGER";
  email: string;
  name: string;
}

declare module "express-serve-static-core" {
  interface Request {
    user?: AuthUser;
  }
}

/**
 * Admin va Menejerlar uchun avtorizatsiya.
 * Tokendan tashqari bazadan jonli tekshiradi: agar xodim o'chirilgan yoki roli pasaytirilgan bo'lsa, sessiya darhol bekor qilinadi.
 */
export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const h =
    req.headers.authorization ||
    (req.headers["x-authorization"] as string) ||
    (req.headers["x-admin-token"] as string) ||
    (req.headers["x-access-token"] as string) ||
    (req.query.token as string) ||
    "";
  const token = h.startsWith("Bearer ") ? h.slice(7).trim() : h.trim();
  if (!token) return next(new HttpError(401, "Tizimga kiring"));

  try {
    const decoded = jwt.verify(token, config.jwtSecret) as AuthUser;
    const validRoles = ["OWNER", "ADMIN", "MANAGER"];
    if (!decoded || !decoded.id || !validRoles.includes(decoded.role)) {
      return next(new HttpError(401, "Noto'g'ri yoki ruxsatsiz token"));
    }

    // Xavfsizlik: xodim hali ham bazada mavjudmi va roli to'g'rimi?
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, role: true, email: true, name: true },
    });

    if (!user || !validRoles.includes(user.role)) {
      return next(new HttpError(401, "Xodim hisobi o'chirilgan yoki huquqlari bekor qilingan"));
    }

    req.user = { id: user.id, role: user.role, email: user.email, name: user.name };
    next();
  } catch {
    next(new HttpError(401, "Sessiya eskirgan. Qayta kiring"));
  }
}

export function requireAdmin(req: Request, _res: Response, next: NextFunction) {
  if (req.user?.role !== "ADMIN" && req.user?.role !== "OWNER") {
    return next(new HttpError(403, "Ruxsat yoʻq"));
  }
  next();
}

export function requireOwner(req: Request, _res: Response, next: NextFunction) {
  if (req.user?.role !== "OWNER") {
    return next(new HttpError(403, "Faqat tizim Egasi (Owner) bajara oladi"));
  }
  next();
}

export const authRouter = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => getClientIp(req),
  message: { error: "Juda koʻp urinish. 15 daqiqadan keyin qayta urinib koʻring." },
});

authRouter.post("/login", loginLimiter, async (req, res) => {
  const { email, password } = z
    .object({ email: z.string().email(), password: z.string().min(1) })
    .parse(req.body);
  const normalizedEmail = email.toLowerCase().trim();
  const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    throw new HttpError(401, "Email yoki parol notoʻgʻri");
  }
  const payload: AuthUser = { id: user.id, role: user.role, email: user.email, name: user.name };
  const token = jwt.sign(payload, config.jwtSecret, { expiresIn: "12h" });
  res.json({ token, user: payload });
});

authRouter.get("/me", requireAuth, (req, res) => {
  res.json({ user: req.user });
});
