import React, { useState, useEffect } from "react";
import { useCustomerAuth } from "../customerAuth";
import { MedaxLogo } from "./MedaxLogo";
import { useI18n } from "../context/I18nContext";

type AuthMode =
  | "login"            // Kirish (Telefon + Parol)
  | "register-phone"   // Ro'yxatdan o'tish: telefon kiritish
  | "register-verify"  // Ro'yxatdan o'tish: SMS kod + Ism + Parol + Parol tasdig'i
  | "forgot-phone"     // Parolni tiklash: telefon kiritish
  | "forgot-reset";    // Parolni tiklash: SMS kod + yangi parol

function EyeIcon({ open }: { open: boolean }) {
  if (open) {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    );
  }
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

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
  const { t } = useI18n();

  const [mode, setMode] = useState<AuthMode>("login");
  const [phone, setPhone] = useState("+998 ");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Registration fields
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [organization, setOrganization] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirmPassword, setRegConfirmPassword] = useState("");
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
    setRegConfirmPassword("");
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
      setError(t("auth_err_phone"));
      return;
    }
    if (!password) {
      setError(t("auth_err_pwd"));
      return;
    }

    setError("");
    setInfoMessage("");
    setLoading(true);
    try {
      await loginWithPassword(phone, password);
      handleClose();
    } catch (err: any) {
      setError(err.message || t("auth_err_pwd"));
    } finally {
      setLoading(false);
    }
  };

  // 2. RO'YXATDAN O'TISH: SMS kod so'rash
  const handleRequestRegOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!isPhoneValid()) {
      setError(t("auth_err_phone"));
      return;
    }

    setError("");
    setInfoMessage("");
    setCode("");
    setLoading(true);
    try {
      const res = await sendOtp(phone);
      setCode("");
      setMode("register-verify");
      setResendTimer(res.resendIn || 60);
    } catch (err: any) {
      setError(err.message || t("auth_btn_sending"));
    } finally {
      setLoading(false);
    }
  };

  // 3. RO'YXATDAN O'TISH: Kodni tekshirish va akkaunt yaratish
  const handleVerifyRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.trim().length !== 6) {
      setError(t("auth_err_code"));
      return;
    }
    if (!name.trim()) {
      setError(t("auth_err_name"));
      return;
    }
    if (!regPassword || regPassword.length < 6) {
      setError(t("auth_err_min_pwd"));
      return;
    }
    if (regPassword !== regConfirmPassword) {
      setError(t("auth_err_pwd_match"));
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
      setError(err.message || t("auth_btn_sending"));
    } finally {
      setLoading(false);
    }
  };

  // 4. PAROLNI UNUTDIM: SMS kod so'rash
  const handleRequestForgotOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!isPhoneValid()) {
      setError(t("auth_err_phone"));
      return;
    }

    setError("");
    setInfoMessage("");
    setCode("");
    setLoading(true);
    try {
      const res = await forgotPasswordOtp(phone);
      setCode("");
      setInfoMessage(res.message || t("auth_code_sent_to"));
      setMode("forgot-reset");
      setResendTimer(res.resendIn || 60);
    } catch (err: any) {
      setError(err.message || t("auth_btn_sending"));
    } finally {
      setLoading(false);
    }
  };

  // 5. PAROLNI UNUTDIM: Kod va yangi parolni tasdiqlash
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.trim().length !== 6) {
      setError(t("auth_err_code"));
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      setError(t("auth_err_min_pwd"));
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(t("auth_err_pwd_match"));
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
      setError(err.message || t("auth_btn_sending"));
    } finally {
      setLoading(false);
    }
  };

  const isForgotMode = mode === "forgot-phone" || mode === "forgot-reset";
  const isRegisterMode = mode === "register-phone" || mode === "register-verify";
  const isLoginMode = mode === "login";

  return (
    <div className="modal-backdrop" onClick={handleClose} role="dialog" aria-modal="true" aria-labelledby="auth-modal-title">
      <div className="auth-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 440, padding: "26px 24px" }}>
        {/* Yopish tugmasi */}
        <button className="modal-close-btn" onClick={handleClose} aria-label={t("auth_modal_close")}>
          ✕
        </button>

        {/* Modal Header */}
        <div className="auth-header" style={{ textAlign: "center", marginBottom: 18 }}>
          <MedaxLogo size="sm" />
          <h2 id="auth-modal-title" style={{ fontSize: 20, margin: "10px 0 4px", fontWeight: 700, color: "var(--ink, #0f172a)" }}>
            {isForgotMode
              ? t("auth_forgot_title")
              : isRegisterMode
              ? t("auth_register_title")
              : t("auth_login_title")}
          </h2>
          <p className="auth-sub" style={{ fontSize: 13, color: "var(--ink2, #64748b)", margin: 0 }}>
            {isForgotMode
              ? t("auth_forgot_sub")
              : isRegisterMode
              ? t("auth_register_sub")
              : t("auth_login_sub")}
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
                background: isLoginMode ? "var(--surface-card, #fff)" : "transparent",
                color: isLoginMode ? "var(--teal, #0d9488)" : "var(--ink2, #64748b)",
                boxShadow: isLoginMode ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
            >
              {t("auth_tab_pwd")}
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
                background: isRegisterMode ? "var(--surface-card, #fff)" : "transparent",
                color: isRegisterMode ? "var(--teal, #0d9488)" : "var(--ink2, #64748b)",
                boxShadow: isRegisterMode ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
            >
              {t("auth_tab_reg")}
            </button>
          </div>
        )}

        {/* Xatolik xabari */}
        {error && (
          <div
            className="err auth-alert"
            role="alert"
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
            {(error.includes("allaqachon ro'yxatdan o'tgan") ||
              error.includes("уже зарегистрирован") ||
              error.includes("already registered")) && (
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
                    padding: "6px 14px",
                    borderRadius: 6,
                    fontSize: 12.5,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  {t("auth_tab_pwd")}
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
              <label htmlFor="login-phone" style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: "var(--ink, #0f172a)", marginBottom: 6 }}>
                {t("auth_phone_label")}
              </label>
              <input
                id="login-phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
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
                <label htmlFor="login-password" style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink, #0f172a)" }}>
                  {t("auth_pwd_label")}
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
                  {t("auth_forgot_pwd")}
                </button>
              </div>
              <div style={{ position: "relative" }}>
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
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
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  <EyeIcon open={showPassword} />
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
              {loading ? t("auth_btn_logging") : t("auth_btn_login")}
            </button>

            <div style={{ textAlign: "center", marginTop: 4 }}>
              <span style={{ fontSize: 13, color: "var(--ink2, #64748b)" }}>
                {t("auth_open_reg")}
              </span>{" "}
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
                {t("auth_tab_reg")}
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
              <label htmlFor="reg-phone" style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: "var(--ink, #0f172a)", marginBottom: 6 }}>
                {t("auth_phone_label")}
              </label>
              <input
                id="reg-phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
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
                {t("auth_reg_hint")}
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
              {loading ? t("auth_btn_sending") : t("auth_btn_get_sms")}
            </button>
          </form>
        )}

        {/* ============================================================== */}
        {/* 3. RO'YXATDAN O'TISH: SMS KOD + ISM + PAROL + TASDIQ           */}
        {/* ============================================================== */}
        {mode === "register-verify" && (
          <form onSubmit={handleVerifyRegister} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ background: "rgba(13, 148, 136, 0.08)", padding: "8px 12px", borderRadius: 8, fontSize: 13, color: "var(--teal, #0d9488)" }}>
              {t("auth_code_sent_to")}: {phone}
            </div>

            <div>
              <label htmlFor="reg-code" style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--ink, #0f172a)", marginBottom: 4 }}>
                {t("auth_enter_code")}
              </label>
              <input
                id="reg-code"
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                placeholder="••••••"
                required
                autoFocus
                autoComplete="one-time-code"
                style={{
                  width: "100%",
                  height: 44,
                  textAlign: "center",
                  fontSize: 22,
                  fontWeight: 700,
                  letterSpacing: 8,
                  borderRadius: 8,
                  border: "1.5px solid var(--teal, #0d9488)",
                  outline: "none",
                  boxSizing: "border-box",
                  color: "var(--ink, #0f172a)",
                }}
              />
            </div>

            <div>
              <label htmlFor="reg-name" style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--ink, #0f172a)", marginBottom: 4 }}>
                {t("auth_name_label")} *
              </label>
              <input
                id="reg-name"
                type="text"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("auth_name_ph")}
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
              <label htmlFor="reg-password" style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--ink, #0f172a)", marginBottom: 4 }}>
                {t("auth_new_pwd")} ({t("auth_min_chars")}) *
              </label>
              <div style={{ position: "relative" }}>
                <input
                  id="reg-password"
                  type={showRegPassword ? "text" : "password"}
                  autoComplete="new-password"
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
                    color: "var(--ink2, #64748b)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                  aria-label={showRegPassword ? "Hide password" : "Show password"}
                >
                  <EyeIcon open={showRegPassword} />
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="reg-confirm-password" style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--ink, #0f172a)", marginBottom: 4 }}>
                {t("auth_confirm_pwd")} *
              </label>
              <input
                id="reg-confirm-password"
                type="password"
                autoComplete="new-password"
                value={regConfirmPassword}
                onChange={(e) => setRegConfirmPassword(e.target.value)}
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

            <div>
              <label htmlFor="reg-org" style={{ display: "block", fontSize: 12, fontWeight: 500, color: "var(--ink2, #64748b)", marginBottom: 4 }}>
                {t("auth_org_label")}
              </label>
              <input
                id="reg-org"
                type="text"
                autoComplete="organization"
                value={organization}
                onChange={(e) => setOrganization(e.target.value)}
                placeholder={t("auth_org_ph")}
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
              {loading ? t("auth_btn_sending") : t("auth_btn_create")}
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
                ← {t("auth_diff_number")}
              </button>

              {resendTimer > 0 ? (
                <span style={{ color: "var(--ink2, #94a3b8)" }}>
                  {t("auth_resend")} {resendTimer}s
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => handleRequestRegOtp()}
                  style={{ background: "none", border: "none", color: "var(--teal, #0d9488)", fontWeight: 600, cursor: "pointer", padding: 0 }}
                >
                  {t("auth_resend_btn")}
                </button>
              )}
            </div>
          </form>
        )}

        {/* ============================================================== */}
        {/* 4. PAROLNI UNUTDIM: TELEFON KIRITISH                            */}
        {/* ============================================================== */}
        {mode === "forgot-phone" && (
          <form onSubmit={handleRequestForgotOtp} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label htmlFor="forgot-phone-input" style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: "var(--ink, #0f172a)", marginBottom: 6 }}>
                {t("auth_phone_label")}
              </label>
              <input
                id="forgot-phone-input"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
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
                {t("auth_forgot_sub")}
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
              {loading ? t("auth_btn_sending") : t("auth_forgot_send_btn")}
            </button>

            <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "center", marginTop: 4 }}>
              <button
                type="button"
                onClick={() => {
                  setError("");
                  setInfoMessage("");
                  setMode("forgot-reset");
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
                {t("auth_forgot_have_code")}
              </button>

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
                  padding: 0,
                }}
              >
                ← {t("auth_cancel_login")}
              </button>
            </div>
          </form>
        )}

        {/* ============================================================== */}
        {/* 5. PAROLNI UNUTDIM: SMS KOD + YANGI PAROL                      */}
        {/* ============================================================== */}
        {mode === "forgot-reset" && (
          <form onSubmit={handleResetPassword} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ background: "rgba(13, 148, 136, 0.08)", padding: "8px 12px", borderRadius: 8, fontSize: 13, color: "var(--teal, #0d9488)" }}>
              {t("auth_code_sent_to")}: {phone}
            </div>

            <div>
              <label htmlFor="forgot-code-input" style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--ink, #0f172a)", marginBottom: 4 }}>
                {t("auth_enter_code")} *
              </label>
              <input
                id="forgot-code-input"
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                placeholder="••••••"
                required
                autoFocus
                autoComplete="one-time-code"
                style={{
                  width: "100%",
                  height: 44,
                  textAlign: "center",
                  fontSize: 22,
                  fontWeight: 700,
                  letterSpacing: 8,
                  borderRadius: 8,
                  border: "1.5px solid var(--teal, #0d9488)",
                  outline: "none",
                  boxSizing: "border-box",
                  color: "var(--ink, #0f172a)",
                }}
              />
            </div>

            <div>
              <label htmlFor="forgot-new-pwd" style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--ink, #0f172a)", marginBottom: 4 }}>
                {t("auth_new_pwd")} ({t("auth_min_chars")}) *
              </label>
              <div style={{ position: "relative" }}>
                <input
                  id="forgot-new-pwd"
                  type={showNewPassword ? "text" : "password"}
                  autoComplete="new-password"
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
                    color: "var(--ink2, #64748b)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                  aria-label={showNewPassword ? "Hide password" : "Show password"}
                >
                  <EyeIcon open={showNewPassword} />
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="forgot-confirm-pwd" style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--ink, #0f172a)", marginBottom: 4 }}>
                {t("auth_confirm_pwd")} *
              </label>
              <input
                id="forgot-confirm-pwd"
                type="password"
                autoComplete="new-password"
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
              {loading ? t("auth_btn_sending") : t("auth_forgot_reset_btn")}
            </button>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, marginTop: 4 }}>
              <button
                type="button"
                onClick={() => {
                  setError("");
                  setCode("");
                  setMode("forgot-phone");
                }}
                style={{ background: "none", border: "none", color: "var(--ink2, #64748b)", cursor: "pointer", padding: 0 }}
              >
                ← {t("auth_diff_number")}
              </button>

              {resendTimer > 0 ? (
                <span style={{ color: "var(--ink2, #94a3b8)" }}>
                  {t("auth_resend")} {resendTimer}s
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => handleRequestForgotOtp()}
                  style={{ background: "none", border: "none", color: "var(--teal, #0d9488)", fontWeight: 600, cursor: "pointer", padding: 0 }}
                >
                  {t("auth_resend_btn")}
                </button>
              )}
            </div>

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
                ← {t("auth_cancel_login")}
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
          {t("auth_security_note")}
        </div>
      </div>
    </div>
  );
}
