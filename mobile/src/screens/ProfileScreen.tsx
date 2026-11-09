import React, { useState, useEffect, useCallback } from "react";
import { useFocusEffect } from "@react-navigation/native";
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
  Platform,
  KeyboardAvoidingView,
  Modal,
  RefreshControl,
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
  sendForgotPasswordOtp,
  resetCustomerPassword,
  uploadCustomerAvatar,
  getImageUrl,
  fetchNotifications,
  markNotificationsRead,
  fetchCustomerOrders,
  deleteCustomerAccount,
} from "../api";
import {
  Button,
  Card,
  Field,
  Segmented,
  StatusPill,
  IcBack,
  IcCamera,
  IcChevron,
  IcExternal,
  IcEye,
  IcEyeOff,
  IcGlobe,
  IcImage,
  IcMail,
  IcPhone,
  IcPin,
  IcSend,
  IcShield,
  IcSun,
  ui,
} from "../components/ui";

/* ------------------------------------------------------------------ */

const STORE_PHONE = "+998 91 186 66 61";

/** "+998901234567" -> "+998 90 123 45 67" (yozish paytida ham ishlaydi) */
function formatPhone(raw: string): string {
  let d = raw.replace(/\D/g, "");
  if (!d.startsWith("998")) d = "998" + d.replace(/^998/, "");
  d = d.slice(0, 12);
  const r = d.slice(3);
  let out = "+998";
  if (r.length) out += " " + r.slice(0, 2);
  if (r.length > 2) out += " " + r.slice(2, 5);
  if (r.length > 5) out += " " + r.slice(5, 7);
  if (r.length > 7) out += " " + r.slice(7, 9);
  return out;
}
/** Sana: o'zbek tilida raqamli format (Intl'da o'zbekcha oy nomlari har doim ham yo'q) */
function fmtDate(iso: string, lang: Language, withYear = false): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  if (lang === "uz") {
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    return withYear ? `${dd}.${mm}.${d.getFullYear()}` : `${dd}.${mm}`;
  }
  return d.toLocaleDateString(lang === "en" ? "en-GB" : "ru-RU", withYear ? undefined : { day: "2-digit", month: "short" });
}
const phoneComplete = (p: string) => p.replace(/\D/g, "").length === 12;

function statusInfo(status: string, lang: Language): { label: string; tone: "info" | "success" | "danger" | "neutral" | "warn"; note: string } {
  const T = {
    NEW: { uz: ["Yangi", "Menejer tez orada bog'lanadi."], ru: ["Новый", "Менеджер скоро свяжется с вами."], en: ["New", "A manager will contact you soon."], tone: "warn" },
    CONFIRMED: { uz: ["Tasdiqlandi", "Buyurtma tayyorlanmoqda."], ru: ["Подтверждён", "Заказ готовится."], en: ["Confirmed", "Your order is being prepared."], tone: "info" },
    READY: { uz: ["Olib ketishga tayyor", "Do'konga kelib olib ketishingiz mumkin."], ru: ["Готов к выдаче", "Можете забрать заказ в магазине."], en: ["Ready for pickup", "You can pick it up at the store."], tone: "success" },
    DONE: { uz: ["Topshirildi", "Xaridingiz uchun rahmat."], ru: ["Выдан", "Спасибо за покупку."], en: ["Completed", "Thank you for your purchase."], tone: "neutral" },
    CANCELED: { uz: ["Bekor qilindi", ""], ru: ["Отменён", ""], en: ["Canceled", ""], tone: "danger" },
  } as const;
  const k = (status === "FAKE" ? "CANCELED" : status) as keyof typeof T;
  const row = T[k];
  if (!row) return { label: status, tone: "neutral", note: "" };
  const [label, note] = row[lang] || row.uz;
  return { label, tone: row.tone, note };
}

