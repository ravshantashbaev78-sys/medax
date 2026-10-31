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
  Platform,
  KeyboardAvoidingView,
  Keyboard,
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
  fetchNotifications,
  markNotificationsRead,
  fetchCustomerOrders,
} from "../api";
import {
  ShieldIcon,
  MedaxEmblem,
  UserIcon,
  BoltIcon,
  CertificateIcon,
} from "../components/Icons";
import { SuccessModal } from "../components/SuccessModal";

export function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { customer, logout, loginWithToken, refreshProfile } = useAuth();
  const { theme, colors, setTheme } = useTheme();
  const { lang, setLang, t } = useI18n();

  // Auth form state (when not logged in)
  const [authMode, setAuthMode] = useState<"phone" | "otp" | "password" | "set_password">("phone");
  const [phone, setPhone] = useState("+998 ");
  const [name, setName] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  // Buyurtmalar holati
  const [orders, setOrders] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  // Keyboard listener
  useEffect(() => {
    const showSub = Keyboard.addListener("keyboardDidShow", (e) => {
      setKeyboardHeight(e.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener("keyboardDidHide", () => {
      setKeyboardHeight(0);
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // Chiroyli muvaffaqiyat modal oynasi
  const [successModal, setSuccessModal] = useState<{ visible: boolean; title: string; message: string }>({
    visible: false,
    title: "",
    message: "",
  });

  // Bildirishnomalar holati
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loadingNotifications, setLoadingNotifications] = useState(false);

  const loadOrders = async () => {
    if (!customer) return;
    setLoadingOrders(true);
    try {
      const data = await fetchCustomerOrders();
      setOrders(Array.isArray(data) ? data : []);
    } catch {
      // ignore
    } finally {
      setLoadingOrders(false);
    }
  };

  const loadNotifications = async () => {
    if (!customer) return;
    setLoadingNotifications(true);
    try {
      const res = await fetchNotifications();
      if (res && res.notifications) {
        setNotifications(res.notifications);
        setUnreadCount(res.unreadCount || 0);
      }
    } catch {
      // ignore
    } finally {
      setLoadingNotifications(false);
    }
  };

  useEffect(() => {
    if (customer) {
      loadOrders();
      loadNotifications();
    } else {
      setOrders([]);
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [customer]);

  const handleMarkAllRead = async () => {
    try {
      await markNotificationsRead();
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch {
      // ignore
    }
  };

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
        setOtpCode("");
        setAuthMode("otp");
      } else {
        if (res.error && res.error.includes("allaqachon ro'yxatdan o'tgan")) {
          Alert.alert("Ro'yxatdan o'tilgan", "Ushbu raqam allaqachon ro'yxatdan o'tgan. Parolingiz bilan kiring.");
          setAuthMode("password");
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

  const handleVerifyOtp = async () => {
    if (otpCode.trim().length !== 6) {
      Alert.alert(t("error"), "Iltimos, 6 xonali tasdiqlash kodini to'liq kiriting");
      return;
    }
    // Parol o'rnatish bosqichiga o'tamiz
    setAuthMode("set_password");
  };

  const handleSetPasswordAndFinish = async (skipPassword = false) => {
    if (!skipPassword) {
      if (newPassword.length < 6) {
        Alert.alert(t("error"), "Parol kamida 6 ta belgidan iborat bo'lishi kerak");
        return;
      }
      if (newPassword !== confirmPassword) {
        Alert.alert(t("error"), "Kiritilgan parollar bir-biriga mos kelmadi");
        return;
      }
    }

    setLoading(true);
    try {
      const res = await verifyCustomerOtp(phone, otpCode, name, skipPassword ? undefined : newPassword);
      if (res.ok && res.token && res.customer) {
        await loginWithToken(res.token, res.customer);
        setSuccessModal({
          visible: true,
          title: t("auth_success_title"),
          message: `${t("auth_welcome")}, ${res.customer.name}!`,
        });
        setAuthMode("phone");
        setOtpCode("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        Alert.alert(t("error"), res.error || "Xatolik yuz berdi");
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
        setSuccessModal({
          visible: true,
          title: t("auth_success_title"),
          message: `${t("auth_welcome")}, ${res.customer.name}!`,
        });
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

  const handleLogout = async () => {
    setPhone("+998 ");
    setName("");
    setOtpCode("");
    setPassword("");
    setAuthMode("phone");
    await logout();
  };

  const displayName = customer?.name && customer.name !== "*" ? customer.name : "Mijoz";
  const avatarLetter = displayName.charAt(0).toUpperCase();

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "NEW":
        return { label: lang === "ru" ? "Новый" : lang === "en" ? "New" : "Yangi", bg: "#fef3c7", text: "#d97706" };
      case "CONFIRMED":
        return { label: lang === "ru" ? "Подтвержден" : lang === "en" ? "Confirmed" : "Tasdiqlangan", bg: "#e0f2fe", text: "#0284c7" };
      case "READY":
        return { label: lang === "ru" ? "Готов" : lang === "en" ? "Ready" : "Tayyor", bg: "#f0fdf4", text: "#16a34a" };
      case "DONE":
        return { label: lang === "ru" ? "Выполнен" : lang === "en" ? "Done" : "Bajarildi", bg: "#dcfce7", text: "#15803d" };
      case "CANCELED":
        return { label: lang === "ru" ? "Отменен" : lang === "en" ? "Canceled" : "Bekor qilindi", bg: "#fee2e2", text: "#dc2626" };
      default:
        return { label: status, bg: "#f1f5f9", text: "#64748b" };
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        style={[styles.container, { backgroundColor: colors.bg }]}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + 14,
            paddingBottom: keyboardHeight > 0 ? keyboardHeight + 80 : 36,
          },
        ]}
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

          {/* Mening buyurtmalarim kartasi */}
          <View style={[styles.ordersCard, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
            <View style={styles.ordersHeader}>
              <View style={styles.ordersTitleRow}>
                <Text style={[styles.infoTitle, { color: colors.text, marginBottom: 0 }]}>📦 {t("my_orders_title")}</Text>
                {orders.length > 0 && (
                  <View style={[styles.ordersCountBadge, { backgroundColor: colors.primary }]}>
                    <Text style={styles.ordersCountText}>{orders.length}</Text>
                  </View>
                )}
              </View>
              <TouchableOpacity onPress={loadOrders} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={[styles.refreshOrdersText, { color: colors.primary }]}>🔄 Yangilash</Text>
              </TouchableOpacity>
            </View>

            {loadingOrders && orders.length === 0 ? (
              <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 14 }} />
            ) : orders.length === 0 ? (
              <Text style={[styles.emptyOrdersText, { color: colors.textMuted }]}>
                {t("my_orders_empty")}
              </Text>
            ) : (
              <View style={styles.ordersList}>
                {orders.slice(0, 5).map((order) => {
                  const badge = getStatusBadge(order.status);
                  return (
                    <View
                      key={order.id}
                      style={[
                        styles.orderItem,
                        { backgroundColor: colors.card, borderColor: colors.border },
                      ]}
                    >
                      <View style={styles.orderItemTop}>
                        <Text style={[styles.orderCode, { color: colors.text }]}>
                          #{order.code || order.id}
                        </Text>
                        <View style={[styles.orderStatusPill, { backgroundColor: badge.bg }]}>
                          <Text style={[styles.orderStatusText, { color: badge.text }]}>
                            {badge.label}
                          </Text>
                        </View>
                      </View>

                      {order.items && order.items.length > 0 && (
                        <Text style={[styles.orderItemsPreview, { color: colors.textMuted }]} numberOfLines={1}>
                          {order.items.map((it: any) => `${it.product?.name || "Mahsulot"} (${it.quantity || 1}x)`).join(", ")}
                        </Text>
                      )}

                      <View style={styles.orderItemBottom}>
                        <Text style={[styles.orderDate, { color: colors.textMuted }]}>
                          {new Date(order.createdAt).toLocaleDateString([], {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </Text>
                        <Text style={[styles.orderTotal, { color: colors.primary }]}>
                          {Number(order.totalPrice || 0).toLocaleString()} so'm
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>

          {/* Bildirishnomalar kartasi */}
          <View style={[styles.notificationsCard, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
            <View style={styles.notifHeader}>
              <View style={styles.notifTitleRow}>
                <Text style={[styles.infoTitle, { color: colors.text, marginBottom: 0 }]}>🔔 {t("notif_title")}</Text>
                {unreadCount > 0 && (
                  <View style={styles.unreadBadge}>
                    <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
                  </View>
                )}
              </View>
              {unreadCount > 0 && (
                <TouchableOpacity onPress={handleMarkAllRead} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Text style={[styles.markReadText, { color: colors.primary }]}>{t("notif_mark_read")}</Text>
                </TouchableOpacity>
              )}
            </View>

            {loadingNotifications && notifications.length === 0 ? (
              <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 12 }} />
            ) : notifications.length === 0 ? (
              <Text style={[styles.emptyNotifText, { color: colors.textMuted }]}>
                {t("notif_empty")}
              </Text>
            ) : (
              <View style={styles.notifList}>
                {notifications.slice(0, 5).map((n) => (
                  <View
                    key={n.id}
                    style={[
                      styles.notifItem,
                      {
                        borderBottomColor: colors.border,
                        backgroundColor: n.isRead ? "transparent" : colors.primary + "14",
                      },
                    ]}
                  >
                    <View style={styles.notifItemHeader}>
                      <Text style={[styles.notifItemTitle, { color: colors.text }]}>{n.title}</Text>
                      {!n.isRead && <View style={[styles.blueDot, { backgroundColor: colors.primary }]} />}
                    </View>
                    <Text style={[styles.notifItemBody, { color: colors.textMuted }]}>{n.body}</Text>
                    <Text style={[styles.notifItemTime, { color: colors.textMuted }]}>
                      {new Date(n.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
            <Text style={styles.logoutBtnText}>{t("profile_logout")}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        /* Foydalanuvchi kirmagan holat: SMS OTP va Parol orqali kirish */
        <View style={[styles.loginCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.emblemWrap}>
            <MedaxEmblem size={56} />
            <View style={{ flexDirection: "row", marginTop: 8 }}>
              <Text style={{ fontSize: 24, fontWeight: "900", color: "#0284c7" }}>Med</Text>
              <Text style={{ fontSize: 24, fontWeight: "900", color: "#16a34a" }}>ax</Text>
            </View>
            <Text style={{ fontSize: 8.5, fontWeight: "900", color: "#0f172a", letterSpacing: 0.8, marginTop: 1 }}>
              MEDTEXNIKA MARKAZI
            </Text>
          </View>
          <Text style={[styles.loginTitle, { color: colors.text }]}>{t("profile_title")}</Text>
          <Text style={[styles.loginSub, { color: colors.textMuted }]}>
            {authMode === "otp"
              ? `${phone} raqamiga yuborilgan 6 xonali SMS kodni kiriting`
              : authMode === "set_password"
              ? "Akkauntingiz uchun doimiy parol o'rnating. Keyingi safar SMS kutmasdan to'g'ridan-to'g'ri kirasiz."
              : authMode === "password"
              ? "Parolingiz orqali tizimga kiring"
              : t("profile_login_sub")}
          </Text>

          {authMode === "phone" && (
            <View style={styles.formWidth}>
              <Text style={[styles.inputLabel, { color: colors.textMuted }]}>{t("auth_phone_label")}</Text>
              <TextInput
                style={[styles.inputField, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
                value={phone}
                onChangeText={formatPhone}
                keyboardType="phone-pad"
                placeholder="+998 90 123 45 67"
                placeholderTextColor={colors.textMuted}
              />

              <Text style={[styles.inputLabel, { color: colors.textMuted }]}>{t("auth_name_label")}</Text>
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
                  <Text style={styles.submitBtnText}>{t("auth_get_code")}</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.switchLink}
                onPress={() => {
                  setOtpCode("");
                  setAuthMode("password");
                }}
              >
                <Text style={[styles.switchLinkText, { color: colors.primary }]}>{t("auth_password_link")}</Text>
              </TouchableOpacity>
            </View>
          )}

          {authMode === "otp" && (
            <View style={styles.formWidth}>
              <Text style={[styles.inputLabel, { color: colors.textMuted }]}>{t("auth_otp_title")}</Text>
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
                placeholder="------"
                placeholderTextColor="rgba(148, 163, 184, 0.35)"
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
                  <Text style={styles.submitBtnText}>{t("auth_verify_btn")}</Text>
                )}
              </TouchableOpacity>

              <View style={styles.otpActions}>
                {countdown > 0 ? (
                  <Text style={[styles.timerText, { color: colors.textMuted }]}>Qayta yuborish: {countdown}s</Text>
                ) : (
                  <TouchableOpacity onPress={handleSendOtp}>
                    <Text style={[styles.resendText, { color: colors.primary }]}>{t("cart_resend_code")}</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  onPress={() => {
                    setOtpCode("");
                    setAuthMode("phone");
                  }}
                >
                  <Text style={[styles.backText, { color: colors.textMuted }]}>{t("auth_change_phone")}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {authMode === "set_password" && (
            <View style={styles.formWidth}>
              <Text style={[styles.inputLabel, { color: colors.textMuted }]}>Yangi parol (kamida 6 ta belgi)</Text>
              <TextInput
                style={[styles.inputField, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry
                placeholder="••••••••"
                placeholderTextColor={colors.textMuted}
                autoFocus
              />

              <Text style={[styles.inputLabel, { color: colors.textMuted }]}>Parolni qayta tasdiqlang</Text>
              <TextInput
                style={[styles.inputField, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                placeholder="••••••••"
                placeholderTextColor={colors.textMuted}
              />

              <TouchableOpacity
                style={[styles.submitBtn, { backgroundColor: colors.primary }]}
                onPress={() => handleSetPasswordAndFinish(false)}
                disabled={loading}
                activeOpacity={0.88}
              >
                {loading ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.submitBtnText}>Ro'yxatdan o'tishni yakunlash ✓</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.switchLink}
                onPress={() => handleSetPasswordAndFinish(true)}
              >
                <Text style={[styles.switchLinkText, { color: colors.textMuted }]}>
                  Parolsiz davom etish (faqat SMS orqali) →
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {authMode === "password" && (
            <View style={styles.formWidth}>
              <Text style={[styles.inputLabel, { color: colors.textMuted }]}>{t("auth_phone_label")}</Text>
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
          onPress={() => Linking.openURL("mailto:medaxuz@gmail.com?subject=Medax%20murojaat")}
        >
          <Text style={styles.contactItemIcon}>✉️</Text>
          <View>
            <Text style={[styles.contactItemTitle, { color: colors.textMuted }]}>{t("contact_email")}</Text>
            <Text style={[styles.contactItemValue, { color: colors.primary }]}>medaxuz@gmail.com</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.contactItemRow, { borderTopColor: colors.border }]}
          onPress={() => Linking.openURL("https://maps.app.goo.gl/Fi3DDmU1kWqHVST4A")}
          activeOpacity={0.7}
        >
          <Text style={styles.contactItemIcon}>📍</Text>
          <View style={{ flex: 1 }}>
            <Text style={[styles.contactItemTitle, { color: colors.textMuted }]}>{t("contact_store")}</Text>
            <Text style={[styles.contactItemValue, { color: colors.text }]}>
              {t("contact_address")}
            </Text>
            <Text style={{ fontSize: 11.5, color: colors.primary, fontWeight: "700", marginTop: 4 }}>
              Xaritada ko'rish ↗
            </Text>
          </View>
        </TouchableOpacity>
      </View>
    </ScrollView>

    {/* Chiroyli muvaffaqiyat modal oynasi */}
    <SuccessModal
      visible={successModal.visible}
      title={successModal.title}
      message={successModal.message}
      buttonText={t("btn_continue")}
      onClose={() => setSuccessModal({ visible: false, title: "", message: "" })}
    />
  </KeyboardAvoidingView>
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

  ordersCard: { width: "100%", borderRadius: 16, padding: 14, borderWidth: 1, marginBottom: 16 },
  ordersHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  ordersTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  ordersCountBadge: { borderRadius: 10, paddingHorizontal: 7, paddingVertical: 1 },
  ordersCountText: { color: "#ffffff", fontSize: 11, fontWeight: "800" },
  refreshOrdersText: { fontSize: 12, fontWeight: "700" },
  emptyOrdersText: { fontSize: 13, textAlign: "center", paddingVertical: 14 },
  ordersList: { gap: 10 },
  orderItem: { padding: 12, borderRadius: 12, borderWidth: 1 },
  orderItemTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  orderCode: { fontSize: 14, fontWeight: "800" },
  orderStatusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  orderStatusText: { fontSize: 11.5, fontWeight: "700" },
  orderItemsPreview: { fontSize: 12.5, lineHeight: 18, marginBottom: 8 },
  orderItemBottom: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  orderDate: { fontSize: 11.5 },
  orderTotal: { fontSize: 13.5, fontWeight: "800" },

  notificationsCard: { width: "100%", borderRadius: 16, padding: 14, borderWidth: 1, marginBottom: 16 },
  notifHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  notifTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  unreadBadge: { backgroundColor: "#ef4444", borderRadius: 10, paddingHorizontal: 6, paddingVertical: 1 },
  unreadBadgeText: { color: "#ffffff", fontSize: 11, fontWeight: "800" },
  markReadText: { fontSize: 12, fontWeight: "700" },
  emptyNotifText: { fontSize: 13, textAlign: "center", paddingVertical: 14 },
  notifList: { gap: 8 },
  notifItem: { padding: 10, borderRadius: 10, borderBottomWidth: 1 },
  notifItemHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  notifItemTitle: { fontSize: 13.5, fontWeight: "700", flex: 1 },
  blueDot: { width: 8, height: 8, borderRadius: 4, marginLeft: 6 },
  notifItemBody: { fontSize: 12.5, lineHeight: 17, marginBottom: 4 },
  notifItemTime: { fontSize: 11, textAlign: "right" },

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
