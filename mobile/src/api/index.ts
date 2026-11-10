import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

export const API_BASE = "https://medax.uz/api";
export const TOKEN_KEY = "@medax_customer_token";
export const CUSTOMER_CACHE_KEY = "@medax_customer_profile";

/** Server JSON o'rniga HTML (masalan 502 xato sahifasi) qaytarsa ham ilova yiqilmaydi */
async function readJson(res: Response): Promise<any> {
  try {
    return await res.json();
  } catch {
    return { error: res.ok ? "Serverdan noto'g'ri javob keldi" : `Server vaqtincha ishlamayapti (${res.status}). Birozdan so'ng urinib ko'ring.` };
  }
}

function networkError(err: any): string {
  const msg = String(err?.message || "");
  if (/network request failed|failed to fetch|network/i.test(msg)) {
    return "Internet aloqasi yo'q. Tarmoqni tekshirib, qayta urinib ko'ring.";
  }
  return msg || "Tarmoq xatosi";
}

export interface Category {
  id: number;
  name: string;
  slug: string;
}

export interface Product {
  id: number;
  name: string;
  nameRu?: string | null;
  nameEn?: string | null;
  slug: string;
  priceFrom?: number | string | null;
  oldPrice?: number | string | null;
  discountPercent?: number | null;
  unit?: string | null;
  stock?: number;
  images?: { url: string; thumbUrl: string }[];
  category?: Category;
  description?: string;
  descriptionRu?: string | null;
  descriptionEn?: string | null;
  specs?: any;
  country?: string | null;
  isHit?: boolean;
  isNew?: boolean;
}

export interface Customer {
  id: number;
  name: string;
  phone?: string | null;
  organization?: string | null;
  avatar?: string | null;
  hasPassword?: boolean;
}

export async function fetchCategories(): Promise<Category[]> {
  try {
    const res = await fetch(`${API_BASE}/categories`);
    const data = await readJson(res);
    return Array.isArray(data) ? data : data.categories || [];
  } catch (err) {
    console.error("fetchCategories error:", err);
    return [];
  }
}

export interface ProductPage {
  items: Product[];
  page: number;
  pages: number;
  total: number;
  ok: boolean;
}

/** Katalog uchun sahifalab yuklash (server bir so'rovda ko'pi bilan 48 ta mahsulot beradi) */
/** Savatdagi mahsulotlarning joriy narxi va qoldig'i (sotuvdan olinganlari javobda bo'lmaydi). null — tarmoq xatosi */
export async function fetchProductsByIds(ids: number[]): Promise<Product[] | null> {
  if (!ids.length) return [];
  try {
    const res = await fetch(`${API_BASE}/products/lookup?ids=${ids.slice(0, 40).join(",")}`);
    if (!res.ok) return null;
    const data = await readJson(res);
    return Array.isArray(data.items) ? data.items : null;
  } catch {
    return null;
  }
}

export async function fetchProductsPage(
  params: { categoryId?: number; search?: string; page?: number; limit?: number } = {}
): Promise<ProductPage> {
  const page = params.page || 1;
  try {
    const query = new URLSearchParams();
    if (params.categoryId) query.append("categoryId", String(params.categoryId));
    if (params.search) query.append("q", params.search);
    query.append("page", String(page));
    query.append("limit", String(params.limit || 24));
    const res = await fetch(`${API_BASE}/products?${query.toString()}`);
    if (!res.ok) return { items: [], page, pages: page, total: 0, ok: false };
    const data = await readJson(res);
    return {
      items: Array.isArray(data.items) ? data.items : [],
      page: data.page || page,
      pages: data.pages || 1,
      total: data.total || 0,
      ok: true,
    };
  } catch (err) {
    console.warn("fetchProductsPage error:", err);
    return { items: [], page, pages: page, total: 0, ok: false };
  }
}