const L = {
  uz: {
    login: "Kirish", register: "Ro'yxatdan o'tish", forgot: "Parolni tiklash",
    loginSub: "Buyurtmalaringiz tarixi va holatini ko'rish uchun hisobingizga kiring.",
    registerSub: "Buyurtmalaringizni kuzatish uchun hisob oching.",
    forgotSub: "Telefon raqamingizga SMS kod yuboramiz.",
    otpTitle: "Tasdiqlash kodi", otpSub: "raqamiga SMS orqali 6 xonali kod yuborildi.",
    passTitle: "Parol o'rnating", passSub: "Keyingi safar telefon raqami va parol bilan kirasiz.",
    phone: "Telefon raqami", password: "Parol", name: "Ismingiz", namePh: "Ism va familiya",
    newPass: "Yangi parol", newPassPh: "Kamida 6 belgi", repeat: "Parolni takrorlang", code: "SMS kod",
    forgotLink: "Parolni unutdingizmi?", getCode: "SMS kod olish", next: "Davom etish", create: "Hisobni yaratish",
    save: "Parolni saqlash", resend: "Kodni qayta yuborish", resendIn: "Qayta yuborish", changeNumber: "Raqamni o'zgartirish", back: "Orqaga",
    orders: "Buyurtmalarim", noOrders: "Hozircha buyurtmalar yo'q.", notifs: "Bildirishnomalar", markRead: "Hammasini o'qildi",
    settings: "Sozlamalar", language: "Til", theme: "Mavzu", light: "Yorug'", dark: "Qorong'i",
    contact: "Do'kon bilan bog'lanish", call: "Qo'ng'iroq qilish", map: "Xaritada ko'rish", privacy: "Maxfiylik siyosati",
    logout: "Chiqish", logoutQ: "Hisobingizdan chiqmoqchimisiz?", cancel: "Bekor qilish",
    del: "Hisobni o'chirish", delText: "Hisobingiz, profil rasmingiz, parolingiz va bildirishnomalaringiz butunlay o'chiriladi. Bu amalni ortga qaytarib bo'lmaydi. Rasmiylashtirilgan buyurtmalar bo'yicha hujjatlar qonunchilik talabiga ko'ra do'konda saqlanadi.",
    delPass: "Tasdiqlash uchun parolingiz", delBtn: "O'chirish", deleted: "Hisobingiz o'chirildi.",
    welcome: "Xush kelibsiz", mismatch: "Parollar bir-biriga mos kelmadi.", short: "Parol kamida 6 belgidan iborat bo'lishi kerak.",
    needPhone: "To'liq telefon raqamini kiriting.", needCode: "6 xonali kodni kiriting.", needPass: "Parolni kiriting.",
    photoOk: "Profil rasmi yangilandi.", show: "Parolni ko'rsatish", hide: "Parolni yashirish",
  },
  ru: {
    login: "Вход", register: "Регистрация", forgot: "Восстановление пароля",
    loginSub: "Войдите, чтобы видеть историю и статус заказов.",
    registerSub: "Создайте аккаунт, чтобы отслеживать заказы.",
    forgotSub: "Мы отправим SMS-код на ваш номер.",
    otpTitle: "Код подтверждения", otpSub: "— на этот номер отправлен 6-значный код.",
    passTitle: "Задайте пароль", passSub: "В следующий раз входите по номеру и паролю.",
    phone: "Номер телефона", password: "Пароль", name: "Ваше имя", namePh: "Имя и фамилия",
    newPass: "Новый пароль", newPassPh: "Не менее 6 символов", repeat: "Повторите пароль", code: "SMS-код",
    forgotLink: "Забыли пароль?", getCode: "Получить SMS-код", next: "Продолжить", create: "Создать аккаунт",
    save: "Сохранить пароль", resend: "Отправить код ещё раз", resendIn: "Повторно через", changeNumber: "Изменить номер", back: "Назад",
    orders: "Мои заказы", noOrders: "Заказов пока нет.", notifs: "Уведомления", markRead: "Прочитать все",
    settings: "Настройки", language: "Язык", theme: "Тема", light: "Светлая", dark: "Тёмная",
    contact: "Связаться с магазином", call: "Позвонить", map: "Открыть на карте", privacy: "Политика конфиденциальности",
    logout: "Выйти", logoutQ: "Выйти из аккаунта?", cancel: "Отмена",
    del: "Удалить аккаунт", delText: "Аккаунт, фото профиля, пароль и уведомления будут удалены безвозвратно. Документы по оформленным заказам хранятся в магазине согласно законодательству.",
    delPass: "Пароль для подтверждения", delBtn: "Удалить", deleted: "Аккаунт удалён.",
    welcome: "Добро пожаловать", mismatch: "Пароли не совпадают.", short: "Пароль должен быть не короче 6 символов.",
    needPhone: "Введите полный номер телефона.", needCode: "Введите 6-значный код.", needPass: "Введите пароль.",
    photoOk: "Фото профиля обновлено.", show: "Показать пароль", hide: "Скрыть пароль",
  },
  en: {
    login: "Sign in", register: "Sign up", forgot: "Reset password",
    loginSub: "Sign in to see your order history and status.",
    registerSub: "Create an account to track your orders.",
    forgotSub: "We'll send an SMS code to your number.",
    otpTitle: "Verification code", otpSub: "— a 6-digit code was sent to this number.",
    passTitle: "Set a password", passSub: "Next time, sign in with your phone number and password.",
    phone: "Phone number", password: "Password", name: "Your name", namePh: "Full name",
    newPass: "New password", newPassPh: "At least 6 characters", repeat: "Repeat password", code: "SMS code",
    forgotLink: "Forgot password?", getCode: "Get SMS code", next: "Continue", create: "Create account",
    save: "Save password", resend: "Resend code", resendIn: "Resend in", changeNumber: "Change number", back: "Back",
    orders: "My orders", noOrders: "No orders yet.", notifs: "Notifications", markRead: "Mark all read",
    settings: "Settings", language: "Language", theme: "Theme", light: "Light", dark: "Dark",
    contact: "Contact the store", call: "Call", map: "Open in maps", privacy: "Privacy policy",
    logout: "Sign out", logoutQ: "Sign out of your account?", cancel: "Cancel",
    del: "Delete account", delText: "Your account, profile photo, password and notifications will be permanently deleted. Records of placed orders are kept by the store as required by law.",
    delPass: "Your password to confirm", delBtn: "Delete", deleted: "Your account was deleted.",
    welcome: "Welcome", mismatch: "Passwords do not match.", short: "Password must be at least 6 characters.",
    needPhone: "Enter the full phone number.", needCode: "Enter the 6-digit code.", needPass: "Enter your password.",
    photoOk: "Profile photo updated.", show: "Show password", hide: "Hide password",
  },
};

