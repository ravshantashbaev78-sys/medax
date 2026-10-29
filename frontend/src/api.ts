export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

const TOKEN_KEY = "mt_token";
export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t: string | null) => (t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY));

interface Opts {
  method?: string;
  json?: unknown;
  form?: FormData;
  admin?: boolean;
  token?: string;
  headers?: Record<string, string>;
}

export async function api<T = any>(path: string, opts: Opts = {}): Promise<T> {
  const headers: Record<string, string> = { ...opts.headers };
  let body: BodyInit | undefined;
  if (opts.json !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(opts.json);
  } else if (opts.form) {
    body = opts.form;
  }
  if (opts.token) {
    headers.Authorization = `Bearer ${opts.token}`;
    headers["X-Authorization"] = `Bearer ${opts.token}`;
    headers["X-Admin-Token"] = opts.token;
    headers["X-Access-Token"] = opts.token;
  } else if (opts.admin) {
    const t = getToken();
    if (t) {
      headers.Authorization = `Bearer ${t}`;
      headers["X-Authorization"] = `Bearer ${t}`;
      headers["X-Admin-Token"] = t;
      headers["X-Access-Token"] = t;
    }
  }

  let res: Response;
  try {
    res = await fetch(`/api${path}`, { method: opts.method || (body ? "POST" : "GET"), headers, body });
  } catch {
    throw new ApiError(0, "Server bilan aloqa yo'q. Internetni tekshiring.");
  }

  const isJson = res.headers.get("content-type")?.includes("application/json");
  if (!res.ok || !isJson) {
    if (res.status === 401 && opts.admin) {
      setToken(null);
      if (!location.pathname.startsWith("/admin/login")) location.href = "/admin/login";
    }
    const data = isJson ? await res.json().catch(() => ({})) : {};
    throw new ApiError(res.status, data?.error || "Xatolik yuz berdi");
  }

  const data = await res.json().catch(() => ({}));
  return data as T;
}

/* ------------------------------- Types -------------------------------- */

export interface Img { id?: number; url: string; thumbUrl: string }
export interface Product {
  id: number;
  slug: string;
  sku?: string | null;
  name: string;
  nameRu?: string | null;
  nameEn?: string | null;
  description: string;
  descriptionRu?: string | null;
  descriptionEn?: string | null;
  specs: { name: string; value: string }[];
  country?: string | null;
  priceFrom?: string | null;
  oldPrice?: string | null;
  discountPercent?: number | null;
  unit?: string | null;
  packageQty?: number | null;
  mfdDate?: string | null;
  expDate?: string | null;
  isHit: boolean;
  isNew: boolean;
  isActive: boolean;
  categoryId: number;
  brandId?: number | null;
  brand?: { name: string; slug: string } | null;
  category?: { name: string; slug: string };
  images: Img[];
  documents?: { id: number; title: string; url: string }[];
  related?: Product[];
}
export interface Category { id: number; name: string; slug: string; count: number; sortOrder?: number }
export interface Brand { id: number; name: string; slug: string; count: number; country?: string | null }
export interface Paged<T> { items: T[]; total: number; page: number; pages: number }

export const formatPrice = (v?: string | number | null) =>
  v == null || v === "" ? "" : Number(v).toLocaleString("ru-RU").replace(/,/g, " ");

export const money = (v?: string | number | null, currency: string = "so'm") => {
  if (v == null || v === "") return "Narx so'rang";
  return `${formatPrice(v)} ${currency}`;
};

export const STATUS_LABEL: Record<string, string> = {
  NEW: "Yangi",
  CONFIRMED: "Tasdiqlangan",
  READY: "Olib ketishga tayyor",
  DONE: "Bajarildi (Olib ketildi)",
  CANCELED: "Bekor qilingan",
  FAKE: "Soxta",
};
