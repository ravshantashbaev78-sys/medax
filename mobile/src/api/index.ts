import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

export const API_BASE = "https://medax.uz/api";
export const TOKEN_KEY = "@medax_customer_token";

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
}

export async function fetchCategories(): Promise<Category[]> {
  try {
    const res = await fetch(`${API_BASE}/categories`);
    const data = await res.json();
    return Array.isArray(data) ? data : data.categories || [];
  } catch (err) {
    console.error("fetchCategories error:", err);
    return [];
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
    const data = await res.json();
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
    return await res.json();
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
    const data = await res.json();
    if (!res.ok) return { ok: false, error: data.error || "SMS yuborishda xatolik" };
    return { ok: true, resendIn: data.resendIn || 60 };
  } catch (err: any) {
    return { ok: false, error: err.message || "Tarmoq xatosi" };
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
        password: password?.trim() || undefined,
      }),
    });
    const data = await res.json();
    if (!res.ok) return { ok: false, error: data.error || "Tasdiqlash kodi noto'g'ri" };
    return data;
  } catch (err: any) {
    return { ok: false, error: err.message || "Tarmoq xatosi" };
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
    const data = await res.json();
    if (!res.ok) return { ok: false, error: data.error || "Login yoki parol noto'g'ri" };
    return data;
  } catch (err: any) {
    return { ok: false, error: err.message || "Tarmoq xatosi" };
  }
}

export async function fetchCustomerProfile(): Promise<Customer | null> {
  try {
    const token = await AsyncStorage.getItem(TOKEN_KEY);
    if (!token) return null;
    const res = await fetch(`${API_BASE}/customer/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      await AsyncStorage.removeItem(TOKEN_KEY);
      return null;
    }
    const data = await res.json();
    return data.customer || null;
  } catch {
    return null;
  }
}

export async function uploadCustomerAvatar(imageUri: string): Promise<{ ok: boolean; avatar?: string; error?: string }> {
  try {
    const token = await AsyncStorage.getItem(TOKEN_KEY);
    if (!token) return { ok: false, error: "Tizimga kirilmagan" };

    const filename = imageUri.split("/").pop() || "avatar.jpg";
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : `image/jpeg`;

    const formData = new FormData();
    try {
      const imgRes = await fetch(imageUri);
      const blob = await imgRes.blob();
      formData.append("avatar", blob, filename);
    } catch {
      formData.append("avatar", {
        uri: Platform.OS === "android" ? imageUri : imageUri.replace("file://", ""),
        name: filename,
        type,
      } as any);
    }

    const res = await fetch(`${API_BASE}/customer/auth/avatar`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });
    const data = await res.json();
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
    const data = await res.json();
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
    const data = await res.json();
    return data;
  } catch (err: any) {
    return { ok: false, error: err.message || "Parolni saqlashda xatolik" };
  }
}

export async function updateCustomerProfile(payload: { name?: string; organization?: string; avatar?: string }): Promise<{ ok: boolean; customer?: Customer; error?: string }> {
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
    const data = await res.json();
    return data;
  } catch (err: any) {
    return { ok: false, error: err.message || "Profilni yangilashda xatolik" };
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
    const data = await res.json();
    if (!res.ok) {
      return { ok: false, error: data.error || "SMS tasdiqlash kodini yuborishda xatolik" };
    }
    return { ok: true, resendIn: data.resendIn || 60 };
  } catch (err: any) {
    return { ok: false, error: err.message || "Tarmoqda xatolik yuz berdi" };
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
    const data = await res.json();
    if (!res.ok) {
      return { ok: false, error: data.error || data.message || "Buyurtma berishda xatolik" };
    }
    return data;
  } catch (err: any) {
    return { ok: false, error: err.message || "Tarmoqda xatolik yuz berdi" };
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

export async function fetchNotifications(): Promise<{ notifications: any[]; unreadCount: number }> {
  try {
    const token = await AsyncStorage.getItem(TOKEN_KEY);
    if (!token) return { notifications: [], unreadCount: 0 };
    const res = await fetch(`${API_BASE}/customer/notifications`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return { notifications: [], unreadCount: 0 };
    return await res.json();
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