export async function fetchProducts(params: { categoryId?: number; category?: string; search?: string; q?: string } = {}): Promise<Product[]> {
  try {
    const query = new URLSearchParams();
    if (params.categoryId) query.append("categoryId", String(params.categoryId));
    if (params.category) query.append("category", params.category);
    const searchVal = params.search || params.q;
    if (searchVal) {
      query.append("q", searchVal);
      query.append("search", searchVal);
    }

    const res = await fetch(`${API_BASE}/products?${query.toString()}`);
    const data = await readJson(res);
    return Array.isArray(data) ? data : (data.items || data.products || []);
  } catch (err) {
    console.error("fetchProducts error:", err);
    return [];
  }
}

export function getImageUrl(path?: string | null): string {
  if (!path) return "https://medax.uz/logo.png";
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  if (path.startsWith("/")) return `https://medax.uz${path}`;
  return `https://medax.uz/${path}`;
}

export function formatPrice(price?: number | string | null): string {
  if (price === undefined || price === null || price === "") return "Kelishilgan narxda";
  const num = typeof price === "number" ? price : parseFloat(String(price));
  if (isNaN(num) || num <= 0) return "Kelishilgan narxda";
  return num.toLocaleString("uz-UZ") + " UZS";
}

export async function fetchProductDetail(slug: string): Promise<Product | null> {
  try {
    const res = await fetch(`${API_BASE}/products/${slug}`);
    if (!res.ok) return null;
    return await readJson(res);
  } catch (err) {
    console.error("fetchProductDetail error:", err);
    return null;
  }
}

export async function sendCustomerOtp(phone: string): Promise<{ ok: boolean; resendIn?: number; error?: string }> {
  try {
    const cleanPhone = phone.replace(/[^\d+]/g, "");
    const res = await fetch(`${API_BASE}/customer/auth/send-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: cleanPhone }),
    });
    const data = await readJson(res);
    if (!res.ok) return { ok: false, error: data.error || "SMS yuborishda xatolik" };
    return { ok: true, resendIn: data.resendIn || 60 };
  } catch (err: any) {
    return { ok: false, error: networkError(err) };
  }
}

export async function verifyCustomerOtp(phone: string, code: string, name?: string, password?: string): Promise<{ ok: boolean; token?: string; customer?: Customer; error?: string }> {
  try {
    const cleanPhone = phone.replace(/[^\d+]/g, "");
    const res = await fetch(`${API_BASE}/customer/auth/verify-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phone: cleanPhone,
        code: code.trim(),
        name: name?.trim(),
        // Parol qirqilmaydi: login va reset ham uni aynan shunday yuboradi
        password: password || undefined,
      }),
    });
    const data = await readJson(res);
    if (!res.ok) return { ok: false, error: data.error || "Tasdiqlash kodi noto'g'ri" };
    return data;
  } catch (err: any) {
    return { ok: false, error: networkError(err) };
  }
}

export async function loginCustomerWithPassword(phone: string, password: string): Promise<{ ok: boolean; token?: string; customer?: Customer; error?: string }> {
  try {
    const cleanPhone = phone.replace(/[^\d+]/g, "");
    const res = await fetch(`${API_BASE}/customer/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: cleanPhone, password }),
    });
    const data = await readJson(res);
    if (!res.ok) return { ok: false, error: data.error || "Login yoki parol noto'g'ri" };
    return data;
  } catch (err: any) {
    return { ok: false, error: networkError(err) };
  }
}

export async function sendForgotPasswordOtp(phone: string): Promise<{ ok: boolean; message?: string; error?: string }> {
  try {
    const cleanPhone = phone.replace(/[^\d+]/g, "");
    const res = await fetch(`${API_BASE}/customer/auth/forgot-password-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: cleanPhone }),
    });
    const data = await readJson(res);
    if (!res.ok) return { ok: false, error: data.error || "SMS yuborishda xatolik" };
    return data;
  } catch (err: any) {
    return { ok: false, error: networkError(err) };
  }
}

