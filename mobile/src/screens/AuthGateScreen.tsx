import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useI18n } from "../context/I18nContext";
import {
  sendCustomerOtp,
  verifyCustomerOtp,
  loginCustomerWithPassword,
  sendForgotPasswordOtp,
  resetCustomerPassword,
} from "../api";
import { MedaxEmblem, EyeIcon, EyeOffIcon } from "../components/Icons";
import { SuccessModal } from "../components/SuccessModal";

interface AuthGateScreenProps {
  onContinue: () => void;
}

export function AuthGateScreen({ onContinue }: AuthGateScreenProps) {
  const insets = useSafeAreaInsets();
  const { loginWithToken } = useAuth();
  const { colors, theme } = useTheme();
  const { t } = useI18n();
  const scrollRef = useRef<ScrollView>(null);

  // Tab: "login" (parol bilan kirish), "register" (yangi ro'yxatdan o'tish) yoki "forgot" (parolni tiklash)
  const [tab, setTab] = useState<"login" | "register" | "forgot">("login");
  const [step, setStep] = useState<"phone" | "otp" | "set_password">("phone");

  const [phone, setPhone] = useState("+998 ");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Forgot password state
  const [forgotStep, setForgotStep] = useState<"phone" | "reset">("phone");
  const [forgotPhone, setForgotPhone] = useState("+998 ");
  const [forgotOtp, setForgotOtp] = useState("");
  const [forgotNewPassword, setForgotNewPassword] = useState("");
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState("");
  const [showForgotNewPassword, setShowForgotNewPassword] = useState(false);
  const [showForgotConfirmPassword, setShowForgotConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);

  // Chiroyli muvaffaqiyat modal oynasi
  const [successInfo, setSuccessInfo] = useState<{ visible: boolean; title: string; message: string }>({
    visible: false,
    title: "",
    message: "",
  });

  // Countdown timer for SMS resend
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => setCountdown((c) => (c > 1 ? c - 1 : 0)), 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const scrollToInput = (yOffset = 260) => {
    setTimeout(() => {
      scrollRef.current?.scrollTo({ y: yOffset, animated: true });
    }, 120);
  };

  const formatPhone = (text: string) => {
    let raw = text.replace(/[^\d+]/g, "");
    if (!raw.startsWith("+998")) raw = "+998" + raw.replace("+", "");
    if (raw.length > 13) raw = raw.slice(0, 13);
    setPhone(raw);
  };

  // 1. Parol orqali kirish (Mavjud mijozlar uchun)
  const handlePasswordLogin = async () => {
    const clean = phone.replace(/[^\d+]/g, "");
    if (clean.length < 13) {
      Alert.alert(t("error"), "Iltimos, telefon raqamingizni to'liq kiriting");
      return;
    }
    if (!password.trim()) {
      Alert.alert(t("error"), "Parolingizni kiriting");
      return;
    }
    setLoading(true);
    try {
      const res = await loginCustomerWithPassword(clean, password);
      if (res.ok && res.token && res.customer) {
        await loginWithToken(res.token, res.customer);
        setSuccessInfo({
          visible: true,
          title: t("auth_success_title"),
          message: `${t("auth_welcome")}, ${res.customer.name}!`,
        });
      } else {
        Alert.alert(
          t("error"),
          res.error || "Telefon raqam yoki parol noto'g'ri. Agar parolingiz bo'lmasa, Ro'yxatdan o'tish bo'limidan foydalaning."
        );
      }
    } catch {
      Alert.alert(t("error"), "Tarmoqda xatolik yuz berdi");
    } finally {
      setLoading(false);
    }
  };

  // 2. Yangi ro'yxatdan o'tish: SMS kod yuborish
  const handleSendOtp = async () => {
    const clean = phone.replace(/[^\d+]/g, "");
    if (clean.length < 13) {
      Alert.alert(t("error"), "Iltimos, to'liq telefon raqamingizni kiriting (+998 XX XXX XX XX)");
      return;
    }
    setLoading(true);
    try {
      const res = await sendCustomerOtp(clean);
      if (res.ok) {
        setCountdown(res.resendIn || 60);
        setCode("");
        setStep("otp");
      } else {
        if (res.error && res.error.includes("allaqachon ro'yxatdan o'tgan")) {
          Alert.alert(
            "Akkaunt mavjud",
            "Ushbu raqam allaqachon ro'yxatdan o'tgan. Iltimos, 'Kirish' bo'limi orqali parolingiz bilan kiring."
          );
          setTab("login");
          setStep("phone");
        } else {
          Alert.alert(t("error"), res.error || "SMS yuborishda xatolik yuz berdi");
        }
      }
    } catch {
      Alert.alert(t("error"), "Internet aloqasini tekshiring");
    } finally {
      setLoading(false);
    }
  };

  // 3. SMS kodni tasdiqlash -> Parol o'rnatish oynasiga o'tish
  const handleVerifyOtp = async () => {
    if (code.trim().length !== 6) {
      Alert.alert(t("error"), "Iltimos, 6 xonali tasdiqlash kodini to'liq kiriting");
      return;
    }
    setNewPassword("");
    setConfirmPassword("");
    setStep("set_password");
  };

  // 4. Parol o'rnatish va ro'yxatdan o'tishni yakunlash (Parol tasdiqlanishi shart)
  const handleSetPasswordAndFinish = async () => {
    if (newPassword.length < 6) {
      Alert.alert(t("error"), "Parol kamida 6 ta belgidan iborat bo'lishi kerak");
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert(t("error"), "Kiritilgan parollar bir-biriga mos kelmadi. Iltimos, tekshirib qayta tering.");
      return;
    }

    setLoading(true);
    try {
      const res = await verifyCustomerOtp(phone, code, name, newPassword);
      if (res.ok && res.token && res.customer) {
        await loginWithToken(res.token, res.customer);
        setSuccessInfo({
          visible: true,
          title: t("auth_success_title"),
          message: `${t("auth_welcome")}, ${res.customer.name}! Akkauntingiz muvaffaqiyatli yaratildi.`,
        });
      } else {
        Alert.alert(t("error"), res.error || "Xatolik yuz berdi");
      }
    } catch {
      Alert.alert(t("error"), "Tarmoqda xatolik yuz berdi");
    } finally {
      setLoading(false);
    }
  };

  // 5. Parolni unutganlar uchun SMS yuborish
  const handleForgotSendOtp = async () => {
    const clean = forgotPhone.replace(/[^\d+]/g, "");
    if (clean.length < 13) {
      Alert.alert(t("error"), "Iltimos, to'liq telefon raqamingizni kiriting (+998 XX XXX XX XX)");
      return;
    }
    setLoading(true);
    try {
      const res = await sendForgotPasswordOtp(clean);
      if (res.ok) {
        setCountdown(60);
        setForgotOtp("");
        setForgotStep("reset");
        Alert.alert("SMS yuborildi", "Telefon raqamingizga 6 xonali tasdiqlash kodi yuborildi.");
      } else {
        Alert.alert(t("error"), res.error || "SMS yuborishda xatolik yuz berdi");
      }
    } catch {
      Alert.alert(t("error"), "Internet aloqasini tekshiring");
    } finally {
      setLoading(false);
    }
  };

  // 6. Yangi parol o'rnatish va kirish
  const handleForgotResetPassword = async () => {
    if (forgotOtp.trim().length !== 6) {
      Alert.alert(t("error"), "Iltimos, 6 xonali tasdiqlash kodini to'liq kiriting");
      return;
    }
    if (forgotNewPassword.length < 6) {
      Alert.alert(t("error"), "Yangi parol kamida 6 ta belgidan iborat bo'lishi kerak");
      return;
    }
    if (forgotNewPassword !== forgotConfirmPassword) {
      Alert.alert(t("error"), "Kiritilgan yangi parollar bir-biriga mos kelmadi");
      return;
    }
    setLoading(true);
    try {
      const res = await resetCustomerPassword(forgotPhone, forgotOtp, forgotNewPassword);
      if (res.ok && res.token && res.customer) {
        await loginWithToken(res.token, res.customer);
        setSuccessInfo({
          visible: true,
          title: "Parol yangilandi!",
          message: `Hurmatli ${res.customer.name}, yangi parolingiz muvaffaqiyatli o'rnatildi va tizimga kirdingiz.`,
        });
      } else {
        Alert.alert(t("error"), res.error || "Parolni yangilashda xatolik yuz berdi");
      }
    } catch {
      Alert.alert(t("error"), "Tarmoqda xatolik yuz berdi");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.bg }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={[
          styles.container,
          {
            backgroundColor: colors.bg,
            paddingTop: insets.top + 16,
            paddingBottom: Math.max(insets.bottom, 24) + 60,
          },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Brand Header */}
        <View style={styles.topSection}>
          <MedaxEmblem size={60} />
          <View style={styles.brandTitleWrap}>
            <Text style={styles.brandMed}>Med</Text>
            <Text style={styles.brandAx}>ax</Text>
          </View>
          <Text style={[styles.tagline, { color: colors.primary }]}>MEDTEXNIKA MARKAZI</Text>
        </View>

        {/* Auth Mode Tabs (Kirish / Ro'yxatdan o'tish) */}
        {tab !== "forgot" ? (
          <View style={[styles.tabBar, { backgroundColor: colors.inputBg }]}>
            <TouchableOpacity
              style={[styles.tabBtn, tab === "login" && [styles.tabBtnActive, { backgroundColor: colors.card }]]}
              onPress={() => {
                setTab("login");
                setStep("phone");
                setCode("");
              }}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabBtnText, { color: colors.textMuted }, tab === "login" && { color: colors.primary, fontWeight: "700" }]}>
                🔑 Kirish
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabBtn, tab === "register" && [styles.tabBtnActive, { backgroundColor: colors.card }]]}
              onPress={() => {
                setTab("register");
                setStep("phone");
                setCode("");
              }}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabBtnText, { color: colors.textMuted }, tab === "register" && { color: colors.primary, fontWeight: "700" }]}>
                📝 Ro'yxatdan o'tish
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={{ width: "100%", marginBottom: 16 }}>
            <TouchableOpacity
              onPress={() => {
                setTab("login");
                setForgotStep("phone");
              }}
              style={{ flexDirection: "row", alignItems: "center", paddingVertical: 4 }}
            >
              <Text style={{ fontSize: 13, fontWeight: "700", color: colors.primary }}>
                ← Kirish oynasiga qaytish
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Main Card */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {/* TAB 1: KIRISH (Telefon + Parol) */}
          {tab === "login" && (
            <View style={styles.form}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>Shaxsiy kabinetga kirish</Text>
              <Text style={[styles.cardDesc, { color: colors.textMuted }]}>
                Oldingi buyurtmalaringiz va shaxsiy hisobingizga kirish uchun telefon raqamingiz va parolingizni kiriting.
              </Text>

              <Text style={[styles.inputLabel, { color: colors.textMuted }]}>Telefon raqamingiz</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
                value={phone}
                onChangeText={formatPhone}
                keyboardType="phone-pad"
                placeholder="+998 90 123 45 67"
                placeholderTextColor={colors.textMuted}
                onFocus={() => scrollToInput(100)}
              />

              <Text style={[styles.inputLabel, { color: colors.textMuted }]}>Parolingiz</Text>
              <View style={styles.passwordInputWrap}>
                <TextInput
                  style={[styles.input, styles.passwordInput, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  placeholder="Parolni kiriting"
                  placeholderTextColor={colors.textMuted}
                  onFocus={() => scrollToInput(220)}
                />
                <TouchableOpacity
                  style={styles.eyeBtn}
                  onPress={() => setShowPassword(!showPassword)}
                  activeOpacity={0.7}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  {showPassword ? <EyeOffIcon size={20} color={colors.textMuted} /> : <EyeIcon size={20} color={colors.textMuted} />}
                </TouchableOpacity>
              </View>

              <View style={{ flexDirection: "row", justifyContent: "flex-end", marginTop: 4, marginBottom: 12 }}>
                <TouchableOpacity
                  onPress={() => {
                    setTab("forgot");
                    setForgotPhone(phone);
                    setForgotStep("phone");
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={{ fontSize: 12.5, fontWeight: "700", color: colors.primary }}>
                    Parolni unutdingizmi?
                  </Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
                onPress={handlePasswordLogin}
                disabled={loading}
                activeOpacity={0.88}
              >
                {loading ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.primaryBtnText}>Kirish ✓</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.switchLink}
                onPress={() => {
                  setTab("register");
                  setStep("phone");
                }}
              >
                <Text style={[styles.switchLinkText, { color: colors.textMuted }]}>
                  Hisobingiz yo'qmi? <Text style={{ fontWeight: "800", color: colors.primary }}>Ro'yxatdan o'tish →</Text>
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* TAB 2: RO'YXATDAN O'TISH */}
          {tab === "register" && step === "phone" && (
            <View style={styles.form}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>Yangi akkaunt ochish</Text>
              <Text style={[styles.cardDesc, { color: colors.textMuted }]}>
                Tizimda ro'yxatdan o'tish uchun telefon raqamingiz va ismingizni kiriting. Tasdiqlash uchun SMS kod yuboriladi.
              </Text>

              <Text style={[styles.inputLabel, { color: colors.textMuted }]}>Telefon raqamingiz *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
                value={phone}
                onChangeText={formatPhone}
                keyboardType="phone-pad"
                placeholder="+998 90 123 45 67"
                placeholderTextColor={colors.textMuted}
                onFocus={() => scrollToInput(100)}
              />

              <Text style={[styles.inputLabel, { color: colors.textMuted }]}>Ism-familiyangiz (ixtiyoriy)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
                value={name}
                onChangeText={setName}
                placeholder="Masalan: Dr. Alisher"
                placeholderTextColor={colors.textMuted}
                onFocus={() => scrollToInput(300)}
              />

              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
                onPress={handleSendOtp}
                disabled={loading}
                activeOpacity={0.88}
              >
                {loading ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.primaryBtnText}>SMS kodni olish →</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.switchLink}
                onPress={() => setTab("login")}
              >
                <Text style={[styles.switchLinkText, { color: colors.textMuted }]}>
                  Oldin ro'yxatdan o'tganmisiz? <Text style={{ fontWeight: "800", color: colors.primary }}>Kirish</Text>
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* TAB 2: STEP 2 - SMS OTP */}
          {tab === "register" && step === "otp" && (
            <View style={styles.form}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>Tasdiqlash kodi</Text>
              <Text style={[styles.cardDesc, { color: colors.textMuted }]}>
                {phone} raqamiga yuborilgan 6 xonali SMS kodni kiriting
              </Text>

              <Text style={[styles.inputLabel, { color: colors.textMuted }]}>SMS kod (6 xonali)</Text>
              <TextInput
                style={[styles.input, styles.otpInput, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
                value={code}
                onChangeText={(v) => setCode(v.replace(/\D/g, ""))}
                keyboardType="number-pad"
                maxLength={6}
                placeholder="••••••"
                placeholderTextColor="#cbd5e1"
                autoFocus
                onFocus={() => scrollToInput(200)}
              />

              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
                onPress={handleVerifyOtp}
                disabled={loading}
                activeOpacity={0.88}
              >
                {loading ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.primaryBtnText}>Kodni tasdiqlash →</Text>
                )}
              </TouchableOpacity>

              <View style={styles.otpActions}>
                {countdown > 0 ? (
                  <Text style={[styles.timerText, { color: colors.textMuted }]}>Qayta yuborish: {countdown}s</Text>
                ) : (
                  <TouchableOpacity onPress={handleSendOtp}>
                    <Text style={[styles.resendText, { color: colors.primary }]}>Kodni qayta yuborish</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  onPress={() => {
                    setCode("");
                    setStep("phone");
                  }}
                >
                  <Text style={[styles.backLinkText, { color: colors.textMuted }]}>Raqamni o'zgartirish</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* TAB 2: STEP 3 - PAROL O'RNATISH (Qat'iy ikki marta teriladi) */}
          {tab === "register" && step === "set_password" && (
            <View style={styles.form}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>Doimiy parol o'rnatish</Text>
              <Text style={[styles.cardDesc, { color: colors.textMuted }]}>
                Akkauntingizga kelgusida SMS kutmasdan tezkor kirishingiz uchun mustahkam parol belgilang va tasdiqlang.
              </Text>

              <Text style={[styles.inputLabel, { color: colors.textMuted }]}>Parol (kamida 6 ta belgi) *</Text>
              <View style={styles.passwordInputWrap}>
                <TextInput
                  style={[styles.input, styles.passwordInput, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry={!showNewPassword}
                  placeholder="Yangi parolni kiriting"
                  placeholderTextColor={colors.textMuted}
                  autoFocus
                  onFocus={() => scrollToInput(240)}
                />
                <TouchableOpacity
                  style={styles.eyeBtn}
                  onPress={() => setShowNewPassword(!showNewPassword)}
                  activeOpacity={0.7}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  {showNewPassword ? <EyeOffIcon size={20} color={colors.textMuted} /> : <EyeIcon size={20} color={colors.textMuted} />}
                </TouchableOpacity>
              </View>

              <Text style={[styles.inputLabel, { color: colors.textMuted }]}>Parolni qayta tasdiqlang *</Text>
              <View style={styles.passwordInputWrap}>
                <TextInput
                  style={[styles.input, styles.passwordInput, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPassword}
                  placeholder="Parolni qayta tering"
                  placeholderTextColor={colors.textMuted}
                  onFocus={() => scrollToInput(300)}
                />
                <TouchableOpacity
                  style={styles.eyeBtn}
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  activeOpacity={0.7}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  {showConfirmPassword ? <EyeOffIcon size={20} color={colors.textMuted} /> : <EyeIcon size={20} color={colors.textMuted} />}
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
                onPress={handleSetPasswordAndFinish}
                disabled={loading}
                activeOpacity={0.88}
              >
                {loading ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.primaryBtnText}>Akkauntni yaratish va kirish ✓</Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* TAB 3: PAROLNI TIKLASH (FORGOT PASSWORD) */}
          {tab === "forgot" && forgotStep === "phone" && (
            <View style={styles.form}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>Parolni tiklash</Text>
              <Text style={[styles.cardDesc, { color: colors.textMuted }]}>
                Parolingizni unutdingizmi? Telefon raqamingizni kiriting va biz SMS orqali tasdiqlash kodini yuboramiz.
              </Text>

              <Text style={[styles.inputLabel, { color: colors.textMuted }]}>Telefon raqamingiz</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
                value={forgotPhone}
                onChangeText={(text) => {
                  let raw = text.replace(/[^\d+]/g, "");
                  if (!raw.startsWith("+998")) raw = "+998" + raw.replace("+", "");
                  if (raw.length > 13) raw = raw.slice(0, 13);
                  setForgotPhone(raw);
                }}
                keyboardType="phone-pad"
                placeholder="+998 90 123 45 67"
                placeholderTextColor={colors.textMuted}
                onFocus={() => scrollToInput(100)}
              />

              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
                onPress={handleForgotSendOtp}
                disabled={loading}
                activeOpacity={0.88}
              >
                {loading ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.primaryBtnText}>SMS kodni olish →</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.switchLink}
                onPress={() => setTab("login")}
              >
                <Text style={[styles.switchLinkText, { color: colors.primary, fontWeight: "700" }]}>
                  ← Kirish oynasiga qaytish
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {tab === "forgot" && forgotStep === "reset" && (
            <View style={styles.form}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>Yangi parol o'rnatish</Text>
              <Text style={[styles.cardDesc, { color: colors.textMuted }]}>
                {forgotPhone} raqamiga yuborilgan 6 xonali SMS kodni va yangi parolingizni kiriting.
              </Text>

              <Text style={[styles.inputLabel, { color: colors.textMuted }]}>SMS tasdiqlash kodi</Text>
              <TextInput
                style={[
                  styles.input,
                  styles.otpInput,
                  { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text },
                ]}
                value={forgotOtp}
                onChangeText={(v) => setForgotOtp(v.replace(/\D/g, ""))}
                keyboardType="number-pad"
                maxLength={6}
                placeholder="••••••"
                placeholderTextColor="#cbd5e1"
                autoFocus
                onFocus={() => scrollToInput(100)}
              />

              <Text style={[styles.inputLabel, { color: colors.textMuted }]}>Yangi parol (kamida 6 ta belgi)</Text>
              <View style={styles.passwordInputWrap}>
                <TextInput
                  style={[
                    styles.input,
                    styles.passwordInput,
                    { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text },
                  ]}
                  value={forgotNewPassword}
                  onChangeText={setForgotNewPassword}
                  secureTextEntry={!showForgotNewPassword}
                  placeholder="Yangi parolni kiriting"
                  placeholderTextColor={colors.textMuted}
                  onFocus={() => scrollToInput(200)}
                />
                <TouchableOpacity
                  style={styles.eyeBtn}
                  onPress={() => setShowForgotNewPassword(!showForgotNewPassword)}
                  activeOpacity={0.7}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  {showForgotNewPassword ? <EyeOffIcon size={20} color={colors.textMuted} /> : <EyeIcon size={20} color={colors.textMuted} />}
                </TouchableOpacity>
              </View>

              <Text style={[styles.inputLabel, { color: colors.textMuted }]}>Yangi parolni tasdiqlang</Text>
              <View style={styles.passwordInputWrap}>
                <TextInput
                  style={[
                    styles.input,
                    styles.passwordInput,
                    { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text },
                  ]}
                  value={forgotConfirmPassword}
                  onChangeText={setForgotConfirmPassword}
                  secureTextEntry={!showForgotConfirmPassword}
                  placeholder="Parolni qayta tering"
                  placeholderTextColor={colors.textMuted}
                  onFocus={() => scrollToInput(280)}
                />
                <TouchableOpacity
                  style={styles.eyeBtn}
                  onPress={() => setShowForgotConfirmPassword(!showForgotConfirmPassword)}
                  activeOpacity={0.7}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  {showForgotConfirmPassword ? <EyeOffIcon size={20} color={colors.textMuted} /> : <EyeIcon size={20} color={colors.textMuted} />}
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
                onPress={handleForgotResetPassword}
                disabled={loading}
                activeOpacity={0.88}
              >
                {loading ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.primaryBtnText}>Parolni yangilash va kirish ✓</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.switchLink}
                onPress={() => {
                  setTab("login");
                  setForgotStep("phone");
                }}
              >
                <Text style={[styles.switchLinkText, { color: colors.primary, fontWeight: "700" }]}>
                  ← Kirish oynasiga qaytish
                </Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={[styles.benefitsRow, { borderTopColor: colors.border }]}>
            <Text style={[styles.benefitText, { color: colors.textMuted }]}>🔒 100% xavfsiz SMS OTP</Text>
            <Text style={[styles.benefitText, { color: colors.textMuted }]}>⚡ Doimiy saqlanadigan profil</Text>
          </View>
        </View>

        {/* Bottom Guest Continue */}
        <View style={styles.bottomSection}>
          <TouchableOpacity style={styles.guestBtn} onPress={onContinue}>
            <Text style={[styles.guestBtnText, { color: colors.textMuted }]}>Ilovaga o'tish (Mehmon sifatida) →</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Chiroyli muvaffaqiyat modal oynasi */}
      <SuccessModal
        visible={successInfo.visible}
        title={successInfo.title}
        message={successInfo.message}
        buttonText={t("btn_continue")}
        onClose={() => {
          setSuccessInfo((prev) => ({ ...prev, visible: false }));
          onContinue();
        }}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: "#f8fafc", paddingHorizontal: 20 },
  topSection: { alignItems: "center", marginTop: 6, marginBottom: 16 },
  brandTitleWrap: { flexDirection: "row", marginTop: 8 },
  brandMed: { fontSize: 26, fontWeight: "900", color: "#0284c7" },
  brandAx: { fontSize: 26, fontWeight: "900", color: "#16a34a" },
  tagline: { fontSize: 9.5, fontWeight: "800", color: "#0284c7", letterSpacing: 0.8, marginTop: 2 },

  tabBar: {
    flexDirection: "row",
    backgroundColor: "#e2e8f0",
    borderRadius: 14,
    padding: 3,
    marginBottom: 16,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 11,
  },
  tabBtnActive: {
    backgroundColor: "#ffffff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  tabBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#64748b",
  },
  tabBtnTextActive: {
    color: "#0284c7",
  },

  card: {
    backgroundColor: "#ffffff",
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 3,
  },
  cardTitle: { fontSize: 18, fontWeight: "800", color: "#0f172a", textAlign: "center", marginBottom: 4 },
  cardDesc: { fontSize: 12.5, color: "#64748b", textAlign: "center", lineHeight: 17, marginBottom: 16 },

  form: { width: "100%" },
  inputLabel: { fontSize: 12, fontWeight: "700", color: "#475569", marginBottom: 5, marginTop: 4 },
  input: {
    backgroundColor: "#f8fafc",
    borderWidth: 1.5,
    borderColor: "#cbd5e1",
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 46,
    fontSize: 15,
    color: "#0f172a",
    marginBottom: 12,
  },
  passwordInputWrap: {
    position: "relative",
    justifyContent: "center",
    width: "100%",
    marginBottom: 12,
  },
  passwordInput: {
    marginBottom: 0,
    paddingRight: 48,
  },
  eyeBtn: {
    position: "absolute",
    right: 12,
    top: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
    padding: 6,
  },
  otpInput: {
    textAlign: "center",
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: 10,
    color: "#0284c7",
    borderColor: "#0284c7",
  },
  primaryBtn: {
    backgroundColor: "#0284c7",
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 6,
    shadowColor: "#0284c7",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryBtnText: { color: "#ffffff", fontSize: 15, fontWeight: "800" },

  switchLink: { marginTop: 14, alignItems: "center" },
  switchLinkText: { fontSize: 13, color: "#475569" },

  otpActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 14,
    paddingHorizontal: 4,
  },
  timerText: { fontSize: 12.5, color: "#94a3b8", fontWeight: "600" },
  resendText: { fontSize: 12.5, color: "#0284c7", fontWeight: "700" },
  backLinkText: { fontSize: 12.5, color: "#64748b", fontWeight: "600" },

  benefitsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  benefitText: { fontSize: 11, color: "#64748b", fontWeight: "600" },

  bottomSection: { alignItems: "center", marginTop: 18 },
  guestBtn: { paddingVertical: 10, paddingHorizontal: 16 },
  guestBtnText: { fontSize: 13, color: "#64748b", fontWeight: "600" },
});
