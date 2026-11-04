import { Request } from "express";
import { config } from "./config";

function isPrivateIp(ip: string): boolean {
  if (!ip) return true;
  // Localhost
  if (ip === "127.0.0.1" || ip === "::1" || ip === "localhost") return true;
  // 10.0.0.0 - 10.255.255.255
  if (ip.startsWith("10.")) return true;
  // 192.168.0.0 - 192.168.255.255
  if (ip.startsWith("192.168.")) return true;
  // 172.16.0.0 - 172.31.255.255 (Docker standard networks)
  const match172 = ip.match(/^172\.(\d+)\./);
  if (match172) {
    const octet = parseInt(match172[1], 10);
    if (octet >= 16 && octet <= 31) return true;
  }
  return false;
}

/**
 * Xavfsiz mijoz IP manzilini aniqlash.
 * Proksi zanjirida (Cloudflare -> Host Nginx -> Docker Nginx -> Backend)
 * har bir mijozning haqiqiy global IP manzilini aniq ajratib oladi.
 */
export function getClientIp(req: Request): string {
  let ip = "";

  // 1. Cloudflare sarlavhasi
  const cfIp = req.headers["cf-connecting-ip"];
  if (typeof cfIp === "string" && cfIp.trim()) {
    ip = cfIp.trim();
  }

  // 2. X-Real-IP sarlavhasi (Host Nginx / Caddy tomonidan o'rnatilgan)
  if (!ip) {
    const realIp = req.headers["x-real-ip"];
    if (typeof realIp === "string" && realIp.trim()) {
      ip = realIp.trim();
    }
  }

  // 3. X-Forwarded-For sarlavhasi (zanjirdagi birinchi tashqi IP)
  if (!ip || isPrivateIp(ip)) {
    const forwarded = req.headers["x-forwarded-for"];
    if (typeof forwarded === "string" && forwarded.trim()) {
      const parts = forwarded.split(",").map((p) => p.trim()).filter(Boolean);
      const publicIp = parts.find((p) => !isPrivateIp(p));
      if (publicIp) ip = publicIp;
      else if (parts.length > 0 && (!ip || isPrivateIp(ip))) ip = parts[0];
    }
  }

  // 4. Express req.ip yoki socket remoteAddress
  if (!ip) {
    ip = req.ip || req.socket.remoteAddress || "127.0.0.1";
  }

  // IPv6 mapped IPv4 tozalash (masalan: ::ffff:192.168.1.1 -> 192.168.1.1)
  if (ip.startsWith("::ffff:")) {
    ip = ip.slice(7);
  }

  return ip;
}