export async function resetCustomerPassword(
  phone: string,
  code: string,
  newPassword: string
): Promise<{ ok: boolean; token?: string; customer?: Customer; error?: string }> {
  try {
    const cleanPhone = phone.replace(/[^\d+]/g, "");
    const res = await fetch(`${API_BASE}/customer/auth/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: cleanPhone, code, newPassword }),
    });
    const data = await readJson(res);
    if (!res.ok) return { ok: false, error: data.error || "Parolni yangilashda xatolik" };
    return data;
  } catch (err: any) {
    return { ok: false, error: networkError(err) };
  }
}

export type ProfileResult =
  | { status: "ok"; customer: Customer }
  | { status: "unauthorized" }
  | { status: "offline" };

/**
 * Profilni tekshiradi. Faqat server tokenni rad etsa (401/404) "unauthorized" qaytaradi.
 * Internet yo'q yoki server vaqtincha ishlamasa — "offline" (mijoz tizimdan chiqarib yuborilmaydi!).
 */
export async function fetchCustomerProfileStatus(): Promise<ProfileResult> {
  const token = await AsyncStorage.getItem(TOKEN_KEY);
  if (!token) return { status: "unauthorized" };
  try {
    const res = await fetch(`${API_BASE}/customer/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status === 401 || res.status === 404) return { status: "unauthorized" };
    if (!res.ok) return { status: "offline" };
    const data = await readJson(res);
    if (!data.customer) return { status: "offline" };
    return { status: "ok", customer: data.customer };
  } catch {
    return { status: "offline" };
  }
}

export async function fetchCustomerProfile(): Promise<Customer | null> {
  const r = await fetchCustomerProfileStatus();
  return r.status === "ok" ? r.customer : null;
}

export async function deleteCustomerAccount(password?: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const token = await AsyncStorage.getItem(TOKEN_KEY);
    if (!token) return { ok: false, error: "Tizimga kirilmagan" };
    const res = await fetch(`${API_BASE}/customer/auth/account`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(password ? { password } : {}),
    });
    const data = await readJson(res);
    if (!res.ok) return { ok: false, error: data.error || "Hisobni o'chirishda xatolik" };
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: networkError(err) };
  }
}

export async function uploadCustomerAvatar(
  imageUri: string,
  mimeTypeParam?: string | null,
  fileNameParam?: string | null
): Promise<{ ok: boolean; avatar?: string; error?: string }> {
  try {
    const token = await AsyncStorage.getItem(TOKEN_KEY);
    if (!token) return { ok: false, error: "Tizimga kirilmagan" };

    const filename = fileNameParam || imageUri.split("/").pop() || `avatar_${Date.now()}.jpg`;
    const ext = filename.split(".").pop()?.toLowerCase() || "jpg";
    const mimeType = mimeTypeParam || (ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg");

    const formData = new FormData();
    formData.append("avatar", {
      uri: imageUri,
      name: filename.includes(".") ? filename : `${filename}.jpg`,
      type: mimeType,
    } as any);

    const res = await fetch(`${API_BASE}/customer/auth/avatar`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      body: formData,
    });
    const data = await readJson(res);
    if (!res.ok) {
      return { ok: false, error: data.error || `Server xatosi (${res.status})` };
    }
    return data;
  } catch (err: any) {
    return { ok: false, error: err.message || "Rasm yuklashda xatolik" };
  }
}

export async function fetchCustomerOrders(): Promise<any[]> {
  try {
    const token = await AsyncStorage.getItem(TOKEN_KEY);
    if (!token) return [];
    const res = await fetch(`${API_BASE}/customer/orders`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return [];
    const data = await readJson(res);
    return data.orders || [];
  } catch {
    return [];
  }
}

export async function setCustomerPassword(newPassword: string): Promise<{ ok: boolean; message?: string; error?: string }> {
  try {
    const token = await AsyncStorage.getItem(TOKEN_KEY);
    if (!token) return { ok: false, error: "Tizimga kirilmagan" };
    const res = await fetch(`${API_BASE}/customer/auth/password`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ newPassword }),
    });
    const data = await readJson(res);
    if (!res.ok) return { ok: false, error: data.error || "Parolni saqlashda xatolik" };
    return data;
  } catch (err: any) {
    return { ok: false, error: err.message || "Parolni saqlashda xatolik" };
  }
}

