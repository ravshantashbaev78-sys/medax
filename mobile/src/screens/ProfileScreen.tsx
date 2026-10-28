import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  ActivityIndicator,
  Alert,
  ScrollView,
  Image,
  TextInput,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useI18n, Language } from "../context/I18nContext";
import {
  sendCustomerOtp,
  verifyCustomerOtp,
  loginCustomerWithPassword,
  uploadCustomerAvatar,
  getImageUrl,
} from "../api";
import {
  ShieldIcon,
  MedaxEmblem,
  UserIcon,
  BoltIcon,
  CertificateIcon,
} from "../components/Icons";

export function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { customer, logout, loginWithToken, refreshProfile } = useAuth();
  const { theme, colors, setTheme } = useTheme();
  const { lang, setLang, t } = useI18n();

  // Auth form state (when not logged in)
  const [authMode, setAuthMode] = useState<"phone" | "otp" | "password">("phone");
  const [phone, setPhone] = useState("+998 ");
  const [name, setName] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => setCountdown((c) => (c > 1 ? c - 1 : 0)), 1000);
    return () => clearInterval(timer);
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
      Alert.alert(t("error"), "Iltimos, to'liq telefon raqamingizni kiriting (+998 XX XXX XX XX)");
      return;
    }
    setLoading(true);
    try {
      const res = await sendCustomerOtp(clean);
      if (res.ok) {
        setCountdown(res.resendIn || 60);
        setAuthMode("otp");
      } else {
        Alert.alert(t("error"), res.error || "SMS yuborishda xatolik yuz berdi");
      }
    } catch {
      Alert.alert(t("error"), "Internet aloqasini tekshiring");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otpCode.trim().length !== 6) {
      Alert.alert(t("error"), "Iltimos, 6 xonali tasdiqlash kodini to'liq kiriting");
      return;
    }
    setLoading(true);
    try {
      const res = await verifyCustomerOtp(phone, otpCode, name);
      if (res.ok && res.token && res.customer) {
        await loginWithToken(res.token, res.customer);
        Alert.alert("Muvaffaqiyatli! 🎉", `Xush kelibsiz, ${res.customer.name}!`);
        setAuthMode("phone");
        setOtpCode("");
      } else {
        Alert.alert(t("error"), res.error || "Kiritilgan kod noto'g'ri");
      }
    } catch {
      Alert.alert(t("error"), "Tarmoqda xatolik yuz berdi");
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordLogin = async () => {
    if (!password.trim()) {
      Alert.alert(t("error"), "Parolni kiriting");
      return;
    }
    setLoading(true);
    try {
      const res = await loginCustomerWithPassword(phone, password);
      if (res.ok && res.token && res.customer) {
        await loginWithToken(res.token, res.customer);
        Alert.alert("Muvaffaqiyatli! 🎉", `Xush kelibsiz, ${res.customer.name}!`);
        setAuthMode("phone");
        setPassword("");
      } else {
        Alert.alert(t("error"), res.error || "Telefon raqam yoki parol noto'g'ri");
      }
    } catch {
      Alert.alert(t("error"), "Tarmoqda xatolik yuz berdi");
    } finally {
      setLoading(false);
    }
  };

  const pickAndUploadAvatar = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert("Ruxsat berilmadi", "Rasm tanlash uchun rasmlar galereyasiga ruxsat bering.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
        setUploadingAvatar(true);
        const res = await uploadCustomerAvatar(result.assets[0].uri);
        setUploadingAvatar(false);
        if (res.ok) {
          await refreshProfile();
          Alert.alert("Muvaffaqiyatli", "Profil rasmingiz yangilandi!");
        } else {
          Alert.alert("Xatolik", res.error || "Rasm yuklashda xatolik yuz berdi");
        }
      }
    } catch (err: any) {
      setUploadingAvatar(false);
      Alert.alert("Xatolik", err.message || "Rasm tanlashda xatolik");
    }
  };

  const displayName = customer?.name && customer.name !== "*" ? customer.name : "Mijoz";
  const avatarLetter = displayName.charAt(0).toUpperCase();

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.bg }]}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 14 }]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {customer ? (
        /* Foydalanuvchi tizimga kirgan holat */
        <View style={[styles.profileCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <TouchableOpacity
            style={styles.avatarContainer}
            onPress={pickAndUploadAvatar}
            activeOpacity={0.85}
          >
            {customer.avatar ? (
              <Image source={{ uri: getImageUrl(customer.avatar) }} style={styles.avatarImg} />
            ) : (
              <View style={[styles.avatarWrap, { backgroundColor: colors.primary }]}>
                <Text style={styles.avatarText}>{avatarLetter}</Text>
              </View>
            )}

            <View style={[styles.cameraBadge, { backgroundColor: colors.primary }]}>
              {uploadingAvatar ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.cameraIcon}>📷</Text>
              )}
            </View>
          </TouchableOpacity>

          <Text style={[styles.userName, { color: colors.text }]}>{displayName}</Text>
          {customer.phone && <Text style={[styles.userPhone, { color: colors.textMuted }]}>{customer.phone}</Text>}

          <TouchableOpacity style={styles.changePhotoBtn} onPress={pickAndUploadAvatar}>
            <Text style={[styles.changePhotoText, { color: colors.primary }]}>
              {t("profile_change_photo")}
            </Text>
          </TouchableOpacity>

          {/* Mijoz ma'lumotlari kartasi */}
          <View style={[styles.infoBox, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
            <Text style={[styles.infoTitle, { color: colors.text }]}>{t("profile_info_title")}</Text>

            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: colors.textMuted }]}>{t("profile_auth_type")}:</Text>
              <View style={styles.pillBadgeBlue}>
                <ShieldIcon size={13} color="#0284c7" />
                <Text style={styles.pillTextBlue}>{t("profile_auth_val")}</Text>
              </View>
            </View>

            <View style={[styles.infoRow, { marginTop: 10 }]}>
              <Text style={[styles.infoLabel, { color: colors.textMuted }]}>{t("profile_status")}:</Text>
              <View style={styles.pillBadgeGreen}>
                <Text style={styles.pillTextGreen}>✓ {t("profile_status_active")}</Text>
              </View>
            </View>
          </View>

          <TouchableOpacity style={styles.logoutBtn} onPress={logout} activeOpacity={0.8}>
            <Text style={styles.logoutBtnText}>{t("profile_logout")}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        /* Foydalanuvchi kirmagan holat: SMS OTP va Parol orqali kirish */
        <View style={[styles.loginCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.emblemWrap}>
            <MedaxEmblem size={56} />
          </View>
          <Text style={[styles.loginTitle, { color: colors.text }]}>{t("profile_title")}</Text>
          <Text style={[styles.loginSub, { color: colors.textMuted }]}>
            {authMode === "otp"
              ? `${phone} raqamiga yuborilgan 6 xonali SMS kodni kiriting`
              : authMode === "password"
              ? "Parolingiz orqali tizimga kiring"
              : t("profile_login_sub")}
          </Text>

          {authMode === "phone" && (
            <View style={styles.formWidth}>
              <Text style={[styles.inputLabel, { color: colors.textMuted }]}>Telefon raqamingiz</Text>
              <TextInput
                style={[styles.inputField, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
                value={phone}
                onChangeText={formatPhone}
                keyboardType="phone-pad"
                placeholder="+998 90 123 45 67"
                placeholderTextColor={colors.textMuted}
              />

              <Text style={[styles.inputLabel, { color: colors.textMuted }]}>Ism-familiyangiz (ixtiyoriy)</Text>
              <TextInput
                style={[styles.inputField, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
                value={name}
                onChangeText={setName}
                placeholder="Masalan: Dr. Karimov"
                placeholderTextColor={colors.textMuted}
              />

              <TouchableOpacity
                style={[styles.submitBtn, { backgroundColor: colors.primary }]}
                onPress={handleSendOtp}
                disabled={loading}
                activeOpacity={0.88}
              >
                {loading ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.submitBtnText}>{t("profile_tg_btn")} →</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.switchLink}
                onPress={() => setAuthMode("password")}
              >
                <Text style={[styles.switchLinkText, { color: colors.primary }]}>Parol orqali kirish</Text>
              </TouchableOpacity>
            </View>
          )}

          {authMode === "otp" && (
            <View style={styles.formWidth}>
              <Text style={[styles.inputLabel, { color: colors.textMuted }]}>SMS kod (6 xonali)</Text>
              <TextInput
                style={[
                  styles.inputField,
                  styles.otpField,
                  { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text },
                ]}
                value={otpCode}
                onChangeText={setOtpCode}
                keyboardType="number-pad"
                maxLength={6}
                placeholder="• • • • • •"
                placeholderTextColor={colors.textMuted}
                autoFocus
              />

              <TouchableOpacity
                style={[styles.submitBtn, { backgroundColor: colors.primary }]}
                onPress={handleVerifyOtp}
                disabled={loading}
                activeOpacity={0.88}
              >
                {loading ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.submitBtnText}>Tasdiqlash va kirish ✓</Text>
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
                <TouchableOpacity onPress={() => setAuthMode("phone")}>
                  <Text style={[styles.backText, { color: colors.textMuted }]}>Raqamni o'zgartirish</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {authMode === "password" && (
            <View style={styles.formWidth}>
              <Text style={[styles.inputLabel, { color: colors.textMuted }]}>Telefon raqamingiz</Text>
              <TextInput
                style={[styles.inputField, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
                value={phone}
                onChangeText={formatPhone}
                keyboardType="phone-pad"
                placeholder="+998 90 123 45 67"
                placeholderTextColor={colors.textMuted}
              />

              <Text style={[styles.inputLabel, { color: colors.textMuted }]}>Parol</Text>
              <TextInput
                style={[styles.inputField, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                placeholder="Parolni kiriting"
                placeholderTextColor={colors.textMuted}
              />

              <TouchableOpacity
                style={[styles.submitBtn, { backgroundColor: colors.primary }]}
                onPress={handlePasswordLogin}
                disabled={loading}
                activeOpacity={0.88}
              >
                {loading ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.submitBtnText}>Kirish ✓</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.switchLink}
                onPress={() => setAuthMode("phone")}
              >
                <Text style={[styles.switchLinkText, { color: colors.primary }]}>SMS orqali kirishga qaytish</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={[styles.benefitList, { borderTopColor: colors.border }]}>
            <View style={styles.benefitRow}>
              <BoltIcon size={16} color={colors.primary} />
              <Text style={[styles.benefitItem, { color: colors.text }]}>{t("profile_benefit_1")}</Text>
            </View>
            <View style={styles.benefitRow}>
              <ShieldIcon size={16} color="#059669" />
              <Text style={[styles.benefitItem, { color: colors.text }]}>{t("profile_benefit_2")}</Text>
            </View>
            <View style={styles.benefitRow}>
              <CertificateIcon size={16} color={colors.primary} />
              <Text style={[styles.benefitItem, { color: colors.text }]}>{t("profile_benefit_3")}</Text>
            </View>
          </View>
        </View>
      )}

      {/* ILOVA SOZLAMALARI: MAVZU VA TIL */}
      <View style={[styles.settingsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.cardTitle, { color: colors.text }]}>⚙️ {t("settings_title")}</Text>

        {/* 1. Mavzu (Theme) almashtirish */}
        <View style={styles.settingItem}>
          <Text style={[styles.settingLabel, { color: colors.text }]}>🎨 {t("settings_theme")}</Text>
          <View style={[styles.segContainer, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
            <TouchableOpacity
              style={[
                styles.segBtn,
                theme === "light" && [styles.segBtnActive, { backgroundColor: colors.primary }],
              ]}
              onPress={() => setTheme("light")}
              activeOpacity={0.8}
            >
              <Text style={[styles.segBtnText, { color: theme === "light" ? "#ffffff" : colors.textMuted }]}>
                ☀️ {t("settings_theme_light")}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.segBtn,
                theme === "dark" && [styles.segBtnActive, { backgroundColor: colors.primary }],
              ]}
              onPress={() => setTheme("dark")}
              activeOpacity={0.8}
            >
              <Text style={[styles.segBtnText, { color: theme === "dark" ? "#ffffff" : colors.textMuted }]}>
                🌙 {t("settings_theme_dark")}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 2. Til (Language) almashtirish */}
        <View style={[styles.settingItem, { marginTop: 16 }]}>
          <Text style={[styles.settingLabel, { color: colors.text }]}>🌐 {t("settings_lang")}</Text>
          <View style={[styles.segContainer, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
            <TouchableOpacity
              style={[
                styles.segBtn,
                lang === "uz" && [styles.segBtnActive, { backgroundColor: colors.primary }],
              ]}
              onPress={() => setLang("uz")}
              activeOpacity={0.8}
            >
              <Text style={[styles.segBtnText, { color: lang === "uz" ? "#ffffff" : colors.textMuted }]}>
                🇺🇿 O'zbek
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.segBtn,
                lang === "ru" && [styles.segBtnActive, { backgroundColor: colors.primary }],
              ]}
              onPress={() => setLang("ru")}
              activeOpacity={0.8}
            >
              <Text style={[styles.segBtnText, { color: lang === "ru" ? "#ffffff" : colors.textMuted }]}>
                🇷🇺 Рус
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.segBtn,
                lang === "en" && [styles.segBtnActive, { backgroundColor: colors.primary }],
              ]}
              onPress={() => setLang("en")}
              activeOpacity={0.8}
            >
              <Text style={[styles.segBtnText, { color: lang === "en" ? "#ffffff" : colors.textMuted }]}>
                🇬🇧 Eng
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Kontaktlar va Do'kon manzili */}
      <View style={[styles.contactCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.contactCardTitle, { color: colors.text }]}>{t("contact_title")}</Text>
        <Text style={[styles.contactDesc, { color: colors.textMuted }]}>
          {t("contact_sub")}
        </Text>

        <TouchableOpacity
          style={[styles.contactItemRow, { borderTopColor: colors.border }]}
          onPress={() => Linking.openURL("tel:+998911866661")}
        >
          <Text style={styles.contactItemIcon}>📞</Text>
          <View>
            <Text style={[styles.contactItemTitle, { color: colors.textMuted }]}>{t("contact_phone")}</Text>
            <Text style={[styles.contactItemValue, { color: colors.text }]}>+998 91 186 66 61</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.contactItemRow, { borderTopColor: colors.border }]}
          onPress={() => Linking.openURL("https://t.me/medax_uz")}
        >
          <Text style={styles.contactItemIcon}>💬</Text>
          <View>
            <Text style={[styles.contactItemTitle, { color: colors.textMuted }]}>{t("contact_tg_channel")}</Text>
            <Text style={[styles.contactItemValue, { color: colors.text }]}>@medax_uz</Text>
          </View>
        </TouchableOpacity>

        <View style={[styles.contactItemRow, { borderTopColor: colors.border }]}>
          <Text style={styles.contactItemIcon}>📍</Text>
          <View style={{ flex: 1 }}>
            <Text style={[styles.contactItemTitle, { color: colors.textMuted }]}>{t("contact_store")}</Text>
            <Text style={[styles.contactItemValue, { color: colors.text }]}>
              Toshkent shahri, Yunusobod tumani, Amir Temur shoh ko'chasi, 107-bino
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 36 },
  loginCard: {
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    elevation: 2,
    marginBottom: 16,
  },
  emblemWrap: { marginBottom: 14 },
  loginTitle: { fontSize: 20, fontWeight: "900", marginBottom: 6 },
  loginSub: { fontSize: 13, textAlign: "center", lineHeight: 19, marginBottom: 20 },
  formWidth: { width: "100%" },
  inputLabel: { fontSize: 12, fontWeight: "700", marginBottom: 6 },
  inputField: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14.5,
    marginBottom: 12,
  },
  otpField: {
    fontSize: 22,
    fontWeight: "800",
    textAlign: "center",
    letterSpacing: 6,
  },
  submitBtn: {
    width: "100%",
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    elevation: 3,
    marginTop: 4,
  },
  submitBtnText: { color: "#ffffff", fontSize: 15, fontWeight: "800" },
  switchLink: { marginTop: 12, alignItems: "center" },
  switchLinkText: { fontSize: 13, fontWeight: "700" },
  otpActions: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 12 },
  timerText: { fontSize: 12 },
  resendText: { fontSize: 12.5, fontWeight: "700" },
  backText: { fontSize: 12 },

  benefitList: { marginTop: 20, width: "100%", borderTopWidth: 1, paddingTop: 14, gap: 8 },
  benefitRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  benefitItem: { fontSize: 12.5, fontWeight: "600" },

  profileCard: {
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    elevation: 2,
    marginBottom: 16,
  },
  avatarContainer: { position: "relative", marginBottom: 12 },
  avatarWrap: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: "center",
    justifyContent: "center",
    elevation: 3,
  },
  avatarText: { fontSize: 36, fontWeight: "900", color: "#ffffff" },
  avatarImg: { width: 84, height: 84, borderRadius: 42 },
  cameraBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#ffffff",
    elevation: 4,
  },
  cameraIcon: { fontSize: 13 },
  userName: { fontSize: 20, fontWeight: "900", marginBottom: 4 },
  userPhone: { fontSize: 14, marginBottom: 8 },
  changePhotoBtn: { paddingVertical: 4, paddingHorizontal: 12, marginBottom: 16 },
  changePhotoText: { fontSize: 13, fontWeight: "700" },

  infoBox: { width: "100%", borderRadius: 16, padding: 14, borderWidth: 1, marginBottom: 16 },
  infoTitle: { fontSize: 13.5, fontWeight: "800", marginBottom: 10 },
  infoRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  infoLabel: { fontSize: 13 },
  pillBadgeBlue: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "#e0f2fe", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  pillTextBlue: { color: "#0284c7", fontSize: 12, fontWeight: "700" },
  pillBadgeGreen: { backgroundColor: "#ecfdf5", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  pillTextGreen: { color: "#059669", fontSize: 12, fontWeight: "700" },

  logoutBtn: { width: "100%", paddingVertical: 12, borderRadius: 12, backgroundColor: "#fee2e2", alignItems: "center" },
  logoutBtnText: { color: "#dc2626", fontSize: 14, fontWeight: "800" },

  settingsCard: { borderRadius: 24, padding: 20, borderWidth: 1, elevation: 2, marginBottom: 16 },
  cardTitle: { fontSize: 16, fontWeight: "800", marginBottom: 14 },
  settingItem: { width: "100%" },
  settingLabel: { fontSize: 13, fontWeight: "700", marginBottom: 8 },
  segContainer: { flexDirection: "row", borderRadius: 12, padding: 3, borderWidth: 1 },
  segBtn: { flex: 1, paddingVertical: 9, borderRadius: 9, alignItems: "center" },
  segBtnActive: { elevation: 2 },
  segBtnText: { fontSize: 13, fontWeight: "700" },

  contactCard: { borderRadius: 24, padding: 20, borderWidth: 1, elevation: 2 },
  contactCardTitle: { fontSize: 16, fontWeight: "800", marginBottom: 4 },
  contactDesc: { fontSize: 12.5, lineHeight: 18, marginBottom: 14 },
  contactItemRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingTop: 12, marginTop: 12, borderTopWidth: 1 },
  contactItemIcon: { fontSize: 20 },
  contactItemTitle: { fontSize: 11, fontWeight: "700", marginBottom: 2 },
  contactItemValue: { fontSize: 13.5, fontWeight: "700" },
});
