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
  // Zamonaviy telefon kamerasi (50-108 MP) suratlari 5 MB dan oshishi mumkin
  limits: { fileSize: 15 * 1024 * 1024, files: 1 },
});

// sharp uchun piksel chegarasi: 108 MP kamera suratlari ham qabul qilinadi (standart 16 MP juda kam edi).
// JPEG'ni kichraytirishda sharp "shrink-on-load" ishlatadi, shuning uchun xotira sarfi past bo'ladi.
const MAX_INPUT_PIXELS = 120_000_000;

async function ensure(sub: string) {
  const dir = path.join(config.uploadDir, sub);
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

/** Rasmni WebP ga oʻtkazadi: asl (max 1600px) va kichik (max 480px) */
/* ------------------------------ Suv belgisi ------------------------------ */
// Mahsulot rasmlari boshqa saytlarga ko'chirilmasligi uchun markazga xira Medax logotipi tushiriladi.
// O'chirish: .env da PRODUCT_WATERMARK=off
const WATERMARK_PATH = path.resolve(__dirname, "../assets/watermark.png");
const WATERMARK_OPACITY = 0.06;
const WATERMARK_WIDTH_RATIO = 0.4;
let watermarkSrc: Promise<Buffer | null> | null = null;

function loadWatermark(): Promise<Buffer | null> {
  if (process.env.PRODUCT_WATERMARK === "off") return Promise.resolve(null);
  if (!watermarkSrc) watermarkSrc = fs.readFile(WATERMARK_PATH).catch(() => null);
  return watermarkSrc;
}

/** Berilgan o'lchamdagi rasm uchun xira logotip qatlami (PNG) */
async function watermarkLayer(width: number, height: number): Promise<Buffer | null> {
  const src = await loadWatermark();
  if (!src) return null;
  const w = Math.max(40, Math.round(Math.min(width, height) * WATERMARK_WIDTH_RATIO));
  const { data, info } = await sharp(src).resize({ width: w }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 3; i < data.length; i += 4) data[i] = Math.round(data[i] * WATERMARK_OPACITY);
  return sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer();
}

/** Tayyor rasm buferiga markazda xira logotip qo'yadi; logotip bo'lmasa, rasmni o'zgarishsiz qaytaradi */
async function withWatermark(img: sharp.Sharp): Promise<sharp.Sharp> {
  const buf = await img.png().toBuffer();
  const meta = await sharp(buf).metadata();
  const layer = await watermarkLayer(meta.width || 0, meta.height || 0);
  if (!layer) return sharp(buf);
  return sharp(buf).composite([{ input: layer, gravity: "center" }]);
}

/** Kartochka miniatyurasi o'lchami (kvadrat) va mahsulot atrofidagi bo'sh joy */
const THUMB_SIZE = 640;
const THUMB_PAD = 28;

/**
 * Mahsulot rasmini saqlaydi:
 * - asosiy rasm: proporsiyasi saqlanadi (galereya uchun), shaffof fon oq bo'ladi;
 * - miniatyura: har qanday rasm bir xil oq kvadratga joylanadi, ortiqcha bir xil rangli chetlar
 *   kesiladi va mahsulot markazga qo'yiladi. Shu sababli katalogdagi kartochkalar bir xil ko'rinadi.
 */
export async function saveImage(buf: Buffer): Promise<{ url: string; thumbUrl: string }> {
  const dir = await ensure("products");
  const id = crypto.randomUUID();
  try {
    const base = sharp(buf, { failOn: "error", limitInputPixels: MAX_INPUT_PIXELS }).rotate().flatten({ background: "#ffffff" });
    const main = base.clone().resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true });
    await (await withWatermark(main)).webp({ quality: 82 }).toFile(path.join(dir, `${id}.webp`));

    // Oq yoki bir xil fonli chetlarni kesamiz (studiya suratlari). Kesish imkonsiz bo'lsa, rasm o'zi olinadi.
    let subject: Buffer;
    try {
      subject = await base.clone().trim({ threshold: 18 }).png().toBuffer();
    } catch {
      subject = await base.clone().png().toBuffer();
    }
    const inner = THUMB_SIZE - THUMB_PAD * 2;
    const thumb = sharp(subject)
      .resize({ width: inner, height: inner, fit: "contain", background: "#ffffff" })
      .extend({ top: THUMB_PAD, bottom: THUMB_PAD, left: THUMB_PAD, right: THUMB_PAD, background: "#ffffff" });
    await (await withWatermark(thumb)).webp({ quality: 80 }).toFile(path.join(dir, `${id}-t.webp`));
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
    const img = sharp(buf, { failOn: "error", limitInputPixels: MAX_INPUT_PIXELS }).rotate();
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
