import { Request } from "express";
import { config } from "./config";

function normalizeIp(raw: string): string {
  let ip = (raw || "").trim();
  // IPv6 mapped IPv4 tozalash (masalan: ::ffff:192.168.1.1 -> 192.168.1.1)
  if (ip.toLowerCase().startsWith("::ffff:")) ip = ip.slice(7);
  return ip;
}

function isPrivateIp(ip: string): boolean {
  if (!ip) return true;
  const lower = ip.toLowerCase();
  // Localhost
  if (ip === "127.0.0.1" || lower === "::1" || lower === "localhost" || ip.startsWith("127.")) return true;
  // 10.0.0.0/8, 192.168.0.0/16, 169.254.0.0/16 (link-local)
  if (ip.startsWith("10.") || ip.startsWith("192.168.") || ip.startsWith("169.254.")) return true;
  // 172.16.0.0 - 172.31.255.255 (Docker standard networks)
  const match172 = ip.match(/^172\.(\d+)\./);
  if (match172) {
    const octet = parseInt(match172[1], 10);
    if (octet >= 16 && octet <= 31) return true;
  }
  // IPv6 unique-local (fc00::/7) va link-local (fe80::/10)
  if (/^f[cd][0-9a-f]{2}:/.test(lower) || /^fe[89ab][0-9a-f]:/.test(lower)) return true;
  return false;
}

/**
 * Xavfsiz mijoz IP manzilini aniqlash.
 *
 * MUHIM: mijoz istalgan sarlavhani (X-Forwarded-For, X-Real-IP, CF-Connecting-IP) o'zi yubora oladi.
 * Shuning uchun:
 *  - CF-Connecting-IP faqat BEHIND_CLOUDFLARE=true bo'lganda o'qiladi (bunda serverga faqat
 *    Cloudflare IP'laridan kirishga ruxsat berilishi kerak).
 *  - X-Forwarded-For zanjiri O'NG tomondan o'qiladi: har bir proksi (nginx $proxy_add_x_forwarded_for)
 *    oxiriga qo'shadi, mijoz yozgan soxta qiymatlar esa chap tomonda qoladi. O'ngdan birinchi
 *    ommaviy (public) IP — bu bizning birinchi proksimiz ko'rgan haqiqiy mijoz manzili.
 */
export function getClientIp(req: Request): string {
  if (config.behindCloudflare) {
    const cfIp = req.headers["cf-connecting-ip"];
    if (typeof cfIp === "string" && cfIp.trim()) return normalizeIp(cfIp);
  }

  const socketIp = normalizeIp(req.socket.remoteAddress || "");
  const forwarded = req.headers["x-forwarded-for"];
  const forwardedStr = Array.isArray(forwarded) ? forwarded.join(",") : forwarded || "";

  // Proksi zanjiri faqat so'rov ichki (private) manzildan — ya'ni o'zimizning nginx'dan kelganda ishonchli
  if (forwardedStr && isPrivateIp(socketIp)) {
    const chain = forwardedStr
      .split(",")
      .map((p) => normalizeIp(p))
      .filter(Boolean);
    for (let i = chain.length - 1; i >= 0; i--) {
      if (!isPrivateIp(chain[i])) return chain[i];
    }
    // Hammasi ichki manzil (lokal ishlab chiqish) — eng yaqin proksi ko'rgan manzil
    if (chain.length) return chain[chain.length - 1];
  }

  return socketIp || "127.0.0.1";
}
