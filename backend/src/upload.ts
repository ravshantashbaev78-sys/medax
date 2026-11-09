import multer from "multer";
import sharp from "sharp";
import path from "path";
import fs from "fs/promises";
import crypto from "crypto";
import { config } from "./config";
import { HttpError } from "./errors";

export const memoryUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024, files: 10 },
});

export const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
});

async function ensure(sub: string) {
  const dir = path.join(config.uploadDir, sub);
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

/** Rasmni WebP ga oʻtkazadi: asl (max 1600px) va kichik (max 480px) */
export async function saveImage(buf: Buffer): Promise<{ url: string; thumbUrl: string }> {
  const dir = await ensure("products");
  const id = crypto.randomUUID();
  try {
    const img = sharp(buf, { failOn: "error", limitInputPixels: 4096 * 4096 }).rotate();
    await img.clone().resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true }).webp({ quality: 82 }).toFile(path.join(dir, `${id}.webp`));
    await img.clone().resize({ width: 480, height: 480, fit: "inside", withoutEnlargement: true }).webp({ quality: 78 }).toFile(path.join(dir, `${id}-t.webp`));
  } catch {
    throw new HttpError(400, "Rasm fayli yaroqsiz");
  }
  return { url: `/uploads/products/${id}.webp`, thumbUrl: `/uploads/products/${id}-t.webp` };
}

/** Profil rasmini WebP ga oʻtkazadi (kvadrat 360x360) */
export async function saveAvatar(buf: Buffer): Promise<string> {
  const dir = await ensure("avatars");
  const id = crypto.randomUUID();
  try {
    const img = sharp(buf, { failOn: "error", limitInputPixels: 4096 * 4096 }).rotate();
    await img.resize({ width: 360, height: 360, fit: "cover" }).webp({ quality: 85 }).toFile(path.join(dir, `${id}.webp`));
  } catch {
    throw new HttpError(400, "Rasm fayli yaroqsiz");
  }
  return `/uploads/avatars/${id}.webp`;
}

export async function savePdf(buf: Buffer): Promise<string> {
  if (buf.subarray(0, 4).toString() !== "%PDF") throw new HttpError(400, "Faqat PDF fayl yuklash mumkin");
  const dir = await ensure("docs");
  const name = `${crypto.randomUUID()}.pdf`;
  await fs.writeFile(path.join(dir, name), buf);
  return `/uploads/docs/${name}`;
}

export async function removeFile(url: string) {
  if (!url.startsWith("/uploads/")) return;
  const rel = url.replace("/uploads/", "");
  if (rel.includes("..") || rel.includes("\\") || rel.includes("\0")) return;
  const root = path.resolve(config.uploadDir);
  const target = path.resolve(root, rel);
  if (!target.startsWith(root + path.sep)) return;
  await fs.rm(target, { force: true });
}
