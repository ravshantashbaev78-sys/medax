import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useI18n } from "../context/I18nContext";
import { SITE_CONFIG } from "../siteConfig";

export function FloatingContactHub() {
  const { lang, t } = useI18n();
  const [open, setOpen] = useState(false);
  const hubRef = useRef<HTMLDivElement>(null);

  const phoneNum = SITE_CONFIG.phone;
  const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(SITE_CONFIG.email)}&su=${encodeURIComponent(
    lang === "ru" ? "Запрос по оборудованию" : lang === "en" ? "Medical Equipment Inquiry" : "Tibbiy uskuna bo'yicha so'rov"
  )}`;

  // Tashqariga bosilganda yoki Escape bosilganda menyuni yopish
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (hubRef.current && !hubRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }

    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div className="floating-hub-container" ref={hubRef}>
      {/* Ochiluvchi menyu kartochkasi */}
      <div className={`floating-hub-popover ${open ? "open" : ""}`} role="dialog" aria-modal="true">
        <div className="floating-hub-header">
          <div className="floating-hub-status">
            <span className="hub-live-dot" />
            <span className="hub-status-text">Online · 24/7</span>
          </div>
          <h4 className="floating-hub-title">{t("float_hub_title")}</h4>
          <p className="floating-hub-sub">{t("float_hub_sub")}</p>
        </div>

        <div className="floating-hub-items">
          {/* 1. Telefon */}
          <a
            href={`tel:${phoneNum.replace(/\s+/g, "")}`}
            className="floating-hub-item hub-item-phone"
            onClick={() => setOpen(false)}
          >
            <div className="hub-item-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
            </div>
            <div className="hub-item-text">
              <span className="hub-item-title">{t("float_call_btn")}</span>
              <span className="hub-item-meta">{t("float_call_sub")}</span>
            </div>
            <span className="hub-item-arrow" aria-hidden="true">→</span>
          </a>

          {/* 2. Gmail */}
          <a
            href={gmailUrl}
            target="_blank"
            rel="noreferrer"
            className="floating-hub-item hub-item-gmail"
            onClick={() => setOpen(false)}
          >
            <div className="hub-item-icon">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L12 9.491l8.073-5.998C21.69 2.28 24 3.434 24 5.457z"/>
              </svg>
            </div>
            <div className="hub-item-text">
              <span className="hub-item-title">{t("float_gmail_btn")}</span>
              <span className="hub-item-meta">{t("float_gmail_sub")}</span>
            </div>
            <span className="hub-item-arrow" aria-hidden="true">→</span>
          </a>

          {/* 4. Xarita va manzil (/contact) */}
          <Link
            to="/contact"
            className="floating-hub-item hub-item-map"
            onClick={() => setOpen(false)}
          >
            <div className="hub-item-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
            </div>
            <div className="hub-item-text">
              <span className="hub-item-title">{t("float_map_btn")}</span>
              <span className="hub-item-meta">{t("float_map_sub")}</span>
            </div>
            <span className="hub-item-arrow" aria-hidden="true">→</span>
          </Link>
        </div>
      </div>

      {/* Asosiy suzuvchi trigger tugmasi */}
      <button
        type="button"
        className={`floating-hub-trigger-btn ${open ? "active" : ""}`}
        onClick={() => setOpen(!open)}
        aria-label={t("float_hub_btn")}
        aria-expanded={open}
      >
        <span className="floating-hub-pulse-ring" />
        <span className="floating-hub-icon-wrap">
          {open ? (
            /* X (yopish) belgisi */
            <svg className="hub-close-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          ) : (
            /* Telefon / Xabarlar belgisi */
            <svg className="hub-open-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              <circle cx="8" cy="10" r="1" fill="currentColor" />
              <circle cx="12" cy="10" r="1" fill="currentColor" />
              <circle cx="16" cy="10" r="1" fill="currentColor" />
            </svg>
          )}
        </span>
      </button>
    </div>
  );
}
