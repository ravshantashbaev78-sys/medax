import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { api, ApiError, money, Product } from "../api";
import { CartItem, useCart } from "../cart";
import { DeviceIcon, ProductCard } from "../components/Shell";
import { useCustomerAuth } from "../customerAuth";
import { OrderBoxIcon } from "../components/Icons";
import { useI18n } from "../context/I18nContext";
import { localizeProductName } from "../utils/localize";
import { SITE_CONFIG } from "../siteConfig";

type CheckoutStage = "cart" | "checkout" | "done";

// Backend shu qiymatlarni saqlaydi: ular buyurtma kartasida admin uchun ko'rinadi
const PAY_STORE = "Do'konda to'lash (Olib ketishda)";
const PAY_CONTRACT = "Shartnoma asosida (B2B / Bank o'tkazmasi)";
const PICKUP_ADDRESS = "Do'kondan olib ketish (Namangan sh., Ozod MFY, Beruniy 2-uy)";

function formatUzPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "+998 ";
  let num = digits.startsWith("998") ? digits.slice(3) : digits;
  num = num.slice(0, 9);
  let formatted = "+998";
  if (num.length > 0) formatted += " " + num.slice(0, 2);
  if (num.length > 2) formatted += " " + num.slice(2, 5);
  if (num.length > 5) formatted += " " + num.slice(5, 7);
  if (num.length > 7) formatted += " " + num.slice(7, 9);
  return formatted;
}

/** Savatdagi qatorning buyurtmaga to'sqinlik qiladigan muammosi */
function itemProblem(i: CartItem): "unavailable" | "out" | "short" | null {
  if (i.unavailable) return "unavailable";
  if (i.stock !== undefined && i.stock !== null) {
    if (i.stock <= 0) return "out";
    if (i.quantity > i.stock) return "short";
  }
  return null;
}

const Icon = {
  trash: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  ),
  pin: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  ),
  clock: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  ),
  check: (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  shield: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  ),
  doc: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  ),
};

