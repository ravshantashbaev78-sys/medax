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

async function findCustomerForOrder(order: { customerId: number | null; phone: string }) {
  if (order.customerId) {
    const byId = await prisma.customer.findUnique({ where: { id: order.customerId } });
    if (byId) return byId;
  }
  const cleanDigits = order.phone.replace(/\D/g, "");
  const last9 = cleanDigits.slice(-9);
  return await prisma.customer.findFirst({
    where: {
      OR: [
        { phone: order.phone },
        { phone: `+${cleanDigits}` },
        { phone: cleanDigits },
        ...(last9 ? [{ phone: { endsWith: last9 } }] : []),
      ],
    },
  });
}

/**
 * Admin buyurtmani tasdiqlaganda (CONFIRMED):
 * 1. Takroriy SMS ketmasligi uchun tekshiriladi (pul tejaladi).
 * 2. Tizimda bildirishnoma (Notification) saqlanadi.
 * 3. Ilovaga PUSH bildirishnoma boradi.
 */
export async function notifyOrderConfirmed(order: {
  id: number;
  code: string;
  phone: string;
  customerId: number | null;
  flags?: string[];
}) {
  const customer = await findCustomerForOrder(order);

  // 1. Faqat birinchi marta SMS yuborish (takroriy status o'zgartirishlarda SMS qayta ketmaydi)
  const alreadySent = order.flags?.includes("SMS_CONFIRMED_SENT");
  if (!alreadySent) {
    try {
      const smsText = `Medax: #${order.code} (№${order.id}) raqamli buyurtmangiz tasdiqlandi va tayyorlanmoqda.`;
      await sendSms(order.phone, smsText);
      await prisma.order.update({
        where: { id: order.id },
        data: { flags: { push: "SMS_CONFIRMED_SENT" } },
      });
      console.log(`[Order Confirmed SMS sent] ${order.phone} -> ${smsText}`);
    } catch (smsErr) {
      console.error("[Order Confirmed SMS Error]:", smsErr);
    }
  }

  const notificationTitle = "Buyurtmangiz tasdiqlandi! 📋";
  const notificationBody = `Siz bergan #${order.code} (№${order.id}) raqamli buyurtmangiz tasdiqlandi va mutaxassislarimiz tomonidan tayyorlanmoqda.`;

  // 2. Bazaga bildirishnoma (Notification) yozish
  try {
    await prisma.notification.create({
      data: {
        customerId: customer?.id || order.customerId || null,
        phone: customer?.phone || order.phone,
        title: notificationTitle,
        body: notificationBody,
        orderId: order.id,
      },
    });
  } catch (dbErr) {
    console.error("[Notification DB Error]:", dbErr);
  }

  // 3. PUSH bildirishnoma jo'natish
  if (customer && customer.pushToken) {
    await sendExpoPush(customer.pushToken, notificationTitle, notificationBody, {
      orderId: order.id,
      orderCode: order.code,
    });
  }
}

/**
 * Buyurtma tayyor bo'lganda (READY):
 * Aynan tayyor bo'lgandagina mijozga do'kondan olib ketish haqida SMS boradi.
 */
export async function notifyOrderReady(order: {
  id: number;
  code: string;
  phone: string;
  customerId: number | null;
  flags?: string[];
}) {
  const customer = await findCustomerForOrder(order);

  const alreadySent = order.flags?.includes("SMS_READY_SENT");
  if (!alreadySent) {
    try {
      const smsText = `Siz Medax saytida bergan buyurtmangiz tayyor. Raqam:# ${order.id}. Uni do'kondan olib ketishingiz mumkin.`;
      await sendSms(order.phone, smsText);
      await prisma.order.update({
        where: { id: order.id },
        data: { flags: { push: "SMS_READY_SENT" } },
      });
      console.log(`[Order Ready SMS sent] ${order.phone} -> ${smsText}`);
    } catch (smsErr) {
      console.error("[Order Ready SMS Error]:", smsErr);
    }
  }

  const notificationTitle = "Buyurtmangiz tayyor! 🎉";
  const notificationBody = `Siz bergan #${order.code} (№${order.id}) raqamli buyurtmangiz do'konda tayyor va uni olib ketishingiz mumkin.`;

  try {
    await prisma.notification.create({
      data: {
        customerId: customer?.id || order.customerId || null,
        phone: customer?.phone || order.phone,
        title: notificationTitle,
        body: notificationBody,
        orderId: order.id,
      },
    });
  } catch (dbErr) {
    console.error("[Notification Ready DB Error]:", dbErr);
  }

  if (customer && customer.pushToken) {
    await sendExpoPush(customer.pushToken, notificationTitle, notificationBody, {
      orderId: order.id,
      orderCode: order.code,
    });
  }
}

/**
 * Admin buyurtmani bekor qilganda:
 * 1. Tizimda bildirishnoma (Notification) saqlanadi.
 * 2. Ilovaga PUSH bildirishnoma yuboriladi.
 */
export async function notifyOrderCanceled(
  order: {
    id: number;
    code: string;
    phone: string;
    customerId: number | null;
  },
  reason?: string
) {
  const customer = await findCustomerForOrder(order);

  const notificationTitle = "Buyurtma bekor qilindi ⚠️";
  const notificationBody = `Siz bergan #${order.code} (№${order.id}) raqamli buyurtmangiz bekor qilindi.${
    reason ? ` Sabab: ${reason}` : ""
  }`;

  // 1. Bazada saqlash
  try {
    await prisma.notification.create({
      data: {
        customerId: customer?.id || order.customerId || null,
        phone: customer?.phone || order.phone,
        title: notificationTitle,
        body: notificationBody,
        orderId: order.id,
      },
    });
    console.log(`[Notification Canceled saved] Order #${order.id} for ${order.phone}`);
  } catch (dbErr) {
    console.error("[Notification Canceled DB Error]:", dbErr);
  }

  // 2. Push jo'natish
  if (customer && customer.pushToken) {
    await sendExpoPush(customer.pushToken, notificationTitle, notificationBody, {
      orderId: order.id,
      orderCode: order.code,
    });
  }
}

/**
 * Buyurtma topshirilganda / yakunlanganda:
 */
export async function notifyOrderDone(order: {
  id: number;
  code: string;
  phone: string;
  customerId: number | null;
}) {
  const customer = await findCustomerForOrder(order);

  const notificationTitle = "Buyurtma topshirildi! ✅";
  const notificationBody = `Siz bergan #${order.code} (№${order.id}) raqamli buyurtmangiz muvaffaqiyatli topshirildi. Medax xizmatidan foydalanganingiz uchun rahmat!`;

  try {
    await prisma.notification.create({
      data: {
        customerId: customer?.id || order.customerId || null,
        phone: customer?.phone || order.phone,
        title: notificationTitle,
        body: notificationBody,
        orderId: order.id,
      },
    });
  } catch (dbErr) {
    console.error("[Notification Done DB Error]:", dbErr);
  }

  if (customer && customer.pushToken) {
    await sendExpoPush(customer.pushToken, notificationTitle, notificationBody, {
      orderId: order.id,
      orderCode: order.code,
    });
  }
}
