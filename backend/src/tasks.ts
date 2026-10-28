import { prisma } from "./db";

/**
 * To'lov qilinmagan va muddati o'tgan (60 daqiqadan oshgan) inPAY buyurtmalarini
 * avtomatik bekor qilish vazifasi.
 */
export async function cleanupExpiredOrders(): Promise<void> {
  try {
    const cutoff = new Date(Date.now() - 60 * 60 * 1000); // 60 daqiqa oldin
    const expired = await prisma.order.findMany({
      where: {
        paymentMethod: "inpay",
        isPaid: false,
        status: "NEW",
        createdAt: { lt: cutoff },
      },
      select: { id: true, code: true },
      take: 50,
    });

    if (expired.length > 0) {
      await prisma.order.updateMany({
        where: { id: { in: expired.map((o) => o.id) } },
        data: {
          status: "CANCELED",
          managerNote: "inPAY: to'lov vaqti tugadi (avtomatik bekor qilindi)",
        },
      });
      console.log(`[AutoCancel] ${expired.length} ta to'lanmagan inPAY buyurtmasi bekor qilindi.`);
    }
  } catch (err) {
    console.error("[AutoCancel] Xatolik:", err);
  }
}

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
  // Har 10 daqiqada to'lanmagan buyurtmalarni tekshiradi
  setInterval(cleanupExpiredOrders, 10 * 60 * 1000);
  setTimeout(cleanupExpiredOrders, 60 * 1000);

  // Har 1 soatda eskirgan OTP kodlarni tozalaydi
  setInterval(cleanupExpiredOtps, 60 * 60 * 1000);
  setTimeout(cleanupExpiredOtps, 5 * 60 * 1000);
}
