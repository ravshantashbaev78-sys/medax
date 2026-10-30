import { useState, useEffect } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { useCart } from "../cart";
import { Product, money } from "../api";
import { MedaxLogo } from "./MedaxLogo";
import { useCustomerAuth } from "../customerAuth";
import { useTheme } from "../context/ThemeContext";
import { useI18n } from "../context/I18nContext";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { ThemeToggle } from "./ThemeToggle";
import { FloatingContactHub } from "./FloatingContactHub";
import { CartToast } from "./CartToast";
import { CustomerHeaderMenu } from "./CustomerHeaderMenu";
import { UzumSearchBar, useAnimatedPresence } from "./UzumSearchBar";
import { UzumCatalogModal } from "./UzumCatalogModal";
import { MobileBottomNav } from "./MobileBottomNav";
import { SITE_CONFIG } from "../siteConfig";
import { localizeProductName, localizeUnit } from "../utils/localize";

export function Layout() {
  const { count } = useCart();
  const { customer, loading, openAuthModal } = useCustomerAuth();
  const { theme, toggleTheme } = useTheme();
  const { lang, setLang, t } = useI18n();
  const location = useLocation();

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);
  const isBackdropActive = isSearchOpen || isCatalogOpen;
  const { mounted: backdropMounted, animState: backdropAnimState } = useAnimatedPresence(isBackdropActive, 280);

  // Close catalog and search on route change
  useEffect(() => {
    setIsSearchOpen(false);
    setIsCatalogOpen(false);
  }, [location.pathname, location.search]);

  // Close catalog and search on ESC key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsSearchOpen(false);
        setIsCatalogOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  if (loading) {
    return (
      <div className="auth-gate-loader">
        <MedaxLogo size="md" />
        <div className="gate-spinner" />
      </div>
    );
  }

  return (
    <>
      {/* Uzum-style Header Architecture */}
      <header className="uz-header">
        {/* Tier 1: Micro Top Bar (Location, pickup points, language, question/answer) */}
        <div className="uz-topbar">
          <div className="wrap uz-topbar-wrap">
            <div className="uz-topbar-left">
              <span className="uz-location">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                <span>{t("topbar_city")} <b>{t("topbar_city_val")}</b></span>
              </span>
              <a
                href={SITE_CONFIG.yandexMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="uz-topbar-link"
              >
                {t("topbar_pickup")}
              </a>
            </div>

            <div className="uz-topbar-right">
              <a href={`tel:${SITE_CONFIG.phoneRaw}`} className="uz-topbar-link uz-topbar-phone">
                <span className="tel-pulse-dot" />
                {SITE_CONFIG.phone}
              </a>
              <Link to="/contact" className="uz-topbar-link">{t("topbar_faq")}</Link>
              <Link to={customer ? "/account" : "/cart"} className="uz-topbar-link">{t("topbar_my_orders")}</Link>
              <div className="uz-topbar-tools">
                <LanguageSwitcher />
                <ThemeToggle />
              </div>
            </div>
          </div>
        </div>

        {/* Tier 2: Main Header (Logo, Big Catalog Button, Live Search Bar, User Profile, Cart) */}
        <div className="uz-mainbar">
          <div className="wrap uz-mainbar-wrap">
            {/* Medax Logo */}
            <Link className="logo-link" to="/" aria-label="Medax — Tibbiy uskunalar bozori">
              <MedaxLogo size="md" />
            </Link>

            {/* Mobile-only tools (Language & Theme toggle) */}
            <div className="uz-mainbar-mobile-tools">
              <LanguageSwitcher />
              <ThemeToggle />
            </div>

            {/* Catalog Button */}
            <button
              type="button"
              className={`uz-btn-catalog ${isCatalogOpen ? "is-open" : ""}`}
              onClick={() => {
                setIsSearchOpen(false);
                setIsCatalogOpen((prev) => !prev);
              }}
              aria-expanded={isCatalogOpen}
              aria-label={t("nav_catalog")}
            >
              {isCatalogOpen ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="7" height="7" rx="1.5" />
                  <rect x="14" y="3" width="7" height="7" rx="1.5" />
                  <rect x="14" y="14" width="7" height="7" rx="1.5" />
                  <rect x="3" y="14" width="7" height="7" rx="1.5" />
                </svg>
              )}
              <span>{t("nav_catalog")}</span>
            </button>

            {/* Central Uzum Search Bar with Dropdown & Dimming Backdrop */}
            <UzumSearchBar
              isOpen={isSearchOpen}
              onOpenChange={(open) => {
                if (open) setIsCatalogOpen(false);
                setIsSearchOpen(open);
              }}
            />

            {/* Right Action Icons: Login / Profile, Saralangan & Cart */}
            <div className="uz-actions">
              {customer ? (
                <CustomerHeaderMenu />
              ) : (
                <button
                  type="button"
                  className="uz-action-btn"
                  onClick={() => openAuthModal()}
                  aria-label={t("btn_login")}
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                  <span>{t("btn_login")}</span>
                </button>
              )}

              <Link
                className="uz-action-btn"
                to="/catalog"
                aria-label={t("nav_wishlist")}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
                <span>{t("nav_wishlist")}</span>
              </Link>

              <Link
                className={`uz-action-btn uz-cart-btn ${count > 0 ? "has-items" : ""}`}
                to="/cart"
                aria-label={`${t("nav_cart")}, ${count}`}
              >
                <div className="uz-cart-icon-wrap">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="9" cy="21" r="1" />
                    <circle cx="20" cy="21" r="1" />
                    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                  </svg>
                  {count > 0 && <span className="uz-badge">{count}</span>}
                </div>
                <span>{t("nav_cart")}</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Uzum-style Mega Catalog Dropdown Modal */}
        <UzumCatalogModal isOpen={isCatalogOpen} onClose={() => setIsCatalogOpen(false)} />

        {/* Tier 3: Category Strip (Quick access navigation - auto-moving ticker on mobile) */}
        <div className="uz-catstrip" aria-label="Kategoriyalar lentasi">
          <div className="uz-catstrip-track">
            <div className="uz-catstrip-wrap">
              <Link to="/catalog?flag=discount" className="uz-catstrip-pill highlight-green">
                <img src="/icons/guarantee.png" alt="" className="uz-catstrip-icon-img" />
                <b>{t("strip_guaranteed_prices")}</b>
              </Link>
              <Link to="/catalog?flag=new" className="uz-catstrip-pill highlight-red">
                <img src="/icons/new.png" alt="" className="uz-catstrip-icon-img" />
                <b>{t("strip_new_models")}</b>
              </Link>
              <Link to="/catalog?category=tibbiy-buyumlar" className="uz-catstrip-pill standard">
                <img src="/icons/consumables.png" alt="" className="uz-catstrip-icon-img" />
                <span>{t("strip_consumables")}</span>
              </Link>
              <Link to="/catalog?category=tibbiy-apparaturalar" className="uz-catstrip-pill standard">
                <img src="/icons/surgery.png" alt="" className="uz-catstrip-icon-img" />
                <span>{t("strip_surgery")}</span>
              </Link>
              <Link to="/catalog?category=tibbiy-jihozlar" className="uz-catstrip-pill standard">
                <img src="/icons/furniture.png" alt="" className="uz-catstrip-icon-img" />
                <span>{t("strip_furniture")}</span>
              </Link>
              <Link to="/catalog?category=laboratoriya-reagentlari" className="uz-catstrip-pill standard">
                <img src="/icons/lab.png" alt="" className="uz-catstrip-icon-img" />
                <span>{t("strip_laboratory")}</span>
              </Link>
              <Link to="/catalog?category=ortopedik-mahsulotlar" className="uz-catstrip-pill standard">
                <img src="/icons/wheelchair.png" alt="" className="uz-catstrip-icon-img" />
                <span>{t("strip_wheelchairs")}</span>
              </Link>
              <Link to="/catalog" className="uz-catstrip-more">
                {t("strip_all")}
              </Link>
            </div>

            {/* Cloned strip for seamless infinite loop on mobile */}
            <div className="uz-catstrip-wrap uz-catstrip-clone" aria-hidden="true">
              <Link to="/catalog?flag=discount" className="uz-catstrip-pill highlight-green" tabIndex={-1}>
                <img src="/icons/guarantee.png" alt="" className="uz-catstrip-icon-img" />
                <b>{t("strip_guaranteed_prices")}</b>
              </Link>
              <Link to="/catalog?flag=new" className="uz-catstrip-pill highlight-red" tabIndex={-1}>
                <img src="/icons/new.png" alt="" className="uz-catstrip-icon-img" />
                <b>{t("strip_new_models")}</b>
              </Link>
              <Link to="/catalog?category=tibbiy-buyumlar" className="uz-catstrip-pill standard" tabIndex={-1}>
                <img src="/icons/consumables.png" alt="" className="uz-catstrip-icon-img" />
                <span>{t("strip_consumables")}</span>
              </Link>
              <Link to="/catalog?category=tibbiy-apparaturalar" className="uz-catstrip-pill standard" tabIndex={-1}>
                <img src="/icons/surgery.png" alt="" className="uz-catstrip-icon-img" />
                <span>{t("strip_surgery")}</span>
              </Link>
              <Link to="/catalog?category=tibbiy-jihozlar" className="uz-catstrip-pill standard" tabIndex={-1}>
                <img src="/icons/furniture.png" alt="" className="uz-catstrip-icon-img" />
                <span>{t("strip_furniture")}</span>
              </Link>
              <Link to="/catalog?category=laboratoriya-reagentlari" className="uz-catstrip-pill standard" tabIndex={-1}>
                <img src="/icons/lab.png" alt="" className="uz-catstrip-icon-img" />
                <span>{t("strip_laboratory")}</span>
              </Link>
              <Link to="/catalog?category=ortopedik-mahsulotlar" className="uz-catstrip-pill standard" tabIndex={-1}>
                <img src="/icons/wheelchair.png" alt="" className="uz-catstrip-icon-img" />
                <span>{t("strip_wheelchairs")}</span>
              </Link>
              <Link to="/catalog" className="uz-catstrip-more" tabIndex={-1}>
                {t("strip_all")}
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Uzum Fon xiralashuvi (Header to'liq xiralashmay yuqorida turadi, faqat reklamadan/bosh sahifadan boshlab pastki qism xiralashadi) */}
      {backdropMounted && (
        <div
          className={`uz-search-backdrop ${backdropAnimState}`}
          onClick={() => {
            setIsSearchOpen(false);
            setIsCatalogOpen(false);
          }}
          aria-hidden="true"
        />
      )}

      <Outlet />
      <footer id="aloqa">
        <div className="wrap">
          <div className="footer-grid">
            <div className="footer-col brand-col">
              <div className="footer-brand-wrap">
                <MedaxLogo size="sm" />
              </div>
              <p className="footer-sub">{t("footer_tagline")}</p>
              <a
                href={`tel:${SITE_CONFIG.phone.replace(/\s+/g, "")}`}
                className="footer-tg-btn"
                aria-label="Phone"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                </svg>
                <span>{SITE_CONFIG.phone}</span>
              </a>
            </div>

            <div className="footer-col">
              <h4>{t("footer_catalog")}</h4>
              <nav className="footer-links">
                <Link to="/catalog?category=tibbiy-buyumlar">{t("strip_consumables")}</Link>
                <Link to="/catalog?category=tibbiy-apparaturalar">{t("strip_surgery")}</Link>
                <Link to="/catalog?category=tibbiy-jihozlar">{t("strip_furniture")}</Link>
                <Link to="/catalog?category=laboratoriya-reagentlari">{t("strip_laboratory")}</Link>
                <Link to="/catalog?category=ortopedik-mahsulotlar">{t("strip_wheelchairs")}</Link>
              </nav>
            </div>

            <div className="footer-col">
              <h4>{t("footer_services")}</h4>
              <nav className="footer-links">
                <a href="#brend">{t("partners")}</a>
                <a href="#aloqa">{t("engineering_service")}</a>
                <a href="#aloqa">{t("installation")}</a>
                <a href="#aloqa">{t("official_warranty")}</a>
              </nav>
            </div>

            <div className="footer-col">
              <h4>
                <Link to="/contact" style={{ color: "inherit", textDecoration: "none" }}>
                  {t("footer_contacts")} →
                </Link>
              </h4>
              <div className="footer-contact-list">
                <a href={`tel:${SITE_CONFIG.phoneRaw}`} className="footer-contact-item footer-tel">
                  <strong>{SITE_CONFIG.phone}</strong>
                </a>
                <a href={`mailto:${SITE_CONFIG.email}`} className="footer-contact-item">
                  <span>{SITE_CONFIG.email}</span>
                </a>
                <span className="footer-contact-item">
                  <span>{t("footer_address")}</span>
                </span>
                <span className="footer-contact-item work-hours">
                  <span>{t("footer_hours")}</span>
                </span>
              </div>
            </div>
          </div>

          <div className="footer-bottom-bar" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
            <span>© 2026 Medax. {t("footer_rights")}</span>
            <Link to="/privacy" style={{ color: "var(--ink-muted)", fontSize: 13, textDecoration: "underline" }}>
              {lang === "ru" ? "Политика конфиденциальности" : lang === "en" ? "Privacy Policy" : "Maxfiylik siyosati"}
            </Link>
          </div>
        </div>
      </footer>

      <FloatingContactHub />
      <CartToast />
      <MobileBottomNav />
    </>
  );
}

