const EMAILJS_SERVICE_ID = process.env.EMAILJS_SERVICE_ID || "service_adkop5n";
const EMAILJS_TEMPLATE_ID = process.env.EMAILJS_TEMPLATE_ID || "template_ilce5bo";
const EMAILJS_ORDER_TEMPLATE_ID = process.env.EMAILJS_ORDER_TEMPLATE_ID || EMAILJS_TEMPLATE_ID;
const EMAILJS_PUBLIC_KEY = process.env.EMAILJS_PUBLIC_KEY || process.env.EMAILJS_USER_ID || "kfwGWpE7XBQH2_06B";
const EMAILJS_PRIVATE_KEY = process.env.EMAILJS_PRIVATE_KEY || process.env.EMAILJS_ACCESS_TOKEN || "";
const GMAIL_DESTINATION = process.env.GMAIL_DESTINATION || "medaxuz@gmail.com";

interface SendEmailJsParams {
  serviceId?: string;
  templateId?: string;
  templateParams: Record<string, any>;
}

/**
 * EmailJS REST API orqali elektron xat jo'natish
 * Endpoint: POST https://api.emailjs.com/api/v1.0/email/send
 */
async function sendViaEmailJS(params: SendEmailJsParams): Promise<boolean> {
  const serviceId = params.serviceId || EMAILJS_SERVICE_ID;
  const templateId = params.templateId || EMAILJS_TEMPLATE_ID;
  const publicKey = EMAILJS_PUBLIC_KEY;
  const privateKey = EMAILJS_PRIVATE_KEY;

  if (!serviceId || !templateId || !publicKey) {
    console.log(
      `[EmailJS] Sozlamalar to'liq emas (EMAILJS_SERVICE_ID: "${serviceId}", EMAILJS_TEMPLATE_ID: "${templateId}", EMAILJS_PUBLIC_KEY: "${publicKey ? "mavjud" : "yo'q"}"). Xabar bazada saqlanadi.`
    );
    return false;
  }

  const payload: Record<string, any> = {
    service_id: serviceId,
    template_id: templateId,
    user_id: publicKey,
    template_params: params.templateParams,
  };

  if (privateKey) {
    payload.accessToken = privateKey;
  }

  try {
    const res = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        "Origin": "https://medax.uz",
        "Referer": "https://medax.uz/",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(`[EmailJS] Xatolik yuz berdi (HTTP ${res.status}):`, errText);
      return false;
    }

    const resText = await res.text();
    console.log(`[EmailJS] Xabar muvaffaqiyatli jo'natildi (${GMAIL_DESTINATION}):`, resText);
    return true;
  } catch (err) {
    console.error("[EmailJS] Tarmoq yoki so'rov xatoligi:", err);
    return false;
  }
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
 * Sayt yoki ilovadan kelgan murojaatni EmailJS orqali medaxuz@gmail.com ga jo'natish
 */
export async function sendContactEmail(data: ContactEmailData): Promise<boolean> {
  const formattedDate = new Date().toLocaleString("uz-UZ", {
    timeZone: "Asia/Tashkent",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

  const mailSubject = `🔔 Medax Murojaat: ${data.subject || "Saytdan yangi xabar"} (${data.name})`;

  const fullSummary = `
Yangi murojaat qabul qilindi:
----------------------------------------
Ismi: ${data.name}
Telefon: ${data.phone}
${data.email ? `Email: ${data.email}\n` : ""}Mavzu: ${data.subject || "Ko'rsatilmagan"}
Sana: ${formattedDate}
IP: ${data.ip || "Noma'lum"}

Xabar:
${data.message}
----------------------------------------
  `.trim();

  return sendViaEmailJS({
    templateParams: {
      name: data.name,
      from_name: data.name,
      phone: data.phone,
      email: data.email || "Keltirilmagan",
      reply_to: data.email || GMAIL_DESTINATION,
      subject: mailSubject,
      title: mailSubject,
      message: `${data.message}\n\n📞 Telefon: ${data.phone}${data.email ? `\n✉️ Email: ${data.email}` : ""}\n📅 Sana: ${formattedDate}`,
      full_message: fullSummary,
      summary: fullSummary,
      date: formattedDate,
      time: formattedDate,
      ip: data.ip || "",
      to_email: GMAIL_DESTINATION,
      recipient: GMAIL_DESTINATION,
    },
  });
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
 * Yangi buyurtma tushganda EmailJS orqali medaxuz@gmail.com ga bildirishnoma jo'natish
 */
export async function sendNewOrderEmail(order: OrderEmailData): Promise<boolean> {
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

  const fullSummary = `
Yangi buyurtma qabul qilindi:
----------------------------------------
Buyurtma kodi: #${order.code} (№${order.id})
Mijoz: ${order.customerName}
Telefon: ${order.phone}
${order.organization ? `Tashkilot: ${order.organization}\n` : ""}${order.deliveryAddress ? `Yetkazish manzili: ${order.deliveryAddress}\n` : ""}Sana: ${formattedDate}

Mahsulotlar:
${itemsList}

Jami summa: ${order.totalAmount ? Number(order.totalAmount).toLocaleString() + " so'm" : "Kelishuv asosida"}
----------------------------------------
Admin panel: https://medax.uz/admin/orders
  `.trim();

  return sendViaEmailJS({
    templateId: EMAILJS_ORDER_TEMPLATE_ID || EMAILJS_TEMPLATE_ID,
    templateParams: {
      name: order.customerName,
      from_name: order.customerName,
      phone: order.phone,
      reply_to: GMAIL_DESTINATION,
      subject: mailSubject,
      title: mailSubject,
      order_code: order.code,
      order_id: String(order.id),
      organization: order.organization || "Jismoniy shaxs",
      delivery_address: order.deliveryAddress || "Ko'rsatilmagan",
      items: itemsList,
      total_amount: order.totalAmount ? Number(order.totalAmount).toLocaleString() + " so'm" : "Kelishuv asosida",
      message: fullSummary,
      full_message: fullSummary,
      summary: fullSummary,
      date: formattedDate,
      time: formattedDate,
      to_email: GMAIL_DESTINATION,
      recipient: GMAIL_DESTINATION,
      admin_link: "https://medax.uz/admin/orders",
    },
  });
}
