import { FormEvent, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { api, ApiError, money, Product } from "../api";
import { useCart } from "../cart";
import { DeviceIcon, ProductCard } from "../components/Shell";
import { useCustomerAuth, CUSTOMER_TOKEN_KEY } from "../customerAuth";
import { ClinicIcon, OrderBoxIcon } from "../components/Icons";
import { useI18n } from "../context/I18nContext";
import { localizeProductName } from "../utils/localize";
import { SITE_CONFIG } from "../siteConfig";

type CheckoutStage = "cart" | "checkout" | "done";

function formatUzPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "+998 ";

  let num = digits;
  if (num.startsWith("998")) {
    num = num.slice(3);
  }
  num = num.slice(0, 9);

  let formatted = "+998";
  if (num.length > 0) {
    formatted += " " + num.slice(0, 2);
  }
  if (num.length > 2) {
    formatted += " " + num.slice(2, 5);
  }
  if (num.length > 5) {
    formatted += " " + num.slice(5, 7);
  }
  if (num.length > 7) {
    formatted += " " + num.slice(7, 9);
  }
  return formatted;
}

export default function Cart() {
  const { lang, t } = useI18n();
  const cart = useCart();
  const { customer, token, refreshCustomer, openAuthModal } = useCustomerAuth();
  const startedAt = useRef(Date.now());

  // Stages: cart -> checkout -> done
  const [stage, setStage] = useState<CheckoutStage>("cart");

  // Form states
  const [phone, setPhone] = useState("+998 ");
  const [name, setName] = useState("");
  const [organization, setOrganization] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<string>("Do'konda to'lash (Olib ketishda)");
  const [comment, setComment] = useState("");
  const [website, setWebsite] = useState(""); // honeypot

  // Validation states
  const [nameTouched, setNameTouched] = useState(false);
  const [phoneTouched, setPhoneTouched] = useState(false);

  const cleanDigits = phone.replace(/\D/g, "");
  const isPhoneValid = cleanDigits.length === 12; // 998 + 9 digits = 12
  const isNameValid = name.trim().length >= 2;

  // Recommended products
  const [recommended, setRecommended] = useState<Product[]>([]);
  useEffect(() => {
    api<{ items: Product[] }>("/products?limit=8&isActive=true")
      .then((res) => {
        const inCart = new Set(cart.items.map((i) => i.productId));
        const filtered = (res.items || []).filter((p) => !inCart.has(p.id));
        setRecommended(filtered.slice(0, 4));
      })
      .catch(() => {});
  }, [cart.items]);

  // Status
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [orderCode, setOrderCode] = useState("");
  const [createdOrderId, setCreatedOrderId] = useState<number | null>(null);

  // Guest OTP verification states
  const [guestOtpSent, setGuestOtpSent] = useState(false);
  const [guestOtpCode, setGuestOtpCode] = useState("");
  const [guestOtpTimer, setGuestOtpTimer] = useState(0);
  const [guestOtpSending, setGuestOtpSending] = useState(false);

  useEffect(() => {
    let t: any;
    if (guestOtpTimer > 0) {
      t = setTimeout(() => setGuestOtpTimer(guestOtpTimer - 1), 1000);
    }
    return () => clearTimeout(t);
  }, [guestOtpTimer]);

  const handleSendGuestOtp = async () => {
    setNameTouched(true);
    setPhoneTouched(true);
    if (!isNameValid) {
      setError(
        lang === "ru"
          ? "Пожалуйста, введите ваше имя и фамилию (не менее 2 символов)"
          : "Iltimos, ism va familiyangizni to'liq kiriting (kamida 2 ta belgi)"
      );
      return false;
    }
    if (!isPhoneValid) {
      setError(
        lang === "ru"
          ? "Пожалуйста, введите корректный номер телефона (+998 __ ___ __ __)"
          : "Iltimos, telefon raqamini to'liq kiriting (+998 __ ___ __ __)"
      );
      return false;
    }

    const cleanPhone = "+998" + cleanDigits.slice(3);
    setGuestOtpSending(true);
    setError("");
    try {
      const res = await api<{ ok: boolean; resendIn?: number }>("/orders/otp", {
        json: { phone: cleanPhone },
      });
      setGuestOtpSent(true);
      setGuestOtpTimer(res.resendIn || 60);
      return true;
    } catch (err: any) {
      setError(err?.message || "SMS kod yuborishda xatolik yuz berdi");
      return false;
    } finally {
      setGuestOtpSending(false);
    }
  };

  // Sync logged in customer info
  useEffect(() => {
    if (customer) {
      if (customer.name && !name) setName(customer.name);
      if (customer.phone && (phone === "+998 " || !phone)) setPhone(formatUzPhone(customer.phone));
      if (customer.organization && !organization) setOrganization(customer.organization);
    }
  }, [customer]);

  // Calculate totals and pricing mode
  const isEveryPriceFixed = cart.items.length > 0 && cart.items.every((i) => i.priceFrom && Number(i.priceFrom) > 0);
  const hasUnpricedItems = cart.items.some((i) => !i.priceFrom || Number(i.priceFrom) <= 0);

  const totalAmount = cart.items.reduce((acc, item) => {
    if (item.priceFrom) {
      return acc + Number(item.priceFrom) * item.quantity;
    }
    return acc;
  }, 0);

  const hasAnyPrice = cart.items.some((i) => i.priceFrom);

  // Click "Buyurtmani rasmiylashtirish"
  const handleProceedToCheckout = () => {
    setError("");
    setStage("checkout");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Confirm and place the order
  const handleConfirmOrder = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setNameTouched(true);
    setPhoneTouched(true);

    if (!isNameValid) {
      setError(
        lang === "ru"
          ? "Пожалуйста, введите ваше имя и фамилию (не менее 2 символов)"
          : "Iltimos, ism va familiyangizni to'liq kiriting (kamida 2 ta belgi)"
      );
      return;
    }

    if (!isPhoneValid) {
      setError(
        lang === "ru"
          ? "Пожалуйста, введите корректный номер телефона (+998 __ ___ __ __)"
          : "Iltimos, telefon raqamini to'liq kiriting (+998 __ ___ __ __)"
      );
      return;
    }

    const authToken = token || localStorage.getItem(CUSTOMER_TOKEN_KEY);
    const isGuest = !customer && !authToken;

    // Guest checkout requires SMS OTP verification
    if (isGuest) {
      if (!guestOtpSent) {
        await handleSendGuestOtp();
        return;
      }
      if (guestOtpCode.trim().length !== 6) {
        setError(
          lang === "ru"
            ? "Введите 6-значный код подтверждения из SMS"
            : "SMS orqali yuborilgan 6 xonali tasdiqlash kodini kiriting"
        );
        return;
      }
    }

    const cleanPhone = "+998" + cleanDigits.slice(3);

    setBusy(true);
    try {
      const headers: Record<string, string> = {};
      if (authToken) headers["Authorization"] = `Bearer ${authToken}`;

      const res = await api<{ code: string; orderId?: number; payUrl?: string }>("/orders", {
        headers,
        json: {
          name: name.trim(),
          phone: cleanPhone,
          organization: organization.trim(),
          deliveryAddress: "Do'kondan olib ketish (Namangan sh., Ozod MFY, Beruniy 2-uy)",
          paymentMethod,
          comment: comment.trim(),
          website, // honeypot
          elapsedMs: Date.now() - startedAt.current,
          items: cart.items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
          code: isGuest ? guestOtpCode.trim() : undefined,
        },
      });

      setOrderCode(res.code);
      if (res.orderId) setCreatedOrderId(res.orderId);
      cart.clear();
      setGuestOtpSent(false);
      setGuestOtpCode("");
      refreshCustomer();

      if (res.payUrl) {
        window.location.href = res.payUrl;
        return;
      }

      setStage("done");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError((err as ApiError).message || "Buyurtmani rasmiylashtirishda xatolik yuz berdi");
    } finally {
      setBusy(false);
    }
  };

  // Render: Done state
  if (stage === "done") {
    return (
      <main className="wrap">
        <div className="order-success-card">
          <div className="success-anim-badge">
            <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <h1>Buyurtma so'rovi qabul qilindi!</h1>
          <p className="order-subheading">
            Medax menejeri tez orada <b>{phone}</b> raqamingizga qo'ng'iroq qilib, tovar omborda borligini tasdiqlaydi va siz uchun ajratib qo'yadi.
          </p>

          <div className="order-number-banner">
            <span className="order-num-label">Buyurtma kodi:</span>
            <span className="order-num-value">
              {orderCode} {createdOrderId ? <small style={{ fontSize: 15, opacity: 0.85, marginLeft: 8 }}>(Raqam:# {createdOrderId})</small> : null}
            </span>
          </div>

          <div className="order-next-steps">
            <div className="step-point">
              <span className="step-num">1</span>
              <div>
                <strong>Menejer tasdiqlashi</strong>
                <p>15 daqiqa ichida qo'ng'iroq qilinib, tovar ajratib qo'yiladi.</p>
              </div>
            </div>
            <div className="step-point">
              <span className="step-num">2</span>
              <div>
                <strong>Do'kondan olib ketish</strong>
                <p>Do'konimizga tashrif buyurib, uskunani ko'rib tekshirib olasiz.</p>
              </div>
            </div>
            <div className="step-point">
              <span className="step-num">3</span>
              <div>
                <strong>Qulay to'lov</strong>
                <p>Olib ketish paytida naqd, terminal yoki bank hisob-faktura orqali to'lov.</p>
              </div>
            </div>
          </div>

          <div className="order-actions-bar">
            {customer && (
              <Link className="btn btn-primary-sheen" to="/account">
                <OrderBoxIcon size={18} />
                Shaxsiy kabinetda ko'rish
              </Link>
            )}
            <Link className="btn ghost" to="/catalog">
              Katalogga qaytish
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // Render: Empty cart
  if (cart.items.length === 0) {
    return (
      <main className="wrap">
        <div className="cart-empty-box">
          <div className="empty-cart-icon-wrap">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <circle cx="9" cy="21" r="1.5" />
              <circle cx="20" cy="21" r="1.5" />
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
            </svg>
          </div>
          <h1>{t("cart_empty_title")}</h1>
          <p className="muted" style={{ maxWidth: "48ch", margin: "0 auto 24px" }}>
            {t("cart_empty_desc")}
          </p>
          <Link className="btn btn-primary-sheen" to="/catalog">
            {t("cart_go_catalog")} →
          </Link>
        </div>
      </main>
    );
  }

  // Main Cart & Checkout Flow
  return (
    <main className="wrap">
      {/* Breadcrumbs */}
      <div className="crumbs">
        <Link to="/">Bosh sahifa</Link> /{" "}
        <span onClick={() => setStage("cart")} style={{ cursor: "pointer", textDecoration: stage !== "cart" ? "underline" : "none" }}>
          Savat
        </span>
        {stage === "checkout" && <span> / Rasmiylashtirish</span>}
      </div>

      {/* Progress Steps Header */}
      <div className="checkout-pipeline-steps">
        <div className={`pipe-step ${stage === "cart" ? "active" : "completed"}`} onClick={() => setStage("cart")}>
          <span className="pipe-dot">1</span>
          <span className="pipe-title">Savat</span>
        </div>
        <div className={`pipe-step ${stage === "checkout" ? "active" : ""}`}>
          <span className="pipe-dot">2</span>
          <span className="pipe-title">Rasmiylashtirish & To'lov</span>
        </div>
      </div>

      <div className="cartpage">
        {/* LEFT COLUMN */}
        <section className="cart-left-col">
          {/* STEP 1: CART ITEMS VIEW */}
          {stage === "cart" && (
            <div>
              <div className="cart-heading-row">
                <h1 style={{ fontSize: 28, margin: 0 }}>
                  {lang === "ru" ? "Корзина покупок" : lang === "en" ? "Shopping Cart" : "Xaridlar savati"}
                </h1>
                <span className="cart-count-pill">
                  {lang === "ru"
                    ? `${cart.count} наим. (${cart.totalQuantity} шт)`
                    : lang === "en"
                    ? `${cart.count} items (${cart.totalQuantity} pcs)`
                    : `${cart.count} xil uskuna (${cart.totalQuantity} dona)`}
                </span>
              </div>

              <div className="cart-items-table">
                {cart.items.map((i) => {
                  const itemTotal = i.priceFrom ? Number(i.priceFrom) * i.quantity : null;
                  return (
                    <div className="line cart-table-row" key={i.productId}>
                      <div className="th">
                        {i.thumb ? <img src={i.thumb} alt={localizeProductName(i, lang)} /> : <DeviceIcon />}
                      </div>

                      <div className="cart-item-info">
                        <Link to={`/product/${i.slug}`} className="cart-item-title">
                          {localizeProductName(i, lang)}
                        </Link>
                        <div className="cart-item-unit-price">
                          {i.priceFrom ? (
                            <>
                              <span className="unit-label">{lang === "ru" ? "Цена за ед:" : lang === "en" ? "Unit price:" : "Dona narxi:"}</span>
                              <strong>{money(i.priceFrom, t("sum_currency"))}</strong>
                            </>
                          ) : (
                            <span className="negotiated-tag">{lang === "ru" ? "Цена по запросу" : lang === "en" ? "Price on request" : "Narx so'rov bo'yicha"}</span>
                          )}
                        </div>
                        {i.stock !== undefined && (
                          <div style={{ fontSize: 12, marginTop: 4, fontWeight: 600, color: (i.stock ?? 0) > 0 ? "#0284c7" : "#dc2626" }}>
                            {(i.stock ?? 0) > 0
                              ? `Omborda: ${i.stock} dona mavjud`
                              : "⚠️ Omborda tugagan"}
                          </div>
                        )}
                      </div>

                      <div className="acts cart-item-actions">
                        <div className="qty-and-subtotal">
                          <div className="qty">
                            <button onClick={() => cart.setQty(i.productId, i.quantity - 1)} aria-label="Kamaytirish">−</button>
                            <input
                              type="number"
                              min={1}
                              max={i.stock ?? 100}
                              value={i.quantity}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                const maxStock = i.stock ?? 100;
                                cart.setQty(i.productId, Math.min(maxStock, Math.max(1, val)));
                              }}
                              aria-label="Soni"
                            />
                            <button
                              disabled={i.stock !== undefined && i.quantity >= i.stock}
                              onClick={() => cart.setQty(i.productId, i.quantity + 1)}
                              aria-label="Ko'paytirish"
                            >
                              +
                            </button>
                          </div>

                          {itemTotal !== null && (
                            <div className="item-subtotal-price">
                              {money(itemTotal, t("sum_currency"))}
                            </div>
                          )}
                        </div>

                        <button className="btn-del-item" onClick={() => cart.remove(i.productId)} title="Savatdan o'chirish">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="cart-table-footer">
                <Link to="/catalog" className="btn ghost sm">
                  ← Katalogdan yana tanlash
                </Link>
                <button className="btn ghost sm" onClick={() => cart.clear()}>
                  Savatni tozalash
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: CHECKOUT DETAILS & PAYMENT */}
          {stage === "checkout" && (
            <div className="checkout-step-card">
              <div className="step-back-link" onClick={() => setStage("cart")}>
                ← Savatga qaytish
              </div>

              <div className="step-card-header">
                <div className="step-icon-badge">
                  <ClinicIcon size={24} />
                </div>
                <div>
                  <h2 style={{ fontSize: 24, margin: "0 0 4px" }}>Buyurtmani rasmiylashtirish</h2>
                  <p className="muted" style={{ margin: 0 }}>
                    Ma'lumotlaringizni kiriting va to'lov usulini tanlang.
                  </p>
                </div>
              </div>

              {/* Logged in vs Guest Auth Banner */}
              {customer ? (
                <div className="customer-verified-banner">
                  <div className="ver-dot-wrap">
                    <span className="live-radar-dot" />
                  </div>
                  <div>
                    <div className="ver-title">
                      {lang === "ru" ? "Клиент подтвержден (SMS)" : "Foydalanuvchi tasdiqlangan (SMS)"}
                    </div>
                    <div className="ver-user">
                      {name || customer?.name || "Mijoz"} · <b>{phone || customer?.phone}</b>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="cart-auth-callout">
                  <div className="cart-auth-callout-text">
                    <strong>{lang === "ru" ? "У вас уже есть аккаунт?" : "Sizda hisob bormi?"}</strong>
                    <span>{lang === "ru" ? "Войдите по номеру телефона для удобного отслеживания заказа." : "Buyurtmalarni shaxsiy kabinetda qulay kuzatish uchun telefon orqali kiring."}</span>
                  </div>
                  <button type="button" className="btn btn-primary" onClick={() => openAuthModal()}>
                    {lang === "ru" ? "Войти в аккаунт" : "Kabinetga kirish"}
                  </button>
                </div>
              )}

              {error && <div className="auth-error-banner">{error}</div>}

              <form onSubmit={handleConfirmOrder} className="checkout-final-form">
                <h3 className="section-subhead">1. Qabul qiluvchi ma'lumotlari</h3>
                <div className="form-grid-2">
                  <div className="field">
                    <label htmlFor="ord-name">Ism va familiya *</label>
                    <input
                      id="ord-name"
                      type="text"
                      value={name}
                      onBlur={() => setNameTouched(true)}
                      onChange={(e) => {
                        setName(e.target.value);
                        if (error) setError("");
                      }}
                      required
                      placeholder="Masalan: Azizbek Karimov"
                      style={
                        nameTouched && !isNameValid
                          ? { borderColor: "#ef4444", background: "rgba(239, 68, 68, 0.05)" }
                          : undefined
                      }
                    />
                    {nameTouched && !isNameValid && (
                      <span style={{ fontSize: 12, color: "#ef4444", marginTop: 4, display: "block" }}>
                        Iltimos, ism va familiyangizni kiriting (kamida 2 ta harf)
                      </span>
                    )}
                  </div>
                  <div className="field">
                    <label htmlFor="ord-phone">Telefon raqam *</label>
                    <input
                      id="ord-phone"
                      type="tel"
                      value={phone}
                      onBlur={() => setPhoneTouched(true)}
                      onChange={(e) => {
                        setPhone(formatUzPhone(e.target.value));
                        if (guestOtpSent) {
                          setGuestOtpSent(false);
                          setGuestOtpCode("");
                        }
                        if (error) setError("");
                      }}
                      required
                      placeholder="+998 90 123 45 67"
                      style={
                        phoneTouched && !isPhoneValid
                          ? { borderColor: "#ef4444", background: "rgba(239, 68, 68, 0.05)" }
                          : undefined
                      }
                    />
                    {phoneTouched && !isPhoneValid && (
                      <span style={{ fontSize: 12, color: "#ef4444", marginTop: 4, display: "block" }}>
                        Iltimos, to'liq telefon raqamini kiriting: +998 (__) ___-__-__
                      </span>
                    )}
                  </div>
                </div>

                <div className="field">
                  <label htmlFor="ord-org">
                    Tashkilot / Klinika yoki Shaxs turi{" "}
                    <span style={{ fontSize: 12, fontWeight: "normal", color: "var(--ink2)" }}>
                      (Ixtiyoriy — Jismoniy shaxs bo'lsangiz bo'sh qoldiring)
                    </span>
                  </label>
                  <input
                    id="ord-org"
                    type="text"
                    value={organization}
                    onChange={(e) => setOrganization(e.target.value)}
                    placeholder="Masalan: Jismoniy shaxs (yoki City Med MCHJ)"
                  />
                </div>

                <h3 className="section-subhead" style={{ marginTop: 24 }}>2. Olib ketish joyi va qoidalari</h3>
                <div
                  style={{
                    background: "var(--sea, #f0f9ff)",
                    border: "1.5px solid rgba(2, 132, 199, 0.3)",
                    borderRadius: 16,
                    padding: "20px 24px",
                    display: "grid",
                    gap: 14,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                    <span style={{ fontSize: 24 }}>🏢</span>
                    <div>
                      <strong style={{ fontSize: 16, color: "var(--ink, #0f172a)", display: "block", marginBottom: 4 }}>
                        Medax do'koni va ombori:
                      </strong>
                      <p style={{ margin: 0, fontSize: 14, color: "var(--ink2, #334155)" }}>
                        {SITE_CONFIG.addressUz}
                      </p>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", fontSize: 13, color: "var(--ink2)" }}>
                    <span>🕒 <b>Ish vaqti:</b> Dush - Shanba, 09:00 - 18:00</span>
                    <span>📞 <b>Aloqa:</b> {SITE_CONFIG.phone}</span>
                  </div>

                  {/* Interaktiv Yandex Xaritasi */}
                  <div
                    style={{
                      borderRadius: 12,
                      overflow: "hidden",
                      border: "1px solid rgba(2, 132, 199, 0.25)",
                      background: "var(--card)",
                      boxShadow: "0 4px 12px rgba(0, 0, 0, 0.05)",
                    }}
                  >
                    <iframe
                      title="Medax Namangan Xaritasi"
                      src={SITE_CONFIG.yandexMapEmbedUrl}
                      width="100%"
                      height="250"
                      style={{ border: 0, display: "block" }}
                      allowFullScreen
                      loading="lazy"
                    />
                  </div>

                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <a
                      href={SITE_CONFIG.yandexMapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn sm ghost"
                      style={{ borderRadius: 8, fontSize: 12, background: "var(--card)" }}
                    >
                      📍 Yandex Xaritada ochish
                    </a>
                    <a
                      href={SITE_CONFIG.googleMapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn sm ghost"
                      style={{ borderRadius: 8, fontSize: 12, background: "var(--card)" }}
                    >
                      🗺️ Google Maps'da ochish
                    </a>
                  </div>
                </div>

                <div className="field" style={{ marginTop: 20 }}>
                  <label htmlFor="ord-comment">Qo'shimcha izoh yoki texnik talablar (ixtiyoriy)</label>
                  <textarea
                    id="ord-comment"
                    rows={2}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Masalan: Uskunani soat 14:00 larda borib olib ketamiz, oldindan tayyorlab qo'ying"
                  />
                </div>

                {/* Honeypot field */}
                <div className="hp" aria-hidden="true" style={{ display: "none" }}>
                  <input type="text" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
                </div>

                <h3 className="section-subhead" style={{ marginTop: 24 }}>3. To'lov va buyurtma shartlari</h3>

                <div style={{ display: "grid", gap: 12 }}>
                  {/* Option 1: Cash / Store pickup */}
                  <label
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 14,
                      padding: "16px 18px",
                      borderRadius: 14,
                      border: paymentMethod === "Do'konda to'lash (Olib ketishda)" ? "2px solid #0284c7" : "1.5px solid var(--line)",
                      background: paymentMethod === "Do'konda to'lash (Olib ketishda)" ? "rgba(2, 132, 199, 0.05)" : "var(--card, #fff)",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                    }}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="Do'konda to'lash (Olib ketishda)"
                      checked={paymentMethod === "Do'konda to'lash (Olib ketishda)"}
                      onChange={() => setPaymentMethod("Do'konda to'lash (Olib ketishda)")}
                      style={{ marginTop: 4, accentColor: "#0284c7", width: 18, height: 18 }}
                    />
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 20 }}>🏪</span>
                        <strong style={{ fontSize: 16, color: "var(--ink)" }}>
                          Do'konda to'lash (Olib ketish paytida)
                        </strong>
                      </div>
                      <p style={{ margin: "6px 0 0", fontSize: 13, color: "var(--ink2)" }}>
                        Uskunani ko'rib, tekshirib qabul qilgach to'laysiz (Naqd pul, korporativ karta/terminal orqali).
                      </p>
                    </div>
                  </label>

                  {/* Option 2: Bank transfer / B2B */}
                  <label
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 14,
                      padding: "16px 18px",
                      borderRadius: 14,
                      border: paymentMethod === "Shartnoma asosida (B2B / Bank o'tkazmasi)" ? "2px solid #0284c7" : "1.5px solid var(--line)",
                      background: paymentMethod === "Shartnoma asosida (B2B / Bank o'tkazmasi)" ? "rgba(2, 132, 199, 0.05)" : "var(--card, #fff)",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                    }}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="Shartnoma asosida (B2B / Bank o'tkazmasi)"
                      checked={paymentMethod === "Shartnoma asosida (B2B / Bank o'tkazmasi)"}
                      onChange={() => setPaymentMethod("Shartnoma asosida (B2B / Bank o'tkazmasi)")}
                      style={{ marginTop: 4, accentColor: "#0284c7", width: 18, height: 18 }}
                    />
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 20 }}>📑</span>
                        <strong style={{ fontSize: 16, color: "var(--ink)" }}>
                          Shartnoma asosida (B2B / Bank o'tkazmasi)
                        </strong>
                      </div>
                      <p style={{ margin: "6px 0 0", fontSize: 13, color: "var(--ink2)" }}>
                        Klinika, shifoxona va yuridik tashkilotlar uchun rasmiy shartnoma va hisob-faktura rasmiylashtiriladi.
                      </p>
                    </div>
                  </label>
                </div>

                {/* Guest OTP verification input */}
                {!customer && !token && guestOtpSent && (
                  <div
                    style={{
                      marginTop: 24,
                      padding: "20px 22px",
                      borderRadius: 16,
                      background: "rgba(2, 132, 199, 0.06)",
                      border: "2px solid rgba(2, 132, 199, 0.35)",
                      display: "grid",
                      gap: 12,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <strong style={{ fontSize: 16, color: "var(--ink)", display: "flex", alignItems: "center", gap: 8 }}>
                        <span>📩</span>
                        <span>{lang === "ru" ? "SMS подтверждение" : "SMS orqali tasdiqlash"}</span>
                      </strong>
                      <button
                        type="button"
                        onClick={() => {
                          setGuestOtpSent(false);
                          setGuestOtpCode("");
                        }}
                        style={{
                          background: "none",
                          border: "none",
                          color: "#0284c7",
                          fontSize: 13,
                          cursor: "pointer",
                          fontWeight: 600,
                          textDecoration: "underline",
                        }}
                      >
                        {lang === "ru" ? "Изменить номер" : "Raqamni o'zgartirish"}
                      </button>
                    </div>

                    <p style={{ margin: 0, fontSize: 13, color: "var(--ink2)", lineHeight: 1.5 }}>
                      {lang === "ru"
                        ? `На номер ${phone} отправлен 6-значный код подтверждения:`
                        : `${phone} raqamingizga buyurtmani tasdiqlash uchun 6 xonali SMS kod yuborildi:`}
                    </p>

                    <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", marginTop: 4 }}>
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={6}
                        value={guestOtpCode}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, "").slice(0, 6);
                          setGuestOtpCode(val);
                          if (error) setError("");
                        }}
                        placeholder="123456"
                        autoFocus
                        style={{
                          width: 170,
                          height: 48,
                          fontSize: 22,
                          fontWeight: 700,
                          letterSpacing: 6,
                          textAlign: "center",
                          borderRadius: 10,
                          border: "2px solid #0284c7",
                          background: "var(--card, #fff)",
                          outline: "none",
                        }}
                      />

                      {guestOtpTimer > 0 ? (
                        <span style={{ fontSize: 13, color: "var(--ink2)", fontWeight: 500 }}>
                          ⏳ {lang === "ru" ? `Повторный запрос: ${guestOtpTimer} сек` : `Kodni qayta yuborish: ${guestOtpTimer} soniya`}
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={handleSendGuestOtp}
                          disabled={guestOtpSending}
                          className="btn ghost sm"
                          style={{ height: 42, fontSize: 13, borderRadius: 8 }}
                        >
                          {guestOtpSending
                            ? (lang === "ru" ? "Отправка..." : "Yuborilmoqda...")
                            : (lang === "ru" ? "🔄 Отправить код повторно" : "🔄 Kodni qayta yuborish")}
                        </button>
                      )}
                    </div>
                  </div>
                )}

                <div style={{ marginTop: 28 }}>
                  <button
                    type="submit"
                    className="btn btn-primary-sheen"
                    style={{ width: "100%", height: 52, fontSize: 17, fontWeight: 700 }}
                    disabled={busy || guestOtpSending}
                  >
                    {busy
                      ? (lang === "ru" ? "Оформление заказа…" : "Buyurtma yuborilmoqda…")
                      : guestOtpSending
                      ? (lang === "ru" ? "Отправка SMS-кода…" : "SMS kod yuborilmoqda…")
                      : !customer && !token && !guestOtpSent
                      ? (lang === "ru" ? "Получить SMS-код и продолжить →" : "SMS kod olish va davom etish →")
                      : (lang === "ru" ? "Подтвердить и отправить заказ ✓" : "Buyurtmani tasdiqlash va yuborish ✓")}
                  </button>
                  <p className="note" style={{ textAlign: "center", marginTop: 12 }}>
                    {!customer && !token && !guestOtpSent
                      ? (lang === "ru"
                          ? "Для подтверждения номера вам будет отправлен бесплатный SMS-код."
                          : "Telefon raqamingizni tasdiqlash uchun bepul SMS tasdiqlash kodi yuboriladi.")
                      : (lang === "ru"
                          ? "Заказ будет рассмотрен администратором. После подтверждения вам поступит SMS и уведомление в приложении."
                          : "Buyurtma admin tomonidan ko'rib chiqiladi. Tasdiqlanishi bilan sizga SMS va mobil ilovada bildirishnoma boradi.")}
                  </p>
                </div>
              </form>
            </div>
          )}
        </section>

        {/* RIGHT COLUMN: Order Summary Box */}
        <aside className="cart-summary-panel">
          <div className="summary-card">
            <h2 className="summary-title">
              {lang === "ru" ? "Итог заказа" : lang === "en" ? "Order Summary" : "Buyurtma xulosasi"}
            </h2>

            <div className="summary-row">
              <span className="summary-label">
                {lang === "ru" ? "Количество товаров:" : lang === "en" ? "Items count:" : "Mahsulotlar soni:"}
              </span>
              <span className="summary-val">
                {lang === "ru"
                  ? `${cart.totalQuantity} шт (${cart.count} наим.)`
                  : lang === "en"
                  ? `${cart.totalQuantity} pcs (${cart.count} items)`
                  : `${cart.totalQuantity} dona (${cart.count} xil)`}
              </span>
            </div>

            <div className="summary-items-preview">
              {cart.items.map((i) => (
                <div className="preview-row" key={i.productId}>
                  <span className="preview-name">{localizeProductName(i, lang)}</span>
                  <span className="preview-qty">× {i.quantity}</span>
                </div>
              ))}
            </div>

            <div className="summary-divider" />

            <div className="summary-row total-row">
              <span className="total-label">{lang === "ru" ? "Итого:" : lang === "en" ? "Total:" : "Jami:"}</span>
              <div className="total-amount-box">
                {hasAnyPrice && totalAmount > 0 ? (
                  <span className="total-price-val">{money(totalAmount, t("sum_currency"))}</span>
                ) : (
                  <span className="total-price-val">{lang === "ru" ? "По согласованию" : lang === "en" ? "Negotiated" : "Kelishilgan narxda"}</span>
                )}
              </div>
            </div>

            {stage === "cart" && (
              <button
                type="button"
                className="btn btn-primary-sheen btn-checkout-cta"
                onClick={handleProceedToCheckout}
              >
                {lang === "ru" ? "Оформить заказ →" : lang === "en" ? "Proceed to checkout →" : "Buyurtmani rasmiylashtirish →"}
              </button>
            )}

            <div className="summary-perks">
              <div className="perk-item">
                <span className="perk-icon">🛡️</span>
                <span>Rasmiy 12 oylik kafolat va servis</span>
              </div>
              <div className="perk-item">
                <span className="perk-icon">🚚</span>
                <span>O'zbekiston bo'ylab yetkazib berish</span>
              </div>
              <div className="perk-item">
                <span className="perk-icon">📄</span>
                <span>Yuridik shaxslar uchun shartnoma & hisob-faktura</span>
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* RECOMMENDED PRODUCTS SECTION */}
      {stage === "cart" && recommended.length > 0 && (
        <section className="cart-recommended-section">
          <div className="cart-rec-header">
            <div>
              <h2 className="cart-rec-title">
                {lang === "ru" ? "Рекомендуемые товары" : lang === "en" ? "Recommended products" : "Tavsiya etiladigan uskunalar"}
              </h2>
              <p className="cart-rec-sub">
                {lang === "ru"
                  ? "Популярные медицинские аппараты и принадлежности к вашему заказу"
                  : lang === "en"
                  ? "Popular medical equipment and accessories for your order"
                  : "Xaridingizga mos qo'shimcha tibbiy uskunalar va sarflov materiallari"}
              </p>
            </div>
            <Link to="/catalog" className="btn ghost sm">
              {lang === "ru" ? "Весь каталог →" : lang === "en" ? "Full catalog →" : "Barcha uskunalar →"}
            </Link>
          </div>

          <div className="grid cart-rec-grid">
            {recommended.map((p) => (
              <ProductCard key={p.id} p={p} />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
