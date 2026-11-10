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
            <span className="hub-status-text">Du–Sha · 09:00–18:00</span>
          </div>
          <h4 className="floating-hub-title">{t("float_hub_title")}</h4>
          <p className="floating-hub-sub">{t("float_hub_sub")}</p>
        </div>

        <div className="floating-hub-items">
          {/* 1. Telefon qo'ng'iroq */}
          <a
            href={`tel:${phoneNum.replace(/\s+/g, "")}`}
            className="floating-hub-item hub-item-phone"
            onClick={() => {
              window.location.href = `tel:${phoneNum.replace(/\s+/g, "")}`;
              setTimeout(() => setOpen(false), 300);
            }}
          >
            <div className="hub-item-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
            </div>
            <div className="hub-item-text">
              <span className="hub-item-title">{lang === "ru" ? "Позвонить" : lang === "en" ? "Call Us" : "Qo'ng'iroq qilish"}</span>
              <span className="hub-item-meta">{phoneNum}</span>
            </div>
            <span className="hub-item-arrow" aria-hidden="true">→</span>
          </a>

          {/* 2. Murojaat qoldirish (Contact sahifasiga kirish) */}
          <Link
            to="/contact"
            className="floating-hub-item hub-item-message"
            onClick={() => setOpen(false)}
          >
            <div className="hub-item-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <div className="hub-item-text">
              <span className="hub-item-title">{lang === "ru" ? "Оставить обращение" : lang === "en" ? "Send Inquiry" : "Murojaat qoldirish"}</span>
              <span className="hub-item-meta">{lang === "ru" ? "Форма на сайте" : lang === "en" ? "Online form" : "Sayt orqali yozish"}</span>
            </div>
            <span className="hub-item-arrow" aria-hidden="true">→</span>
          </Link>

          {/* 3. Gmail pochta */}
          <a
            href={`mailto:${SITE_CONFIG.email}`}
            className="floating-hub-item hub-item-gmail"
            onClick={() => setOpen(false)}
          >
            <div className="hub-item-icon">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L12 9.491l8.073-5.998C21.69 2.28 24 3.434 24 5.457z"/>
              </svg>
            </div>
            <div className="hub-item-text">
              <span className="hub-item-title">{lang === "ru" ? "Написать на почту" : lang === "en" ? "Send Email" : "Gmail orqali yozish"}</span>
              <span className="hub-item-meta">{SITE_CONFIG.email}</span>
            </div>
            <span className="hub-item-arrow" aria-hidden="true">→</span>
          </a>

          {/* 4. Telegram kanal */}
          <a
            href={SITE_CONFIG.telegram}
            target="_blank"
            rel="noopener noreferrer"
            className="floating-hub-item hub-item-tg"
            onClick={() => setOpen(false)}
          >
            <div className="hub-item-icon" style={{ background: "#e0f2fe", color: "#0284c7" }}>
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" />
              </svg>
            </div>
            <div className="hub-item-text">
              <span className="hub-item-title">{lang === "ru" ? "Telegram канал" : lang === "en" ? "Telegram Channel" : "Telegram kanalimiz"}</span>
              <span className="hub-item-meta">@medax_uz</span>
            </div>
            <span className="hub-item-arrow" aria-hidden="true">→</span>
          </a>

          {/* 5. Instagram sahifa */}
          <a
            href={SITE_CONFIG.instagram}
            target="_blank"
            rel="noopener noreferrer"
            className="floating-hub-item hub-item-insta"
            onClick={() => setOpen(false)}
          >
            <div className="hub-item-icon" style={{ background: "#fdf2f8", color: "#e1306c" }}>
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
              </svg>
            </div>
            <div className="hub-item-text">
              <span className="hub-item-title">{lang === "ru" ? "Instagram профиль" : lang === "en" ? "Instagram Profile" : "Instagram sahifamiz"}</span>
              <span className="hub-item-meta">@medax_uz</span>
            </div>
            <span className="hub-item-arrow" aria-hidden="true">→</span>
          </a>

          {/* 6. Xarita va manzil (/contact) */}
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
              <span className="hub-item-title">{lang === "ru" ? "Адрес и локация" : lang === "en" ? "Address & Map" : "Ofis manzili va xarita"}</span>
              <span className="hub-item-meta">
                {lang === "ru"
                  ? "г. Наманган, ул. Беруни, 2"
                  : lang === "en"
                  ? "Namangan city, Beruniy st., 2"
                  : "Namangan sh., Beruniy ko'chasi, 2-uy"}
              </span>
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
