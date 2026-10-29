import { config } from "./config";

let eskizToken: { value: string; at: number } | null = null;

async function eskizLogin(): Promise<string> {
  if (eskizToken && Date.now() - eskizToken.at < 20 * 24 * 3600 * 1000) return eskizToken.value;
  const body = new URLSearchParams({ email: config.eskiz.email, password: config.eskiz.password });
  const r = await fetch("https://notify.eskiz.uz/api/auth/login", {
    method: "POST",
    body,
    signal: AbortSignal.timeout(10000),
  });
  const j: any = await r.json();
  const token = j?.data?.token;
  if (!token) throw new Error("Eskiz login xatosi");
  eskizToken = { value: token, at: Date.now() };
  return token;
}

export async function sendSms(phone: string, text: string): Promise<void> {
  if (config.smsProvider === "eskiz") {
    const token = await eskizLogin();
    const body = new URLSearchParams({
      mobile_phone: phone.replace("+", ""),
      message: text,
      from: config.eskiz.from,
    });
    const r = await fetch("https://notify.eskiz.uz/api/message/sms/send", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body,
      signal: AbortSignal.timeout(10000),
    });
    const resData: any = await r.json().catch(() => null);
    if (!r.ok || resData?.status === "error") {
      console.error("[Eskiz SMS Error]", r.status, resData);
      throw new Error(resData?.message || `SMS yuborilmadi (${r.status})`);
    }
    console.log(`[Eskiz SMS Success] To: ${phone}, ID: ${resData?.id || resData?.data?.id || "ok"}, Status: ${resData?.status || "sent"}`);
    return;
  }
  console.log(`[SMS:console] ${phone} -> ${text}`);
}