export function DeviceIcon({ category, name }: { category?: string; name?: string }) {
  const cat = (category || "").toLowerCase();
  const title = (name || "").toLowerCase();

  // 1. Ultratovush diagnostikasi
  if (cat.includes("ultratovush") || title.includes("uzi") || title.includes("ultratovush")) {
    return (
      <div className="device-icon-wrap" aria-hidden="true">
        <svg viewBox="0 0 160 120" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          {/* UZI monitor */}
          <rect x="30" y="16" width="100" height="66" rx="8" stroke="var(--ink2)" fill="var(--card)" />
          <rect x="38" y="24" width="84" height="50" rx="4" stroke="var(--teal)" fill="var(--sea)" opacity="0.3" />
          {/* Ultratovush fan-to'lqin nuri */}
          <path d="M80 30 L55 68 A 45 45 0 0 0 105 68 Z" stroke="var(--teal)" strokeWidth="1.5" fill="rgba(13,148,136,0.15)" />
          <path d="M65 48 A 25 25 0 0 0 95 48" stroke="var(--teal)" strokeWidth="1.6" strokeDasharray="2 3" />
          {/* Datchik kabeli va datchik */}
          <path d="M125 78 C135 90, 140 100, 115 105" stroke="var(--ink2)" strokeWidth="2" />
          <rect x="105" y="100" width="16" height="8" rx="2" fill="var(--teal)" stroke="var(--ink2)" />
          {/* Konsol va g'ildirakli baza */}
          <path d="M80 82v18M50 100h60" stroke="var(--ink2)" strokeWidth="2.2" />
          <circle cx="52" cy="106" r="3" fill="var(--ink2)" />
          <circle cx="108" cy="106" r="3" fill="var(--ink2)" />
        </svg>
      </div>
    );
  }

  // 2. Jarrohlik (Surgery / Laparoscopy / Lights)
  if (cat.includes("jarroh") || title.includes("jarroh") || title.includes("stol") || title.includes("chiroq")) {
    return (
      <div className="device-icon-wrap" aria-hidden="true">
        <svg viewBox="0 0 160 120" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          {/* Jarrohlik chirog'i reflektori */}
          <ellipse cx="80" cy="30" rx="44" ry="14" stroke="var(--teal)" fill="var(--card)" />
          <circle cx="80" cy="30" r="5" fill="var(--teal)" />
          <circle cx="60" cy="30" r="3.5" fill="var(--teal)" opacity="0.8" />
          <circle cx="100" cy="30" r="3.5" fill="var(--teal)" opacity="0.8" />
          {/* Nur konusi */}
          <path d="M42 34 L62 90 M118 34 L98 90" stroke="var(--teal)" strokeWidth="1.2" strokeDasharray="3 3" opacity="0.5" />
          {/* Pantograf ushlagich */}
          <path d="M80 16 L80 6 M80 6 L125 12" stroke="var(--ink2)" strokeWidth="2.5" />
          {/* Operatsion stol */}
          <rect x="36" y="90" width="88" height="10" rx="3" stroke="var(--ink2)" fill="var(--sea)" />
          <path d="M80 100v12M60 112h40" stroke="var(--ink2)" strokeWidth="2.2" />
        </svg>
      </div>
    );
  }

  // 3. Operatsion raqamli integratsiya (Digital OR / 4K Systems)
  if (cat.includes("integratsiya") || title.includes("video") || title.includes("monitor") || title.includes("4k")) {
    return (
      <div className="device-icon-wrap" aria-hidden="true">
        <svg viewBox="0 0 160 120" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          {/* Katta 4K devor ekrani */}
          <rect x="22" y="18" width="116" height="68" rx="6" stroke="var(--ink2)" fill="var(--card)" />
          <rect x="28" y="24" width="104" height="56" rx="4" stroke="var(--teal)" fill="var(--sea)" opacity="0.25" />
          {/* Ko'p kamerali bo'linma ekranda (Quad-view) */}
          <line x1="80" y1="24" x2="80" y2="80" stroke="var(--teal)" strokeWidth="1" strokeDasharray="2 2" />
          <line x1="28" y1="52" x2="132" y2="52" stroke="var(--teal)" strokeWidth="1" strokeDasharray="2 2" />
          <path d="M42 42h16l3-6 4 10 4-4h10" stroke="var(--teal)" strokeWidth="1.5" />
          <rect x="94" y="32" width="24" height="14" rx="2" stroke="var(--teal)" fill="rgba(13,148,136,0.15)" />
          {/* Signal indikatorlari */}
          <circle cx="120" cy="74" r="2.5" fill="#10b981" />
          {/* Devor ushlagich yoki poydevor */}
          <path d="M68 86h24v16H68z M50 102h60" stroke="var(--ink2)" strokeWidth="2" />
        </svg>
      </div>
    );
  }

  // 4. Tibbiy mebel (Beds / Trolleys)
  if (cat.includes("mebel") || title.includes("karavot") || title.includes("aravacha")) {
    return (
      <div className="device-icon-wrap" aria-hidden="true">
        <svg viewBox="0 0 160 120" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          {/* Funksional karavot romi va burchak ko'tarilishi */}
          <path d="M26 62 L60 44 L95 62 L134 62" stroke="var(--teal)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          {/* Karavot bosh tomoni va oyoq tomoni to'siqlari */}
          <path d="M22 40v38 M138 48v30" stroke="var(--ink2)" strokeWidth="3.2" strokeLinecap="round" />
          {/* Yon himoya to'siqlari */}
          <rect x="52" y="48" width="34" height="12" rx="3" stroke="var(--ink2)" fill="var(--card)" opacity="0.8" />
          {/* Gidravlik oyoqlar va g'ildiraklar */}
          <path d="M45 64v32 M115 64v32 M35 96h90" stroke="var(--ink2)" strokeWidth="2.4" />
          <circle cx="45" cy="102" r="4.5" fill="var(--teal)" stroke="var(--ink2)" strokeWidth="1.5" />
          <circle cx="115" cy="102" r="4.5" fill="var(--teal)" stroke="var(--ink2)" strokeWidth="1.5" />
        </svg>
      </div>
    );
  }

  // 5. Standart Reanimatsiya va IVL apparati (ICU / Ventilator)
  return (
    <div className="device-icon-wrap" aria-hidden="true">
      <svg viewBox="0 0 160 120" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        {/* Korpus */}
        <rect x="25" y="15" width="110" height="74" rx="10" stroke="var(--ink2)" fill="var(--card)" opacity="0.95" />
        {/* Ekran */}
        <rect x="35" y="25" width="70" height="46" rx="6" stroke="var(--teal)" fill="var(--sea)" opacity="0.35" />
        {/* EKG puls chizig'i ekranda */}
        <path d="M40 48h12l4-8 6 16 6-12 4 4h18" stroke="var(--teal)" strokeWidth="2.2" />
        {/* Boshqaruv tugmalari va indikatorlar */}
        <circle cx="118" cy="32" r="3" fill="#10b981" />
        <circle cx="118" cy="44" r="3" fill="#f59e0b" />
        <rect x="113" y="55" width="10" height="12" rx="2" stroke="var(--ink2)" fill="var(--sea)" />
        {/* Stativ va asos */}
        <path d="M80 89v16M55 105h50" stroke="var(--ink2)" strokeWidth="2.2" />
        <circle cx="56" cy="108" r="3" fill="var(--ink2)" />
        <circle cx="104" cy="108" r="3" fill="var(--ink2)" />
      </svg>
    </div>
  );
}

