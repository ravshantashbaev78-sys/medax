import { FormEvent, useEffect, useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { api, ApiError, getToken, setToken } from "../api";
import { MedaxLogo } from "../components/MedaxLogo";
import { AdminI18nProvider, useAdminI18n } from "./i18n";
import { useTheme } from "../context/ThemeContext";
import { LanguageSwitcher } from "../components/LanguageSwitcher";
import { ThemeToggle } from "../components/ThemeToggle";

export interface Me {
  id: number;
  name: string;
  email: string;
  role: "OWNER" | "ADMIN" | "MANAGER";
}

function AdminLayoutInner() {
  const nav = useNavigate();
  const { lang, setLang, t } = useAdminI18n();
  const { theme, toggleTheme } = useTheme();
  const [me, setMe] = useState<Me | null>(null);
  const [newCount, setNewCount] = useState(0);
  const [unreadMsg, setUnreadMsg] = useState(0);

  useEffect(() => {
    if (!getToken()) return void nav("/admin/login", { replace: true });
    api<{ user: Me }>("/auth/me", { admin: true })
      .then((r) => setMe(r.user))
      .catch(() => {});
    const load = () =>
      api<{ orders: Record<string, number>; unreadContacts?: number }>("/admin/stats", { admin: true })
        .then((s) => {
          setNewCount(s.orders.NEW || 0);
          setUnreadMsg(s.unreadContacts || 0);
        })
        .catch(() => {});
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

          <NavLink to="/admin/orders" className={link}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <path d="M16 10a4 4 0 0 1-8 0" />
            </svg>
            <span>{t("orders")}</span>
            {newCount > 0 && <span className="adm-badge-count">{newCount}</span>}
          </NavLink>

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

          <NavLink to="/admin/customers" className={link}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            <span>Mijozlar ro'yxati</span>
          </NavLink>

          <NavLink to="/admin/messages" className={link}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <span>Murojaatlar</span>
            {unreadMsg > 0 && <span className="adm-badge-count">{unreadMsg}</span>}
          </NavLink>

          <NavLink to="/admin/import" className={link}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            <span>{t("import_excel")}</span>
          </NavLink>

          <NavLink to="/admin/blocklist" className={link}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
            </svg>
            <span>{t("blocklist")}</span>
          </NavLink>

          {me.role === "ADMIN" && (
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
            <span className="adm-page-title">{t("admin_panel")}</span>
          </div>

          <div className="adm-topbar-right">
            {/* Smooth Globe Dropdown Language Switcher */}
            <LanguageSwitcher />

            {/* Sun-to-Moon Morphing SVG Theme Toggle */}
            <ThemeToggle />

            {/* User Profile Pill */}
            <div className="adm-user-profile-chip" title={`${me.email} (${me.role})`}>
              <span className="user-avatar-dot">{me.name.charAt(0).toUpperCase()}</span>
              <div className="user-meta">
                <span className="user-name">{me.name}</span>
                <span className="user-role-badge">
                  {me.role === "OWNER" ? "👑 Ega (Owner)" : me.role === "ADMIN" ? t("role_admin") : t("role_manager")}
                </span>
              </div>
            </div>
          </div>
        </header>

        <main className="adm-content-body">
          <Outlet context={me} />
        </main>
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
  items: { quantity: number; productName: string }[];
}

export function Dashboard() {
  const { t } = useAdminI18n();
  const [s, setS] = useState<any>(null);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api("/admin/stats", { admin: true }).catch(() => null),
      api<{ items: RecentOrder[] }>("/admin/orders?page=1", { admin: true }).catch(() => ({ items: [] })),
    ]).then(([stats, ordersRes]) => {
      if (stats) setS(stats);
      if (ordersRes?.items) setRecentOrders(ordersRes.items.slice(0, 5));
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

  const rate = s.last30 ? Math.round((s.fake30 / s.last30) * 100) : 0;

  const statusLabel = (st: string) => {
    switch (st) {
      case "NEW": return t("st_new");
      case "CONFIRMED": return t("st_confirmed");
      case "DONE": return t("st_done");
      case "CANCELED": return t("st_canceled");
      case "FAKE": return t("st_fake");
      default: return st;
    }
  };

  return (
    <div className="adm-dashboard-view">
      <div className="adm-dashboard-head">
        <div>
          <h1>{t("dashboard")}</h1>
          <p className="adm-dashboard-sub">{t("security_notice")}</p>
        </div>

        <div className="adm-dashboard-actions">
          <Link to="/admin/products/new" className="adm-btn-primary">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>{t("action_add_product")}</span>
          </Link>
        </div>
      </div>

      {/* Modern KPI Cards Grid */}
      <div className="adm-kpi-grid">
        <Link to="/admin/orders?status=NEW" className="adm-kpi-card card-amber">
          <div className="kpi-icon-box">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
          </div>
          <div className="kpi-meta">
            <span className="kpi-value">{s.orders.NEW || 0}</span>
            <strong className="kpi-title">{t("stat_new_orders")}</strong>
            <span className="kpi-sub">{t("stat_new_orders_sub")}</span>
          </div>
        </Link>

        <Link to="/admin/orders?status=CONFIRMED" className="adm-kpi-card card-blue">
          <div className="kpi-icon-box">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
          </div>
          <div className="kpi-meta">
            <span className="kpi-value">{s.orders.CONFIRMED || 0}</span>
            <strong className="kpi-title">{t("stat_confirmed")}</strong>
            <span className="kpi-sub">{t("stat_confirmed_sub")}</span>
          </div>
        </Link>

        <Link to="/admin/orders?status=DONE" className="adm-kpi-card card-green">
          <div className="kpi-icon-box">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <div className="kpi-meta">
            <span className="kpi-value">{s.orders.DONE || 0}</span>
            <strong className="kpi-title">{t("stat_completed")}</strong>
            <span className="kpi-sub">{t("stat_completed_sub")}</span>
          </div>
        </Link>

        <Link to="/admin/products" className="adm-kpi-card card-purple">
          <div className="kpi-icon-box">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
              <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
            </svg>
          </div>
          <div className="kpi-meta">
            <span className="kpi-value">{s.products || 0}</span>
            <strong className="kpi-title">{t("stat_products")}</strong>
            <span className="kpi-sub">{t("stat_products_sub")}</span>
          </div>
        </Link>

        <div className="adm-kpi-card card-rose">
          <div className="kpi-icon-box">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>
          <div className="kpi-meta">
            <span className="kpi-value">{rate}%</span>
            <strong className="kpi-title">{t("stat_fake_rate")}</strong>
            <span className="kpi-sub">
              {t("stat_fake_sub")} ({s.fake30 || 0} / {s.last30 || 0})
            </span>
          </div>
        </div>

        <Link to="/admin/blocklist" className="adm-kpi-card card-slate">
          <div className="kpi-icon-box">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <div className="kpi-meta">
            <span className="kpi-value">{s.blocked || 0}</span>
            <strong className="kpi-title">{t("stat_blocked")}</strong>
            <span className="kpi-sub">{t("stat_blocked_sub")}</span>
          </div>
        </Link>

        <Link to="/admin/messages" className="adm-kpi-card card-blue">
          <div className="kpi-icon-box">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <div className="kpi-meta">
            <span className="kpi-value">{s.unreadContacts || 0}</span>
            <strong className="kpi-title">Murojaatlar</strong>
            <span className="kpi-sub">Yangi o'qilmagan xabarlar</span>
          </div>
        </Link>
      </div>

      {/* Quick Actions & System Health Section */}
      <div className="adm-two-col-grid">
        {/* Quick Actions Panel */}
        <div className="adm-panel-card">
          <div className="adm-panel-head">
            <h3>{t("quick_actions")}</h3>
          </div>
          <div className="adm-quick-actions-list">
            <Link to="/admin/products/new" className="quick-action-btn">
              <span className="qa-icon">➕</span>
              <div className="qa-text">
                <strong>{t("action_add_product")}</strong>
                <small>Yangi tibbiy uskuna spetsifikatsiyasini kiritish</small>
              </div>
            </Link>

            <Link to="/admin/taxonomy" className="quick-action-btn">
              <span className="qa-icon">📁</span>
              <div className="qa-text">
                <strong>{t("action_add_category")}</strong>
                <small>Kategoriyalar va brendlar ro'yxatini boshqarish</small>
              </div>
            </Link>

            <Link to="/admin/orders" className="quick-action-btn">
              <span className="qa-icon">📋</span>
              <div className="qa-text">
                <strong>{t("action_view_orders")}</strong>
                <small>Kelib tushgan B2B buyurtmalarni tekshirish</small>
              </div>
            </Link>

            <Link to="/admin/import" className="quick-action-btn">
              <span className="qa-icon">📊</span>
              <div className="qa-text">
                <strong>{t("action_excel_import")}</strong>
                <small>Ommaviy mahsulotlarni Excel fayl orqali yuklash</small>
              </div>
            </Link>
          </div>
        </div>

        {/* System Status Panel */}
        <div className="adm-panel-card">
          <div className="adm-panel-head">
            <h3>{t("system_health")}</h3>
          </div>
          <div className="adm-health-list">
            <div className="health-row">
              <div className="health-info">
                <span className="health-indicator-dot online" />
                <div>
                  <strong>{t("sys_server")}</strong>
                  <small>Node.js & Express REST API</small>
                </div>
              </div>
              <span className="health-status-badge">{t("sys_online")}</span>
            </div>

            <div className="health-row">
              <div className="health-info">
                <span className="health-indicator-dot online" />
                <div>
                  <strong>{t("sys_database")}</strong>
                  <small>Prisma ORM & PostgreSQL</small>
                </div>
              </div>
              <span className="health-status-badge">{t("sys_online")}</span>
            </div>

            <div className="health-row">
              <div className="health-info">
                <span className="health-indicator-dot online" />
                <div>
                  <strong>{t("sys_security")}</strong>
                  <small>SMS OTP va IP antispam filtri</small>
                </div>
              </div>
              <span className="health-status-badge">{t("sys_active")}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Orders Overview Table */}
      <div className="adm-panel-card" style={{ marginTop: 24 }}>
        <div className="adm-panel-head space-between">
          <h3>{t("recent_orders")}</h3>
          <Link to="/admin/orders" className="adm-link-more">
            {t("all")} →
          </Link>
        </div>

        {recentOrders.length === 0 ? (
          <p className="muted" style={{ padding: 20 }}>
            {t("no_orders_yet")}
          </p>
        ) : (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>{t("order_code")}</th>
                  <th>{t("customer")}</th>
                  <th>{t("phone")}</th>
                  <th>Uskunalar</th>
                  <th>{t("status")}</th>
                  <th>{t("date")}</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((o) => (
                  <tr key={o.id}>
                    <td>
                      <Link to={`/admin/orders?q=${o.code}`} className="order-code-link">
                        #{o.code}
                      </Link>
                    </td>
                    <td>
                      <strong>{o.customerName}</strong>
                    </td>
                    <td>{o.phone}</td>
                    <td>
                      {o.items?.length > 0
                        ? `${o.items[0].productName} ${o.items.length > 1 ? `(+${o.items.length - 1})` : ""}`
                        : "1 ta"}
                    </td>
                    <td>
                      <span className={`st ${o.status}`}>{statusLabel(o.status)}</span>
                    </td>
                    <td>{new Date(o.createdAt).toLocaleDateString("ru-RU")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
