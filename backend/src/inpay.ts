import { config } from "./config";

interface TokenCache {
  token: string;
  expiresAt: number;
}

let cachedToken: TokenCache | null = null;

/**
 * inPAY Bearer tokenni oladi va 23 soat davomida keshda saqlaydi.
 * Docs: GET /api/v1/authorization/?merchant_id=...&merchant_token=...
 */
export async function getInpayBearerToken(): Promise<string> {
  const { merchantId, merchantToken, baseUrl } = config.inpay;
  if (!merchantId || !merchantToken) {
    throw new Error("inPAY sozlamalari (INPAY_MERCHANT_ID yoki INPAY_MERCHANT_TOKEN) topilmadi.");
  }

  // Kesh tekshiruvi (muddati tugashidan 1 soat oldin yangilaydi)
  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.token;
  }

  const url = `${baseUrl.replace(/\/+$/, "")}/authorization/?merchant_id=${encodeURIComponent(
    merchantId
  )}&merchant_token=${encodeURIComponent(merchantToken)}`;

  const res = await fetch(url, {
    method: "GET",
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(12000),
  });

  const data = (await res.json().catch(() => ({}))) as any;
  if (!res.ok || !data.success || !data.bearer_token) {
    throw new Error(data.message || `inPAY avtorizatsiyadan o'tolmadi (${res.status})`);
  }

  cachedToken = {
    token: data.bearer_token,
    expiresAt: Date.now() + 23 * 3600 * 1000, // 23 soat kesh
  };

  return cachedToken.token;
}

export interface CreateInpayPaymentParams {
  amount: number;
  description: string;
  phone?: string;
  clientIp?: string;
  paymentMethod?: "click" | "payme" | "cardsystem";
}

export interface InpayPaymentResult {
  success: boolean;
  orderId: string;
  payUrl: string;
  message?: string;
}

/**
 * inPAY orqali to'lov havolasini yaratadi.
 * Docs: POST /api/v1/create/
 */
export async function createInpayPayment(
  params: CreateInpayPaymentParams
): Promise<InpayPaymentResult> {
  const { merchantId, merchantToken, baseUrl, callbackUrl } = config.inpay;
  const bearerToken = await getInpayBearerToken();

  const cleanPhone = params.phone ? params.phone.replace(/[^\d]/g, "") : "";

  const payload: Record<string, any> = {
    merchant_id: String(merchantId),
    token: merchantToken,
    amount: Math.max(1000, Math.round(params.amount)),
    description: params.description,
    callback_url: callbackUrl,
  };

  if (params.paymentMethod) payload.payment_method = params.paymentMethod;
  if (cleanPhone) payload.phone = cleanPhone;
  if (params.clientIp) payload.client_ip = params.clientIp;

  const res = await fetch(`${baseUrl.replace(/\/+$/, "")}/create/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${bearerToken}`,
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(12000),
  });

  const data = (await res.json().catch(() => ({}))) as any;
  if (!res.ok || !data.success || !data.pay_url) {
    throw new Error(data.message || `inPAY to'lov hisobi yaratishda xatolik (${res.status})`);
  }

  return {
    success: true,
    orderId: data.order_id,
    payUrl: data.pay_url,
    message: data.message,
  };
}

/**
 * inPAY tranzaksiya holatini tekshiradi.
 * Docs: GET /api/v1/transactions/?order_id=...
 */
export async function getInpayTransactionStatus(orderId: string) {
  const { baseUrl } = config.inpay;
  const bearerToken = await getInpayBearerToken();
  const res = await fetch(
    `${baseUrl.replace(/\/+$/, "")}/transactions/?order_id=${encodeURIComponent(orderId)}`,
    {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${bearerToken}`,
      },
      signal: AbortSignal.timeout(10000),
    }
  );
  return await res.json().catch(() => ({}));
}

