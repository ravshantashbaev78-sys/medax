import { FormEvent, useEffect, useState, useRef } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { api, ApiError, getToken, setToken } from "../api";
import { MedaxLogo } from "../components/MedaxLogo";
import { AdminI18nProvider, useAdminI18n } from "./i18n";
import { useTheme } from "../context/ThemeContext";
import { LanguageSwitcher } from "../components/LanguageSwitcher";
import { ThemeToggle } from "../components/ThemeToggle";
import "./admin.css";

export interface Me {
  id: number;
  name: string;
  email: string;
  role: "OWNER" | "ADMIN" | "MANAGER";
}

function playNotificationChime() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(587.33, now); // D5
    osc1.frequency.exponentialRampToValueAtTime(880, now + 0.15); // A5
    gain1.gain.setValueAtTime(0.15, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.35);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(880, now + 0.12);
    osc2.frequency.exponentialRampToValueAtTime(1174.66, now + 0.3); // D6
    gain2.gain.setValueAtTime(0.18, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.5);
  } catch {}
}

const NAV_GROUPS: Record<string, Record<string, string>> = {
  sales: { uz: "Savdo", ru: "Продажи", en: "Sales" },
  catalog: { uz: "Katalog", ru: "Каталог", en: "Catalog" },
  stock: { uz: "Ombor", ru: "Склад", en: "Inventory" },
  system: { uz: "Tizim", ru: "Система", en: "System" },
};

// Sarlavhada joriy bo'lim nomi (i18n kalitlari)
const PAGE_TITLE_KEYS: [string, string][] = [
  ["/admin/orders", "orders"],
  ["/admin/customers", "customers_list"],
  ["/admin/messages", "contact_inquiries"],
  ["/admin/products", "products"],
  ["/admin/taxonomy", "taxonomy"],
  ["/admin/import", "import_excel"],
  ["/admin/erp", "erp_title"],
  ["/admin/blocklist", "blocklist"],
  ["/admin/users", "users"],
];