export function ProductCard({ p }: { p: Product }) {
  const cart = useCart();
  const { lang, t } = useI18n();
  const [added, setAdded] = useState(false);
  const img = p.images?.[0];
  const localizedName = localizeProductName(p, lang);

  const onAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    cart.add(p, 1);
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  const priceLabel = p.priceFrom
    ? `${Number(p.priceFrom).toLocaleString("ru-RU").replace(/,/g, " ")} ${t("sum_currency")}`
    : lang === "ru"
    ? "По запросу"
    : lang === "en"
    ? "On request"
    : "Narx so'rang";

  const addedLabel = lang === "ru" ? "✓ Добавлено" : lang === "en" ? "✓ Added" : "✓ Qo'shildi";
  const btnLabel = lang === "ru" ? "В корзину" : lang === "en" ? "Add" : "Savatga";

  const hasDiscount = Boolean(p.oldPrice && p.priceFrom && Number(p.oldPrice) > Number(p.priceFrom));
  const discountVal = p.discountPercent || (hasDiscount ? Math.round(((Number(p.oldPrice) - Number(p.priceFrom)) / Number(p.oldPrice)) * 100) : null);
  const unitLabel = p.unit ? ` / ${localizeUnit(p.unit, lang)}` : "";

  // Donalab narx hisobi (agar 1 qutida masalan 50 yoki 100 dona bo'lsa)
  const perPiecePrice = p.priceFrom && p.packageQty && p.packageQty > 1
    ? Math.round(Number(p.priceFrom) / p.packageQty)
    : null;

  return (
    <article className="p med-product-card">
      <Link className="img" to={`/product/${p.slug}`} aria-label={localizedName}>
        {/* Top Badges: Chegirma, Xit, Yangi */}
        <div className="card-badges-top">
          {discountVal && <span className="tag discount-badge">-{discountVal}%</span>}
          {p.isHit && <span className="tag hit">{t("badge_hit")}</span>}
          {p.isNew && <span className="tag new">{t("badge_new")}</span>}
        </div>

        {(() => {
          const catImgMap: Record<string, string> = {
            "reanimatsiya-va-anesteziologiya": "/uploads/products/medical-icu.jpg",
            "ultratovush-diagnostikasi": "/uploads/products/medical-diag.jpg",
            "jarrohlik": "/uploads/products/medical-surgery.jpg",
            "tibbiy-mebel": "/uploads/products/medical-bed.jpg",
            "operatsion-raqamli-integratsiya": "/uploads/products/medical-recorder.jpg",
            "reabilitatsiya-va-invalit-aravachalari": "/uploads/products/wheelchair.jpg",
          };
          const imgSrc = img?.thumbUrl || img?.url || catImgMap[p.category?.slug || ""] || "/uploads/products/medical-diag.jpg";
          return <img src={imgSrc} alt={localizedName} loading="lazy" width={480} height={360} onError={(e) => { (e.currentTarget as HTMLImageElement).src = "/uploads/products/medical-diag.jpg"; }} />;
        })()}
      </Link>

      <div className="b">
        <span className="card-brand-name">{p.brand?.name || "Medax"}</span>

        <h3 className="card-product-title">
          <Link to={`/product/${p.slug}`} title={localizedName}>
            {localizedName}
          </Link>
        </h3>

        {/* Qutida ko'p dona bo'lsa, donalab hisobi */}
        {perPiecePrice && (
          <div className="card-package-subtext">
            {lang === "ru"
              ? `В упаковке ${p.packageQty} шт (1 шт ~ ${perPiecePrice.toLocaleString("ru-RU").replace(/,/g, " ")} сум)`
              : lang === "en"
              ? `${p.packageQty} pcs/box (~ ${perPiecePrice.toLocaleString("ru-RU").replace(/,/g, " ")} UZS each)`
              : `1 qutida ${p.packageQty} ta (1 donasi ~ ${perPiecePrice.toLocaleString("ru-RU").replace(/,/g, " ")} so'm)`}
          </div>
        )}

        <div className="pr card-bottom-bar">
          <div className="price-block">
            {p.stock !== undefined && (
              <span
                style={{
                  display: "block",
                  fontSize: 11,
                  fontWeight: 700,
                  color: (p.stock ?? 0) > 0 ? "#0284c7" : "#dc2626",
                  marginBottom: 2,
                }}
              >
                {(p.stock ?? 0) > 0
                  ? lang === "ru"
                    ? `В наличии: ${p.stock} шт`
                    : lang === "en"
                    ? `In stock: ${p.stock} pcs`
                    : `Omborda: ${p.stock} dona`
                  : lang === "ru"
                  ? "Нет в наличии"
                  : lang === "en"
                  ? "Out of stock"
                  : "Omborda tugagan"}
              </span>
            )}
            {hasDiscount && (
              <span className="price-old">
                {Number(p.oldPrice).toLocaleString("ru-RU").replace(/,/g, " ")} {t("sum_currency")}
              </span>
            )}
            <span className="price-val">
              {priceLabel}
              <span className="price-unit-sub">{unitLabel}</span>
            </span>
          </div>

          {p.stock !== undefined && p.stock <= 0 ? (
            <span
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: "#dc2626",
                background: "#fef2f2",
                padding: "6px 10px",
                borderRadius: 8,
              }}
            >
              {lang === "ru" ? "Закончился" : lang === "en" ? "Out of stock" : "Tugagan"}
            </span>
          ) : (
            <button
              type="button"
              className={`btn-quick-cart ${added ? "added" : ""}`}
              onClick={onAddToCart}
              aria-label={added ? addedLabel : t("pd_add_to_cart")}
              title={added ? addedLabel : t("pd_add_to_cart")}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="9" cy="21" r="1" />
                <circle cx="20" cy="21" r="1" />
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
              </svg>
              <span>{added ? addedLabel : btnLabel}</span>
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

export function Pager({ page, pages, onPage }: { page: number; pages: number; onPage: (n: number) => void }) {
  if (pages <= 1) return null;
  const nums: number[] = [];
  for (let i = Math.max(1, page - 2); i <= Math.min(pages, page + 2); i++) nums.push(i);
  return (
    <nav className="pager" aria-label="Sahifalar">
      <button disabled={page === 1} onClick={() => onPage(page - 1)} aria-label="Oldingi">‹</button>
      {nums[0] > 1 && <button onClick={() => onPage(1)}>1</button>}
      {nums.map((n) => (
        <button key={n} aria-current={n === page} onClick={() => onPage(n)}>{n}</button>
      ))}
      {nums[nums.length - 1] < pages && <button onClick={() => onPage(pages)}>{pages}</button>}
      <button disabled={page === pages} onClick={() => onPage(page + 1)} aria-label="Keyingi">›</button>
    </nav>
  );
}
