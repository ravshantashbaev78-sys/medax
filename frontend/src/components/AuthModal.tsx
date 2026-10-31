import React, { useState, useEffect } from "react";
import { useCustomerAuth } from "../customerAuth";
import { MedaxLogo } from "./MedaxLogo";
import { useI18n } from "../context/I18nContext";

type AuthMode =
  | "login"            // Kirish (Telefon + Parol)
  | "register-phone"   // Ro'yxatdan o'tish: telefon kiritish
  | "register-verify"  // Ro'yxatdan o'tish: SMS kod + Ism + Yangi parol
  | "forgot-phone"     // Parolni unutdim: telefon kiritish (12 soatda 1 SMS)
  | "forgot-reset";    // Parolni unutdim: SMS kod + yangi parol

export function AuthModal() {
  const {
    isAuthModalOpen,
    closeAuthModal,
    loginWithPassword,
    sendOtp,
    verifyOtp,
    forgotPasswordOtp,
    resetPassword,
  } = useCustomerAuth();
  const { lang, t } = useI18n();

  const [mode, setMode] = useState<AuthMode>("login");
  const [phone, setPhone] = useState("+998 ");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Registration fields
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [organization, setOrganization] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [showRegPassword, setShowRegPassword] = useState(false);

  // Forgot password fields
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [infoMessage, setInfoMessage] = useState("");
  const [resendTimer, setResendTimer] = useState(0);

  // Telefon raqamni formatlash (+998 XX XXX XX XX)
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

  // Timer countdown
  useEffect(() => {
    if (resendTimer <= 0) return;
    const interval = setInterval(() => {
      setResendTimer((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendTimer]);

  // Har rejim o'zgarganda yoki modal ochilganda kod va xatoni tozalash
  useEffect(() => {
    setCode("");
    setError("");
  }, [mode]);

  useEffect(() => {
    if (isAuthModalOpen) {
      setCode("");
      setError("");
      setInfoMessage("");
    }
  }, [isAuthModalOpen]);

  if (!isAuthModalOpen) return null;

  const handleClose = () => {
    setError("");
    setInfoMessage("");
    setLoading(false);
    setCode("");
    setPassword("");
    setRegPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setMode("login");
    closeAuthModal();
  };

  const isPhoneValid = () => phone.replace(/[^\d]/g, "").length === 12;

  // 1. KIRISH: Telefon + Parol
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isPhoneValid()) {
      setError(
        lang === "ru"
          ? "Введите корректный номер телефона"
          : "Telefon raqamingizni to'liq kiriting (masalan: +998 90 123 45 67)"
      );
      return;
    }
    if (!password) {
      setError(lang === "ru" ? "Введите пароль" : "Parolingizni kiriting");
      return;
    }

    setError("");
    setInfoMessage("");
    setLoading(true);
    try {
      await loginWithPassword(phone, password);
      handleClose();
    } catch (err: any) {
      setError(err.message || (lang === "ru" ? "Неверный телефон или пароль" : "Telefon raqami yoki parol noto'g'ri"));
    } finally {
      setLoading(false);
    }
  };

  // 2. RO'YXATDAN O'TISH: SMS kod so'rash
  const handleRequestRegOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!isPhoneValid()) {
      setError(
        lang === "ru"
          ? "Введите корректный номер телефона"
          : "Telefon raqamingizni to'liq kiriting"
      );
      return;
    }

    setError("");
    setInfoMessage("");
    setLoading(true);
    try {
      const res = await sendOtp(phone);
      setMode("register-verify");
      setResendTimer(res.resendIn || 60);
    } catch (err: any) {
      setError(err.message || (lang === "ru" ? "Ошибка при отправке SMS" : "SMS yuborishda xatolik yuz berdi"));
    } finally {
      setLoading(false);
    }
  };

  // 3. RO'YXATDAN O'TISH: Kodni tekshirish va akkaunt yaratish
  const handleVerifyRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.trim().length !== 6) {
      setError(lang === "ru" ? "Введите 6-значный SMS-код" : "SMS orqali kelgan 6 xonali kodni kiriting");
      return;
    }
    if (!name.trim()) {
      setError(lang === "ru" ? "Введите ваше имя" : "Iltimos, ismingizni kiriting");
      return;
    }
    if (!regPassword || regPassword.length < 6) {
      setError(
        lang === "ru"
          ? "Пароль должен содержать не менее 6 символов"
          : "Parol kamida 6 ta belgidan iborat bo'lishi kerak"
      );
      return;
    }

    setError("");
    setLoading(true);
    try {
      await verifyOtp({
        phone,
        code: code.trim(),
        name: name.trim(),
        organization: organization.trim() || undefined,
        password: regPassword,
      });
      handleClose();
    } catch (err: any) {
      setError(err.message || (lang === "ru" ? "Ошибка подтверждения" : "Tasdiqlashda xatolik yuz berdi"));
    } finally {
      setLoading(false);
    }
  };

  // 4. PAROLNI UNUTDIM: 12 soatlik limit bilan SMS kod so'rash
  const handleRequestForgotOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!isPhoneValid()) {
      setError(lang === "ru" ? "Введите номер телефона" : "Telefon raqamingizni to'liq kiriting");
      return;
    }

    setError("");
    setInfoMessage("");
    setLoading(true);
    try {
      const res = await forgotPasswordOtp(phone);
      setInfoMessage(
        res.message ||
          (lang === "ru"
            ? "SMS-код для восстановления отправлен на ваш номер"
            : "Parolni tiklash kodi telefoningizga yuborildi")
      );
      setMode("forgot-reset");
      setResendTimer(60);
    } catch (err: any) {
      setError(err.message || (lang === "ru" ? "Ошибка при отправке SMS" : "SMS yuborishda xatolik"));
    } finally {
      setLoading(false);
    }
  };

  // 5. PAROLNI UNUTDIM: Kod va yangi parolni tasdiqlash
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.trim().length !== 6) {
      setError(lang === "ru" ? "Введите 6-значный SMS-код" : "SMS orqali kelgan 6 xonali kodni kiriting");
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      setError(
        lang === "ru"
          ? "Новый пароль должен содержать не менее 6 символов"
          : "Yangi parol kamida 6 ta belgidan iborat bo'lishi kerak"
      );
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(lang === "ru" ? "Пароли не совпадают" : "Kiritilgan yangi parollar bir xil emas");
      return;
    }

    setError("");
    setLoading(true);
    try {
      await resetPassword({
        phone,
        code: code.trim(),
        newPassword,
      });
      handleClose();
    } catch (err: any) {
      setError(err.message || (lang === "ru" ? "Ошибка при смене пароля" : "Parolni tiklashda xatolik yuz berdi"));
    } finally {
      setLoading(false);
    }
  };

  const isForgotMode = mode === "forgot-phone" || mode === "forgot-reset";
  const isRegisterMode = mode === "register-phone" || mode === "register-verify";
  const isLoginMode = mode === "login";

  return (
    <div className="modal-backdrop" onClick={handleClose} role="dialog" aria-modal="true">
      <div className="auth-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 440, padding: "26px 24px" }}>
        {/* Yopish tugmasi */}
        <button className="modal-close-btn" onClick={handleClose} aria-label={t("auth_modal_close")}>
          ✕
        </button>

        {/* Modal Header */}
        <div className="auth-header" style={{ textAlign: "center", marginBottom: 18 }}>
          <MedaxLogo size="sm" />
          <h2 style={{ fontSize: 20, margin: "10px 0 4px", fontWeight: 700, color: "var(--ink, #0f172a)" }}>
            {isForgotMode
              ? (lang === "ru" ? "Восстановление пароля" : "Parolni tiklash")
              : isRegisterMode
              ? (lang === "ru" ? "Регистрация нового клиента" : "Yangi mijozni ro'yxatdan o'tkazish")
              : (lang === "ru" ? "Вход в личный кабинет" : "Shaxsiy kabinetga kirish")}
          </h2>
          <p className="auth-sub" style={{ fontSize: 13, color: "var(--ink2, #64748b)", margin: 0 }}>
            {isForgotMode
              ? (lang === "ru"
                  ? "SMS-код будет отправлен на подтвержденный номер (1 раз в 12 часов)"
                  : "Parolni tiklash kodi tasdiqlangan raqamga boradi (12 soatda 1 marta)")
              : isRegisterMode
              ? (lang === "ru"
                  ? "Создайте аккаунт для отслеживания заказов и скидок"
                  : "Buyurtmalarni kuzatish uchun yangi hisob oching")
              : (lang === "ru"
                  ? "Введите номер телефона и пароль для входа"
                  : "Tizimga kirish uchun raqamingiz va parolingizni kiriting")}
          </p>
        </div>

        {/* Tab switchers: Faqat Kirish va Ro'yxatdan o'tish holatida ko'rsatiladi */}
        {!isForgotMode && (
          <div
            style={{
              display: "flex",
              background: "rgba(100, 116, 139, 0.08)",
              borderRadius: 10,
              padding: 4,
              marginBottom: 16,
            }}
          >
            <button
              type="button"
              onClick={() => {
                setError("");
                setInfoMessage("");
                setMode("login");
              }}
              style={{
                flex: 1,
                padding: "8px 0",
                fontSize: 14,
                fontWeight: 600,
                border: "none",
                borderRadius: 8,
                background: isLoginMode ? "#fff" : "transparent",
                color: isLoginMode ? "var(--teal, #0d9488)" : "var(--ink2, #64748b)",
                boxShadow: isLoginMode ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
            >
              {lang === "ru" ? "Вход" : "Kirish"}
            </button>
            <button
              type="button"
              onClick={() => {
                setError("");
                setInfoMessage("");
                setMode("register-phone");
              }}
              style={{
                flex: 1,
                padding: "8px 0",
                fontSize: 14,
                fontWeight: 600,
                border: "none",
                borderRadius: 8,
                background: isRegisterMode ? "#fff" : "transparent",
                color: isRegisterMode ? "var(--teal, #0d9488)" : "var(--ink2, #64748b)",
                boxShadow: isRegisterMode ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
            >
              {lang === "ru" ? "Регистрация" : "Ro'yxatdan o'tish"}
            </button>
          </div>
        )}

        {/* Xatolik xabari */}
        {error && (
          <div
            className="err auth-alert"
            style={{
              padding: "10px 14px",
              background: "#fee2e2",
              color: "#b91c1c",
              borderRadius: 10,
              fontSize: 13,
              marginBottom: 14,
              border: "1px solid #fca5a5",
              lineHeight: 1.4,
            }}
          >
            {error}
            {error.includes("allaqachon ro'yxatdan o'tgan") && (
              <div style={{ marginTop: 8 }}>
                <button
                  type="button"
                  onClick={() => {
                    setError("");
                    setMode("login");
                  }}
                  style={{
                    background: "var(--teal, #0d9488)",
                    color: "#fff",
                    border: "none",
                    padding: "5px 12px",
                    borderRadius: 6,
                    fontSize: 12.5,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  {lang === "ru" ? "Войти с паролем →" : "Kirish oynasiga o'tish →"}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Ma'lumot xabari */}
        {infoMessage && (
          <div
            style={{
              padding: "10px 14px",
              background: "#f0fdf4",
              color: "#166534",
              borderRadius: 10,
              fontSize: 13,
              marginBottom: 14,
              border: "1px solid #bbf7d0",
              lineHeight: 1.4,
            }}
          >
            {infoMessage}
          </div>
        )}

        {/* ============================================================== */}
        {/* 1. KIRISH OQIMI (Telefon + Parol)                              */}
        {/* ============================================================== */}
        {mode === "login" && (
          <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: "var(--ink, #0f172a)", marginBottom: 6 }}>
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
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <label style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink, #0f172a)" }}>
                  {lang === "ru" ? "Пароль" : "Parolingiz"}
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setError("");
                    setInfoMessage("");
                    setMode("forgot-phone");
                  }}
                  style={{
                    background: "none",
                    border: "none",
                    fontSize: 12,
                    color: "var(--teal, #0d9488)",
                    cursor: "pointer",
                    textDecoration: "underline",
                    padding: 0,
                  }}
                >
                  {lang === "ru" ? "Забыли пароль?" : "Parolni unutdingizmi?"}
                </button>
              </div>
              <div style={{ position: "relative" }}>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  style={{
                    width: "100%",
                    height: 44,
                    padding: "0 40px 0 14px",
                    fontSize: 15,
                    borderRadius: 10,
                    border: "1.5px solid var(--line, #cbd5e1)",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: "absolute",
                    right: 10,
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    fontSize: 16,
                    cursor: "pointer",
                    color: "var(--ink2, #64748b)",
                  }}
                  title={showPassword ? "Yashirish" : "Ko'rsatish"}
                >
                  {showPassword ? "🙈" : "👁️"}
                </button>
              </div>
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
              {loading ? (lang === "ru" ? "Вход..." : "Kirilmoqda...") : (lang === "ru" ? "Войти" : "Kirish")}
            </button>

            <div style={{ textAlign: "center", marginTop: 4 }}>
              <span style={{ fontSize: 13, color: "var(--ink2, #64748b)" }}>
                {lang === "ru" ? "Нет аккаунта? " : "Hisobingiz yo'qmi? "}
              </span>
              <button
                type="button"
                onClick={() => {
                  setError("");
                  setInfoMessage("");
                  setMode("register-phone");
                }}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: 13,
                  fontWeight: 600,
                  color: "var(--teal, #0d9488)",
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                {lang === "ru" ? "Зарегистрироваться" : "Ro'yxatdan o'tish"}
              </button>
            </div>
          </form>
        )}

        {/* ============================================================== */}
        {/* 2. RO'YXATDAN O'TISH: TELEFON KIRITISH                          */}
        {/* ============================================================== */}
        {mode === "register-phone" && (
          <form onSubmit={handleRequestRegOtp} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: "var(--ink, #0f172a)", marginBottom: 6 }}>
                {lang === "ru" ? "Номер телефона для регистрации" : "Ro'yxatdan o'tish uchun telefon raqam"}
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
              <span style={{ display: "block", fontSize: 12, color: "var(--ink2, #64748b)", marginTop: 4 }}>
                {lang === "ru"
                  ? "На этот номер будет отправлен SMS-код подтверждения."
                  : "Ushbu raqamga tasdiqlash uchun SMS kod yuboriladi."}
              </span>
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
          </form>
        )}

        {/* ============================================================== */}
        {/* 3. RO'YXATDAN O'TISH: SMS KOD + ISM + PAROL                    */}
        {/* ============================================================== */}
        {mode === "register-verify" && (
          <form onSubmit={handleVerifyRegister} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ background: "rgba(13, 148, 136, 0.08)", padding: "8px 12px", borderRadius: 8, fontSize: 13, color: "var(--teal, #0d9488)" }}>
              {lang === "ru"
                ? `Код отправлен на ${phone}`
                : `Tasdiqlash kodi ${phone} raqamiga yuborildi`}
            </div>

            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--ink, #0f172a)", marginBottom: 4 }}>
                {lang === "ru" ? "6-значный SMS-код" : "6 xonali SMS kod"} *
              </label>
              <input
                type="text"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                placeholder="------"
                required
                autoFocus
                style={{
                  width: "100%",
                  height: 44,
                  textAlign: "center",
                  fontSize: 20,
                  fontWeight: 700,
                  letterSpacing: 6,
                  borderRadius: 8,
                  border: "1.5px solid var(--teal, #0d9488)",
                  outline: "none",
                  boxSizing: "border-box",
                  opacity: code ? 1 : 0.85,
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--ink, #0f172a)", marginBottom: 4 }}>
                {lang === "ru" ? "Ваше имя" : "Ismingiz"} *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={lang === "ru" ? "Например, Доктор Алишер" : "Masalan: Alisher"}
                required
                style={{
                  width: "100%",
                  height: 38,
                  padding: "0 12px",
                  fontSize: 14,
                  borderRadius: 8,
                  border: "1px solid var(--line, #cbd5e1)",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--ink, #0f172a)", marginBottom: 4 }}>
                {lang === "ru" ? "Придумайте пароль (мин. 6 символов)" : "Yangi parol belgilang (kamida 6 ta belgi)"} *
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type={showRegPassword ? "text" : "password"}
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  style={{
                    width: "100%",
                    height: 38,
                    padding: "0 36px 0 12px",
                    fontSize: 14,
                    borderRadius: 8,
                    border: "1px solid var(--line, #cbd5e1)",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowRegPassword(!showRegPassword)}
                  style={{
                    position: "absolute",
                    right: 8,
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    fontSize: 14,
                    cursor: "pointer",
                  }}
                >
                  {showRegPassword ? "🙈" : "👁️"}
                </button>
              </div>
            </div>

            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "var(--ink2, #64748b)", marginBottom: 4 }}>
                {lang === "ru" ? "Организация / Клиника (необязательно)" : "Tashkilot / Klinika nomi (ixtiyoriy)"}
              </label>
              <input
                type="text"
                value={organization}
                onChange={(e) => setOrganization(e.target.value)}
                placeholder={lang === "ru" ? "Клиника MedLife" : "Masalan: MedLife klinikasi"}
                style={{
                  width: "100%",
                  height: 38,
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
                height: 44,
                fontSize: 15,
                fontWeight: 600,
                borderRadius: 10,
                background: "var(--teal, #0d9488)",
                color: "#fff",
                border: "none",
                cursor: loading ? "wait" : "pointer",
                marginTop: 6,
              }}
            >
              {loading
                ? (lang === "ru" ? "Регистрация..." : "Ro'yxatdan o'tilmoqda...")
                : (lang === "ru" ? "Завершить регистрацию" : "Ro'yxatdan o'tish")}
            </button>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, marginTop: 4 }}>
              <button
                type="button"
                onClick={() => {
                  setError("");
                  setCode("");
                  setMode("register-phone");
                }}
                style={{ background: "none", border: "none", color: "var(--ink2, #64748b)", cursor: "pointer", padding: 0 }}
              >
                {lang === "ru" ? "← Другой номер" : "← Boshqa raqam"}
              </button>

              {resendTimer > 0 ? (
                <span style={{ color: "var(--ink2, #94a3b8)" }}>
                  {lang === "ru" ? `Повтор через ${resendTimer}с` : `Qayta yuborish (${resendTimer}s)`}
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => handleRequestRegOtp()}
                  style={{ background: "none", border: "none", color: "var(--teal, #0d9488)", fontWeight: 600, cursor: "pointer", padding: 0 }}
                >
                  {lang === "ru" ? "Отправить код снова" : "Kodni qayta yuborish"}
                </button>
              )}
            </div>
          </form>
        )}

        {/* ============================================================== */}
        {/* 4. PAROLNI UNUTDIM: TELEFON KIRITISH (12 soatda 1 marta limit)  */}
        {/* ============================================================== */}
        {mode === "forgot-phone" && (
          <form onSubmit={handleRequestForgotOtp} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: "var(--ink, #0f172a)", marginBottom: 6 }}>
                {lang === "ru" ? "Зарегистрированный номер телефона" : "Ro'yxatdan o'tgan telefon raqamingiz"}
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
              <span style={{ display: "block", fontSize: 12, color: "var(--ink2, #64748b)", marginTop: 6, lineHeight: 1.4 }}>
                {lang === "ru"
                  ? "В целях безопасности SMS-код для сброса пароля отправляется не чаще 1 раза в 12 часов."
                  : "Xavfsizlik maqsadida parolni tiklash kodi 12 soatda faqat 1 marta yuboriladi."}
              </span>
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
                : (lang === "ru" ? "Отправить код для сброса" : "Tiklash kodini yuborish")}
            </button>

            <div style={{ textAlign: "center", marginTop: 4 }}>
              <button
                type="button"
                onClick={() => {
                  setError("");
                  setInfoMessage("");
                  setMode("login");
                }}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: 13,
                  color: "var(--teal, #0d9488)",
                  cursor: "pointer",
                }}
              >
                {lang === "ru" ? "← Вернуться ко входу" : "← Kirish oynasiga qaytish"}
              </button>
            </div>
          </form>
        )}

        {/* ============================================================== */}
        {/* 5. PAROLNI UNUTDIM: SMS KOD + YANGI PAROL                      */}
        {/* ============================================================== */}
        {mode === "forgot-reset" && (
          <form onSubmit={handleResetPassword} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--ink, #0f172a)", marginBottom: 4 }}>
                {lang === "ru" ? "6-значный SMS-код" : "6 xonali SMS kod"} *
              </label>
              <input
                type="text"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                placeholder="------"
                required
                autoFocus
                style={{
                  width: "100%",
                  height: 44,
                  textAlign: "center",
                  fontSize: 20,
                  fontWeight: 700,
                  letterSpacing: 6,
                  borderRadius: 8,
                  border: "1.5px solid var(--teal, #0d9488)",
                  outline: "none",
                  boxSizing: "border-box",
                  opacity: code ? 1 : 0.85,
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--ink, #0f172a)", marginBottom: 4 }}>
                {lang === "ru" ? "Новый пароль (мин. 6 символов)" : "Yangi parol (kamida 6 ta belgi)"} *
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  style={{
                    width: "100%",
                    height: 38,
                    padding: "0 36px 0 12px",
                    fontSize: 14,
                    borderRadius: 8,
                    border: "1px solid var(--line, #cbd5e1)",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  style={{
                    position: "absolute",
                    right: 8,
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    fontSize: 14,
                    cursor: "pointer",
                  }}
                >
                  {showNewPassword ? "🙈" : "👁️"}
                </button>
              </div>
            </div>

            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--ink, #0f172a)", marginBottom: 4 }}>
                {lang === "ru" ? "Подтвердите новый пароль" : "Yangi parolni takrorlang"} *
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                style={{
                  width: "100%",
                  height: 38,
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
                height: 44,
                fontSize: 15,
                fontWeight: 600,
                borderRadius: 10,
                background: "var(--teal, #0d9488)",
                color: "#fff",
                border: "none",
                cursor: loading ? "wait" : "pointer",
                marginTop: 6,
              }}
            >
              {loading
                ? (lang === "ru" ? "Обновление..." : "Yangilanmoqda...")
                : (lang === "ru" ? "Сохранить и войти" : "Parolni yangilash va kirish")}
            </button>

            <div style={{ textAlign: "center", marginTop: 4 }}>
              <button
                type="button"
                onClick={() => {
                  setError("");
                  setInfoMessage("");
                  setMode("login");
                }}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: 12.5,
                  color: "var(--ink2, #64748b)",
                  cursor: "pointer",
                }}
              >
                {lang === "ru" ? "← Отмена и вход" : "← Bekor qilish va kirish"}
              </button>
            </div>
          </form>
        )}

        <div
          className="auth-footer-note"
          style={{
            textAlign: "center",
            marginTop: 18,
            fontSize: 11.5,
            color: "var(--ink2, #94a3b8)",
          }}
        >
          {lang === "ru"
            ? "Безопасный доступ к Medax с защитой от SMS-спама"
            : "Medax tibbiyot uskunalari markazi — xavfsiz va himoyalangan tizim"}
        </div>
      </div>
    </div>
  );
}
