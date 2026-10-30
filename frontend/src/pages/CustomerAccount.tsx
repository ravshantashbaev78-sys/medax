import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useCustomerAuth } from "../customerAuth";
import { DeviceIcon } from "../components/Shell";
import { ClinicIcon, PhoneSmsIcon, OrderBoxIcon, SettingsIcon } from "../components/Icons";
import { useI18n, Lang } from "../context/I18nContext";
import { useTheme } from "../context/ThemeContext";

interface OrderItem {
  id: number;
  productId: number;
  productName: string;
  quantity: number;
  product?: {
    id: number;
    name: string;
    slug: string;
    images?: Array<{ thumbUrl: string }>;
  };
}

interface CustomerOrder {
  id: number;
  code: string;
  status: "NEW" | "CONFIRMED" | "READY" | "DONE" | "CANCELED";
  createdAt: string;
  customerName: string;
  phone: string;
  organization?: string;
  comment?: string;
  cancelReason?: string;
  items: OrderItem[];
}

export default function CustomerAccount() {
  const { customer, token, updateProfile, changePassword, logout, openAuthModal, refreshCustomer } = useCustomerAuth();
  const { lang, setLang, t } = useI18n();
  const { theme, toggleTheme } = useTheme();
  const dateLocale = lang === "ru" ? "ru-RU" : lang === "en" ? "en-US" : "uz-UZ";
  const nav = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");

  const [tab, setTab] = useState<"orders" | "notifications" | "profile">(
    tabParam === "profile" ? "profile" : tabParam === "notifications" ? "notifications" : "orders"
  );
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  useEffect(() => {
    if (tabParam === "profile") setTab("profile");
    else if (tabParam === "notifications") setTab("notifications");
    else if (tabParam === "orders") setTab("orders");
  }, [tabParam]);

  const switchTab = (newTab: "orders" | "notifications" | "profile") => {
    setTab(newTab);
    setSearchParams(newTab === "orders" ? {} : { tab: newTab });
    if (newTab === "notifications" && unreadNotifications > 0) {
      fetch("/api/customer/notifications/read-all", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token || ""}`,
          "X-Authorization": `Bearer ${token || ""}`,
          "X-Customer-Token": token || "",
        },
      }).catch(() => {});
      setUnreadNotifications(0);
    }
  };

  // Profile edit states
  const [name, setName] = useState(customer?.name || "");
  const [org, setOrg] = useState(customer?.organization || "");
  const [saving, setSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState("");
  const [profileErr, setProfileErr] = useState("");

  // Password change states
  const [currPassword, setCurrPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confPassword, setConfPassword] = useState("");
  const [pwdSaving, setPwdSaving] = useState(false);
  const [pwdMsg, setPwdMsg] = useState("");
  const [pwdErr, setPwdErr] = useState("");

  // Customer order cancellation state
  const [cancelingOrderId, setCancelingOrderId] = useState<number | null>(null);
  const [cancelReasonText, setCancelReasonText] = useState("");
  const [cancelBusy, setCancelBusy] = useState(false);

  // Avatar upload state
  const [avatarUploading, setAvatarUploading] = useState(false);

  useEffect(() => {
    if (customer) {
      setName(customer.name || "");
      setOrg(customer.organization || "");
    }
  }, [customer]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !token) return;

    setAvatarUploading(true);
    try {
      const formData = new FormData();
      formData.append("avatar", file);

      const res = await fetch("/api/customer/auth/avatar", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token || ""}`,
          "X-Authorization": `Bearer ${token || ""}`,
          "X-Customer-Token": token || "",
        },
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Rasm yuklashda xatolik");
      }

      await refreshCustomer();
    } catch (err: any) {
      alert(err.message || "Rasm yuklashda xatolik yuz berdi");
    } finally {
      setAvatarUploading(false);
      e.target.value = "";
    }
  };

  const loadOrders = () => {
    if (!token) return;
    setLoadingOrders(true);
    fetch("/api/customer/orders", {
      headers: {
        Authorization: `Bearer ${token || ""}`,
        "X-Authorization": `Bearer ${token || ""}`,
        "X-Customer-Token": token || "",
      },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Yuklab bo'lmadi");
        return res.json();
      })
      .then((data) => setOrders(data.orders || []))
      .catch(() => setOrders([]))
      .finally(() => setLoadingOrders(false));
  };

  const loadNotifications = () => {
    if (!token) return;
    fetch("/api/customer/notifications", {
      headers: {
        Authorization: `Bearer ${token || ""}`,
        "X-Authorization": `Bearer ${token || ""}`,
        "X-Customer-Token": token || "",
      },
    })
      .then((res) => res.json())
      .then((data) => {
        setNotifications(data.notifications || []);
        setUnreadNotifications(data.unreadCount || 0);
      })
      .catch(() => {});
  };

  useEffect(() => {
    loadOrders();
    loadNotifications();
  }, [token]);

  const handleCancelOrder = async (orderId: number) => {
    if (!cancelReasonText.trim()) {
      alert("Iltimos, bekor qilish sababini yozing.");
      return;
    }
    setCancelBusy(true);
    try {
      const res = await fetch(`/api/customer/orders/${orderId}/cancel`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token || ""}`,
          "X-Authorization": `Bearer ${token || ""}`,
          "X-Customer-Token": token || "",
        },
        body: JSON.stringify({ reason: cancelReasonText.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Xatolik yuz berdi");
      setCancelingOrderId(null);
      setCancelReasonText("");
      loadOrders();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setCancelBusy(false);
    }
  };



  if (!customer && !token) {
    return (
      <main className="wrap account-login-prompt">
        <div className="prompt-card">
          <h2>{t("acc_login_prompt_title")}</h2>
          <p className="muted">
            {t("acc_login_prompt_desc")}
          </p>
          <button className="btn btn-primary-sheen" onClick={() => openAuthModal()}>
            {t("acc_login_prompt_btn")}
          </button>
        </div>
      </main>
    );
  }

  const handleSaveProfile = async (e: FormEvent) => {
    e.preventDefault();
    setProfileMsg("");
    setProfileErr("");
    setSaving(true);
    try {
      await updateProfile({
        name: name.trim(),
        organization: org.trim() || undefined,
      });
      setProfileMsg(t("acc_profile_saved_ok"));
    } catch (err: any) {
      setProfileErr(err.message || "Xatolik yuz berdi");
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: FormEvent) => {
    e.preventDefault();
    setPwdMsg("");
    setPwdErr("");
    if (newPassword.length < 6) {
      setPwdErr("Yangi parol kamida 6 belgidan iborat bo'lishi kerak.");
      return;
    }
    if (newPassword !== confPassword) {
      setPwdErr("Yangi parollar bir-biriga mos kelmadi.");
      return;
    }
    setPwdSaving(true);
    try {
      await changePassword({
        currentPassword: currPassword ? currPassword : undefined,
        newPassword,
      });
      setPwdMsg(t("acc_pwd_saved_ok"));
      setCurrPassword("");
      setNewPassword("");
      setConfPassword("");
    } catch (err: any) {
      setPwdErr(err.message || "Parolni o'zgartirishda xatolik yuz berdi");
    } finally {
      setPwdSaving(false);
    }
  };

  const getStatusBadge = (st: string) => {
    switch (st) {
      case "NEW":
        return <span className="st NEW">{t("acc_st_new")}</span>;
      case "CONFIRMED":
        return <span className="st CONFIRMED">{t("acc_st_confirmed")}</span>;
      case "READY":
        return <span className="st CONFIRMED" style={{ background: "#e0f2fe", color: "#0284c7", fontWeight: 700 }}>{t("acc_st_ready")}</span>;
      case "DONE":
        return <span className="st DONE">{t("acc_st_done")}</span>;
      case "CANCELED":
        return <span className="st CANCELED">{t("acc_st_canceled")}</span>;
      default:
        return <span className="st">{st}</span>;
    }
  };

  return (
    <main className="wrap account-page">
      <div className="account-hero-bar">
        <div className="account-user-info">
          <div style={{ position: "relative" }}>
            <div className="account-avatar">
              {customer?.avatar ? (
                <img src={customer.avatar} alt="" />
              ) : (
                <span>{customer?.name && customer.name !== "*" ? customer.name.charAt(0).toUpperCase() : "M"}</span>
              )}
            </div>
            <label
              title="Rasmni o'zgartirish"
              style={{
                position: "absolute",
                bottom: 2,
                right: 2,
                width: 26,
                height: 26,
                borderRadius: "50%",
                background: "var(--med-blue, #0284c7)",
                color: "#ffffff",
                display: "grid",
                placeItems: "center",
                cursor: "pointer",
                boxShadow: "0 2px 6px rgba(0,0,0,0.25)",
                border: "2px solid var(--paper, #ffffff)",
                fontSize: 12,
              }}
            >
              <input
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={handleAvatarUpload}
                disabled={avatarUploading}
              />
              <span>📷</span>
            </label>
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <h1>{customer?.name && customer.name !== "*" ? customer.name : "Mijoz"}</h1>
            </div>
            <div className="account-meta">
              {customer?.organization && (
                <span className="meta-item">
                  <ClinicIcon size={15} />
                  <span>{customer.organization}</span>
                </span>
              )}
              {customer?.phone && (
                <span className="meta-item">
                  <PhoneSmsIcon size={15} />
                  <span>{customer.phone}</span>
                </span>
              )}
            </div>
          </div>
        </div>

        <button
          type="button"
          className="account-logout-btn"
          onClick={() => {
            if (window.confirm(t("acc_logout_confirm"))) {
              logout();
              nav("/");
            }
          }}
          title={t("acc_logout")}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          <span>{t("acc_logout")}</span>
        </button>
      </div>

      {/* Navigation tabs */}
      <div className="account-tabs">
        <button
          className={`tab-btn ${tab === "orders" ? "active" : ""}`}
          onClick={() => switchTab("orders")}
        >
          <OrderBoxIcon size={18} />
          <span>{t("acc_my_orders")} ({orders.length})</span>
        </button>

        <button
          className={`tab-btn ${tab === "notifications" ? "active" : ""}`}
          onClick={() => switchTab("notifications")}
          style={{ position: "relative" }}
        >
          <span style={{ fontSize: 18 }}>🔔</span>
          <span>Bildirishnomalar</span>
          {unreadNotifications > 0 && (
            <span
              style={{
                marginLeft: 4,
                padding: "2px 7px",
                borderRadius: 10,
                background: "#ef4444",
                color: "#fff",
                fontSize: 11,
                fontWeight: 700,
              }}
            >
              {unreadNotifications}
            </span>
          )}
        </button>

        <button
          className={`tab-btn ${tab === "profile" ? "active" : ""}`}
          onClick={() => switchTab("profile")}
        >
          <SettingsIcon size={18} />
          <span>{t("acc_profile_settings")}</span>
        </button>
      </div>

      {/* 1. ORDERS TAB */}
      {tab === "orders" && (
        <section className="account-orders-section">
          {loadingOrders ? (
            <p className="muted" style={{ padding: 40, textAlign: "center" }}>
              {t("acc_loading_orders")}
            </p>
          ) : orders.length === 0 ? (
            <div className="empty-orders-card">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <rect x="2" y="7" width="20" height="14" rx="2" />
                <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
              </svg>
              <h3>{t("acc_no_orders_title")}</h3>
              <p className="muted">{t("acc_no_orders_desc")}</p>
              <Link to="/catalog" className="btn btn-primary-sheen">
                {t("acc_go_catalog")}
              </Link>
            </div>
          ) : (
            <div className="orders-list">
              {orders.map((o) => (
                <article key={o.id} className="customer-order-card">
                  <div className="order-card-header">
                    <div className="order-code-group">
                      <span className="order-code">{t("acc_order_title")}: <b>{o.code}</b> <span style={{ fontSize: 13, color: "var(--ink2)", fontWeight: "normal" }}>(Raqam:# {o.id})</span></span>
                      <span className="order-date">
                        {new Date(o.createdAt).toLocaleDateString(dateLocale, {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <div>{getStatusBadge(o.status)}</div>
                  </div>

                  <div className="order-items-grid">
                    {o.items.map((item) => {
                      const img = item.product?.images?.[0];
                      return (
                        <div key={item.id} className="order-item-row">
                          <div className="order-item-thumb">
                            {img ? (
                              <img src={img.thumbUrl} alt="" />
                            ) : (
                              <DeviceIcon />
                            )}
                          </div>
                          <div className="order-item-desc">
                            <b>{item.productName}</b>
                            <span className="muted">{t("acc_qty_items")}: {item.quantity}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {o.comment && (
                    <div className="order-card-comment">
                      <span className="muted">{t("acc_order_comment")}:</span> {o.comment}
                    </div>
                  )}

                  {/* Bekor qilingan bo'lsa sababini ko'rsatish */}
                  {o.status === "CANCELED" && (
                    <div style={{ background: "rgba(239, 68, 68, 0.08)", border: "1px solid rgba(239, 68, 68, 0.2)", borderRadius: 10, padding: "10px 14px", marginTop: 10 }}>
                      <strong style={{ color: "#ef4444", display: "block", fontSize: 13, marginBottom: 3 }}>
                        ❌ {t("acc_order_canceled_badge")}
                      </strong>
                      <span style={{ fontSize: 13, color: "var(--ink)" }}>
                        <b>{t("acc_order_cancel_reason")}:</b> {o.cancelReason || "Menejer tomonidan ko'rib chiqilib bekor qilindi"}
                      </span>
                    </div>
                  )}

                  {/* Yangi bo'lsa, mijoz o'zi bekor qila olishi */}
                  {o.status === "NEW" && (
                    <div style={{ marginTop: 12, borderTop: "1px dashed var(--line)", paddingTop: 10 }}>
                      {cancelingOrderId === o.id ? (
                        <div style={{ background: "var(--bg)", border: "1px solid var(--line)", borderRadius: 10, padding: "12px", marginTop: 6 }}>
                          <span style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6, color: "#be123c" }}>
                            {t("acc_cancel_prompt")}
                          </span>
                          <input
                            type="text"
                            value={cancelReasonText}
                            onChange={(e) => setCancelReasonText(e.target.value)}
                            placeholder={t("acc_cancel_reason_ph")}
                            style={{ width: "100%", padding: "8px 12px", borderRadius: 8, fontSize: 13, marginBottom: 8 }}
                            autoFocus
                          />
                          <div style={{ display: "flex", gap: 8 }}>
                            <button
                              type="button"
                              className="btn sm danger"
                              disabled={cancelBusy}
                              onClick={() => handleCancelOrder(o.id)}
                            >
                              {t("acc_confirm_cancel_btn")}
                            </button>
                            <button
                              type="button"
                              className="btn sm ghost"
                              disabled={cancelBusy}
                              onClick={() => {
                                setCancelingOrderId(null);
                                setCancelReasonText("");
                              }}
                            >
                              {t("acc_back_btn")}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          className="btn ghost sm"
                          style={{ color: "var(--ink2)", fontSize: 12 }}
                          onClick={() => {
                            setCancelingOrderId(o.id);
                            setCancelReasonText("");
                          }}
                        >
                          {t("acc_btn_cancel_order")}
                        </button>
                      )}
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {/* 2. NOTIFICATIONS TAB */}
      {tab === "notifications" && (
        <section className="account-orders-section">
          {notifications.length === 0 ? (
            <div className="empty-orders-card">
              <span style={{ fontSize: 44 }}>🔔</span>
              <h3>Bildirishnomalar mavjud emas</h3>
              <p className="muted">Buyurtmangiz tasdiqlanganda yoki holati o'zgarganda bu yerda xabar chiqadi.</p>
            </div>
          ) : (
            <div className="orders-list">
              {notifications.map((n) => (
                <article
                  key={n.id}
                  className="customer-order-card"
                  style={{
                    borderLeft: n.isRead ? "3px solid var(--line)" : "4px solid var(--brand, #0284c7)",
                    background: n.isRead ? "var(--card)" : "rgba(2, 132, 199, 0.04)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                    <div>
                      <strong style={{ fontSize: 16, color: "var(--ink)" }}>{n.title}</strong>
                      <p style={{ margin: "6px 0 0", fontSize: 14, color: "var(--ink2)", lineHeight: 1.5 }}>
                        {n.body}
                      </p>
                    </div>
                    <span style={{ fontSize: 12, color: "var(--ink2)", whiteSpace: "nowrap" }}>
                      {new Date(n.createdAt).toLocaleDateString(dateLocale, {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {/* 3. PROFILE TAB */}
      {tab === "profile" && (
        <section className="account-profile-section">
          <div className="profile-edit-card">
            <h3>{t("acc_personal_info_title")}</h3>
            <p className="muted">
              {t("acc_personal_info_desc")}
            </p>

            {profileMsg && <div className="ok">{profileMsg}</div>}
            {profileErr && <div className="err">{profileErr}</div>}

            <form onSubmit={handleSaveProfile}>
              <div className="field" style={{ marginBottom: 20 }}>
                <label style={{ display: "block", marginBottom: 8, fontWeight: 600 }}>
                  Profil rasmi
                </label>
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <div
                    style={{
                      width: 64,
                      height: 64,
                      borderRadius: "50%",
                      overflow: "hidden",
                      background: "var(--sea)",
                      border: "2px solid var(--med-blue)",
                      display: "grid",
                      placeItems: "center",
                      flexShrink: 0,
                    }}
                  >
                    {customer?.avatar ? (
                      <img src={customer.avatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <span style={{ fontSize: 24, fontWeight: 700, color: "var(--med-blue)" }}>
                        {customer?.name && customer.name !== "*" ? customer.name.charAt(0).toUpperCase() : "M"}
                      </span>
                    )}
                  </div>
                  <div>
                    <label
                      className="btn btn-primary-sheen sm"
                      style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}
                    >
                      <input
                        type="file"
                        accept="image/*"
                        style={{ display: "none" }}
                        onChange={handleAvatarUpload}
                        disabled={avatarUploading}
                      />
                      <span>{avatarUploading ? "Yuklanmoqda..." : "📷 Rasmni yuklash"}</span>
                    </label>
                    <small className="field-hint" style={{ display: "block", marginTop: 4 }}>
                      JPG, PNG yoki WebP formatida kvadrat rasm
                    </small>
                  </div>
                </div>
              </div>

              <div className="field">
                <label htmlFor="p-name">{t("acc_name_label")}</label>
                <input
                  id="p-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="field">
                <label htmlFor="p-org">{t("acc_org_label")}</label>
                <input
                  id="p-org"
                  type="text"
                  value={org}
                  onChange={(e) => setOrg(e.target.value)}
                  placeholder={t("acc_org_ph")}
                />
              </div>

              <div className="field">
                <label htmlFor="p-phone">{t("acc_phone_label")}</label>
                <input
                  id="p-phone"
                  type="tel"
                  value={customer?.phone || ""}
                  disabled
                  style={{ opacity: 0.7, cursor: "not-allowed" }}
                />
                <small className="field-hint">{t("acc_phone_hint")}</small>
              </div>

              <button className="btn btn-primary-sheen" type="submit" disabled={saving}>
                {saving ? t("acc_saving_btn") : t("acc_save_changes_btn")}
              </button>
            </form>
          </div>

          <div className="profile-edit-card" style={{ marginTop: 20 }}>
            <h3>{t("acc_pwd_title")}</h3>
            <p className="muted">
              {t("acc_pwd_desc")}
            </p>

            {pwdMsg && <div className="ok">{pwdMsg}</div>}
            {pwdErr && <div className="err">{pwdErr}</div>}

            <form onSubmit={handleChangePassword}>
              {customer?.hasPassword && (
                <div className="field">
                  <label htmlFor="p-curr-pwd">{t("acc_curr_pwd_label")}</label>
                  <input
                    id="p-curr-pwd"
                    type="password"
                    value={currPassword}
                    onChange={(e) => setCurrPassword(e.target.value)}
                    placeholder={t("acc_curr_pwd_ph")}
                    required
                  />
                </div>
              )}

              <div className="formgrid">
                <div className="field">
                  <label htmlFor="p-new-pwd">{t("acc_new_pwd_label")}</label>
                  <input
                    id="p-new-pwd"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder={t("acc_new_pwd_ph")}
                    required
                  />
                </div>
                <div className="field">
                  <label htmlFor="p-conf-pwd">{t("acc_conf_pwd_label")}</label>
                  <input
                    id="p-conf-pwd"
                    type="password"
                    value={confPassword}
                    onChange={(e) => setConfPassword(e.target.value)}
                    placeholder={t("acc_conf_pwd_ph")}
                    required
                  />
                </div>
              </div>

              <button className="btn btn-primary-sheen" type="submit" disabled={pwdSaving}>
                {pwdSaving ? t("acc_saving_btn") : t("acc_save_pwd_btn")}
              </button>
            </form>
          </div>

          {/* 3. ILOVA SOZLAMALARI (TIL VA MAVZU) */}
          <div className="profile-edit-card" style={{ marginTop: 20 }}>
            <h3>{t("acc_app_settings_title")}</h3>
            <p className="muted">
              {t("acc_app_settings_desc")}
            </p>

            <div style={{ marginTop: 16 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 8, color: "var(--ink)" }}>
                {t("acc_ui_lang_label")}
              </label>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {[
                  { code: "uz" as Lang, label: "O'zbekcha 🇺🇿" },
                  { code: "ru" as Lang, label: "Русский 🇷🇺" },
                  { code: "en" as Lang, label: "English 🇬🇧" },
                ].map((item) => (
                  <button
                    key={item.code}
                    type="button"
                    className={`btn sm ${lang === item.code ? "btn-primary-sheen" : "ghost"}`}
                    onClick={() => setLang(item.code)}
                    style={{ borderRadius: 10, padding: "8px 16px", fontWeight: lang === item.code ? 700 : 500 }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px dashed var(--line)" }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 8, color: "var(--ink)" }}>
                {t("acc_ui_theme_label")}
              </label>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button
                  type="button"
                  className={`btn sm ${theme === "light" ? "btn-primary-sheen" : "ghost"}`}
                  onClick={() => theme === "dark" && toggleTheme()}
                  style={{ borderRadius: 10, padding: "8px 16px", display: "inline-flex", alignItems: "center", gap: 6, fontWeight: theme === "light" ? 700 : 500 }}
                >
                  {t("acc_theme_light")}
                </button>
                <button
                  type="button"
                  className={`btn sm ${theme === "dark" ? "btn-primary-sheen" : "ghost"}`}
                  onClick={() => theme === "light" && toggleTheme()}
                  style={{ borderRadius: 10, padding: "8px 16px", display: "inline-flex", alignItems: "center", gap: 6, fontWeight: theme === "dark" ? 700 : 500 }}
                >
                  {t("acc_theme_dark")}
                </button>
              </div>
            </div>
          </div>

          <div className="profile-edit-card profile-security-card">
            <div className="profile-sec-info">
              <h3>{t("acc_security_title")}</h3>
              <p className="muted">
                {t("acc_security_desc")}
              </p>
            </div>
            <button
              type="button"
              className="btn danger"
              onClick={() => {
                if (window.confirm(t("acc_logout_confirm"))) {
                  logout();
                  nav("/");
                }
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              <span>{t("acc_logout")}</span>
            </button>
          </div>
        </section>
      )}
    </main>
  );
}
