import { prisma } from "./db";
import { sendSms } from "./sms";

/**
 * Expo Push Notifications API orqali mobil qurilmaga bildirishnoma jo'natish
 */
export async function sendExpoPush(token: string, title: string, body: string, data: any = {}) {
  try {
    if (!token || !token.startsWith("ExponentPushToken[") && !token.startsWith("ExpoPushToken[")) {
      console.log(`[Expo Push] Noto'g'ri push token: ${token}`);
      return;
    }

    const payload = {
      to: token,
      sound: "default",
      title,
      body,
      data,
      priority: "high",
    };

    const res = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Accept-encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const resJson = await res.json();
    console.log(`[Expo Push sent to ${token}]`, resJson);
  } catch (err) {
    console.error("[Expo Push Error]:", err);
  }
}

/**
 * Admin buyurtmani tasdiqlaganda (yoki tayyor holatiga o'tkazganda):
 * 1. Barcha holatda SMS yuboriladi (Eskiz rasmiy tasdiqlangan shabloni bo'yicha).
 * 2. Tizimda bildirishnoma (Notification) saqlanadi.
 * 3. Agar mijozda mobil ilova bo'lsa (pushToken mavjud bo'lsa), ilovaga PUSH bildirishnoma ham boradi!
 */
export async function notifyOrderConfirmed(order: {
  id: number;
  code: string;
  phone: string;
  customerId: number | null;
}) {
  // 1. Mijozni bazadan topamiz
  let customer = null;
  if (order.customerId) {
    customer = await prisma.customer.findUnique({ where: { id: order.customerId } });
  } else if (order.phone) {
    customer = await prisma.customer.findUnique({ where: { phone: order.phone } });
  }

  // 2. Har doim SMS yuborish (Eskiz tasdiqlangan shabloni bo'yicha)
  try {
    const smsText = `Siz Medax saytida bergan buyurtmangiz tayyor. Raqam:# ${order.id}. Uni do'kondan olib ketishingiz mumkin.`;
    await sendSms(order.phone, smsText);
    console.log(`[Order Confirmed SMS sent] ${order.phone} -> ${smsText}`);
  } catch (smsErr) {
    console.error("[Order Confirmed SMS Error]:", smsErr);
  }

  const notificationTitle = "Buyurtmangiz tasdiqlandi! 🎉";
  const notificationBody = `Siz bergan #${order.code} (№${order.id}) raqamli buyurtmangiz tasdiqlandi va olib ketishga tayyor.`;

  // 3. Bazaga bildirishnoma (Notification) yozish
  try {
    await prisma.notification.create({
      data: {
        customerId: customer?.id || null,
        phone: order.phone,
        title: notificationTitle,
        body: notificationBody,
        orderId: order.id,
      },
    });
  } catch (dbErr) {
    console.error("[Notification DB Error]:", dbErr);
  }

  // 4. Agar mobil ilovasi bo'lsa (pushToken mavjud bo'lsa), PUSH bildirishnoma jo'natamiz!
  if (customer && customer.pushToken) {
    console.log(`[Push Notification] Foydalanuvchi ilovaga ega (${customer.phone}), push jo'natilmoqda...`);
    await sendExpoPush(customer.pushToken, notificationTitle, notificationBody, {
      orderId: order.id,
      orderCode: order.code,
    });
  } else {
    console.log(`[Push Notification] Foydalanuvchida mobil ilova tokeni yo'q, faqat SMS yuborildi.`);
  }
}