export default function Cart() {
  const { lang, t } = useI18n();
  const tr = (uz: string, ru: string, en: string) => (lang === "ru" ? ru : lang === "en" ? en : uz);
  const cart = useCart();
  const { customer, refreshCustomer, openAuthModal } = useCustomerAuth();
  const startedAt = useRef(Date.now());

  const [stage, setStage] = useState<CheckoutStage>("cart");

  const [phone, setPhone] = useState("+998 ");
  const [name, setName] = useState("");
  const [organization, setOrganization] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<string>(PAY_STORE);
  const [comment, setComment] = useState("");
  const [website, setWebsite] = useState(""); // honeypot

  const [nameTouched, setNameTouched] = useState(false);
  const [phoneTouched, setPhoneTouched] = useState(false);

  const cleanDigits = phone.replace(/\D/g, "");
  const isPhoneValid = cleanDigits.length === 12;
  const isNameValid = name.trim().length >= 2;

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [orderCode, setOrderCode] = useState("");
  const [donePhone, setDonePhone] = useState("");

  const [guestOtpSent, setGuestOtpSent] = useState(false);
  const [guestOtpCode, setGuestOtpCode] = useState("");
  const [guestOtpTimer, setGuestOtpTimer] = useState(0);
  const [guestOtpSending, setGuestOtpSending] = useState(false);

  // Tizimga kirgan mijoz uchun backend uning tasdiqlangan raqamini ishlatadi, shuning uchun
  // mehmonlik faqat "customer" yo'qligi bilan aniqlanadi (eskirgan token bilan qotib qolmaslik uchun).
  const isGuest = !customer;

  // Savatni serverdagi joriy narx va qoldiq bilan yangilash
  const idsKey = cart.items.map((i) => i.productId).sort((a, b) => a - b).join(",");
  const refreshItems = () => {
    if (!idsKey) return;
    api<{ items: Product[] }>(`/products/lookup?ids=${idsKey}`)
      .then((res) => cart.sync(res.items || []))
      .catch(() => {});
  };
  useEffect(refreshItems, [idsKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const [recommended, setRecommended] = useState<Product[]>([]);
  useEffect(() => {
    api<{ items: Product[] }>("/products?limit=8")
      .then((res) => {
        const inCart = new Set(idsKey.split(",").map(Number));
        setRecommended((res.items || []).filter((p) => !inCart.has(p.id) && (p.stock ?? 1) > 0).slice(0, 4));
      })
      .catch(() => {});
  }, [idsKey]);

  useEffect(() => {
    if (guestOtpTimer <= 0) return;
    const id = setTimeout(() => setGuestOtpTimer((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [guestOtpTimer]);

  useEffect(() => {
    if (!customer) return;
    if (customer.name && !name) setName(customer.name);
    if (customer.phone) setPhone(formatUzPhone(customer.phone));
    if (customer.organization && !organization) setOrganization(customer.organization);
  }, [customer]); // eslint-disable-line react-hooks/exhaustive-deps

  const totals = useMemo(() => {
    let sum = 0;
    let unpriced = 0;
    for (const i of cart.items) {
      if (i.unavailable) continue;
      if (i.priceFrom && Number(i.priceFrom) > 0) sum += Number(i.priceFrom) * i.quantity;
      else unpriced += 1;
    }
    return { sum, unpriced };
  }, [cart.items]);

  const problems = cart.items.filter((i) => itemProblem(i));
  const canCheckout = cart.items.length > 0 && problems.length === 0;

  const msgName = tr(
    "Ism va familiyangizni kiriting (kamida 2 ta harf)",
    "Введите имя и фамилию (не менее 2 букв)",
    "Enter your full name (at least 2 letters)"
  );
  const msgPhone = tr(
    "Telefon raqamini to'liq kiriting: +998 __ ___ __ __",
    "Введите номер полностью: +998 __ ___ __ __",
    "Enter the full number: +998 __ ___ __ __"
  );

  const validateContact = () => {
    setNameTouched(true);
    setPhoneTouched(true);
    if (!isNameValid) return setError(msgName), false;
    if (!isPhoneValid) return setError(msgPhone), false;
    return true;
  };

  const handleSendGuestOtp = async () => {
    if (!validateContact()) return;
    setGuestOtpSending(true);
    setError("");
    try {
      const res = await api<{ ok: boolean; resendIn?: number }>("/orders/otp", {
        json: { phone: "+998" + cleanDigits.slice(3) },
      });
      setGuestOtpSent(true);
      setGuestOtpTimer(res.resendIn || 60);
    } catch (err) {
      setError((err as ApiError)?.message || tr("SMS yuborishda xatolik", "Ошибка отправки SMS", "Failed to send SMS"));
    } finally {
      setGuestOtpSending(false);
    }
  };

  const goCheckout = () => {
    if (!canCheckout) return;
    setError("");
    setStage("checkout");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleConfirmOrder = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (!canCheckout) {
      setStage("cart");
      return;
    }
    if (!validateContact()) return;

    if (isGuest) {
      if (!guestOtpSent) {
        await handleSendGuestOtp();
        return;
      }
      if (guestOtpCode.length !== 6) {
        setError(tr("SMS orqali kelgan 6 xonali kodni kiriting", "Введите 6-значный код из SMS", "Enter the 6-digit code from SMS"));
        return;
      }
    }

    setBusy(true);
    try {
      const res = await api<{ code: string; orderId?: number; payUrl?: string }>("/orders", {
        json: {
          name: name.trim(),
          phone: "+998" + cleanDigits.slice(3),
          organization: organization.trim(),
          deliveryAddress: PICKUP_ADDRESS,
          paymentMethod,
          comment: comment.trim(),
          website,
          elapsedMs: Date.now() - startedAt.current,
          items: cart.items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
          code: isGuest ? guestOtpCode : undefined,
        },
      });

      setOrderCode(res.code);
      setDonePhone(phone);
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
      setError((err as ApiError).message || tr("Buyurtma yuborilmadi. Qayta urinib ko'ring.", "Заказ не отправлен. Попробуйте ещё раз.", "Order was not sent. Please try again."));
      // Qoldiq yoki narx o'zgargan bo'lishi mumkin: savatni yangilaymiz
      refreshItems();
    } finally {
      setBusy(false);
    }
  };

  /* ---------- Muvaffaqiyat ---------- */
  if (stage === "done") {
    return (
      <main className="wrap">
        <div className="co-done">
          <div className="co-done-badge">{Icon.check}</div>
          <h1>{tr("Buyurtmangiz qabul qilindi", "Ваш заказ принят", "Your order has been received")}</h1>
          <p className="co-done-sub">
            {tr("Menejerimiz", "Наш менеджер позвонит на", "Our manager will call")} <b>{donePhone}</b>{" "}
            {tr(
              "raqamiga qo'ng'iroq qilib, buyurtmani tasdiqlaydi.",
              "и подтвердит заказ.",
              "to confirm the order."
            )}
          </p>

          <div className="co-done-code">
            <span>{tr("Buyurtma raqami", "Номер заказа", "Order number")}</span>
            <strong>{orderCode}</strong>
          </div>

          <ol className="co-done-steps">
            <li>
              <strong>{tr("Tasdiqlash", "Подтверждение", "Confirmation")}</strong>
              <span>{tr("Menejer qo'ng'iroq qilib, mavjudlik va narxni tasdiqlaydi.", "Менеджер позвонит и подтвердит наличие и цену.", "A manager calls to confirm availability and price.")}</span>
            </li>
            <li>
              <strong>{tr("Olib ketish", "Самовывоз", "Pickup")}</strong>
              <span>{lang === "ru" ? SITE_CONFIG.addressRu : lang === "en" ? SITE_CONFIG.addressEn : SITE_CONFIG.addressUz}</span>
            </li>
            <li>
              <strong>{tr("To'lov", "Оплата", "Payment")}</strong>
              <span>{tr("Olib ketishda naqd, karta yoki shartnoma asosida.", "При получении: наличные, карта или по договору.", "On pickup: cash, card or by contract.")}</span>
            </li>
          </ol>

          <div className="co-done-actions">
            {customer && (
              <Link className="btn btn-primary-sheen" to="/account">
                <OrderBoxIcon size={18} />
                {tr("Buyurtmalarim", "Мои заказы", "My orders")}
              </Link>
            )}
            <Link className="btn ghost" to="/catalog">
              {tr("Xaridni davom ettirish", "Продолжить покупки", "Continue shopping")}
            </Link>
          </div>
        </div>
      </main>
    );
  }

  /* ---------- Bo'sh savat ---------- */
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
            {t("cart_go_catalog")}
          </Link>
        </div>
      </main>
    );
  }

  const countLabel = tr(
    `${cart.count} ta mahsulot · ${cart.totalQuantity} dona`,
    `${cart.count} товар(а) · ${cart.totalQuantity} шт`,
    `${cart.count} item(s) · ${cart.totalQuantity} pcs`
  );

  const totalBlock = (
    <>
      <div className="co-total">
        <span>{tr("Jami", "Итого", "Total")}</span>
        <strong>{totals.sum > 0 ? money(totals.sum, t("sum_currency")) : t("cart_negotiated")}</strong>
      </div>
      {totals.sum > 0 && totals.unpriced > 0 && (
        <p className="co-total-note">
          {tr(
            `+ ${totals.unpriced} ta mahsulot narxi menejer bilan kelishiladi`,
            `+ цена ${totals.unpriced} товар(ов) уточняется у менеджера`,
            `+ price of ${totals.unpriced} item(s) is agreed with a manager`
          )}
        </p>
      )}
    </>
  );

  const problemText = (i: CartItem) => {
    const p = itemProblem(i);
    if (p === "unavailable") return tr("Sotuvda yo'q. Savatdan olib tashlang.", "Нет в продаже. Удалите из корзины.", "No longer available. Remove it.");
    if (p === "out") return tr("Omborda qolmagan. Savatdan olib tashlang.", "Нет на складе. Удалите из корзины.", "Out of stock. Remove it.");
    if (p === "short") return tr(`Omborda faqat ${i.stock} dona bor`, `На складе только ${i.stock} шт`, `Only ${i.stock} in stock`);
    return "";
  };

  return (
    <main className="wrap co-page">
      <ol className="co-steps" aria-label={tr("Bosqichlar", "Этапы", "Steps")}>
        <li className={stage === "cart" ? "co-step-active" : "co-step-done"}>
          <button type="button" onClick={() => setStage("cart")}>
            <span>1</span>
            {tr("Savat", "Корзина", "Cart")}
          </button>
        </li>
        <li className={stage === "checkout" ? "co-step-active" : ""}>
          <button type="button" onClick={goCheckout} disabled={!canCheckout}>
            <span>2</span>
            {tr("Rasmiylashtirish", "Оформление", "Checkout")}
          </button>
        </li>
      </ol>

      <div className="cartpage">
        <section className="cart-left-col">
          {stage === "cart" && (
            <div>
              <div className="cart-heading-row">
                <h1 style={{ fontSize: 28, margin: 0 }}>{tr("Savat", "Корзина", "Cart")}</h1>
                <span className="cart-count-pill">{countLabel}</span>
              </div>

              <div className="cart-items-table">
                {cart.items.map((i) => {
                  const priced = i.priceFrom && Number(i.priceFrom) > 0;
                  const itemTotal = priced ? Number(i.priceFrom) * i.quantity : null;
                  const problem = itemProblem(i);
                  const maxQty = Math.max(1, Math.min(100, i.stock ?? 100));
                  return (
                    <div className={`line cart-table-row${problem ? " has-problem" : ""}`} key={i.productId}>
                      <div className="th">
                        {i.thumb ? <img src={i.thumb} alt="" /> : <DeviceIcon />}
                      </div>

                      <div className="cart-item-info">
                        <Link to={`/product/${i.slug}`} className="cart-item-title">
                          {localizeProductName(i, lang)}
                        </Link>
                        <div className="cart-item-unit-price">
                          {priced ? (
                            <>
                              <span className="unit-label">{tr("Dona narxi:", "Цена за шт:", "Unit price:")}</span>
                              <strong>{money(i.priceFrom!, t("sum_currency"))}</strong>
                            </>
                          ) : (
                            <span className="negotiated-tag">{t("cart_negotiated")}</span>
                          )}
                        </div>
                        {problem ? (
                          <div className="co-item-warn" role="alert">{problemText(i)}</div>
                        ) : i.stock !== undefined && i.stock !== null && i.stock <= 5 ? (
                          <div className="co-item-stock">{tr(`Omborda ${i.stock} dona qoldi`, `Осталось ${i.stock} шт`, `${i.stock} left in stock`)}</div>
                        ) : null}
                      </div>

                      <div className="acts cart-item-actions">
                        <div className="qty-and-subtotal">
                          {problem === "unavailable" || problem === "out" ? null : (
                            <div className="qty">
                              <button
                                type="button"
                                disabled={i.quantity <= 1}
                                onClick={() => cart.setQty(i.productId, i.quantity - 1)}
                                aria-label={tr("Kamaytirish", "Уменьшить", "Decrease")}
                              >
                                −
                              </button>
                              <input
                                type="number"
                                inputMode="numeric"
                                min={1}
                                max={maxQty}
                                value={i.quantity}
                                onChange={(e) => {
                                  const val = Number(e.target.value);
                                  if (val >= 1) cart.setQty(i.productId, Math.min(maxQty, val));
                                }}
                                aria-label={tr("Soni", "Количество", "Quantity")}
                              />
                              <button
                                type="button"
                                disabled={i.quantity >= maxQty}
                                onClick={() => cart.setQty(i.productId, i.quantity + 1)}
                                aria-label={tr("Ko'paytirish", "Увеличить", "Increase")}
                              >
                                +
                              </button>
                            </div>
                          )}
                          {itemTotal !== null && !problem && <div className="item-subtotal-price">{money(itemTotal, t("sum_currency"))}</div>}
                        </div>

                        <button
                          type="button"
                          className="btn-del-item"
                          onClick={() => cart.remove(i.productId)}
                          title={tr("Savatdan o'chirish", "Удалить", "Remove")}
                          aria-label={tr("Savatdan o'chirish", "Удалить", "Remove")}
                        >
                          {Icon.trash}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="cart-table-footer">
                <Link to="/catalog" className="btn ghost sm">
                  {tr("Xaridni davom ettirish", "Продолжить покупки", "Continue shopping")}
                </Link>
                <button
                  type="button"
                  className="co-link-danger"
                  onClick={() => {
                    if (window.confirm(tr("Savatdagi barcha mahsulotlar o'chirilsinmi?", "Удалить все товары из корзины?", "Remove all items from the cart?"))) cart.clear();
                  }}
                >
                  {tr("Savatni tozalash", "Очистить корзину", "Clear cart")}
                </button>
              </div>
            </div>
          )}

          {stage === "checkout" && (
            <div className="checkout-step-card">
              <button type="button" className="co-back" onClick={() => setStage("cart")}>
                ← {tr("Savatga qaytish", "Назад в корзину", "Back to cart")}
              </button>
              <h1 className="co-title">{tr("Buyurtmani rasmiylashtirish", "Оформление заказа", "Checkout")}</h1>

              {customer ? (
                <div className="co-signed">
                  {Icon.shield}
                  <span>
                    {tr("Hisobingiz orqali buyurtma beryapsiz:", "Вы оформляете заказ через аккаунт:", "Ordering with your account:")} <b>{phone}</b>
                  </span>
                </div>
              ) : (
                <div className="co-signin">
                  <span>{tr("Hisobingiz bormi? Kirsangiz, buyurtma holatini kabinetda kuzatasiz.", "Есть аккаунт? Войдите, чтобы отслеживать заказ.", "Have an account? Sign in to track your order.")}</span>
                  <button type="button" onClick={() => openAuthModal()}>
                    {tr("Kirish", "Войти", "Sign in")}
                  </button>
                </div>
              )}

              <form onSubmit={handleConfirmOrder} className="checkout-final-form" noValidate>
                <h2 className="co-section">{tr("1. Aloqa ma'lumotlari", "1. Контактные данные", "1. Contact details")}</h2>
                <div className="form-grid-2">
                  <div className="field">
                    <label htmlFor="ord-name">{tr("Ism va familiya", "Имя и фамилия", "Full name")}</label>
                    <input
                      id="ord-name"
                      type="text"
                      autoComplete="name"
                      value={name}
                      aria-invalid={nameTouched && !isNameValid}
                      onBlur={() => setNameTouched(true)}
                      onChange={(e) => {
                        setName(e.target.value);
                        if (error) setError("");
                      }}
                      placeholder={tr("Masalan: Azizbek Karimov", "Например: Азизбек Каримов", "e.g. Azizbek Karimov")}
                      className={nameTouched && !isNameValid ? "is-invalid" : undefined}
                    />
                    {nameTouched && !isNameValid && <span className="co-field-err">{msgName}</span>}
                  </div>
                  <div className="field">
                    <label htmlFor="ord-phone">{tr("Telefon raqam", "Телефон", "Phone")}</label>
                    <input
                      id="ord-phone"
                      type="tel"
                      autoComplete="tel"
                      inputMode="tel"
                      value={phone}
                      readOnly={!!customer}
                      aria-invalid={phoneTouched && !isPhoneValid}
                      onBlur={() => setPhoneTouched(true)}
                      onChange={(e) => {
                        setPhone(formatUzPhone(e.target.value));
                        if (guestOtpSent) {
                          setGuestOtpSent(false);
                          setGuestOtpCode("");
                        }
                        if (error) setError("");
                      }}
                      placeholder="+998 90 123 45 67"
                      className={phoneTouched && !isPhoneValid ? "is-invalid" : undefined}
                    />
                    {phoneTouched && !isPhoneValid && <span className="co-field-err">{msgPhone}</span>}
                  </div>
                </div>

                <div className="field">
                  <label htmlFor="ord-org">
                    {tr("Tashkilot yoki klinika", "Организация или клиника", "Organization or clinic")}{" "}
                    <span className="co-optional">{tr("ixtiyoriy", "необязательно", "optional")}</span>
                  </label>
                  <input
                    id="ord-org"
                    type="text"
                    autoComplete="organization"
                    value={organization}
                    onChange={(e) => setOrganization(e.target.value)}
                    placeholder={tr("Jismoniy shaxs bo'lsangiz bo'sh qoldiring", "Оставьте пустым, если вы физлицо", "Leave empty if ordering as an individual")}
                  />
                </div>

                <h2 className="co-section">{tr("2. Olib ketish", "2. Самовывоз", "2. Pickup")}</h2>
                <div className="co-pickup">
                  <div className="co-pickup-icon">{Icon.pin}</div>
                  <div className="co-pickup-body">
                    <strong>Medax, {tr("Namangan", "Наманган", "Namangan")}</strong>
                    <p>{lang === "ru" ? SITE_CONFIG.addressRu : lang === "en" ? SITE_CONFIG.addressEn : SITE_CONFIG.addressUz}</p>
                    <p className="co-pickup-meta">
                      {Icon.clock} {t("cart_working_hours")}
                    </p>
                    <div className="co-pickup-links">
                      <a href={SITE_CONFIG.yandexMapsUrl} target="_blank" rel="noopener noreferrer">
                        {t("cart_open_yandex")}
                      </a>
                      <a href={SITE_CONFIG.googleMapsUrl} target="_blank" rel="noopener noreferrer">
                        {t("cart_open_google")}
                      </a>
                    </div>
                  </div>
                </div>

                <h2 className="co-section">{tr("3. To'lov usuli", "3. Способ оплаты", "3. Payment")}</h2>
                <div className="co-pay">
                  {[
                    { v: PAY_STORE, title: t("cart_pay_cash_title"), desc: t("cart_pay_cash_desc") },
                    { v: PAY_CONTRACT, title: t("cart_pay_contract_title"), desc: t("cart_pay_contract_desc") },
                  ].map((o) => (
                    <label key={o.v} className={`co-pay-opt${paymentMethod === o.v ? " selected" : ""}`}>
                      <input type="radio" name="paymentMethod" value={o.v} checked={paymentMethod === o.v} onChange={() => setPaymentMethod(o.v)} />
                      <span>
                        <strong>{o.title}</strong>
                        <small>{o.desc}</small>
                      </span>
                    </label>
                  ))}
                </div>

                <div className="field" style={{ marginTop: 18 }}>
                  <label htmlFor="ord-comment">
                    {tr("Izoh", "Комментарий", "Comment")} <span className="co-optional">{tr("ixtiyoriy", "необязательно", "optional")}</span>
                  </label>
                  <textarea
                    id="ord-comment"
                    rows={2}
                    maxLength={1000}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder={tr("Masalan: ertaga soat 14:00 da olib ketaman", "Например: заберу завтра в 14:00", "e.g. I'll pick it up tomorrow at 2 pm")}
                  />
                </div>

                <div className="hp" aria-hidden="true" style={{ display: "none" }}>
                  <input type="text" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
                </div>

                {isGuest && guestOtpSent && (
                  <div className="co-otp">
                    <div className="co-otp-head">
                      <strong>{tr("SMS kodni kiriting", "Введите код из SMS", "Enter the SMS code")}</strong>
                      <button
                        type="button"
                        onClick={() => {
                          setGuestOtpSent(false);
                          setGuestOtpCode("");
                          document.getElementById("ord-phone")?.focus();
                        }}
                      >
                        {tr("Raqamni o'zgartirish", "Изменить номер", "Change number")}
                      </button>
                    </div>
                    <p>
                      {tr(`Kod ${phone} raqamiga yuborildi.`, `Код отправлен на ${phone}.`, `The code was sent to ${phone}.`)}
                    </p>
                    <div className="co-otp-row">
                      <input
                        type="text"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        maxLength={6}
                        value={guestOtpCode}
                        onChange={(e) => {
                          setGuestOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6));
                          if (error) setError("");
                        }}
                        placeholder="000000"
                        autoFocus
                        aria-label={tr("SMS kod", "SMS-код", "SMS code")}
                      />
                      {guestOtpTimer > 0 ? (
                        <span className="co-otp-wait">
                          {t("cart_guest_sms_wait")} {guestOtpTimer}s
                        </span>
                      ) : (
                        <button type="button" onClick={handleSendGuestOtp} disabled={guestOtpSending} className="btn ghost sm">
                          {guestOtpSending ? t("auth_btn_sending") : t("cart_guest_sms_resend")}
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {error && (
                  <div className="auth-error-banner" role="alert" style={{ marginTop: 18 }}>
                    {error}
                  </div>
                )}

                <button type="submit" className="btn btn-primary-sheen co-submit" disabled={busy || guestOtpSending}>
                  {busy
                    ? t("cart_btn_sending_order")
                    : guestOtpSending
                    ? t("auth_btn_sending")
                    : isGuest && !guestOtpSent
                    ? t("cart_btn_get_code")
                    : t("cart_btn_confirm_order")}
                </button>
                <p className="co-submit-note">
                  {isGuest && !guestOtpSent
                    ? t("cart_guest_sms_prompt")
                    : tr(
                        "Hozir to'lov olinmaydi. Menejer qo'ng'iroq qilib, buyurtmani tasdiqlaydi.",
                        "Сейчас оплата не списывается. Менеджер позвонит и подтвердит заказ.",
                        "No payment is taken now. A manager will call to confirm the order."
                      )}
                </p>
              </form>
            </div>
          )}
        </section>

        <aside className="cart-summary-panel">
          <div className="summary-card">
            <h2 className="summary-title">{tr("Buyurtmangiz", "Ваш заказ", "Your order")}</h2>

            <div className="summary-items-preview">
              {cart.items.map((i) => (
                <div className="preview-row" key={i.productId}>
                  <span className="preview-name">{localizeProductName(i, lang)}</span>
                  <span className="preview-qty">× {i.quantity}</span>
                </div>
              ))}
            </div>

            <div className="summary-divider" />
            {totalBlock}

            {stage === "cart" && (
              <>
                <button type="button" className="btn btn-primary-sheen btn-checkout-cta" onClick={goCheckout} disabled={!canCheckout}>
                  {t("cart_checkout")}
                </button>
                {!canCheckout && (
                  <p className="co-blocked">
                    {tr(
                      "Davom etish uchun belgilangan mahsulotlarni tuzating.",
                      "Чтобы продолжить, исправьте отмеченные товары.",
                      "Fix the highlighted items to continue."
                    )}
                  </p>
                )}
              </>
            )}

            <div className="summary-perks">
              <div className="perk-item">
                {Icon.shield}
                <span>{t("cart_perk_warranty")}</span>
              </div>
              <div className="perk-item">
                {Icon.pin}
                <span>{t("cart_perk_pickup")}</span>
              </div>
              <div className="perk-item">
                {Icon.doc}
                <span>{t("cart_perk_docs")}</span>
              </div>
            </div>
          </div>
        </aside>
      </div>

      {stage === "cart" && (
        <div className="co-mobile-bar">
          <div>
            <small>{countLabel}</small>
            <strong>{totals.sum > 0 ? money(totals.sum, t("sum_currency")) : t("cart_negotiated")}</strong>
          </div>
          <button type="button" className="btn btn-primary-sheen" onClick={goCheckout} disabled={!canCheckout}>
            {tr("Rasmiylashtirish", "Оформить", "Checkout")}
          </button>
        </div>
      )}

      {stage === "cart" && recommended.length > 0 && (
        <section className="cart-recommended-section">
          <div className="cart-rec-header">
            <h2 className="cart-rec-title">{tr("Sizga ham kerak bo'lishi mumkin", "Вам также может пригодиться", "You may also need")}</h2>
            <Link to="/catalog" className="btn ghost sm">
              {tr("Barcha mahsulotlar", "Весь каталог", "All products")}
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
