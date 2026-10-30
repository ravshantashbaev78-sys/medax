import nodemailer, { Transporter } from "nodemailer";

const GMAIL_DESTINATION = process.env.GMAIL_DESTINATION || "medaxuz@gmail.com";
const GMAIL_USER = process.env.GMAIL_USER || "medaxuz@gmail.com";
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD || process.env.SMTP_PASSWORD || "";

let transporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  if (transporter) return transporter;
  if (!GMAIL_APP_PASSWORD) {
    console.log("[Email] GMAIL_APP_PASSWORD o'rnatilmagan. Xabarlar bazada saqlanadi.");
    return null;
  }

  transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: GMAIL_USER,
      pass: GMAIL_APP_PASSWORD,
    },
  });

  return transporter;
}

export interface ContactEmailData {
  name: string;
  phone: string;
  email?: string;
  subject?: string;
  message: string;
  ip?: string;
}

/**
 * Sayt yoki mobil ilovadan kelgan murojaatni medaxuz@gmail.com pochtasiga yuborish
 */
export async function sendContactEmail(data: ContactEmailData): Promise<boolean> {
  const mailTransporter = getTransporter();

  const formattedDate = new Date().toLocaleString("uz-UZ", {
    timeZone: "Asia/Tashkent",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

  const mailSubject = `🔔 Medax Murojaat: ${data.subject || "Saytdan yangi xabar"} (${data.name})`;

  const textBody = `
Yangi murojaat qabul qilindi:
----------------------------------------
Ismi: ${data.name}
Telefon: ${data.phone}
${data.email ? `Email: ${data.email}\n` : ""}Mavzu: ${data.subject || "Ko'rsatilmagan"}
Sana: ${formattedDate}
IP: ${data.ip || "Noma'lum"}

Xabar matni:
${data.message}
----------------------------------------
  `.trim();

  const htmlBody = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 14px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.06);">
  <div style="background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%); padding: 24px; color: #ffffff;">
    <h1 style="margin: 0; font-size: 20px; font-weight: 800; letter-spacing: 0.5px;">🏥 MEDAX · Yangi Murojaat</h1>
    <p style="margin: 6px 0 0; opacity: 0.9; font-size: 13px;">Sayt yoki mobil ilova orqali mijoz xabar qoldirdi</p>
  </div>
  
  <div style="padding: 24px;">
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
      <tr>
        <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #64748b; font-size: 13px; width: 140px;">Mijoz ismi:</td>
        <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #0f172a; font-weight: 700; font-size: 14px;">${data.name}</td>
      </tr>
      <tr>
        <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #64748b; font-size: 13px;">Telefon raqami:</td>
        <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #0f172a; font-weight: 700; font-size: 14px;">
          <a href="tel:${data.phone}" style="color: #0284c7; text-decoration: none;">${data.phone}</a>
        </td>
      </tr>
      ${
        data.email
          ? `<tr>
        <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #64748b; font-size: 13px;">Elektron pochta:</td>
        <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #0f172a; font-weight: 600; font-size: 14px;">
          <a href="mailto:${data.email}" style="color: #0284c7; text-decoration: none;">${data.email}</a>
        </td>
      </tr>`
          : ""
      }
      <tr>
        <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #64748b; font-size: 13px;">Mavzu:</td>
        <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #0f172a; font-weight: 600; font-size: 14px;">${data.subject || "Ko'rsatilmagan"}</td>
      </tr>
      <tr>
        <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #64748b; font-size: 13px;">Yuborilgan vaqti:</td>
        <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #475569; font-size: 13px;">${formattedDate}</td>
      </tr>
    </table>

    <div style="background: #f8fafc; border-left: 4px solid #0284c7; padding: 16px; border-radius: 8px; margin-bottom: 24px;">
      <strong style="display: block; font-size: 13px; color: #0f172a; margin-bottom: 8px;">Xabar mazmuni:</strong>
      <div style="color: #334155; font-size: 14px; line-height: 1.6; white-space: pre-wrap;">${data.message}</div>
    </div>

    <div style="text-align: center;">
      <a href="tel:${data.phone}" style="display: inline-block; background: #0284c7; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 10px; font-weight: 700; font-size: 14px; margin-right: 10px;">
        📞 Mijozga qo'ng'iroq qilish
      </a>
      ${
        data.email
          ? `<a href="mailto:${data.email}?subject=Re:%20${encodeURIComponent(data.subject || "Medax murojaat")}" style="display: inline-block; background: #f1f5f9; color: #334155; text-decoration: none; padding: 12px 24px; border-radius: 10px; font-weight: 700; font-size: 14px;">
        ✉️ Javob yozish
      </a>`
          : ""
      }
    </div>
  </div>

  <div style="background: #f8fafc; padding: 14px; text-align: center; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8;">
    Medax Tibbiyot Uskunalari Savdo Tizimi · Rasmiy Pochta: medaxuz@gmail.com
  </div>
</div>
  `.trim();

  if (!mailTransporter) {
    console.log(`[Email Mock] ${GMAIL_DESTINATION} ga xabar tayyorlandi (GMAIL_APP_PASSWORD o'rnatilsa jo'natiladi):\n`, textBody);
    return false;
  }

  try {
    const info = await mailTransporter.sendMail({
      from: `"Medax Sayti" <${GMAIL_USER}>`,
      to: GMAIL_DESTINATION,
      replyTo: data.email || undefined,
      subject: mailSubject,
      text: textBody,
      html: htmlBody,
    });
    console.log(`[Email] Murojaat muvaffaqiyatli ${GMAIL_DESTINATION} ga yuborildi:`, info.messageId);
    return true;
  } catch (err) {
    console.error("[Email] Xabar yuborishda xatolik:", err);
    return false;
  }
}

export interface OrderEmailData {
  id: number;
  code: string;
  customerName: string;
  phone: string;
  organization?: string;
  deliveryAddress?: string;
  totalAmount?: any;
  items: { productName: string; quantity: number; price?: any }[];
}

/**
 * Yangi buyurtma tushganda medaxuz@gmail.com ga xabar jo'natish
 */
export async function sendNewOrderEmail(order: OrderEmailData): Promise<boolean> {
  const mailTransporter = getTransporter();

  const formattedDate = new Date().toLocaleString("uz-UZ", {
    timeZone: "Asia/Tashkent",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

  const mailSubject = `🛒 Yangi Buyurtma #${order.code} (${order.customerName})`;

  const itemsList = order.items
    .map((i) => `• ${i.productName} — ${i.quantity} dona ${i.price ? `(${Number(i.price).toLocaleString()} so'm)` : ""}`)
    .join("\n");

  const textBody = `
Yangi buyurtma qabul qilindi:
----------------------------------------
Buyurtma kodi: #${order.code} (№${order.id})
Mijoz: ${order.customerName}
Telefon: ${order.phone}
${order.organization ? `Tashkilot: ${order.organization}\n` : ""}${order.deliveryAddress ? `Manzil: ${order.deliveryAddress}\n` : ""}Sana: ${formattedDate}

Mahsulotlar:
${itemsList}

Jami summa: ${order.totalAmount ? Number(order.totalAmount).toLocaleString() + " so'm" : "Kelishuv asosida"}
----------------------------------------
Admin panelda ko'rish: https://medax.uz/admin/orders
  `.trim();

  const htmlBody = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 14px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.06);">
  <div style="background: linear-gradient(135deg, #059669 0%, #047857 100%); padding: 24px; color: #ffffff;">
    <h1 style="margin: 0; font-size: 20px; font-weight: 800;">🛒 MEDAX · Yangi Buyurtma #${order.code}</h1>
    <p style="margin: 6px 0 0; opacity: 0.9; font-size: 13px;">Sayt yoki ilovadan yangi buyurtma kelib tushdi</p>
  </div>
  
  <div style="padding: 24px;">
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
      <tr>
        <td style="padding: 8px 0; color: #64748b; font-size: 13px; width: 140px;">Mijoz:</td>
        <td style="padding: 8px 0; color: #0f172a; font-weight: 700; font-size: 14px;">${order.customerName}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; color: #64748b; font-size: 13px;">Telefon:</td>
        <td style="padding: 8px 0; color: #0f172a; font-weight: 700; font-size: 14px;">
          <a href="tel:${order.phone}" style="color: #0284c7; text-decoration: none;">${order.phone}</a>
        </td>
      </tr>
      ${
        order.organization
          ? `<tr>
        <td style="padding: 8px 0; color: #64748b; font-size: 13px;">Tashkilot:</td>
        <td style="padding: 8px 0; color: #0f172a; font-weight: 600; font-size: 14px;">${order.organization}</td>
      </tr>`
          : ""
      }
      ${
        order.deliveryAddress
          ? `<tr>
        <td style="padding: 8px 0; color: #64748b; font-size: 13px;">Yetkazish manzili:</td>
        <td style="padding: 8px 0; color: #0f172a; font-size: 14px;">${order.deliveryAddress}</td>
      </tr>`
          : ""
      }
      <tr>
        <td style="padding: 8px 0; color: #64748b; font-size: 13px;">Vaqti:</td>
        <td style="padding: 8px 0; color: #475569; font-size: 13px;">${formattedDate}</td>
      </tr>
    </table>

    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px; margin-bottom: 20px;">
      <strong style="display: block; font-size: 13px; color: #0f172a; margin-bottom: 10px;">Buyurtma qilingan mahsulotlar:</strong>
      ${order.items
        .map(
          (item) => `
        <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px dashed #e2e8f0; font-size: 13.5px;">
          <span style="color: #1e293b; font-weight: 600;">${item.productName} × ${item.quantity} dona</span>
          <span style="color: #64748b;">${item.price ? (Number(item.price) * item.quantity).toLocaleString() + " so'm" : "Kelishuv"}</span>
        </div>
      `
        )
        .join("")}
      <div style="margin-top: 12px; text-align: right; font-size: 15px; font-weight: 800; color: #0f172a;">
        Jami: ${order.totalAmount ? Number(order.totalAmount).toLocaleString() + " so'm" : "Kelishuv asosida"}
      </div>
    </div>

    <div style="text-align: center;">
      <a href="https://medax.uz/admin/orders" style="display: inline-block; background: #059669; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 10px; font-weight: 800; font-size: 14px;">
        Admin panelda ochish va tasdiqlash →
      </a>
    </div>
  </div>

  <div style="background: #f8fafc; padding: 14px; text-align: center; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8;">
    Medax Buyurtma Tizimi · Rasmiy Pochta: medaxuz@gmail.com
  </div>
</div>
  `.trim();

  if (!mailTransporter) {
    console.log(`[Email Mock] ${GMAIL_DESTINATION} ga yangi buyurtma xabari tayyorlandi:\n`, textBody);
    return false;
  }

  try {
    const info = await mailTransporter.sendMail({
      from: `"Medax Buyurtmalar" <${GMAIL_USER}>`,
      to: GMAIL_DESTINATION,
      subject: mailSubject,
      text: textBody,
      html: htmlBody,
    });
    console.log(`[Email] Buyurtma xabari ${GMAIL_DESTINATION} ga yuborildi:`, info.messageId);
    return true;
  } catch (err) {
    console.error("[Email] Buyurtma xabarini yuborishda xatolik:", err);
    return false;
  }
}
