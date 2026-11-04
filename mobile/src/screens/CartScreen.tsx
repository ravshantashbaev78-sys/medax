import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  Alert,
  ActivityIndicator,
  Linking,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { submitOrder, sendOrderOtp, getImageUrl, formatPrice } from "../api";
import { useTheme } from "../context/ThemeContext";
import { useI18n, localizeProductName } from "../context/I18nContext";
import { CartIcon, CloseIcon, ShieldIcon, BoltIcon, MapPinIcon, UserIcon } from "../components/Icons";
import { SuccessModal } from "../components/SuccessModal";

export function CartScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { lang, t } = useI18n();
  const { colors, theme } = useTheme();
  const { items, updateQuantity, removeFromCart, clearCart, totalPrice, totalItems } = useCart();
  const { customer, token, logout } = useAuth();

  const [customerName, setCustomerName] = useState(customer?.name || "");
  const [phone, setPhone] = useState(customer?.phone || "+998 ");
  const [address, setAddress] = useState("");
  const [comment, setComment] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<string>("Do'konda to'lash (Olib ketishda)");
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [resendTimer, setResendTimer] = useState(0);
  const [orderSuccessModal, setOrderSuccessModal] = useState<{ visible: boolean; orderCode: string }>({
    visible: false,
    orderCode: "",
  });

  useEffect(() => {
    let t: any;
    if (resendTimer > 0) {
      t = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
    }
    return () => clearTimeout(t);
  }, [resendTimer]);

  const hasUnpriced = items.some((i) => !i.product.priceFrom || Number(i.product.priceFrom) <= 0);

  const handleCheckout = async () => {
    if (!customerName.trim()) {
      Alert.alert("Diqqat", "Iltimos, to'liq ismingizni kiriting.");
      return;
    }
    const cleanPhone = phone.replace(/\D/g, "");
    if (cleanPhone.length < 9) {
      Alert.alert("Diqqat", "Iltimos, to'g'ri telefon raqamini kiriting (+998 __ ___ __ __).");
      return;
    }
    if (!address.trim()) {
      Alert.alert("Diqqat", "Iltimos, yetkazib berish yoki olib ketish manzilini kiriting.");
      return;
    }

    // Agar mijoz tizimga kirmagan bo'lsa va hali SMS kod yuborilmagan bo'lsa
    if (!token && !otpSent) {
      setLoading(true);
      const otpRes = await sendOrderOtp(phone.trim());
      setLoading(false);
      if (!otpRes.ok) {
        Alert.alert("Xatolik", otpRes.error || "SMS tasdiqlash kodini yuborishda xatolik yuz berdi.");
        return;
      }
      setOtpSent(true);
      setOtpCode("");
      setResendTimer(otpRes.resendIn || 60);
      Alert.alert("SMS yuborildi 📩", "Telefoningizga 6 xonali tasdiqlash kodi yuborildi. Kodni kiriting.");
      return;
    }

    // Agar tizimga kirmagan bo'lsa va kod kiritilmagan bo'lsa
    if (!token && otpSent && otpCode.trim().length !== 6) {
      Alert.alert("Diqqat", "SMS orqali kelgan 6 xonali tasdiqlash kodini kiriting.");
      return;
    }

    const selectedMethod = hasUnpriced ? "cash" : paymentMethod;

    setLoading(true);
    const orderItems = items.map((i) => ({
      productId: i.product.id,
      quantity: i.quantity,
    }));

    const res = await submitOrder({
      customerName: customerName.trim(),
      phone: phone.trim(),
      deliveryAddress: t("contact_address") || "Namangan sh., Ozod MFY, Abu Rayhon Beruniy ko'chasi, 2-uy",
      comment: comment.trim(),
      paymentMethod: selectedMethod,
      items: orderItems,
      code: !token ? otpCode.trim() : undefined,
    });

    setLoading(false);

    if (res.ok) {
      clearCart();
      setOtpSent(false);
      setOtpCode("");
      setOrderSuccessModal({
        visible: true,
        orderCode: String(res.code || res.orderId || "yangi"),
      });
    } else {
      if (token && res.error && (res.error.includes("SMS tasdiqlash kodini") || res.error.includes("401"))) {
        await logout();
        setOtpSent(true);
        Alert.alert(
          "Sessiya yangilandi",
          "Avvalgi profilingiz sessiyasi eskirgan. Telefoningizga tasdiqlash kodi yuborildi, kodni kiritib buyurtmani tasdiqlang."
        );
        await sendOrderOtp(phone.trim());
        return;
      }
      Alert.alert("Xatolik", res.error || "Buyurtma yuborishda xatolik yuz berdi");
    }
  };

  if (items.length === 0) {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: colors.bg, paddingTop: insets.top + 20 }]}>
        <View style={[styles.emptyIconCircle, { backgroundColor: colors.inputBg }]}>
          <CartIcon size={46} color={colors.primary} />
        </View>
        <Text style={[styles.emptyTitle, { color: colors.text }]}>{t("cart_empty_title")}</Text>
        <Text style={[styles.emptyDesc, { color: colors.textMuted }]}>
          {t("cart_empty_sub")}
        </Text>
        <TouchableOpacity
          style={[styles.shopBtn, { backgroundColor: "#0284c7" }]}
          onPress={() => navigation.navigate("Katalog")}
          activeOpacity={0.85}
        >
          <Text style={styles.shopBtnText}>{t("cart_go_catalog")}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10, backgroundColor: colors.headerBg, borderBottomColor: colors.border }]}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <CartIcon size={22} color={colors.primary} />
          <Text style={[styles.headerTitle, { color: colors.text }]}>{t("nav_cart")} ({totalItems})</Text>
        </View>
        <TouchableOpacity onPress={clearCart} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={styles.clearAll}>{t("cart_clear")}</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: 16, paddingBottom: 60 }}
        >
          {/* Cart Items */}
          <View style={styles.itemList}>
            {items.map(({ product, quantity }) => {
              const imgUrl = getImageUrl(product.images?.[0]?.url);
              const price = product.priceFrom ? Number(product.priceFrom) : 0;
              return (
                <View key={product.id} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Image source={{ uri: imgUrl }} style={[styles.cardImg, { backgroundColor: theme === "dark" ? "#0e1822" : "#f8fafc" }]} resizeMode="contain" />
                  <View style={styles.cardInfo}>
                    <Text style={[styles.cardName, { color: colors.text }]} numberOfLines={2}>
                      {localizeProductName(product, lang)}
                    </Text>
                    <Text style={[styles.cardPrice, { color: colors.primary }]}>
                      {price ? `${(price * quantity).toLocaleString()} UZS` : "Kelishuv asosida"}
                    </Text>
                    {product.stock !== undefined && (
                      <Text
                        style={{
                          fontSize: 11,
                          color: (product.stock ?? 0) > 0 ? colors.primary : "#ef4444",
                          fontWeight: "600",
                          marginTop: 2,
                        }}
                      >
                        {(product.stock ?? 0) > 0
                          ? t("stock_in").replace("{n}", String(product.stock))
                          : t("stock_cart_empty")}
                      </Text>
                    )}

                    <View style={styles.cardActions}>
                      <View style={[styles.qtyBox, { backgroundColor: colors.inputBg }]}>
                        <TouchableOpacity
                          style={[styles.qtyBtn, { backgroundColor: colors.card }]}
                          onPress={() => updateQuantity(product.id, quantity - 1)}
                        >
                          <Text style={[styles.qtyBtnText, { color: colors.text }]}>−</Text>
                        </TouchableOpacity>
                        <Text style={[styles.qtyNumber, { color: colors.text }]}>{quantity}</Text>
                        <TouchableOpacity
                          style={[styles.qtyBtn, { backgroundColor: colors.card }]}
                          disabled={product.stock !== undefined && quantity >= product.stock}
                          onPress={() => updateQuantity(product.id, Math.min(product.stock ?? 100, quantity + 1))}
                        >
                          <Text style={[styles.qtyBtnText, { color: colors.text }]}>+</Text>
                        </TouchableOpacity>
                      </View>

                      <TouchableOpacity
                        onPress={() => removeFromCart(product.id)}
                        style={styles.removeBtn}
                      >
                        <CloseIcon size={14} color="#ef4444" />
                        <Text style={styles.removeText}>{t("cart_clear") || "O'chirish"}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>

          {/* SMS Verified info or guest tip */}
          {customer ? (
            <View style={[styles.authBadge, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
              <UserIcon size={16} color={colors.primary} />
              <Text style={[styles.authBadgeText, { color: colors.textMuted }]}>
                Hisob: <Text style={{ fontWeight: "800", color: colors.text }}>{customer.name}</Text>
              </Text>
            </View>
          ) : null}

          {/* Checkout Form */}
          <View style={[styles.checkoutBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.checkoutTitle, { color: colors.text }]}>{t("cart_checkout_title")}</Text>
            <Text style={[styles.checkoutSub, { color: colors.textMuted }]}>{t("cart_checkout_sub")}</Text>

            <Text style={[styles.label, { color: colors.textMuted }]}>{t("cart_name_label")}</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
              placeholder="Masalan: Azizbek Karimov"
              value={customerName}
              onChangeText={setCustomerName}
              placeholderTextColor={colors.textMuted}
            />

            <Text style={[styles.label, { color: colors.textMuted }]}>{t("cart_phone_label")}</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
              placeholder="+998 90 123 45 67"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              placeholderTextColor={colors.textMuted}
            />

            <Text style={[styles.label, { color: colors.textMuted }]}>{t("contact_store") || "Olib ketish manzili"}</Text>
            <View style={[styles.storeAddressCard, theme === "dark" && { backgroundColor: "#064e3b25", borderColor: "#05966950" }]}>
              <View style={styles.storeAddressIconWrap}>
                <MapPinIcon size={20} color="#10b981" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.storeAddressTitle, { color: "#10b981" }]}>Medax tibbiyot texnikalari markazi</Text>
                <Text style={[styles.storeAddressDesc, { color: colors.text }]}>
                  {t("contact_address")}
                </Text>
                <Text style={[styles.storeAddressPickupNote, { color: theme === "dark" ? "#a7f3d0" : "#047857" }]}>
                  ℹ️ Hozircha faqat do'kondan olib ketish mavjud. Uskunani do'konda tekshirib qabul qilib olasiz.
                </Text>
              </View>
            </View>

            <Text style={[styles.label, { color: colors.textMuted }]}>{t("cart_comment_label")}</Text>
            <TextInput
              style={[styles.input, { height: 64, textAlignVertical: "top", backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
              placeholder="Klinika nomi, o'rnatish yoki olib ketish vaqti"
              value={comment}
              onChangeText={setComment}
              multiline
              placeholderTextColor={colors.textMuted}
            />

            {/* Payment Method Selection */}
            <Text style={[styles.label, { marginTop: 8, marginBottom: 8, color: colors.textMuted }]}>{t("cart_pay_method")}</Text>

            {/* Option: Cash / Store pickup */}
            <TouchableOpacity
              style={[
                styles.payOption,
                styles.payOptionActive,
                { marginTop: 4, backgroundColor: theme === "dark" ? "rgba(56, 189, 248, 0.12)" : "#f0f9ff", borderColor: colors.primary },
              ]}
              onPress={() => setPaymentMethod("Do'konda to'lash (Olib ketishda)")}
              activeOpacity={0.8}
            >
              <View style={[styles.radioCircle, { borderColor: colors.primary }]}>
                <View style={[styles.radioDot, { backgroundColor: colors.primary }]} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.payOptionHeader}>
                  <Text style={[styles.payTitle, { color: colors.text }]}>{t("cart_pay_cash_title")}</Text>
                </View>
                <Text style={[styles.payDesc, { color: colors.textMuted }]}>
                  {t("cart_pay_cash_desc")}
                </Text>
              </View>
            </TouchableOpacity>

            {/* Total Row */}
            <View style={[styles.totalRow, { borderTopColor: colors.border }]}>
              <Text style={[styles.totalLabel, { color: colors.textMuted }]}>{t("cart_total_label")}</Text>
              <Text style={[styles.totalValue, { color: colors.primary }]}>
                {totalPrice > 0 ? `${totalPrice.toLocaleString()} UZS` : "Kelishuv asosida"}
              </Text>
            </View>

            {/* Mehmonlar uchun OTP Kod kiritish maydoni */}
            {!token && otpSent && (
              <View style={[styles.otpCard, theme === "dark" && { backgroundColor: "#1e3a8a25", borderColor: "#3b82f650" }]}>
                <Text style={[styles.otpTitle, { color: colors.primary }]}>{t("cart_otp_title")}</Text>
                <Text style={[styles.otpSubtitle, { color: colors.textMuted }]}>
                  {phone} {t("cart_otp_sub")}
                </Text>
                <TextInput
                  style={[styles.otpInput, { backgroundColor: colors.inputBg, borderColor: colors.primary, color: colors.text }]}
                  placeholder="------"
                  value={otpCode}
                  onChangeText={setOtpCode}
                  keyboardType="number-pad"
                  maxLength={6}
                  placeholderTextColor={colors.textMuted}
                />
                <TouchableOpacity
                  disabled={resendTimer > 0 || loading}
                  onPress={async () => {
                    setLoading(true);
                    const r = await sendOrderOtp(phone.trim());
                    setLoading(false);
                    if (r.ok) {
                      setResendTimer(r.resendIn || 60);
                      Alert.alert("SMS qayta yuborildi", "Yangi tasdiqlash kodi yuborildi.");
                    } else {
                      Alert.alert("Xatolik", r.error || "SMS yuborilmadi.");
                    }
                  }}
                  style={styles.resendBtn}
                >
                  <Text style={[styles.resendText, { color: colors.primary }, resendTimer > 0 && { color: colors.textMuted }]}>
                    {resendTimer > 0 ? `${t("cart_resend_code")} (${resendTimer}s)` : t("cart_resend_code")}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            <TouchableOpacity
              style={[styles.orderBtn, { backgroundColor: "#0284c7" }, loading && { opacity: 0.7 }]}
              onPress={handleCheckout}
              disabled={loading}
              activeOpacity={0.88}
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Text style={styles.orderBtnText}>
                    {!token && !otpSent
                      ? t("cart_get_code_btn")
                      : t("cart_confirm_btn")}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <SuccessModal
        visible={orderSuccessModal.visible}
        title={t("order_success_title")}
        message={t("order_success_sub").replace("{code}", orderSuccessModal.orderCode)}
        buttonText={t("btn_continue")}
        onClose={() => {
          setOrderSuccessModal({ visible: false, orderCode: "" });
          navigation.navigate("Asosiy");
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 14,
    backgroundColor: "#ffffff",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  headerTitle: { fontSize: 19, fontWeight: "900", color: "#0f172a" },
  clearAll: { fontSize: 13, color: "#ef4444", fontWeight: "700" },
  itemList: { marginBottom: 14 },
  card: {
    flexDirection: "row",
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  cardImg: { width: 75, height: 75, borderRadius: 10, backgroundColor: "#f8fafc", marginRight: 12 },
  cardInfo: { flex: 1, justifyContent: "space-between" },
  cardName: { fontSize: 13.5, fontWeight: "700", color: "#0f172a", lineHeight: 18 },
  cardPrice: { fontSize: 14.5, fontWeight: "900", color: "#0284c7", marginVertical: 4 },
  cardActions: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  qtyBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f1f5f9",
    borderRadius: 8,
    padding: 2,
  },
  qtyBtn: { width: 28, height: 28, borderRadius: 6, backgroundColor: "#ffffff", alignItems: "center", justifyContent: "center" },
  qtyBtnText: { fontSize: 16, fontWeight: "700", color: "#0f172a" },
  qtyNumber: { marginHorizontal: 10, fontSize: 13, fontWeight: "700", color: "#0f172a" },
  removeBtn: { flexDirection: "row", alignItems: "center", gap: 3 },
  removeText: { fontSize: 12, color: "#ef4444", fontWeight: "600" },

  authBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#e0f2fe",
    borderWidth: 1,
    borderColor: "#bae6fd",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 14,
  },
  authBadgeText: { fontSize: 12.5, color: "#0369a1" },

  checkoutBox: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  checkoutTitle: { fontSize: 17, fontWeight: "900", color: "#0f172a" },
  checkoutSub: { fontSize: 12, color: "#64748b", marginTop: 2, marginBottom: 14 },
  label: { fontSize: 12, fontWeight: "700", color: "#334155", marginBottom: 5 },
  input: {
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13,
    color: "#0f172a",
    marginBottom: 12,
  },

  payOption: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    backgroundColor: "#ffffff",
  },
  payOptionActive: {
    borderColor: "#0284c7",
    backgroundColor: "#f0f9ff",
  },
  payOptionDisabled: {
    opacity: 0.5,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#0284c7",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#0284c7",
  },
  payOptionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  payTitle: { fontSize: 13.5, fontWeight: "800", color: "#0f172a" },
  payDesc: { fontSize: 11.5, color: "#64748b", marginTop: 3, lineHeight: 16 },
  payBadgesRow: {
    flexDirection: "row",
    gap: 5,
    marginTop: 6,
  },
  payPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  payPillText: { fontSize: 10, fontWeight: "800", color: "#ffffff" },

  storeAddressCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    backgroundColor: "#f0fdf4",
    borderWidth: 1.5,
    borderColor: "rgba(5, 150, 105, 0.35)",
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
  },
  storeAddressIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(5, 150, 105, 0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  storeAddressTitle: {
    fontSize: 13.5,
    fontWeight: "800",
    color: "#065f46",
    marginBottom: 2,
  },
  storeAddressDesc: {
    fontSize: 12,
    color: "#1e293b",
    lineHeight: 17,
  },
  storeAddressPickupNote: {
    fontSize: 11,
    color: "#047857",
    fontWeight: "600",
    marginTop: 6,
    lineHeight: 15,
  },

  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
    marginTop: 14,
    marginBottom: 8,
  },
  totalLabel: { fontSize: 14, fontWeight: "700", color: "#64748b" },
  totalValue: { fontSize: 18, fontWeight: "900", color: "#0284c7" },
  secNote: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginBottom: 14,
  },
  secNoteText: { fontSize: 11, color: "#059669", fontWeight: "600" },

  orderBtn: {
    backgroundColor: "#0284c7",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  orderBtnText: { color: "#ffffff", fontSize: 14.5, fontWeight: "800" },

  otpCard: {
    backgroundColor: "#eff6ff",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#bfdbfe",
    marginBottom: 16,
    alignItems: "center",
  },
  otpTitle: { fontSize: 14, fontWeight: "800", color: "#1e3a8a", marginBottom: 4 },
  otpSubtitle: { fontSize: 12, color: "#3b82f6", textAlign: "center", marginBottom: 12 },
  otpInput: {
    backgroundColor: "#ffffff",
    borderWidth: 1.5,
    borderColor: "#0284c7",
    borderRadius: 12,
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: 6,
    textAlign: "center",
    width: "70%",
    paddingVertical: 8,
    color: "#0f172a",
    marginBottom: 10,
  },
  resendBtn: { paddingVertical: 4 },
  resendText: { fontSize: 12, color: "#0284c7", fontWeight: "700" },

  emptyContainer: { flex: 1, alignItems: "center", justifyContent: "center", padding: 30, backgroundColor: "#ffffff" },
  emptyIconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "#e0f2fe",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyTitle: { fontSize: 19, fontWeight: "900", color: "#0f172a", marginBottom: 6 },
  emptyDesc: { fontSize: 13, color: "#64748b", textAlign: "center", marginBottom: 24, lineHeight: 18 },
  shopBtn: { backgroundColor: "#0284c7", paddingHorizontal: 24, paddingVertical: 12, borderRadius: 14 },
  shopBtnText: { color: "#ffffff", fontWeight: "800", fontSize: 14 },
});
