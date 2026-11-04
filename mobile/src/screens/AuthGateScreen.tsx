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
import { useI18n } from "../context/I18nContext";
import { sendCustomerOtp, verifyCustomerOtp, loginCustomerWithPassword } from "../api";
import { MedaxEmblem, EyeIcon, EyeOffIcon } from "../components/Icons";
import { SuccessModal } from "../components/SuccessModal";

interface AuthGateScreenProps {
  onContinue: () => void;
}

export function AuthGateScreen({ onContinue }: AuthGateScreenProps) {
  const insets = useSafeAreaInsets();
  const { loginWithToken } = useAuth();
  const { t } = useI18n();
  const scrollRef = useRef<ScrollView>(null);

  // Tab: "login" (parol bilan kirish) yoki "register" (yangi ro'yxatdan o'tish)
  const [tab, setTab] = useState<"login" | "register">("login");
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

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: "#f8fafc" }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={[
          styles.container,
          {
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
          <Text style={styles.tagline}>RASMIY TIBBIY USKUNALAR MARKAZI</Text>
        </View>

        {/* Auth Mode Tabs (Kirish / Ro'yxatdan o'tish) */}
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tabBtn, tab === "login" && styles.tabBtnActive]}
            onPress={() => {
              setTab("login");
              setStep("phone");
              setCode("");
            }}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabBtnText, tab === "login" && styles.tabBtnTextActive]}>
              🔑 Kirish
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, tab === "register" && styles.tabBtnActive]}
            onPress={() => {
              setTab("register");
              setStep("phone");
              setCode("");
            }}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabBtnText, tab === "register" && styles.tabBtnTextActive]}>
              📝 Ro'yxatdan o'tish
            </Text>
          </TouchableOpacity>
        </View>

        {/* Main Card */}
        <View style={styles.card}>
          {/* TAB 1: KIRISH (Telefon + Parol) */}
          {tab === "login" && (
            <View style={styles.form}>
              <Text style={styles.cardTitle}>Shaxsiy kabinetga kirish</Text>
              <Text style={styles.cardDesc}>
                Oldingi buyurtmalaringiz va shaxsiy hisobingizga kirish uchun telefon raqamingiz va parolingizni kiriting.
              </Text>

              <Text style={styles.inputLabel}>Telefon raqamingiz</Text>
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={formatPhone}
                keyboardType="phone-pad"
                placeholder="+998 90 123 45 67"
                placeholderTextColor="#94a3b8"
                onFocus={() => scrollToInput(100)}
              />

              <Text style={styles.inputLabel}>Parolingiz</Text>
              <View style={styles.passwordInputWrap}>
                <TextInput
                  style={[styles.input, styles.passwordInput]}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  placeholder="Parolni kiriting"
                  placeholderTextColor="#94a3b8"
                  onFocus={() => scrollToInput(220)}
                />
                <TouchableOpacity
                  style={styles.eyeBtn}
                  onPress={() => setShowPassword(!showPassword)}
                  activeOpacity={0.7}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  {showPassword ? <EyeOffIcon size={20} color="#64748b" /> : <EyeIcon size={20} color="#64748b" />}
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.primaryBtn}
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
                <Text style={styles.switchLinkText}>
                  Hisobingiz yo'qmi? <Text style={{ fontWeight: "800", color: "#0284c7" }}>Ro'yxatdan o'tish →</Text>
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* TAB 2: RO'YXATDAN O'TISH */}
          {tab === "register" && step === "phone" && (
            <View style={styles.form}>
              <Text style={styles.cardTitle}>Yangi akkaunt ochish</Text>
              <Text style={styles.cardDesc}>
                Tizimda ro'yxatdan o'tish uchun telefon raqamingiz va ismingizni kiriting. Tasdiqlash uchun SMS kod yuboriladi.
              </Text>

              <Text style={styles.inputLabel}>Telefon raqamingiz *</Text>
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={formatPhone}
                keyboardType="phone-pad"
                placeholder="+998 90 123 45 67"
                placeholderTextColor="#94a3b8"
                onFocus={() => scrollToInput(100)}
              />

              <Text style={styles.inputLabel}>Ism-familiyangiz (ixtiyoriy)</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Masalan: Dr. Alisher"
                placeholderTextColor="#94a3b8"
                onFocus={() => scrollToInput(300)}
              />

              <TouchableOpacity
                style={styles.primaryBtn}
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
                <Text style={styles.switchLinkText}>
                  Oldin ro'yxatdan o'tganmisiz? <Text style={{ fontWeight: "800", color: "#0284c7" }}>Kirish</Text>
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* TAB 2: STEP 2 - SMS OTP */}
          {tab === "register" && step === "otp" && (
            <View style={styles.form}>
              <Text style={styles.cardTitle}>Tasdiqlash kodi</Text>
              <Text style={styles.cardDesc}>
                {phone} raqamiga yuborilgan 6 xonali SMS kodni kiriting
              </Text>

              <Text style={styles.inputLabel}>SMS kod (6 xonali)</Text>
              <TextInput
                style={[styles.input, styles.otpInput]}
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
                style={styles.primaryBtn}
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
                  <Text style={styles.timerText}>Qayta yuborish: {countdown}s</Text>
                ) : (
                  <TouchableOpacity onPress={handleSendOtp}>
                    <Text style={styles.resendText}>Kodni qayta yuborish</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  onPress={() => {
                    setCode("");
                    setStep("phone");
                  }}
                >
                  <Text style={styles.backLinkText}>Raqamni o'zgartirish</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* TAB 2: STEP 3 - PAROL O'RNATISH (Qat'iy ikki marta teriladi) */}
          {tab === "register" && step === "set_password" && (
            <View style={styles.form}>
              <Text style={styles.cardTitle}>Doimiy parol o'rnatish</Text>
              <Text style={styles.cardDesc}>
                Akkauntingizga kelgusida SMS kutmasdan tezkor kirishingiz uchun mustahkam parol belgilang va tasdiqlang.
              </Text>

              <Text style={styles.inputLabel}>Parol (kamida 6 ta belgi) *</Text>
              <View style={styles.passwordInputWrap}>
                <TextInput
                  style={[styles.input, styles.passwordInput]}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry={!showNewPassword}
                  placeholder="Yangi parolni kiriting"
                  placeholderTextColor="#94a3b8"
                  autoFocus
                  onFocus={() => scrollToInput(240)}
                />
                <TouchableOpacity
                  style={styles.eyeBtn}
                  onPress={() => setShowNewPassword(!showNewPassword)}
                  activeOpacity={0.7}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  {showNewPassword ? <EyeOffIcon size={20} color="#64748b" /> : <EyeIcon size={20} color="#64748b" />}
                </TouchableOpacity>
              </View>

              <Text style={styles.inputLabel}>Parolni qayta tasdiqlang *</Text>
              <View style={styles.passwordInputWrap}>
                <TextInput
                  style={[styles.input, styles.passwordInput]}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPassword}
                  placeholder="Parolni qayta tering"
                  placeholderTextColor="#94a3b8"
                  onFocus={() => scrollToInput(300)}
                />
                <TouchableOpacity
                  style={styles.eyeBtn}
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  activeOpacity={0.7}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  {showConfirmPassword ? <EyeOffIcon size={20} color="#64748b" /> : <EyeIcon size={20} color="#64748b" />}
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.primaryBtn}
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

          <View style={styles.benefitsRow}>
            <Text style={styles.benefitText}>🔒 100% xavfsiz SMS OTP</Text>
            <Text style={styles.benefitText}>⚡ Doimiy saqlanadigan profil</Text>
          </View>
        </View>

        {/* Bottom Guest Continue */}
        <View style={styles.bottomSection}>
          <TouchableOpacity style={styles.guestBtn} onPress={onContinue}>
            <Text style={styles.guestBtnText}>Ilovaga o'tish (Mehmon sifatida) →</Text>
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
  tagline: { fontSize: 9, fontWeight: "900", color: "#0f172a", letterSpacing: 1, marginTop: 2 },

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
