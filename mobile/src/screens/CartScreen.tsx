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
import { useI18n, localizeProductName } from "../context/I18nContext";
import { CartIcon, CloseIcon, ShieldIcon, BoltIcon } from "../components/Icons";
import { SuccessModal } from "../components/SuccessModal";

export function CartScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { lang, t } = useI18n();
  const { items, updateQuantity, removeFromCart, clearCart, totalPrice, totalItems } = useCart();
  const { customer, token } = useAuth();

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
      deliveryAddress: address.trim(),
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
      Alert.alert("Xatolik", res.error || "Buyurtma yuborishda xatolik yuz berdi");
    }
  };

  if (items.length === 0) {
    return (
      <View style={[styles.emptyContainer, { paddingTop: insets.top + 20 }]}>
        <View style={styles.emptyIconCircle}>
          <CartIcon size={46} color="#0284c7" />
        </View>
        <Text style={styles.emptyTitle}>{t("cart_empty_title")}</Text>
        <Text style={styles.emptyDesc}>
          {t("cart_empty_sub")}
        </Text>
        <TouchableOpacity
          style={styles.shopBtn}
          onPress={() => navigation.navigate("Katalog")}
          activeOpacity={0.85}
        >
          <Text style={styles.shopBtnText}>{t("cart_go_catalog")}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <CartIcon size={22} color="#0284c7" />
          <Text style={styles.headerTitle}>{t("nav_cart")} ({totalItems})</Text>
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
                <View key={product.id} style={styles.card}>
                  <Image source={{ uri: imgUrl }} style={styles.cardImg} resizeMode="contain" />
                  <View style={styles.cardInfo}>
                    <Text style={styles.cardName} numberOfLines={2}>
                      {localizeProductName(product, lang)}
                    </Text>
                    <Text style={styles.cardPrice}>
                      {price ? `${(price * quantity).toLocaleString()} UZS` : "Kelishuv asosida"}
                    </Text>
                    {product.stock !== undefined && (
                      <Text
                        style={{
                          fontSize: 11,
                          color: (product.stock ?? 0) > 0 ? "#0284c7" : "#ef4444",
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
                      <View style={styles.qtyBox}>
                        <TouchableOpacity
                          style={styles.qtyBtn}
                          onPress={() => updateQuantity(product.id, quantity - 1)}
                        >
                          <Text style={styles.qtyBtnText}>−</Text>
                        </TouchableOpacity>
                        <Text style={styles.qtyNumber}>{quantity}</Text>
                        <TouchableOpacity
                          style={styles.qtyBtn}
                          disabled={product.stock !== undefined && quantity >= product.stock}
                          onPress={() => updateQuantity(product.id, Math.min(product.stock ?? 100, quantity + 1))}
                        >
                          <Text style={styles.qtyBtnText}>+</Text>
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
            <View style={styles.authBadge}>
              <ShieldIcon size={18} color="#0284c7" />
              <Text style={styles.authBadgeText}>
                SMS tasdiqlangan hisob: <Text style={{ fontWeight: "800", color: "#0f172a" }}>{customer.name}</Text>
              </Text>
            </View>
          ) : null}

          {/* Checkout Form */}
          <View style={styles.checkoutBox}>
            <Text style={styles.checkoutTitle}>{t("cart_checkout_title")}</Text>
            <Text style={styles.checkoutSub}>{t("cart_checkout_sub")}</Text>

            <Text style={styles.label}>{t("cart_name_label")}</Text>
            <TextInput
              style={styles.input}
              placeholder="Masalan: Azizbek Karimov"
              value={customerName}
              onChangeText={setCustomerName}
              placeholderTextColor="#94a3b8"
            />

            <Text style={styles.label}>{t("cart_phone_label")}</Text>
            <TextInput
              style={styles.input}
              placeholder="+998 90 123 45 67"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              placeholderTextColor="#94a3b8"
            />

            <Text style={styles.label}>{t("cart_address_label")}</Text>
            <TextInput
              style={styles.input}
              placeholder="Viloyat, shahar, ko'cha, klinika yoki bino"
              value={address}
              onChangeText={setAddress}
              placeholderTextColor="#94a3b8"
            />

            <Text style={styles.label}>{t("cart_comment_label")}</Text>
            <TextInput
              style={[styles.input, { height: 64, textAlignVertical: "top" }]}
              placeholder="Klinika nomi, o'rnatish yoki yetkazish vaqti"
              value={comment}
              onChangeText={setComment}
              multiline
              placeholderTextColor="#94a3b8"
            />

            {/* Payment Method Selection */}
            <Text style={[styles.label, { marginTop: 8, marginBottom: 8 }]}>{t("cart_pay_method")}</Text>

            {/* Option: Cash / Store pickup */}
            <TouchableOpacity
              style={[
                styles.payOption,
                styles.payOptionActive,
                { marginTop: 4 },
              ]}
              onPress={() => setPaymentMethod("Do'konda to'lash (Olib ketishda)")}
              activeOpacity={0.8}
            >
              <View style={styles.radioCircle}>
                <View style={styles.radioDot} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.payOptionHeader}>
                  <Text style={styles.payTitle}>{t("cart_pay_cash_title")}</Text>
                </View>
                <Text style={styles.payDesc}>
                  {t("cart_pay_cash_desc")}
                </Text>
              </View>
            </TouchableOpacity>

            {/* Total Row */}
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>{t("cart_total_label")}</Text>
              <Text style={styles.totalValue}>
                {totalPrice > 0 ? `${totalPrice.toLocaleString()} UZS` : "Kelishuv asosida"}
              </Text>
            </View>

            {/* Security note */}
            <View style={styles.secNote}>
              <ShieldIcon size={14} color="#059669" />
              <Text style={styles.secNoteText}>
                {t("cart_sec_note")}
              </Text>
            </View>

            {/* Mehmonlar uchun OTP Kod kiritish maydoni */}
            {!token && otpSent && (
              <View style={styles.otpCard}>
                <Text style={styles.otpTitle}>{t("cart_otp_title")}</Text>
                <Text style={styles.otpSubtitle}>
                  {phone} {t("cart_otp_sub")}
                </Text>
                <TextInput
                  style={styles.otpInput}
                  placeholder="123456"
                  value={otpCode}
                  onChangeText={setOtpCode}
                  keyboardType="number-pad"
                  maxLength={6}
                  placeholderTextColor="#94a3b8"
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
                  <Text style={[styles.resendText, resendTimer > 0 && { color: "#94a3b8" }]}>
                    {resendTimer > 0 ? `${t("cart_resend_code")} (${resendTimer}s)` : t("cart_resend_code")}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            <TouchableOpacity
              style={[styles.orderBtn, loading && { opacity: 0.7 }]}
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
