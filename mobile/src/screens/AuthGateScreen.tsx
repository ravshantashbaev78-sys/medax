import React, { useState, useEffect } from "react";
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
import { sendCustomerOtp, verifyCustomerOtp, loginCustomerWithPassword } from "../api";
import { MedaxEmblem } from "../components/Icons";

interface AuthGateScreenProps {
  onContinue: () => void;
}

export function AuthGateScreen({ onContinue }: AuthGateScreenProps) {
  const insets = useSafeAreaInsets();
  const { loginWithToken } = useAuth();

  const [step, setStep] = useState<"phone" | "otp" | "password">("phone");
  const [phone, setPhone] = useState("+998 ");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);

  // Countdown timer for SMS resend
  useEffect(() => {
    if (countdown <= 0) return;
    const t = setInterval(() => setCountdown((c) => (c > 1 ? c - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [countdown]);

  const formatPhone = (text: string) => {
    let raw = text.replace(/[^\d+]/g, "");
    if (!raw.startsWith("+998")) raw = "+998" + raw.replace("+", "");
    if (raw.length > 13) raw = raw.slice(0, 13);
    setPhone(raw);
  };

  const handleSendOtp = async () => {
    const clean = phone.replace(/[^\d+]/g, "");
    if (clean.length < 13) {
      Alert.alert("Xatolik", "Iltimos, to'liq telefon raqamingizni kiriting (+998 XX XXX XX XX)");
      return;
    }
    setLoading(true);
    try {
      const res = await sendCustomerOtp(clean);
      if (res.ok) {
        setCountdown(res.resendIn || 60);
        setStep("otp");
      } else {
        Alert.alert("Xatolik", res.error || "SMS yuborishda xatolik yuz berdi");
      }
    } catch {
      Alert.alert("Xatolik", "Internet aloqasini tekshiring");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (code.trim().length !== 6) {
      Alert.alert("Xatolik", "Iltimos, 6 xonali tasdiqlash kodini to'liq kiriting");
      return;
    }
    setLoading(true);
    try {
      const res = await verifyCustomerOtp(phone, code, name);
      if (res.ok && res.token && res.customer) {
        await loginWithToken(res.token, res.customer);
        Alert.alert("Muvaffaqiyatli!", `Xush kelibsiz, ${res.customer.name}!`);
        onContinue();
      } else {
        Alert.alert("Xatolik", res.error || "Kiritilgan kod noto'g'ri");
      }
    } catch {
      Alert.alert("Xatolik", "Tarmoqda xatolik yuz berdi");
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordLogin = async () => {
    if (!password.trim()) {
      Alert.alert("Xatolik", "Parolni kiriting");
      return;
    }
    setLoading(true);
    try {
      const res = await loginCustomerWithPassword(phone, password);
      if (res.ok && res.token && res.customer) {
        await loginWithToken(res.token, res.customer);
        Alert.alert("Muvaffaqiyatli!", `Xush kelibsiz, ${res.customer.name}!`);
        onContinue();
      } else {
        Alert.alert("Xatolik", res.error || "Telefon raqam yoki parol noto'g'ri");
      }
    } catch {
      Alert.alert("Xatolik", "Tarmoqda xatolik yuz berdi");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingTop: insets.top + 20, paddingBottom: Math.max(insets.bottom, 20) },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Brand Header */}
        <View style={styles.topSection}>
          <MedaxEmblem size={64} />
          <View style={styles.brandTitleWrap}>
            <Text style={styles.brandMed}>Med</Text>
            <Text style={styles.brandAx}>ax</Text>
          </View>
          <Text style={styles.tagline}>RASMIY TIBBIY USKUNALAR MARKAZI</Text>
        </View>

        {/* Main Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            {step === "otp"
              ? "Tasdiqlash kodi"
              : step === "password"
              ? "Parol bilan kirish"
              : "Shaxsiy kabinetga kirish"}
          </Text>
          <Text style={styles.cardDesc}>
            {step === "otp"
              ? `${phone} raqamiga yuborilgan 6 xonali SMS kodni kiriting`
              : step === "password"
              ? "Oldin o'rnatilgan parolingiz orqali tizimga kiring"
              : "Buyurtmalarni kuzatish va hujjatlarni yuklab olish uchun telefon raqamingizni kiriting"}
          </Text>

          {step === "phone" && (
            <View style={styles.form}>
              <Text style={styles.inputLabel}>Telefon raqamingiz</Text>
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={formatPhone}
                keyboardType="phone-pad"
                placeholder="+998 90 123 45 67"
                placeholderTextColor="#94a3b8"
              />

              <Text style={styles.inputLabel}>Ism-familiyangiz (ixtiyoriy)</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Masalan: Dr. Alisher"
                placeholderTextColor="#94a3b8"
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
                onPress={() => setStep("password")}
              >
                <Text style={styles.switchLinkText}>Parol orqali kirish</Text>
              </TouchableOpacity>
            </View>
          )}

          {step === "otp" && (
            <View style={styles.form}>
              <Text style={styles.inputLabel}>SMS kod (6 xonali)</Text>
              <TextInput
                style={[styles.input, styles.otpInput]}
                value={code}
                onChangeText={setCode}
                keyboardType="number-pad"
                maxLength={6}
                placeholder="• • • • • •"
                placeholderTextColor="#94a3b8"
                autoFocus
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
                  <Text style={styles.primaryBtnText}>Tasdiqlash va kirish ✓</Text>
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
                <TouchableOpacity onPress={() => setStep("phone")}>
                  <Text style={styles.backLinkText}>Raqamni o'zgartirish</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {step === "password" && (
            <View style={styles.form}>
              <Text style={styles.inputLabel}>Telefon raqamingiz</Text>
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={formatPhone}
                keyboardType="phone-pad"
                placeholder="+998 90 123 45 67"
                placeholderTextColor="#94a3b8"
              />

              <Text style={styles.inputLabel}>Parolingiz</Text>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                placeholder="Parolni kiriting"
                placeholderTextColor="#94a3b8"
              />

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
                onPress={() => setStep("phone")}
              >
                <Text style={styles.switchLinkText}>SMS kod orqali kirishga qaytish</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.benefitsRow}>
            <Text style={styles.benefitText}>🔒 100% xavfsiz SMS OTP</Text>
            <Text style={styles.benefitText}>⚡ Tezkor autentifikatsiya</Text>
          </View>
        </View>

        {/* Bottom Guest Continue */}
        <View style={styles.bottomSection}>
          <TouchableOpacity style={styles.guestBtn} onPress={onContinue}>
            <Text style={styles.guestBtnText}>Ilovaga o'tish (Mehmon sifatida) →</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: "#f8fafc", justifyContent: "space-between", paddingHorizontal: 20 },
  topSection: { alignItems: "center", marginTop: 10, marginBottom: 16 },
  brandTitleWrap: { flexDirection: "row", marginTop: 10 },
  brandMed: { fontSize: 28, fontWeight: "900", color: "#0284c7" },
  brandAx: { fontSize: 28, fontWeight: "900", color: "#0f172a" },
  tagline: { fontSize: 9, fontWeight: "800", color: "#64748b", letterSpacing: 1, marginTop: 2 },

  card: {
    backgroundColor: "#ffffff",
    borderRadius: 24,
    padding: 22,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 3,
  },
  cardTitle: { fontSize: 19, fontWeight: "800", color: "#0f172a", textAlign: "center", marginBottom: 4 },
  cardDesc: { fontSize: 13, color: "#64748b", textAlign: "center", lineHeight: 18, marginBottom: 18 },

  form: { width: "100%" },
  inputLabel: { fontSize: 12, fontWeight: "700", color: "#475569", marginBottom: 6 },
  input: {
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 15,
    color: "#0f172a",
    marginBottom: 14,
  },
  otpInput: {
    fontSize: 22,
    letterSpacing: 8,
    textAlign: "center",
    fontWeight: "800",
  },

  primaryBtn: {
    width: "100%",
    backgroundColor: "#0284c7",
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 4,
    shadowColor: "#0284c7",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  primaryBtnText: { color: "#ffffff", fontSize: 14.5, fontWeight: "800" },

  switchLink: { marginTop: 14, alignItems: "center" },
  switchLinkText: { fontSize: 13, color: "#0284c7", fontWeight: "700" },

  otpActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 14,
  },
  timerText: { fontSize: 12.5, color: "#64748b" },
  resendText: { fontSize: 12.5, color: "#0284c7", fontWeight: "700" },
  backLinkText: { fontSize: 12.5, color: "#94a3b8" },

  benefitsRow: {
    marginTop: 18,
    width: "100%",
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
    paddingTop: 12,
    flexDirection: "row",
    justifyContent: "space-around",
  },
  benefitText: { fontSize: 11, color: "#64748b", fontWeight: "600" },

  bottomSection: { alignItems: "center", marginTop: 14, marginBottom: 6 },
  guestBtn: { paddingVertical: 8, paddingHorizontal: 16 },
  guestBtnText: { fontSize: 13.5, color: "#0284c7", fontWeight: "700" },
});