type Mode = "login" | "register" | "otp" | "setpass" | "forgot" | "forgotReset";

/* ------------------------------------------------------------------ */

export function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { customer, logout, clearSession, loginWithToken, refreshProfile } = useAuth();
  const { theme, colors, setTheme } = useTheme();
  const { lang, setLang, t } = useI18n();
  const c = L[lang] || L.uz;

  const [mode, setMode] = useState<Mode>("login");
  const [phone, setPhone] = useState("+998");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const [orders, setOrders] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loadingData, setLoadingData] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleting, setDeleting] = useState(false);

  /* ----------------------------- data ----------------------------- */

  const loadData = useCallback(async () => {
    if (!customer) return;
    setLoadingData(true);
    const [o, n] = await Promise.all([fetchCustomerOrders(), fetchNotifications()]);
    setOrders(Array.isArray(o) ? o : []);
    setNotifications(n?.notifications || []);
    setUnreadCount(n?.unreadCount || 0);
    setLoadingData(false);
  }, [customer?.id]);

  useEffect(() => {
    if (!customer) {
      setOrders([]);
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [customer?.id]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => setCountdown((v) => (v > 1 ? v - 1 : 0)), 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  /* ----------------------------- auth ----------------------------- */

  const resetForm = () => {
    setPassword("");
    setOtpCode("");
    setNewPassword("");
    setConfirmPassword("");
    setShowPass(false);
  };
  const go = (m: Mode) => {
    setShowPass(false);
    setMode(m);
  };

  const handleLogin = async () => {
    if (!phoneComplete(phone)) return Alert.alert(t("error"), c.needPhone);
    if (!password) return Alert.alert(t("error"), c.needPass);
    setLoading(true);
    const res = await loginCustomerWithPassword(phone, password);
    setLoading(false);
    if (res.ok && res.token && res.customer) {
      await loginWithToken(res.token, res.customer);
      resetForm();
    } else {
      Alert.alert(t("error"), res.error || "Telefon raqam yoki parol noto'g'ri");
    }
  };

  const handleSendRegisterOtp = async () => {
    if (!phoneComplete(phone)) return Alert.alert(t("error"), c.needPhone);
    setLoading(true);
    const res = await sendCustomerOtp(phone);
    setLoading(false);
    if (res.ok) {
      setCountdown(res.resendIn || 60);
      setOtpCode("");
      go("otp");
    } else if (res.error && res.error.includes("allaqachon ro'yxatdan o'tgan")) {
      Alert.alert(c.login, res.error);
      go("login");
    } else {
      Alert.alert(t("error"), res.error || "SMS yuborishda xatolik");
    }
  };

  const handleCreateAccount = async () => {
    if (newPassword.length < 6) return Alert.alert(t("error"), c.short);
    if (newPassword !== confirmPassword) return Alert.alert(t("error"), c.mismatch);
    setLoading(true);
    const res = await verifyCustomerOtp(phone, otpCode, name, newPassword);
    setLoading(false);
    if (res.ok && res.token && res.customer) {
      await loginWithToken(res.token, res.customer);
      resetForm();
      go("login");
      Alert.alert(`${c.welcome}, ${res.customer.name}!`);
    } else {
      const msg = res.error || "Xatolik yuz berdi";
      // Kod noto'g'ri/eskirgan bo'lsa — kod kiritish bosqichiga qaytaramiz
      if (/kod/i.test(msg)) {
        setOtpCode("");
        go("otp");
      }
      Alert.alert(t("error"), msg);
    }
  };

  const handleSendForgotOtp = async () => {
    if (!phoneComplete(phone)) return Alert.alert(t("error"), c.needPhone);
    setLoading(true);
    const res = await sendForgotPasswordOtp(phone);
    setLoading(false);
    if (res.ok) {
      setCountdown(60);
      setOtpCode("");
      go("forgotReset");
    } else {
      Alert.alert(t("error"), res.error || "SMS yuborishda xatolik");
    }
  };

  const handleResetPassword = async () => {
    if (otpCode.length !== 6) return Alert.alert(t("error"), c.needCode);
    if (newPassword.length < 6) return Alert.alert(t("error"), c.short);
    if (newPassword !== confirmPassword) return Alert.alert(t("error"), c.mismatch);
    setLoading(true);
    const res = await resetCustomerPassword(phone, otpCode, newPassword);
    setLoading(false);
    if (res.ok && res.token && res.customer) {
      await loginWithToken(res.token, res.customer);
      resetForm();
      go("login");
    } else {
      Alert.alert(t("error"), res.error || "Parolni yangilashda xatolik");
    }
  };

  /* ---------------------------- account --------------------------- */

  const pickAvatar = async () => {
    try {
      // Tizimli Photo Picker: galereyaga ruxsat talab qilinmaydi
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: true, aspect: [1, 1], quality: 0.6 });
      if (result.canceled || !result.assets?.[0]?.uri) return;
      const asset = result.assets[0];
      setUploadingAvatar(true);
      const res = await uploadCustomerAvatar(asset.uri, asset.mimeType, asset.fileName);
      setUploadingAvatar(false);
      if (res.ok) {
        await refreshProfile();
        Alert.alert(c.photoOk);
      } else {
        Alert.alert(t("error"), res.error || "Rasm yuklashda xatolik");
      }
    } catch (err: any) {
      setUploadingAvatar(false);
      Alert.alert(t("error"), err?.message || "Rasm tanlashda xatolik");
    }
  };

  const handleLogout = () =>
    Alert.alert(c.logout, c.logoutQ, [
      { text: c.cancel, style: "cancel" },
      {
        text: c.logout,
        style: "destructive",
        onPress: async () => {
          resetForm();
          setPhone("+998");
          go("login");
          await logout();
        },
      },
    ]);

  const handleDeleteAccount = async () => {
    if (customer?.hasPassword && !deletePassword) return Alert.alert(t("error"), c.needPass);
    setDeleting(true);
    const res = await deleteCustomerAccount(deletePassword || undefined);
    setDeleting(false);
    if (!res.ok) return Alert.alert(t("error"), res.error || "Xatolik");
    setDeleteOpen(false);
    setDeletePassword("");
    resetForm();
    setPhone("+998");
    go("login");
    await clearSession();
    Alert.alert(c.deleted);
  };

  const handleMarkAllRead = async () => {
    await markNotificationsRead();
    setUnreadCount(0);
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  /* ----------------------------- views ---------------------------- */

  const eye = (
    <TouchableOpacity onPress={() => setShowPass((v) => !v)} hitSlop={8} accessibilityLabel={showPass ? c.hide : c.show}>
      {showPass ? <IcEyeOff size={20} color={colors.textMuted} strokeWidth={1.8} /> : <IcEye size={20} color={colors.textMuted} strokeWidth={1.8} />}
    </TouchableOpacity>
  );
  const passProps = { secureTextEntry: !showPass, autoCapitalize: "none" as const, autoCorrect: false, right: eye };

  const phoneField = (
    <Field label={c.phone} value={phone} onChangeText={(v) => setPhone(formatPhone(v))} keyboardType="phone-pad" autoComplete="tel" maxLength={17} />
  );

  const resendRow = (onResend: () => void) => (
    <View style={s.linkRow}>
      {countdown > 0 ? (
        <Text style={{ fontSize: 14, color: colors.textMuted }}>
          {c.resendIn}: 0:{String(countdown).padStart(2, "0")}
        </Text>
      ) : (
        <TouchableOpacity onPress={onResend} disabled={loading} hitSlop={8}>
          <Text style={[s.link, { color: colors.primary }]}>{c.resend}</Text>
        </TouchableOpacity>
      )}
      <TouchableOpacity onPress={() => go(mode === "otp" ? "register" : "forgot")} hitSlop={8}>
        <Text style={[s.link, { color: colors.primary }]}>{c.changeNumber}</Text>
      </TouchableOpacity>
    </View>
  );

  const authForm = () => {
    const titles: Record<Mode, [string, string]> = {
      login: [c.login, c.loginSub],
      register: [c.register, c.registerSub],
      otp: [c.otpTitle, `${phone} ${c.otpSub}`],
      setpass: [c.passTitle, c.passSub],
      forgot: [c.forgot, c.forgotSub],
      forgotReset: [c.forgot, `${phone} ${c.otpSub}`],
    };
    const [title, sub] = titles[mode];
    const showBack = mode !== "login" && mode !== "register";
    return (
      <View style={{ paddingHorizontal: 24, paddingTop: insets.top + 20 }}>
        {showBack ? (
          <TouchableOpacity
            style={[ui.iconBtn, { borderColor: colors.border, marginBottom: 18 }]}
            onPress={() => go(mode === "otp" ? "register" : mode === "setpass" ? "otp" : mode === "forgotReset" ? "forgot" : "login")}
            accessibilityLabel={c.back}
          >
            <IcBack size={20} color={colors.text} strokeWidth={2} />
          </TouchableOpacity>
        ) : null}
        <Text style={[s.title, { color: colors.text }]}>{title}</Text>
        <Text style={[s.sub, { color: colors.textSecondary }]}>{sub}</Text>

        {mode === "login" || mode === "register" ? (
          <View style={{ marginTop: 22, marginBottom: 20 }}>
            <Segmented<Mode> value={mode} onChange={go} options={[{ value: "login", label: c.login }, { value: "register", label: c.register }]} />
          </View>
        ) : (
          <View style={{ height: 22 }} />
        )}

        {mode === "login" && (
          <>
            {phoneField}
            <Field label={c.password} value={password} onChangeText={setPassword} placeholder={c.password} autoComplete="password" {...passProps} />
            <TouchableOpacity onPress={() => go("forgot")} style={{ alignSelf: "flex-end", paddingVertical: 6, marginTop: -6, marginBottom: 10 }} hitSlop={6}>
              <Text style={[s.link, { color: colors.primary }]}>{c.forgotLink}</Text>
            </TouchableOpacity>
            <Button title={c.login} loading={loading} onPress={handleLogin} />
          </>
        )}

        {mode === "register" && (
          <>
            <Field label={c.name} value={name} onChangeText={setName} placeholder={c.namePh} autoComplete="name" />
            {phoneField}
            <View style={{ height: 6 }} />
            <Button title={c.getCode} loading={loading} disabled={!phoneComplete(phone)} onPress={handleSendRegisterOtp} />
          </>
        )}

        {(mode === "otp" || mode === "forgotReset") && (
          <>
            <Text style={[ui.label, { color: colors.textSecondary }]}>{c.code}</Text>
            <TextInput
              value={otpCode}
              onChangeText={(v) => setOtpCode(v.replace(/\D/g, ""))}
              keyboardType="number-pad"
              maxLength={6}
              textContentType="oneTimeCode"
              autoComplete="sms-otp"
              placeholder="000000"
              placeholderTextColor={colors.textMuted}
              autoFocus
              accessibilityLabel={c.code}
              style={[s.otp, { color: colors.text, borderColor: colors.primary, backgroundColor: colors.card }]}
            />
            {resendRow(mode === "otp" ? handleSendRegisterOtp : handleSendForgotOtp)}
          </>
        )}

        {mode === "otp" && <Button title={c.next} disabled={otpCode.length !== 6} onPress={() => go("setpass")} style={{ marginTop: 8 }} />}

        {(mode === "setpass" || mode === "forgotReset") && (
          <View style={{ marginTop: mode === "forgotReset" ? 12 : 0 }}>
            <Field label={c.newPass} value={newPassword} onChangeText={setNewPassword} placeholder={c.newPassPh} autoComplete="new-password" {...passProps} />
            <Field label={c.repeat} value={confirmPassword} onChangeText={setConfirmPassword} placeholder={c.repeat} autoComplete="new-password" {...passProps} />
            <Button
              title={mode === "setpass" ? c.create : c.save}
              loading={loading}
              onPress={mode === "setpass" ? handleCreateAccount : handleResetPassword}
              style={{ marginTop: 6 }}
            />
          </View>
        )}

        {mode === "forgot" && (
          <>
            {phoneField}
            <Button title={c.getCode} loading={loading} disabled={!phoneComplete(phone)} onPress={handleSendForgotOtp} style={{ marginTop: 4 }} />
          </>
        )}
      </View>
    );
  };

  const settingsBlock = (
    <View style={{ paddingHorizontal: 20, marginTop: 28 }}>
      <Text style={[s.sectionTitle, { color: colors.text }]}>{c.settings}</Text>
      <Card style={{ paddingHorizontal: 16, paddingVertical: 6 }}>
        <View style={s.settingRow}>
          <View style={s.rowLeft}>
            <IcGlobe size={19} color={colors.textSecondary} strokeWidth={1.8} />
            <Text style={[s.rowText, { color: colors.text }]}>{c.language}</Text>
          </View>
          <View style={{ width: 150 }}>
            <Segmented<Language> value={lang} onChange={setLang} options={[{ value: "uz", label: "UZ" }, { value: "ru", label: "RU" }, { value: "en", label: "EN" }]} />
          </View>
        </View>
        <View style={[s.settingRow, { borderTopWidth: 1, borderTopColor: colors.border }]}>
          <View style={s.rowLeft}>
            <IcSun size={19} color={colors.textSecondary} strokeWidth={1.8} />
            <Text style={[s.rowText, { color: colors.text }]}>{c.theme}</Text>
          </View>
          <View style={{ width: 170 }}>
            <Segmented value={theme} onChange={setTheme} options={[{ value: "light", label: c.light }, { value: "dark", label: c.dark }]} />
          </View>
        </View>
      </Card>

      <Text style={[s.sectionTitle, { color: colors.text, marginTop: 22 }]}>{c.contact}</Text>
      <Card style={{ paddingHorizontal: 16 }}>
        {[
          { icon: IcPhone, label: c.call, value: STORE_PHONE, url: "tel:+998911866661" },
          { icon: IcSend, label: "Telegram", value: "@medax_uz", url: "https://t.me/medax_uz" },
          { icon: IcImage, label: "Instagram", value: "@medax_uz", url: "https://instagram.com/medax_uz" },
          { icon: IcMail, label: "Email", value: "medaxuz@gmail.com", url: "mailto:medaxuz@gmail.com" },
          { icon: IcPin, label: c.map, value: "Namangan, Beruniy 2", url: "https://maps.app.goo.gl/Fi3DDmU1kWqHVST4A" },
          { icon: IcShield, label: c.privacy, value: "", url: "https://medax.uz/privacy", external: true },
        ].map((row, i) => {
          const Icon = row.icon;
          return (
            <TouchableOpacity
              key={row.label}
              onPress={() => Linking.openURL(row.url)}
              accessibilityRole="link"
              style={[s.linkItem, i > 0 && { borderTopWidth: 1, borderTopColor: colors.border }]}
            >
              <View style={s.rowLeft}>
                <Icon size={19} color={colors.textSecondary} strokeWidth={1.8} />
                <Text style={[s.rowText, { color: colors.text }]}>{row.label}</Text>
              </View>
              <View style={[s.rowLeft, { gap: 6 }]}>
                {row.value ? (
                  <Text style={{ fontSize: 14, color: colors.textMuted }} numberOfLines={1}>
                    {row.value}
                  </Text>
                ) : null}
                {row.external ? (
                  <IcExternal size={16} color={colors.textMuted} strokeWidth={2} />
                ) : (
                  <IcChevron size={16} color={colors.textMuted} strokeWidth={2} />
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </Card>
    </View>
  );

  const loggedIn = customer && (
    <>
      <View style={[s.profileHead, { paddingTop: insets.top + 16, backgroundColor: colors.headerBg, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={pickAvatar} accessibilityRole="button" accessibilityLabel={t("profile_change_photo")} style={s.avatarWrap}>
          {customer.avatar ? (
            <Image source={{ uri: getImageUrl(customer.avatar) }} style={s.avatar} />
          ) : (
            <View style={[s.avatar, { backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" }]}>
              <Text style={{ fontSize: 22, fontWeight: "600", color: colors.primary }}>{(customer.name || "M").charAt(0).toUpperCase()}</Text>
            </View>
          )}
          <View style={[s.camBadge, { backgroundColor: colors.button, borderColor: colors.card }]}>
            {uploadingAvatar ? <ActivityIndicator size="small" color="#fff" /> : <IcCamera size={13} color="#FFFFFF" strokeWidth={2} />}
          </View>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[s.userName, { color: colors.text }]} numberOfLines={1}>
            {customer.name}
          </Text>
          {customer.phone ? <Text style={{ fontSize: 14, color: colors.textMuted, marginTop: 2 }}>{formatPhone(customer.phone)}</Text> : null}
        </View>
      </View>

      <View style={{ paddingHorizontal: 20, marginTop: 18 }}>
        <Text style={[s.sectionTitle, { color: colors.text }]}>{c.orders}</Text>
        {loadingData && orders.length === 0 ? (
          <ActivityIndicator color={colors.primary} style={{ marginVertical: 18 }} />
        ) : orders.length === 0 ? (
          <Card style={{ padding: 20, alignItems: "center" }}>
            <Text style={{ fontSize: 14.5, color: colors.textMuted }}>{c.noOrders}</Text>
          </Card>
        ) : (
          <View style={{ gap: 10 }}>
            {orders.slice(0, 10).map((o) => {
              const st = statusInfo(o.status, lang);
              const first = o.items?.[0];
              const img = first?.product?.images?.[0]?.thumbUrl || first?.product?.images?.[0]?.url;
              const qty = (o.items || []).reduce((n: number, it: any) => n + (it.quantity || 0), 0);
              const note = o.status === "CANCELED" && o.cancelReason ? o.cancelReason : st.note;
              return (
                <Card key={o.id} style={{ padding: 14 }}>
                  <View style={s.orderTop}>
                    <Text style={[s.orderCode, { color: colors.text }]}>{o.code || `#${o.id}`}</Text>
                    <StatusPill label={st.label} tone={st.tone} />
                  </View>
                  <View style={s.orderMid}>
                    <View style={[s.orderImg, { backgroundColor: colors.inputBg }]}>
                      {img ? <Image source={{ uri: getImageUrl(img) }} style={{ width: "100%", height: "100%" }} /> : <IcImage size={20} color={colors.textMuted} strokeWidth={1.4} />}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: "500", color: colors.text }} numberOfLines={1}>
                        {first?.product?.name || first?.productName || "—"}
                        {o.items?.length > 1 ? ` +${o.items.length - 1}` : ""}
                      </Text>
                      <Text style={{ fontSize: 13, color: colors.textMuted, marginTop: 2 }}>
                        {qty} {lang === "ru" ? "шт." : lang === "en" ? "pcs" : "dona"} · {fmtDate(o.createdAt, lang, true)}
                      </Text>
                    </View>
                  </View>
                  {note ? (
                    <Text style={[s.orderNote, { color: colors.textSecondary, borderTopColor: colors.border }]} numberOfLines={3}>
                      {note}
                    </Text>
                  ) : null}
                </Card>
              );
            })}
          </View>
        )}

        {notifications.length > 0 ? (
          <>
            <View style={[s.notifHead]}>
              <Text style={[s.sectionTitle, { color: colors.text, marginBottom: 0 }]}>
                {c.notifs}
                {unreadCount > 0 ? ` · ${unreadCount}` : ""}
              </Text>
              {unreadCount > 0 ? (
                <TouchableOpacity onPress={handleMarkAllRead} hitSlop={8}>
                  <Text style={[s.link, { color: colors.primary }]}>{c.markRead}</Text>
                </TouchableOpacity>
              ) : null}
            </View>
            <Card style={{ paddingHorizontal: 14 }}>
              {notifications.slice(0, 5).map((n, i) => (
                <View key={n.id} style={[s.notif, i > 0 && { borderTopWidth: 1, borderTopColor: colors.border }]}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    {!n.isRead ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary }} /> : null}
                    <Text style={{ flex: 1, fontSize: 14, fontWeight: "600", color: colors.text }}>{n.title}</Text>
                    <Text style={{ fontSize: 12, color: colors.textMuted }}>
                      {fmtDate(n.createdAt, lang)}
                    </Text>
                  </View>
                  <Text style={{ fontSize: 13.5, lineHeight: 19, color: colors.textSecondary, marginTop: 4 }}>{n.body}</Text>
                </View>
              ))}
            </Card>
          </>
        ) : null}
      </View>
    </>
  );

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: customer ? colors.bg : colors.card }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        refreshControl={customer ? <RefreshControl refreshing={loadingData && orders.length > 0} onRefresh={loadData} colors={[colors.primary]} tintColor={colors.primary} /> : undefined}
      >
        {customer ? loggedIn : authForm()}

        {customer || mode === "login" || mode === "register" ? settingsBlock : null}

        {customer ? (
          <View style={{ paddingHorizontal: 20, marginTop: 24 }}>
            <Button title={c.logout} variant="danger" onPress={handleLogout} />
            <TouchableOpacity
              onPress={() => {
                setDeletePassword("");
                setDeleteOpen(true);
              }}
              style={{ alignSelf: "center", paddingVertical: 14 }}
            >
              <Text style={{ fontSize: 13.5, color: colors.textMuted, textDecorationLine: "underline" }}>{c.del}</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </ScrollView>

      {/* Hisobni o'chirish (Google Play talabi) */}
      <Modal visible={deleteOpen} transparent animationType="fade" onRequestClose={() => !deleting && setDeleteOpen(false)}>
        <View style={[s.scrim, { backgroundColor: colors.scrim }]}>
          <View style={[s.modal, { backgroundColor: colors.card }]}>
            <Text style={{ fontSize: 19, fontWeight: "700", color: colors.text }}>{c.del}</Text>
            <Text style={{ fontSize: 14, lineHeight: 20, color: colors.textSecondary, marginTop: 8, marginBottom: 16 }}>{c.delText}</Text>
            {customer?.hasPassword ? (
              <Field label={c.password} value={deletePassword} onChangeText={setDeletePassword} placeholder={c.delPass} secureTextEntry autoCapitalize="none" autoCorrect={false} />
            ) : null}
            <View style={{ flexDirection: "row", gap: 10 }}>
              <Button title={c.cancel} variant="secondary" onPress={() => setDeleteOpen(false)} disabled={deleting} style={{ flex: 1 }} />
              <Button title={c.delBtn} variant="danger" loading={deleting} onPress={handleDeleteAccount} style={{ flex: 1 }} />
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  title: { fontSize: 26, fontWeight: "700", letterSpacing: -0.5 },
  sub: { fontSize: 15, lineHeight: 22, marginTop: 8 },
  link: { fontSize: 14, fontWeight: "500" },
  linkRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 12 },
  otp: { height: 58, borderWidth: 1.5, borderRadius: 12, textAlign: "center", fontSize: 26, fontWeight: "600", letterSpacing: 12 },
  sectionTitle: { fontSize: 17, fontWeight: "600", marginBottom: 10 },
  settingRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 10, gap: 12 },
  rowLeft: { flexDirection: "row", alignItems: "center", gap: 12, flexShrink: 1 },
  rowText: { fontSize: 15 },
  linkItem: { minHeight: 52, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  profileHead: { flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1 },
  avatarWrap: { width: 60, height: 60 },
  avatar: { width: 60, height: 60, borderRadius: 30 },
  camBadge: { position: "absolute", right: -2, bottom: -2, width: 24, height: 24, borderRadius: 12, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  userName: { fontSize: 18, fontWeight: "600" },
  orderTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  orderCode: { fontSize: 14.5, fontWeight: "600" },
  orderMid: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 12 },
  orderImg: { width: 48, height: 48, borderRadius: 10, overflow: "hidden", alignItems: "center", justifyContent: "center" },
  orderNote: { fontSize: 13, marginTop: 12, paddingTop: 10, borderTopWidth: 1, lineHeight: 18 },
  notifHead: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", marginTop: 24, marginBottom: 10 },
  notif: { paddingVertical: 12 },
  scrim: { flex: 1, justifyContent: "center", padding: 24 },
  modal: { borderRadius: 20, padding: 22 },
});