export async function updateCustomerProfile(payload: { name?: string; organization?: string; avatar?: null }): Promise<{ ok: boolean; customer?: Customer; error?: string }> {
  try {
    const token = await AsyncStorage.getItem(TOKEN_KEY);
    if (!token) return { ok: false, error: "Tizimga kirilmagan" };

    const res = await fetch(`${API_BASE}/customer/auth/profile`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
    const data = await readJson(res);
    if (!res.ok) return { ok: false, error: data.error || "Profilni yangilashda xatolik" };
    return data;
  } catch (err: any) {
    return { ok: false, error: networkError(err) };
  }
}

export async function sendOrderOtp(phone: string): Promise<{ ok: boolean; resendIn?: number; error?: string }> {
  try {
    const cleanPhone = phone.replace(/[^\d+]/g, "");
    const res = await fetch(`${API_BASE}/orders/otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: cleanPhone }),
    });
    const data = await readJson(res);
    if (!res.ok) {
      return { ok: false, error: data.error || "SMS tasdiqlash kodini yuborishda xatolik" };
    }
    return { ok: true, resendIn: data.resendIn || 60 };
  } catch (err: any) {
    return { ok: false, error: networkError(err) };
  }
}

export async function submitOrder(orderData: {
  customerName: string;
  phone: string;
  deliveryAddress?: string;
  organization?: string;
  paymentMethod?: string;
  comment?: string;
  code?: string;
  items: { productId: number; quantity: number }[];
}): Promise<{ ok: boolean; orderId?: number; code?: string; error?: string }> {
  try {
    const token = await AsyncStorage.getItem(TOKEN_KEY);
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;

    const cleanPhone = orderData.phone.replace(/[^\d+]/g, "");

    const payload: Record<string, any> = {
      name: orderData.customerName,
      phone: cleanPhone,
      deliveryAddress: orderData.deliveryAddress || "Do'kondan olib ketish",
      organization: orderData.organization || "",
      paymentMethod: orderData.paymentMethod || "Do'konda to'lash (Olib ketishda)",
      comment: orderData.comment || "",
      items: orderData.items,
      elapsedMs: 3000,
    };
    if (orderData.code) {
      payload.code = orderData.code;
    }

    const res = await fetch(`${API_BASE}/orders`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });
    const data = await readJson(res);
    if (!res.ok) {
      return { ok: false, error: data.error || data.message || "Buyurtma berishda xatolik" };
    }
    return data;
  } catch (err: any) {
    return { ok: false, error: networkError(err) };
  }
}

export async function registerPushToken(pushToken: string): Promise<boolean> {
  try {
    const token = await AsyncStorage.getItem(TOKEN_KEY);
    if (!token) return false;
    const res = await fetch(`${API_BASE}/customer/auth/push-token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ pushToken }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function removePushToken(): Promise<boolean> {
  try {
    const token = await AsyncStorage.getItem(TOKEN_KEY);
    if (!token) return false;
    const res = await fetch(`${API_BASE}/customer/auth/push-token`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function fetchNotifications(): Promise<{ notifications: any[]; unreadCount: number }> {
  try {
    const token = await AsyncStorage.getItem(TOKEN_KEY);
    if (!token) return { notifications: [], unreadCount: 0 };
    const res = await fetch(`${API_BASE}/customer/notifications`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return { notifications: [], unreadCount: 0 };
    return await readJson(res);
  } catch {
    return { notifications: [], unreadCount: 0 };
  }
}

export async function markNotificationsRead(): Promise<boolean> {
  try {
    const token = await AsyncStorage.getItem(TOKEN_KEY);
    if (!token) return false;
    const res = await fetch(`${API_BASE}/customer/notifications/read-all`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.ok;
  } catch {
    return false;
  }
}
