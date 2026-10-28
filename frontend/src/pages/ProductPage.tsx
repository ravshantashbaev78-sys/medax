import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api, ApiError, money, Product } from "../api";
import { useCart } from "../cart";
import { DeviceIcon, ProductCard } from "../components/Shell";
import { useI18n } from "../context/I18nContext";
import {
  localizeCategory,
  localizeCountry,
  localizeProductDescription,
  localizeProductName,
  localizeSpecName,
  localizeSpecValue,
  localizeUnit,
} from "../utils/localize";

export default function ProductPage() {
  const { lang, t } = useI18n();
  const { slug } = useParams();
  const nav = useNavigate();
  const cart = useCart();
  const [p, setP] = useState<Product | null>(null);
  const [error, setError] = useState("");
  const [idx, setIdx] = useState(0);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    setP(null);
    setIdx(0);
    setQty(1);
    setAdded(false);
    setError("");
    api<Product>(`/products/${slug}`)
      .then((d) => {
        setP(d);
        document.title = `${localizeProductName(d.name, lang)} — Medax`;
      })
      .catch((e: ApiError) => setError(e.status === 404 ? (lang === "ru" ? "Товар не найден." : lang === "en" ? "Product not found." : "Mahsulot topilmadi.") : e.message));
    window.scrollTo({ top: 0 });
  }, [slug, lang]);

  if (error) return <main className="wrap"><p className="err" style={{ marginTop: 32 }}>{error} <Link to="/catalog">{lang === "ru" ? "В каталог" : lang === "en" ? "Back to catalog" : "Katalogga qaytish"}</Link></p></main>;
  if (!p) return <main className="wrap"><p className="muted" style={{ padding: 40 }}>{lang === "ru" ? "Загрузка..." : lang === "en" ? "Loading..." : "Yuklanmoqda…"}</p></main>;

  const img = p.images[idx];
  const setQ = (n: number) => setQty(Math.max(1, Math.min(100, n || 1)));

  return (
    <main className="wrap">
      <div className="crumbs">
        <Link to="/">{lang === "ru" ? "Главная" : lang === "en" ? "Home" : "Bosh sahifa"}</Link> / <Link to="/catalog">{t("nav_catalog")}</Link>
        {p.category && <> / <Link to={`/catalog?category=${p.category.slug}`}>{localizeCategory(p.category.name || p.category.slug, lang)}</Link></>}
      </div>

      <div className="pd">
        <div className="gal">
          <div className="main">
            {img ? (
              <img src={img.url} alt={p.name} />
            ) : (
              <img
                src={
                  p.category?.slug === "reanimatsiya-va-anesteziologiya"
                    ? "/uploads/products/medical-icu.jpg"
                    : p.category?.slug === "ultratovush-diagnostikasi"
                    ? "/uploads/products/medical-diag.jpg"
                    : p.category?.slug === "jarrohlik"
                    ? "/uploads/products/medical-surgery.jpg"
                    : p.category?.slug === "tibbiy-mebel"
                    ? "/uploads/products/medical-bed.jpg"
                    : p.category?.slug === "operatsion-raqamli-integratsiya"
                    ? "/uploads/products/medical-recorder.jpg"
                    : "/uploads/products/medical-diag.jpg"
                }
                alt={p.name}
              />
            )}
          </div>
          {p.images.length > 1 && (
            <div className="thumbs">
              {p.images.map((im, i) => (
                <button key={im.id} aria-current={i === idx} onClick={() => setIdx(i)} aria-label={`Rasm ${i + 1}`}>
                  <img src={im.thumbUrl} alt="" loading="lazy" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="meta">
            <span className="stock-badge">
              <span className="tel-pulse-dot" />
              {t("in_stock")} · {t("hero_delivery_metric")}
            </span>
            {p.discountPercent && <span className="pill discount-pill">-{p.discountPercent}% AKSIYA</span>}
            {p.isNew && <span className="pill n">{lang === "ru" ? "Новая модель" : lang === "en" ? "New Model" : "Yangi model"}</span>}
            {p.isHit && <span className="pill hit">{lang === "ru" ? "Популярный" : lang === "en" ? "Popular" : "Ommabop"}</span>}
            {p.brand && <Link className="pill" to={`/catalog?brand=${p.brand.slug}`}>{p.brand.name}</Link>}
            {p.country && <span className="pill">{localizeCountry(p.country, lang)}</span>}
          </div>
          <h1>{localizeProductName(p.name, lang)}</h1>
          {p.sku && <div className="muted sku-code"><span className="sku-tag">{t("pd_sku")}</span> {p.sku}</div>}

          {/* Sana va yaroqlilik ma'lumotlari */}
          {(p.mfdDate || p.expDate) && (
            <div className="product-date-meta">
              {p.mfdDate && (
                <span className="date-item">
                  <strong>{t("mfd_label")}:</strong> {p.mfdDate}
                </span>
              )}
              {p.expDate && (
                <span className="date-item exp">
                  <strong>{t("exp_label")}:</strong> {p.expDate}
                </span>
              )}
            </div>
          )}

          <div className="price-detail-wrap">
            {p.oldPrice && p.priceFrom && Number(p.oldPrice) > Number(p.priceFrom) && (
              <span className="price-old-detail">
                {money(p.oldPrice, t("sum_currency"))}
              </span>
            )}
            <div className="price">
              {p.priceFrom ? money(p.priceFrom, t("sum_currency")) : (lang === "ru" ? "По запросу" : lang === "en" ? "On request" : "Narx so'rang")}
              {p.unit && <span className="price-unit-tag"> / {localizeUnit(p.unit, lang)}</span>}
            </div>
            {p.priceFrom && p.packageQty && p.packageQty > 1 && (
              <p className="package-piece-hint">
                💡 {lang === "ru"
                  ? `В упаковке ${p.packageQty} шт (1 шт ~ ${money(Math.round(Number(p.priceFrom) / p.packageQty), t("sum_currency"))})`
                  : lang === "en"
                  ? `${p.packageQty} pcs per box (~ ${money(Math.round(Number(p.priceFrom) / p.packageQty), t("sum_currency"))} each)`
                  : `1 qutida ${p.packageQty} ta (1 donasi ~ ${money(Math.round(Number(p.priceFrom) / p.packageQty), t("sum_currency"))})`}
              </p>
            )}
          </div>

          <div className="buy">
            <div className="qty">
              <button onClick={() => setQ(qty - 1)} aria-label="Kamaytirish">−</button>
              <input type="number" min={1} max={100} value={qty} onChange={(e) => setQ(Number(e.target.value))} aria-label="Soni" />
              <button onClick={() => setQ(qty + 1)} aria-label="Ko'paytirish">+</button>
            </div>
            <button className="btn btn-primary-sheen" onClick={() => { cart.add(p, qty); setAdded(true); }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="9" cy="21" r="1" />
                <circle cx="20" cy="21" r="1" />
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
              </svg>
              {t("pd_add_to_cart")}
            </button>
            {added && (
              <button className="btn ghost pulse-btn" onClick={() => nav("/cart")}>
                {t("nav_cart")} →
              </button>
            )}
          </div>
          {added && (
            <div className="cart-feedback-banner">
              <span className="check-circle">✓</span>
              <span>{lang === "ru" ? "Товар добавлен в корзину!" : lang === "en" ? "Product added to cart!" : "Mahsulot savatga qo'shildi!"}</span>
            </div>
          )}
          <p className="note">
            {lang === "ru"
              ? "Окончательная цена и спецификация подтверждаются после обратного звонка специалиста. Оплата онлайн не взимается."
              : lang === "en"
              ? "Final price and technical specifications are verified upon manager confirmation. No online upfront payment."
              : "Narx boshlang'ich hisoblanadi. Buyurtmani telefon raqamingizni tasdiqlaganingizdan keyin menejer ko'rib chiqadi va rasmiy tijoriy taklif beradi."}
          </p>

          {p.documents && p.documents.length > 0 && (
            <div className="docs" style={{ marginTop: 22 }}>
              {p.documents.map((d) => <a key={d.id} href={d.url} target="_blank" rel="noopener">PDF · {d.title}</a>)}
            </div>
          )}
        </div>
      </div>

      <div className="pd" style={{ paddingTop: 0 }}>
        <div>
          <h2 style={{ fontSize: 24, marginBottom: 12 }}>{t("pd_description")}</h2>
          <p className="prose">{localizeProductDescription(p.description, lang, p.name) || (lang === "ru" ? "Описание отсутствует." : lang === "en" ? "No description available." : "Tavsif hali kiritilmagan.")}</p>
        </div>
        <div>
          <h2 style={{ fontSize: 24, marginBottom: 4 }}>{t("pd_specifications")}</h2>
          {p.specs.length ? (
            <table className="specs"><tbody>
              {p.specs.map((s, i) => (
                <tr key={i}>
                  <td>{localizeSpecName(s.name, lang)}</td>
                  <td>{localizeSpecValue(s.value, lang)}</td>
                </tr>
              ))}
            </tbody></table>
          ) : <p className="muted">{lang === "ru" ? "Характеристики не указаны." : lang === "en" ? "No specifications provided." : "Xususiyatlar kiritilmagan."}</p>}
        </div>
      </div>

      {p.related && p.related.length > 0 && (
        <section className="sec">
          <h2>{lang === "ru" ? "Похожее оборудование" : lang === "en" ? "Related equipment" : "O'xshash mahsulotlar"}</h2>
          <div className="grid">{p.related.map((r) => <ProductCard key={r.id} p={r} />)}</div>
        </section>
      )}
    </main>
  );
}
