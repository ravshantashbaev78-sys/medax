import { FormEvent, useEffect, useState } from "react";
import { useI18n } from "../context/I18nContext";
import { SITE_CONFIG } from "../siteConfig";
import { api, ApiError } from "../api";

export default function Contact() {
  const { lang, t } = useI18n();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState(""); // honeypot
  const [copied, setCopied] = useState(false);

  const [busy, setBusy] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const officialEmail = SITE_CONFIG.email;
  const officialPhone = SITE_CONFIG.phone;
  const officeAddress =
    lang === "ru"
      ? SITE_CONFIG.addressRu
      : lang === "en"
      ? SITE_CONFIG.addressEn
      : SITE_CONFIG.addressUz;

  const googleMapsUrl = SITE_CONFIG.googleMapsUrl;
  const yandexMapsUrl = SITE_CONFIG.yandexMapsUrl;

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("visible");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -40px 0px" }
    );
    document.querySelectorAll(".reveal, .reveal-scale").forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  const copyEmail = () => {
    navigator.clipboard.writeText(officialEmail).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    });
  };

  // 1. Murojaatni to'g'ridan-to'g'ri tizimga (bazaga) yuborish
  const handleSubmitMessage = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setBusy(true);

    try {
      await api<{ ok: boolean; message: string }>("/contact", {
        json: {
          name: name.trim(),
          phone: phone.trim(),
          subject: subject.trim() || undefined,
          message: email ? `[Email: ${email.trim()}]\n\n${message.trim()}` : message.trim(),
          website,
        },
      });

      setSentSuccess(true);
      setName("");
      setEmail("");
      setPhone("");
      setSubject("");
      setMessage("");
    } catch (err) {
      setErrorMsg((err as ApiError).message || "Xabar yuborishda xatolik yuz berdi");
    } finally {
      setBusy(false);
    }
  };

  // 2. Gmail Web Client orqali ixtiyoriy yozish
  const handleGmailOpen = () => {
    const mailSubject = subject.trim() || (lang === "ru" ? "Запрос на медицинское оборудование" : lang === "en" ? "Medical Equipment Inquiry" : "Tibbiy uskuna bo'yicha so'rov");
    let mailBody = "";
    if (name.trim()) mailBody += `${lang === "ru" ? "Имя" : lang === "en" ? "Name" : "Mijoz"}: ${name.trim()}\n`;
    if (phone.trim()) mailBody += `${lang === "ru" ? "Телефон" : lang === "en" ? "Phone" : "Telefon"}: ${phone.trim()}\n`;
    if (email.trim()) mailBody += `Email: ${email.trim()}\n`;
    if (message.trim()) mailBody += `\n${lang === "ru" ? "Сообщение" : lang === "en" ? "Message" : "Xabar"}:\n${message.trim()}\n`;

    const gmailComposeUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(
      officialEmail
    )}&su=${encodeURIComponent(mailSubject)}&body=${encodeURIComponent(mailBody)}`;

    window.open(gmailComposeUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <main className="contact-page">
      {/* Yuqori sarlavha */}
      <section className="contact-hero sec">
        <div className="wrap">
          <div className="contact-head reveal">
            <span className="contact-pill-badge">{lang === "ru" ? "Официальные контакты" : lang === "en" ? "Official Contacts" : "Rasmiy aloqa"}</span>
            <h1 className="contact-title">{t("contact_page_title")}</h1>
            <p className="contact-sub">{t("contact_page_sub")}</p>
          </div>
        </div>
      </section>

      {/* 2 ustunli asosiy blok: Rekvizitlar + Aloqa formasi */}
      <section className="sec contact-details-sec">
        <div className="wrap">
          <div className="contact-grid stagger-items">
            {/* Chap tomon: Rekvizitlar kartochkalari */}
            <div className="contact-info-col">
              <div className="contact-col-header reveal">
                <div className="form-head-badge">
                  <span className="direct-badge">Medax Rekvizitlar</span>
                </div>
                <h2 className="contact-col-heading">{t("contact_info_title")}</h2>
                <p className="contact-col-sub">
                  {lang === "ru"
                    ? "Официальные каналы связи, служба сервиса и адрес центрального склада"
                    : lang === "en"
                    ? "Official communication channels, service support, and central office"
                    : "Rasmiy aloqa kanallari, servis xizmati va bosh ofisimiz ma'lumotlari"}
                </p>
              </div>

              <div className="contact-card-item reveal">
                <div className="contact-card-icon map-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                </div>
                <div className="contact-card-body">
                  <span className="contact-card-label">{t("contact_office_title")}</span>
                  <strong className="contact-card-value">{officeAddress}</strong>
                  <span className="contact-card-hint">
                    {lang === "ru" ? "Ориентир: СГМ Озод, улица Беруни" : lang === "en" ? "Landmark: Ozod MCC, Beruniy street" : "Mo'ljal: Ozod MFY, Beruniy ko'chasi"}
                  </span>
                  <div className="contact-card-actions">
                    <a href={googleMapsUrl} target="_blank" rel="noreferrer" className="btn-route-link">
                      <span>{t("contact_route_btn")}</span>
                      <span aria-hidden="true">→</span>
                    </a>
                  </div>
                </div>
              </div>

              <div className="contact-card-item reveal">
                <div className="contact-card-icon phone-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                  </svg>
                </div>
                <div className="contact-card-body">
                  <span className="contact-card-label">{t("contact_phone_title")}</span>
                  <a href={`tel:${officialPhone.replace(/\s+/g, "")}`} className="contact-card-value tel-link">
                    {officialPhone}
                  </a>
                  <span className="contact-card-hint">{t("contact_hours_title")}: 09:00 - 18:00</span>
                </div>
              </div>

              <div className="contact-card-item reveal">
                <div className="contact-card-icon email-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <polyline points="22,6 12,13 2,6" />
                  </svg>
                </div>
                <div className="contact-card-body">
                  <span className="contact-card-label">{t("contact_email_title")}</span>
                  <div className="email-copy-row">
                    <a href={`mailto:${officialEmail}`} className="contact-card-value email-link">
                      {officialEmail}
                    </a>
                    <button
                      type="button"
                      className={`btn-copy-email ${copied ? "copied" : ""}`}
                      onClick={copyEmail}
                      title="Nusxalash"
                    >
                      {copied ? "✓ Nusxalandi" : "Nusxa olish"}
                    </button>
                  </div>
                  <span className="contact-card-hint">
                    {lang === "ru" ? "Для коммерческих запросов и предложений" : lang === "en" ? "For business inquiries and proposals" : "Tijoriy takliflar va rasmiy xatlar uchun"}
                  </span>
                </div>
              </div>

              <div className="contact-card-item reveal">
                <div className="contact-card-icon support-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                </div>
                <div className="contact-card-body">
                  <span className="contact-card-label">
                    {lang === "ru" ? "Служба поддержки и консультации" : lang === "en" ? "Support & Consultation" : "Tezkor konsultatsiya va qo'llab-quvvatlash"}
                  </span>
                  <a href={`tel:${SITE_CONFIG.phone.replace(/\s+/g, "")}`} className="contact-card-value tel-link">
                    {SITE_CONFIG.phone}
                  </a>
                  <span className="contact-card-hint">
                    {lang === "ru" ? "Инженерные консультации и онлайн поддержка 24/7" : lang === "en" ? "Engineering consultations & 24/7 online support" : "Muhandislik maslahati va 24/7 qo'llab-quvvatlash"}
                  </span>
                </div>
              </div>
            </div>

            {/* O'ng tomon: Murojaat formasi */}
            <div className="contact-form-col reveal">
              <div className="contact-form-card">
                <div className="contact-form-header">
                  <div className="form-head-badge">
                    <span className="direct-badge">Medax Qabulxona</span>
                  </div>
                  <h3>{t("contact_form_title")}</h3>
                  <p>{t("contact_form_sub")}</p>
                </div>

                {sentSuccess && (
                  <div className="ok auth-alert" style={{ marginBottom: 20 }}>
                    <strong>Murojaatingiz muvaffaqiyatli qabul qilindi! ✓</strong>
                    <p style={{ margin: "4px 0 0", fontSize: 14 }}>
                      Menejerimiz qisqa vaqt ichida ko'rsatilgan telefon raqamingiz orqali bog'lanadi.
                    </p>
                  </div>
                )}

                {errorMsg && <div className="err auth-alert" style={{ marginBottom: 20 }}>{errorMsg}</div>}

                <form className="contact-main-form" onSubmit={handleSubmitMessage}>
                  {/* Honeypot field */}
                  <div style={{ display: "none" }} aria-hidden="true">
                    <input type="text" tabIndex={-1} value={website} onChange={(e) => setWebsite(e.target.value)} />
                  </div>

                  <div className="form-row-2">
                    <div className="form-group">
                      <label htmlFor="ct-name">{t("contact_form_name")} *</label>
                      <input
                        id="ct-name"
                        type="text"
                        required
                        placeholder={lang === "ru" ? "Например, Доктор Саидов" : lang === "en" ? "E.g., Dr. Saidov" : "Masalan, Dr. Saidov"}
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="ct-phone">{t("contact_form_phone")} *</label>
                      <input
                        id="ct-phone"
                        type="tel"
                        required
                        placeholder="+998 90 123 45 67"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="ct-email">{t("contact_form_email")} (ixtiyoriy)</label>
                    <input
                      id="ct-email"
                      type="email"
                      placeholder="nomingiz@klinika.uz"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="ct-subject">{t("contact_form_subject")}</label>
                    <input
                      id="ct-subject"
                      type="text"
                      placeholder={lang === "ru" ? "Например, Запрос КП на УЗИ аппарат" : lang === "en" ? "E.g., Ultrasound Machine Offer Inquiry" : "Masalan, UZI apparati bo'yicha tijoriy taklif"}
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="ct-msg">{t("contact_form_msg")} *</label>
                    <textarea
                      id="ct-msg"
                      rows={4}
                      required
                      placeholder={
                        lang === "ru"
                          ? "Укажите необходимые характеристики оборудования, количество или вопросы..."
                          : lang === "en"
                          ? "Specify required equipment specifications, quantities, or your questions..."
                          : "Kerakli uskuna modellari, soni yoki o'zingizni qiziqtirgan savollarni yozing..."
                      }
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                    />
                  </div>

                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                    <button type="submit" className="btn btn-primary-sheen" style={{ flex: 1, minWidth: 200, height: 48 }} disabled={busy}>
                      {busy ? "Yuborilmoqda…" : "Murojaatni yuborish ✓"}
                    </button>
                    <button
                      type="button"
                      className="btn ghost"
                      style={{ height: 48, display: "flex", alignItems: "center", gap: 8 }}
                      onClick={handleGmailOpen}
                      title="Gmail ochish"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L12 9.491l8.073-5.998C21.69 2.28 24 3.434 24 5.457z"/>
                      </svg>
                      <span>Gmail orqali</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Google Maps Katta interaktiv Xarita bo'limi */}
      <section className="sec contact-map-sec">
        <div className="wrap">
          <div className="map-card-wrapper reveal">
            <div className="map-card-topbar">
              <div className="map-topbar-left">
                <span className="map-status-dot" />
                <span className="map-topbar-title">{t("contact_map_badge")} · MEDTEXNIKA</span>
                <span className="map-topbar-coord">{SITE_CONFIG.coordinates}</span>
              </div>
              <div className="map-topbar-right">
                <a
                  href={googleMapsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-map-out"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3" />
                  </svg>
                  <span>Google Maps</span>
                </a>
                <a
                  href={yandexMapsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-map-out"
                >
                  <span>Yandex Maps</span>
                </a>
              </div>
            </div>

            {/* Google Maps iFrame */}
            <div className="map-iframe-container">
              <iframe
                title="Medax Namangan Manzili Xaritasi"
                src={SITE_CONFIG.mapEmbedUrl}
                width="100%"
                height="450"
                style={{ border: 0, display: "block" }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
