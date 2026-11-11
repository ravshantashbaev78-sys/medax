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
import { localizeProductName, localizeUnit, localizeCategory } from "../utils/localize";

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

              <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                <a
                  href={SITE_CONFIG.telegram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="footer-social-pill tg"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "7px 12px",
                    borderRadius: 20,
                    background: "rgba(2, 132, 199, 0.12)",
                    color: "#0284c7",
                    fontSize: 12.5,
                    fontWeight: 700,
                    textDecoration: "none",
                    border: "1px solid rgba(2, 132, 199, 0.25)",
                    transition: "all 0.2s ease",
                  }}
                  title="Medax Telegram kanali"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" />
                  </svg>
                  <span>@medax_uz</span>
                </a>

                <a
                  href={SITE_CONFIG.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="footer-social-pill insta"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "7px 12px",
                    borderRadius: 20,
                    background: "rgba(225, 48, 108, 0.12)",
                    color: "#e1306c",
                    fontSize: 12.5,
                    fontWeight: 700,
                    textDecoration: "none",
                    border: "1px solid rgba(225, 48, 108, 0.25)",
                    transition: "all 0.2s ease",
                  }}
                  title="Medax Instagram sahifasi"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                  </svg>
                  <span>@medax_uz</span>
                </a>
              </div>
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
  const name = localizeProductName(p, lang);
  const tr = (uz: string, ru: string, en: string) => (lang === "ru" ? ru : lang === "en" ? en : uz);
  const fmt = (n: number) => n.toLocaleString("ru-RU").replace(/,/g, " ").replace(/\u00a0/g, " ");

  const stock = p.stock ?? null;
  const soldOut = stock !== null && stock <= 0;

  const price = p.priceFrom ? Number(p.priceFrom) : null;
  const hasDiscount = Boolean(p.oldPrice && price && Number(p.oldPrice) > price);
  const discount = p.discountPercent || (hasDiscount ? Math.round(((Number(p.oldPrice) - price!) / Number(p.oldPrice)) * 100) : null);
  const perPiece = price && p.packageQty && p.packageQty > 1 ? Math.round(price / p.packageQty) : null;

  const onAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (soldOut) return;
    cart.add(p, 1);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1600);
  };

  return (
    <article className={`pc${soldOut ? " pc-out" : ""}`}>
      <Link className="pc-media" to={`/product/${p.slug}`} aria-label={name}>
        {img?.thumbUrl || img?.url ? (
          <img
            src={img.thumbUrl || img.url}
            alt={name}
            loading="lazy"
            width={640}
            height={640}
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.visibility = "hidden";
            }}
          />
        ) : (
          <span className="pc-placeholder">
            <DeviceIcon category={p.category?.slug} name={p.name} />
          </span>
        )}
        {(discount || p.isHit || p.isNew) && (
          <span className="pc-badges">
            {discount ? <span className="pc-badge sale">−{discount}%</span> : null}
            {p.isHit && <span className="pc-badge hit">{t("badge_hit")}</span>}
            {p.isNew && <span className="pc-badge new">{t("badge_new")}</span>}
          </span>
        )}
      </Link>

      <div className="pc-body">
        <span className="pc-meta">
          {p.brand?.name ||
            (p.category ? (lang === "uz" ? p.category.name : localizeCategory(p.category.slug || p.category.name, lang)) : "") ||
            "\u00a0"}
        </span>
        <h3 className="pc-title">
          <Link to={`/product/${p.slug}`} title={name}>
            {name}
          </Link>
        </h3>

        <span className={`pc-stock${soldOut ? " out" : ""}`}>
          <i aria-hidden="true" />
          {soldOut ? tr("Tugagan", "Нет в наличии", "Out of stock") : tr("Mahsulot mavjud", "В наличии", "In stock")}
        </span>

        <div className="pc-price">
          {hasDiscount && <s>{fmt(Number(p.oldPrice))}</s>}
          {price ? (
            <strong>
              {fmt(price)} <small>{t("sum_currency")}</small>
            </strong>
          ) : (
            <strong className="pc-ask">{tr("Narxi kelishiladi", "Цена по запросу", "Price on request")}</strong>
          )}
          {perPiece && (
            <span className="pc-per">
              {tr(`1 qutida ${p.packageQty} ta · donasi ~${fmt(perPiece)}`, `${p.packageQty} шт/уп · ~${fmt(perPiece)} за шт`, `${p.packageQty}/box · ~${fmt(perPiece)} each`)}
            </span>
          )}
        </div>

        <button type="button" className={`pc-btn${added ? " added" : ""}`} onClick={onAdd} disabled={soldOut}>
          {added ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="9" cy="21" r="1" />
              <circle cx="20" cy="21" r="1" />
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
            </svg>
          )}
          <span>
            {soldOut ? tr("Tugagan", "Нет в наличии", "Sold out") : added ? tr("Qo'shildi", "Добавлено", "Added") : tr("Savatga", "В корзину", "Add to cart")}
          </span>
        </button>
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