function AdminLayoutInner() {
  const nav = useNavigate();
  const location = useLocation();
  const { lang, setLang, t } = useAdminI18n();
  const { theme, toggleTheme } = useTheme();
  const [me, setMe] = useState<Me | null>(null);
  const [newCount, setNewCount] = useState(0);
  const [unreadMsg, setUnreadMsg] = useState(0);
  const [showPwdModal, setShowPwdModal] = useState(false);
  const prevOrdersRef = useRef<number | null>(null);

  useEffect(() => {
    if (!getToken()) return void nav("/admin/login", { replace: true });
    api<{ user: Me }>("/auth/me", { admin: true })
      .then((r) => setMe(r.user))
      .catch(() => {});

    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }

    const load = () => {
      // 1. Stats and order audio chime
      api<{ orders: Record<string, number>; unreadContacts?: number }>("/admin/stats", { admin: true })
        .then((s) => {
          const currentNew = s.orders.NEW || 0;
          if (prevOrdersRef.current !== null && currentNew > prevOrdersRef.current) {
            playNotificationChime();
            if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
              new Notification("Yangi buyurtma!", {
                body: `Yangi buyurtma qabul qilindi. Tasdiqlanmagan buyurtmalar: ${currentNew} ta.`,
                icon: "/favicon.ico",
              });
            }
          }
          prevOrdersRef.current = currentNew;
          setNewCount(currentNew);
          setUnreadMsg(s.unreadContacts || 0);
        })
        .catch(() => {});
    };

    load();
    const timer = setInterval(load, 30000);
    return () => clearInterval(timer);
  }, [nav]);

  if (!me) {
    return (
      <div className="adm-loading-screen">
        <div className="adm-spinner" />
        <p>{t("loading")}</p>
      </div>
    );
  }

  const link = ({ isActive }: { isActive: boolean }) => (isActive ? "adm-nav-item on" : "adm-nav-item");

  return (
    <div className={`adm ${theme === "dark" ? "theme-dark" : "theme-light"}`}>
      {/* Modern Admin Sidebar */}
      <aside className="adm-side">
        <div className="adm-side-brand">
          <Link to="/admin" className="adm-logo-wrap" title="Medax Admin">
            <MedaxLogo size="sm" showSub={false} />
            <span className="adm-version-tag">v2.4</span>
          </Link>
        </div>

        <nav className="adm-nav-list" aria-label="Admin menyu">
          <NavLink end to="/admin" className={link}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7" rx="1.5" />
              <rect x="14" y="3" width="7" height="7" rx="1.5" />
              <rect x="14" y="14" width="7" height="7" rx="1.5" />
              <rect x="3" y="14" width="7" height="7" rx="1.5" />
            </svg>
            <span>{t("dashboard")}</span>
          </NavLink>

          <div className="adm-nav-group">{NAV_GROUPS.sales[lang] || NAV_GROUPS.sales.uz}</div>
          <NavLink to="/admin/orders" className={link}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <path d="M16 10a4 4 0 0 1-8 0" />
            </svg>
            <span>{t("orders")}</span>
            {newCount > 0 && <span className="adm-badge-count">{newCount}</span>}
          </NavLink>
          <NavLink to="/admin/customers" className={link}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            <span>{t("customers_list")}</span>
          </NavLink>
          <NavLink to="/admin/messages" className={link}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <span>{t("contact_inquiries")}</span>
            {unreadMsg > 0 && <span className="adm-badge-count">{unreadMsg}</span>}
          </NavLink>

          <div className="adm-nav-group">{NAV_GROUPS.catalog[lang] || NAV_GROUPS.catalog.uz}</div>
          <NavLink to="/admin/products" className={link}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
              <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
              <line x1="12" y1="22.08" x2="12" y2="12" />
            </svg>
            <span>{t("products")}</span>
          </NavLink>
          <NavLink to="/admin/taxonomy" className={link}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            </svg>
            <span>{t("taxonomy")}</span>
          </NavLink>
          <NavLink to="/admin/import" className={link}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            <span>{t("import_excel")}</span>
          </NavLink>

          <div className="adm-nav-group">{NAV_GROUPS.stock[lang] || NAV_GROUPS.stock.uz}</div>
          <NavLink to="/admin/erp" className={link}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="3" width="20" height="14" rx="2" />
              <line x1="8" y1="21" x2="16" y2="21" />
              <line x1="12" y1="17" x2="12" y2="21" />
              <path d="M7 8h4" />
              <path d="M7 12h10" />
            </svg>
            <span>{t("erp_title")}</span>
          </NavLink>

          <div className="adm-nav-group">{NAV_GROUPS.system[lang] || NAV_GROUPS.system.uz}</div>
          <NavLink to="/admin/blocklist" className={link}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
            </svg>
            <span>{t("blocklist")}</span>
          </NavLink>
          {(me.role === "ADMIN" || me.role === "OWNER") && (
            <NavLink to="/admin/users" className={link}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              <span>{t("users")}</span>
            </NavLink>
          )}
        </nav>

        <div className="adm-side-footer">
          <a href="/" target="_blank" rel="noopener noreferrer" className="adm-side-link" title="Saytni yangi oynada ochish">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
            <span>{t("view_site")}</span>
          </a>

          <button
            type="button"
            className="adm-side-link"
            onClick={() => setShowPwdModal(true)}
            title={lang === "uz" ? "Parolni o'zgartirish" : lang === "ru" ? "Сменить пароль" : "Change password"}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <span>{lang === "uz" ? "Parol almashtirish" : lang === "ru" ? "Сменить пароль" : "Change password"}</span>
          </button>

          <button
            type="button"
            className="adm-side-link btn-logout"
            onClick={() => {
              setToken(null);
              nav("/admin/login");
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            <span>{t("logout")}</span>
          </button>
        </div>
      </aside>

      {/* Main Container with Top Bar */}
      <div className="adm-main-wrap">
        <header className="adm-topbar">
          <div className="adm-topbar-left">
            <span className="adm-page-title">
              {t((PAGE_TITLE_KEYS.find(([p]) => location.pathname.startsWith(p))?.[1] || "dashboard") as any)}
            </span>
          </div>

          <div className="adm-topbar-right">
            {/* 3-Button Segmented Language Picker */}
            <div className="adm-lang-picker">
              {(["uz", "ru", "en"] as const).map((l) => (
                <button
                  key={l}
                  type="button"
                  className={`lang-btn ${lang === l ? "active" : ""}`}
                  onClick={() => setLang(l)}
                >
                  {l.toUpperCase()}
                </button>
              ))}
            </div>

            {/* Sun-to-Moon Morphing SVG Theme Toggle */}
            <ThemeToggle />

            {/* User Profile Pill */}
            <div
              className="adm-user-profile-chip"
              title={`${me.email} (${me.role}) - Parolni o'zgartirish uchun bosing`}
              onClick={() => setShowPwdModal(true)}
              style={{ cursor: "pointer" }}
            >
              <span className="user-avatar-dot">{me.name.charAt(0).toUpperCase()}</span>
              <div className="user-meta">
                <span className="user-name">{me.name}</span>
                <span className="user-role-badge">
                  {me.role === "OWNER" ? t("role_owner") : me.role === "ADMIN" ? t("role_admin") : t("role_manager")}
                </span>
              </div>
            </div>
          </div>
        </header>

        <main className="adm-content-body">
          <Outlet context={me} />
        </main>
      </div>

      {showPwdModal && <ChangePasswordModal onClose={() => setShowPwdModal(false)} />}
    </div>
  );
}

function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const { lang } = useAdminI18n();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!currentPassword) {
      setError(
        lang === "uz"
          ? "Joriy parolni kiriting"
          : lang === "ru"
          ? "Введите текущий пароль"
          : "Enter current password"
      );
      return;
    }
    if (newPassword.length < 8) {
      setError(
        lang === "uz"
          ? "Yangi parol kamida 8 ta belgidan iborat bo'lishi kerak"
          : lang === "ru"
          ? "Новый пароль должен содержать минимум 8 символов"
          : "New password must be at least 8 characters"
      );
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(
        lang === "uz"
          ? "Yangi parollar bir-biriga mos kelmadi"
          : lang === "ru"
          ? "Пароли не совпадают"
          : "Passwords do not match"
      );
      return;
    }

    try {
      setBusy(true);
      const r = await api<{ token?: string }>("/admin/me/password", {
        method: "PATCH",
        json: { currentPassword, newPassword },
        admin: true,
      });
      // Server boshqa sessiyalarni yopadi va shu qurilma uchun yangi token beradi
      if (r?.token) setToken(r.token);
      setSuccess(
        lang === "uz"
          ? "Parol muvaffaqiyatli o'zgartirildi!"
          : lang === "ru"
          ? "Пароль успешно изменён!"
          : "Password updated successfully!"
      );
      setTimeout(() => {
        onClose();
      }, 1400);
    } catch (err: any) {
      setError(
        err?.message ||
          (lang === "uz"
            ? "Parolni o'zgartirishda xatolik yuz berdi"
            : "Error updating password")
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="box" style={{ maxWidth: 440 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h2 style={{ fontSize: 20, margin: 0, fontWeight: 700 }}>
            {lang === "uz" ? "Parolni o'zgartirish" : lang === "ru" ? "Смена пароля" : "Change Password"}
          </h2>
          <button type="button" className="btn ghost sm" onClick={onClose} style={{ padding: "4px 8px" }}>
            ✕
          </button>
        </div>

        {error && (
          <div style={{ background: "#fee2e2", color: "#991b1b", padding: "10px 14px", borderRadius: 8, marginBottom: 14, fontSize: 14 }}>
            {error}
          </div>
        )}

        {success && (
          <div style={{ background: "#dcfce7", color: "#166534", padding: "10px 14px", borderRadius: 8, marginBottom: 14, fontSize: 14 }}>
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
              {lang === "uz" ? "Joriy parol" : lang === "ru" ? "Текущий пароль" : "Current Password"}
            </label>
            <input
              type="password"
              className="inp"
              style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid var(--line)" }}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoFocus
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
              {lang === "uz" ? "Yangi parol (kamida 8 belgi)" : lang === "ru" ? "Новый пароль (мин. 8 симв.)" : "New Password (min 8 chars)"}
            </label>
            <input
              type="password"
              className="inp"
              style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid var(--line)" }}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={8}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
              {lang === "uz" ? "Yangi parolni tasdiqlang" : lang === "ru" ? "Повторите новый пароль" : "Confirm New Password"}
            </label>
            <input
              type="password"
              className="inp"
              style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid var(--line)" }}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={8}
            />
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 8 }}>
            <button type="button" className="btn ghost" onClick={onClose} disabled={busy}>
              {lang === "uz" ? "Bekor qilish" : lang === "ru" ? "Отмена" : "Cancel"}
            </button>
            <button type="submit" className="btn primary" disabled={busy}>
              {busy
                ? (lang === "uz" ? "Saqlanmoqda..." : "Saving...")
                : (lang === "uz" ? "Saqlash" : lang === "ru" ? "Сохранить" : "Save")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function AdminLayout() {
  return (
    <AdminI18nProvider>
      <AdminLayoutInner />
    </AdminI18nProvider>
  );
}

export function Login() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const r = await api<{ token: string }>("/auth/login", { json: { email, password } });
      setToken(r.token);
      nav("/admin", { replace: true });
    } catch (err) {
      setError((err as ApiError).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="login" onSubmit={submit}>
      <Link className="logo-link" to="/" style={{ marginBottom: 24, display: "inline-block" }}>
        <MedaxLogo size="md" />
      </Link>
      <h1 style={{ fontSize: 30, marginBottom: 18 }}>Boshqaruv paneliga kirish</h1>
      {error && <p className="err" role="alert">{error}</p>}
      <div className="field">
        <label htmlFor="e">Email</label>
        <input id="e" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" required />
      </div>
      <div className="field">
        <label htmlFor="p">Parol</label>
        <input id="p" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
      </div>
      <button className="btn" style={{ width: "100%" }} disabled={busy}>
        {busy ? "Kirilmoqda…" : "Kirish"}
      </button>
    </form>
  );
}

interface RecentOrder {
  id: number;
  code: string;
  customerName: string;
  phone: string;
  status: string;
  createdAt: string;
  totalAmount?: string | number | null;
  items: { quantity: number; productName: string }[];
}

interface LowStockItem {
  id: number;
  name: string;
  stock: number;
  minStock: number;
}

const DASH_TEXT: Record<string, Record<string, string>> = {
  newOrders: { uz: "Yangi buyurtmalar", ru: "Новые заказы", en: "New orders" },
  newOrdersFoot: { uz: "Tasdiqlashni kutmoqda", ru: "Ожидают подтверждения", en: "Awaiting confirmation" },
  inWork: { uz: "Jarayonda", ru: "В работе", en: "In progress" },
  inWorkFoot: { uz: "Tasdiqlangan va tayyor", ru: "Подтверждены и готовы", en: "Confirmed and ready" },
  last30: { uz: "30 kunda buyurtmalar", ru: "Заказы за 30 дней", en: "Orders, 30 days" },
  fake: { uz: "soxta", ru: "фейк", en: "fake" },
  products: { uz: "Mahsulotlar", ru: "Товары", en: "Products" },
  productsFoot: { uz: "Katalogda jami", ru: "Всего в каталоге", en: "Total in catalog" },
  customers: { uz: "Mijozlar", ru: "Клиенты", en: "Customers" },
  inquiries: { uz: "O'qilmagan murojaatlar", ru: "Непрочитанные обращения", en: "Unread inquiries" },
  blocked: { uz: "Bloklangan", ru: "Заблокировано", en: "Blocked" },
  done: { uz: "Topshirilgan", ru: "Выдано", en: "Completed" },
  lowStock: { uz: "Kam qolgan tovarlar", ru: "Заканчиваются", en: "Low stock" },
  lowStockEmpty: { uz: "Barcha tovarlar yetarli", ru: "Остатков достаточно", en: "Stock levels are fine" },
  warehouse: { uz: "Omborga o'tish", ru: "Перейти на склад", en: "Open inventory" },
  pcs: { uz: "dona", ru: "шт.", en: "pcs" },
  amount: { uz: "Summa", ru: "Сумма", en: "Amount" },
  negotiable: { uz: "Kelishiladi", ru: "Договорная", en: "On request" },
};

function fmtMoney(v: RecentOrder["totalAmount"], neg: string) {
  const n = Number(v);
  if (!v || !Number.isFinite(n) || n <= 0) return neg;
  return n.toLocaleString("ru-RU").replace(/,/g, " ") + " so'm";
}

export function Dashboard() {
  const { t, lang } = useAdminI18n();
  const d = (k: string) => DASH_TEXT[k]?.[lang] || DASH_TEXT[k]?.uz || k;
  const [s, setS] = useState<any>(null);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [lowStock, setLowStock] = useState<LowStockItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api("/admin/stats", { admin: true }).catch(() => null),
      api<{ items: RecentOrder[] }>("/admin/orders?page=1", { admin: true }).catch(() => ({ items: [] })),
      api<{ lowStock: LowStockItem[] }>("/admin/erp/alerts", { admin: true }).catch(() => ({ lowStock: [] })),
    ]).then(([stats, ordersRes, alerts]) => {
      if (stats) setS(stats);
      setRecentOrders(ordersRes?.items?.slice(0, 7) || []);
      setLowStock((alerts?.lowStock || []).filter((p) => p.stock <= (p.minStock || 5)).slice(0, 8));
      setLoading(false);
    });
  }, []);

  if (loading || !s) {
    return (
      <div className="adm-dashboard-loading">
        <div className="adm-spinner" />
        <p>{t("loading")}</p>
      </div>
    );
  }

  const statusLabel = (st: string) =>
    ({ NEW: t("st_new"), CONFIRMED: t("st_confirmed"), READY: t("st_ready"), DONE: t("st_done"), CANCELED: t("st_canceled"), FAKE: t("st_fake") } as Record<string, string>)[st] || st;

  const o = s.orders || {};
  const today = new Date().toLocaleDateString(lang === "en" ? "en-GB" : "ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" });

  return (
    <div className="adm-dashboard-view">
      <div className="dash-head">
        <div>
          <h1>{t("dashboard")}</h1>
          <div className="dash-date">{today}</div>
        </div>
        <Link to="/admin/products/new" className="btn">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
            <path d="M12 5v14M5 12h14" />
          </svg>
          {t("add_product")}
        </Link>
      </div>

      <div className="dash-kpis">
        <Link to="/admin/orders?status=NEW" className={`dash-kpi ${o.NEW ? "attention" : ""}`}>
          <span className="dash-kpi-label">{d("newOrders")}</span>
          <span className="dash-kpi-value">{o.NEW || 0}</span>
          <span className="dash-kpi-foot">{d("newOrdersFoot")}</span>
        </Link>
        <Link to="/admin/orders?status=CONFIRMED" className="dash-kpi">
          <span className="dash-kpi-label">{d("inWork")}</span>
          <span className="dash-kpi-value">{(o.CONFIRMED || 0) + (o.READY || 0)}</span>
          <span className="dash-kpi-foot">{d("inWorkFoot")}</span>
        </Link>
        <Link to="/admin/orders" className="dash-kpi">
          <span className="dash-kpi-label">{d("last30")}</span>
          <span className="dash-kpi-value">{s.last30 || 0}</span>
          <span className="dash-kpi-foot">
            {s.fake30 || 0} {d("fake")}
          </span>
        </Link>
        <Link to="/admin/products" className="dash-kpi">
          <span className="dash-kpi-label">{d("products")}</span>
          <span className="dash-kpi-value">{s.products || 0}</span>
          <span className="dash-kpi-foot">{d("productsFoot")}</span>
        </Link>
      </div>

      <div className="dash-strip">
        <Link to="/admin/customers" className="dash-strip-item">
          {d("customers")} <b>{s.customers || 0}</b>
        </Link>
        <Link to="/admin/messages" className="dash-strip-item">
          {d("inquiries")} <b>{s.unreadContacts || 0}</b>
        </Link>
        <Link to="/admin/orders?status=DONE" className="dash-strip-item">
          {d("done")} <b>{o.DONE || 0}</b>
        </Link>
        <Link to="/admin/blocklist" className="dash-strip-item">
          {d("blocked")} <b>{s.blocked || 0}</b>
        </Link>
      </div>

      <div className="dash-grid">
        <div className="adm-panel-card">
          <div className="adm-panel-head space-between">
            <h3>{t("recent_orders")}</h3>
            <Link to="/admin/orders" className="adm-link-more">
              {t("all")}
            </Link>
          </div>
          {recentOrders.length === 0 ? (
            <div className="dash-empty">{t("no_orders_yet")}</div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table className="tbl" style={{ minWidth: 560 }}>
                <thead>
                  <tr>
                    <th>{t("order_code")}</th>
                    <th>{t("customer")}</th>
                    <th>{t("products_col")}</th>
                    <th style={{ textAlign: "right" }}>{d("amount")}</th>
                    <th>{t("status")}</th>
                    <th>{t("date")}</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map((r) => (
                    <tr key={r.id}>
                      <td>
                        <Link to={`/admin/orders?q=${r.code}`} className="order-code-link">
                          {r.code}
                        </Link>
                      </td>
                      <td>{r.customerName}</td>
                      <td style={{ maxWidth: 220 }}>
                        {r.items?.length ? `${r.items[0].productName}${r.items.length > 1 ? ` +${r.items.length - 1}` : ""}` : "—"}
                      </td>
                      <td style={{ textAlign: "right" }}>{fmtMoney(r.totalAmount, d("negotiable"))}</td>
                      <td>
                        <span className={`st ${r.status}`}>{statusLabel(r.status)}</span>
                      </td>
                      <td>{new Date(r.createdAt).toLocaleDateString("ru-RU")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="adm-panel-card">
          <div className="adm-panel-head space-between">
            <h3>{d("lowStock")}</h3>
            <Link to="/admin/erp" className="adm-link-more">
              {d("warehouse")}
            </Link>
          </div>
          {lowStock.length === 0 ? (
            <div className="dash-empty">{d("lowStockEmpty")}</div>
          ) : (
            <ul className="dash-list">
              {lowStock.map((p) => (
                <li key={p.id}>
                  <Link to={`/admin/products/${p.id}`} className="name" style={{ color: "inherit", textDecoration: "none" }}>
                    {p.name}
                  </Link>
                  <span className={`dash-stock ${p.stock <= 0 ? "zero" : "low"}`}>
                    {p.stock} {d("pcs")}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
