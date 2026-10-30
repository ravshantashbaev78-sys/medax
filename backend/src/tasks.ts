import { prisma } from "./db";

/**
 * Muddati o'tgan (24 soatdan oshgan) OTP SMS yozuvlarini tozalash
 */
export async function cleanupExpiredOtps(): Promise<void> {
  try {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const res = await prisma.otpCode.deleteMany({
      where: { createdAt: { lt: cutoff } },
    });
    if (res.count > 0) {
      console.log(`[Cleanup] ${res.count} ta eskirgan OTP kod tozalandi.`);
    }
  } catch (err) {
    console.error("[Cleanup] OTP tozalashda xatolik:", err);
  }
}

export function startBackgroundTasks(): void {
  // Har 1 soatda eskirgan OTP kodlarni tozalaydi
  setInterval(cleanupExpiredOtps, 60 * 60 * 1000);
  setTimeout(cleanupExpiredOtps, 5 * 60 * 1000);
}
