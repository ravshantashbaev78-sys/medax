import React, { useState, useEffect } from "react";
import { useCustomerAuth } from "../customerAuth";
import { MedaxLogo } from "./MedaxLogo";
import { useI18n } from "../context/I18nContext";

export function AuthModal() {
  const {
    isAuthModalOpen,
    closeAuthModal,
    sendOtp,
    verifyOtp,
    loginWithPassword,
  } = useCustomerAuth();
  const { lang, t } = useI18n();

  // Mode: "otp-phone" | "otp-code" | "password"
  const [mode, setMode] = useState<"otp-phone" | "otp-code" | "password">("otp-phone");
  const [phone, setPhone] = useState("+998 ");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [organization, setOrganization] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resendTimer, setResendTimer] = useState(0);

  // Format phone number
  const handlePhoneChange = (val: string) => {
    let clean = val.replace(/[^\d+]/g, "");
    if (!clean.startsWith("+998")) clean = "+998" + clean.replace(/\+/g, "");
    let digits = clean.slice(4);
    if (digits.length > 9) digits = digits.slice(0, 9);

    let formatted = "+998";
    if (digits.length > 0) formatted += " " + digits.slice(0, 2);
    if (digits.length > 2) formatted += " " + digits.slice(2, 5);
    if (digits.length > 5) formatted += " " + digits.slice(5, 7);
    if (digits.length > 7) formatted += " " + digits.slice(7, 9);
    setPhone(formatted);
  };

  // Resend timer countdown
  useEffect(() => {
    if (resendTimer <= 0) return;
    const interval = setInterval(() => {
      setResendTimer((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendTimer]);

  if (!isAuthModalOpen) return null;

  const handleClose = () => {
    setError("");
    setLoading(false);
    setMode("otp-phone");
    closeAuthModal();
  };

  // Step 1: Send SMS OTP
  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const rawDigits = phone.replace(/[^\d]/g, "");
    if (rawDigits.length !== 12) {
      setError(
        lang === "ru"
          ? "Введите корректный номер телефона (9 цифр)"
          : "Telefon raqamingizni to'liq kiriting (masalan: +998 90 123 45 67)"
      );
      return;
    }

    setError("");
    setLoading(true);
    try {
      const res = await sendOtp(phone);
      setMode("otp-code");
      setResendTimer(res.resendIn || 60);
    } catch (err: any) {
      setError(err.message || (lang === "ru" ? "Ошибка при отправке SMS" : "SMS yuborishda xatolik yuz berdi"));
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify SMS OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.trim().length !== 6) {
      setError(lang === "ru" ? "Введите 6-значный код из SMS" : "SMS orqali kelgan 6 xonali kodni kiriting");
      return;
    }

    setError("");
    setLoading(true);
    try {
      await verifyOtp({
        phone,
        code: code.trim(),
        name: name.trim() || undefined,
        organization: organization.trim() || undefined,
      });
      handleClose();
    } catch (err: any) {
      setError(err.message || (lang === "ru" ? "Неверный код подтверждения" : "Tasdiqlash kodi noto'g'ri"));
    } finally {
      setLoading(false);
    }
  };

  // Password login
  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      setError(lang === "ru" ? "Введите пароль" : "Parolni kiriting");
      return;
    }

    setError("");
    setLoading(true);
    try {
      await loginWithPassword(phone, password);
      handleClose();
    } catch (err: any) {
      setError(err.message || (lang === "ru" ? "Неверный телефон или пароль" : "Telefon yoki parol noto'g'ri"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={handleClose} role="dialog" aria-modal="true">
      <div className="auth-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 440, padding: "28px 24px" }}>
        {/* Yopish tugmasi */}
        <button className="modal-close-btn" onClick={handleClose} aria-label={t("auth_modal_close")}>
          ✕
        </button>

        {/* Modal Header */}
        <div className="auth-header" style={{ textAlign: "center", marginBottom: 20 }}>
          <MedaxLogo size="sm" />
          <h2 style={{ fontSize: 20, margin: "12px 0 4px", fontWeight: 700, color: "var(--ink, #0f172a)" }}>
            {lang === "ru"
              ? "Вход в личный кабинет"
              : lang === "en"
              ? "Sign In to Account"
              : "Shaxsiy kabinetga kirish"}
          </h2>
          <p className="auth-sub" style={{ fontSize: 13, color: "var(--ink2, #64748b)", margin: 0 }}>
            {mode === "otp-code"
              ? lang === "ru"
                ? `Код отправлен на номер ${phone}`
                : `Tasdiqlash kodi ${phone} raqamiga yuborildi`
              : lang === "ru"
              ? "Быстрый и безопасный вход по номеру телефона"
              : "Telefon raqamingiz orqali tezkor va xavfsiz kiring"}
          </p>
        </div>

        {error && (
          <div
            className="err auth-alert"
            style={{
              padding: "10px 14px",
              background: "#fee2e2",
              color: "#b91c1c",
              borderRadius: 10,
              fontSize: 13,
              marginBottom: 16,
              border: "1px solid #fca5a5",
            }}
          >
            {error}
          </div>
        )}

        {/* STEP 1: OTP PHONE INPUT */}
        {mode === "otp-phone" && (
          <form onSubmit={handleSendOtp} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: 12.5,
                  fontWeight: 600,
                  color: "var(--ink, #0f172a)",
                  marginBottom: 6,
                }}
              >
                {lang === "ru" ? "Номер телефона" : "Telefon raqamingiz"}
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => handlePhoneChange(e.target.value)}
                placeholder="+998 90 123 45 67"
                required
                autoFocus
                style={{
                  width: "100%",
                  height: 46,
                  padding: "0 14px",
                  fontSize: 16,
                  fontWeight: 600,
                  letterSpacing: 0.5,
                  borderRadius: 10,
                  border: "1.5px solid var(--line, #cbd5e1)",
                  outline: "none",
                  background: "var(--paper, #fff)",
                  color: "var(--ink, #0f172a)",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn"
              style={{
                width: "100%",
                height: 46,
                fontSize: 15,
                fontWeight: 600,
                borderRadius: 10,
                background: "var(--teal, #0d9488)",
                color: "#fff",
                border: "none",
                cursor: loading ? "wait" : "pointer",
              }}
            >
              {loading
                ? (lang === "ru" ? "Отправка SMS..." : "SMS yuborilmoqda...")
                : (lang === "ru" ? "Получить SMS-код" : "SMS kod olish")}
            </button>

            <div style={{ textAlign: "center", marginTop: 8 }}>
              <button
                type="button"
                onClick={() => {
                  setError("");
                  setMode("password");
                }}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: 13,
                  color: "var(--teal, #0d9488)",
                  cursor: "pointer",
                  textDecoration: "underline",
                }}
              >
                {lang === "ru" ? "Войти с помощью пароля →" : "Parol orqali kirish →"}
              </button>
            </div>
          </form>
        )}

        {/* STEP 2: OTP CODE VERIFICATION */}
        {mode === "otp-code" && (
          <form onSubmit={handleVerifyOtp} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: 12.5,
                  fontWeight: 600,
                  color: "var(--ink, #0f172a)",
                  marginBottom: 6,
                }}
              >
                {lang === "ru" ? "6-значный SMS-код" : "6 xonali SMS kod"}
              </label>
              <input
                type="text"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                placeholder="123456"
                required
                autoFocus
                style={{
                  width: "100%",
                  height: 48,
                  textAlign: "center",
                  fontSize: 22,
                  fontWeight: 700,
                  letterSpacing: 6,
                  borderRadius: 10,
                  border: "1.5px solid var(--teal, #0d9488)",
                  outline: "none",
                  background: "var(--paper, #fff)",
                  color: "var(--ink, #0f172a)",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <div>
              <label
                style={{
                  display: "block",
                  fontSize: 12,
                  fontWeight: 500,
                  color: "var(--ink2, #64748b)",
                  marginBottom: 4,
                }}
              >
                {lang === "ru" ? "Ваше имя (необязательно)" : "Ismingiz (ixtiyoriy)"}
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={lang === "ru" ? "Например, Доктор Алишер" : "Masalan: Alisher"}
                style={{
                  width: "100%",
                  height: 40,
                  padding: "0 12px",
                  fontSize: 14,
                  borderRadius: 8,
                  border: "1px solid var(--line, #cbd5e1)",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn"
              style={{
                width: "100%",
                height: 46,
                fontSize: 15,
                fontWeight: 600,
                borderRadius: 10,
                background: "var(--teal, #0d9488)",
                color: "#fff",
                border: "none",
                cursor: loading ? "wait" : "pointer",
              }}
            >
              {loading
                ? (lang === "ru" ? "Проверка..." : "Tekshirilmoqda...")
                : (lang === "ru" ? "Подтвердить и войти" : "Tasdiqlash va kirish")}
            </button>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12.5, marginTop: 4 }}>
              <button
                type="button"
                onClick={() => {
                  setError("");
                  setCode("");
                  setMode("otp-phone");
                }}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--ink2, #64748b)",
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                {lang === "ru" ? "← Другой номер" : "← Boshqa raqam"}
              </button>

              {resendTimer > 0 ? (
                <span style={{ color: "var(--ink2, #94a3b8)" }}>
                  {lang === "ru" ? `Повторить через ${resendTimer}с` : `Qayta yuborish (${resendTimer}s)`}
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => handleSendOtp()}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--teal, #0d9488)",
                    fontWeight: 600,
                    cursor: "pointer",
                    padding: 0,
                  }}
                >
                  {lang === "ru" ? "Отправить код снова" : "Kodni qayta yuborish"}
                </button>
              )}
            </div>
          </form>
        )}

        {/* STEP 3: PASSWORD LOGIN */}
        {mode === "password" && (
          <form onSubmit={handlePasswordLogin} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: 12.5,
                  fontWeight: 600,
                  color: "var(--ink, #0f172a)",
                  marginBottom: 6,
                }}
              >
                {lang === "ru" ? "Номер телефона" : "Telefon raqamingiz"}
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => handlePhoneChange(e.target.value)}
                placeholder="+998 90 123 45 67"
                required
                style={{
                  width: "100%",
                  height: 44,
                  padding: "0 14px",
                  fontSize: 15,
                  fontWeight: 600,
                  borderRadius: 10,
                  border: "1.5px solid var(--line, #cbd5e1)",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <div>
              <label
                style={{
                  display: "block",
                  fontSize: 12.5,
                  fontWeight: 600,
                  color: "var(--ink, #0f172a)",
                  marginBottom: 6,
                }}
              >
                {lang === "ru" ? "Пароль" : "Parolingiz"}
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoFocus
                style={{
                  width: "100%",
                  height: 44,
                  padding: "0 14px",
                  fontSize: 15,
                  borderRadius: 10,
                  border: "1.5px solid var(--line, #cbd5e1)",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn"
              style={{
                width: "100%",
                height: 46,
                fontSize: 15,
                fontWeight: 600,
                borderRadius: 10,
                background: "var(--teal, #0d9488)",
                color: "#fff",
                border: "none",
                cursor: loading ? "wait" : "pointer",
              }}
            >
              {loading
                ? (lang === "ru" ? "Вход..." : "Kirilmoqda...")
                : (lang === "ru" ? "Войти с паролем" : "Kirish")}
            </button>

            <div style={{ textAlign: "center", marginTop: 8 }}>
              <button
                type="button"
                onClick={() => {
                  setError("");
                  setMode("otp-phone");
                }}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: 13,
                  color: "var(--teal, #0d9488)",
                  cursor: "pointer",
                  textDecoration: "underline",
                }}
              >
                {lang === "ru" ? "← Войти через SMS-код" : "← SMS kod orqali kirish"}
              </button>
            </div>
          </form>
        )}

        <div
          className="auth-footer-note"
          style={{
            textAlign: "center",
            marginTop: 20,
            fontSize: 12,
            color: "var(--ink2, #94a3b8)",
          }}
        >
          {lang === "ru"
            ? "Безопасный доступ к Medax с официальным SMS-подтверждением"
            : "Medax tibbiyot uskunalari markaziga xavfsiz SMS tasdiqlash"}
        </div>
      </div>
    </div>
  );
}
