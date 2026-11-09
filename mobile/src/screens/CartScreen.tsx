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
  KeyboardAvoidingView,
  Platform,
  Modal,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { submitOrder, sendOrderOtp, getImageUrl } from "../api";
import { useTheme } from "../context/ThemeContext";
import { useI18n, localizeProductName } from "../context/I18nContext";
import { priceLabel } from "../components/ProductCard";
import { Button, Card, Field, IconBadge, IcCheck, IcImage, IcMinus, IcPin, IcPlus, IcTrash, ui } from "../components/ui";
import { CartIcon } from "../components/Icons";

const PAY_METHOD = "Do'konda to'lash (Olib ketishda)";

const L = {
  uz: {
    buyer: "Buyurtmachi", pickupTitle: "Do'kondan olib ketish.", pickupText: "Namangan sh., Beruniy ko'chasi, 2-uy. To'lov do'konda.",
    total: "Jami", pcs: "dona", lockedHint: "Buyurtma akkauntingizdagi tasdiqlangan raqamga beriladi.", phoneHint: "Shu raqamga 6 xonali tasdiqlash kodi yuboriladi.",
    commentPh: "Ixtiyoriy: klinika nomi, olib ketish vaqti", codeLabel: "SMS kod", codeHint: "raqamiga yuborilgan 6 xonali kod",
    clearQ: "Savatchadagi barcha mahsulotlar o'chirilsinmi?", cancel: "Bekor qilish", successTitle: "Buyurtma qabul qilindi",
    successText: "Buyurtma raqami: {code}. Menejer tez orada siz bilan bog'lanadi.", myOrders: "Buyurtmalarimni ko'rish", ok: "Davom etish", remove: "O'chirish",
  },
  ru: {
    buyer: "Покупатель", pickupTitle: "Самовывоз из магазина.", pickupText: "г. Наманган, ул. Беруни, 2. Оплата в магазине.",
    total: "Итого", pcs: "шт.", lockedHint: "Заказ оформляется на подтверждённый номер аккаунта.", phoneHint: "На этот номер придёт 6-значный код.",
    commentPh: "Необязательно: клиника, время самовывоза", codeLabel: "SMS-код", codeHint: "— на этот номер отправлен 6-значный код",
    clearQ: "Удалить все товары из корзины?", cancel: "Отмена", successTitle: "Заказ принят",
    successText: "Номер заказа: {code}. Менеджер скоро свяжется с вами.", myOrders: "Мои заказы", ok: "Продолжить", remove: "Удалить",
  },
  en: {
    buyer: "Customer", pickupTitle: "Store pickup.", pickupText: "Namangan, Beruniy street 2. Pay at the store.",
    total: "Total", pcs: "pcs", lockedHint: "The order is placed on your account's verified number.", phoneHint: "A 6-digit code will be sent to this number.",
    commentPh: "Optional: clinic name, pickup time", codeLabel: "SMS code", codeHint: "— 6-digit code sent to this number",
    clearQ: "Remove all items from the cart?", cancel: "Cancel", successTitle: "Order received",
    successText: "Order number: {code}. A manager will contact you shortly.", myOrders: "View my orders", ok: "Continue", remove: "Remove",
  },
};

export function CartScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { lang, t } = useI18n();
  const { colors } = useTheme();
  const c = L[lang] || L.uz;
  const { items, updateQuantity, removeFromCart, clearCart, totalPrice, totalItems } = useCart();
  const { customer, token, logout } = useAuth();

  const [customerName, setCustomerName] = useState(customer?.name || "");
  const [phone, setPhone] = useState(customer?.phone || "+998 ");
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [resendTimer, setResendTimer] = useState(0);
  const [successCode, setSuccessCode] = useState<string | null>(null);

  // Savatcha ochiq turganda mijoz tizimga kirsa, forma yangilanadi
  useEffect(() => {
    if (customer) {
      setCustomerName((prev) => prev.trim() || customer.name || "");
      if (customer.phone) setPhone(customer.phone);
      setOtpSent(false);
      setOtpCode("");
    }
  }, [customer?.id]);

  useEffect(() => {
    if (resendTimer <= 0) return;
    const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendTimer]);

  const handlePhoneChange = (value: string) => {
    setPhone(value);
    // Raqam o'zgarsa, eski raqamga yuborilgan SMS kod endi yaroqsiz
    if (otpSent) {
      setOtpSent(false);
      setOtpCode("");
    }
  };

  const requestOtp = async () => {
    setLoading(true);
    const otpRes = await sendOrderOtp(phone.trim());
    setLoading(false);
    if (!otpRes.ok) {
      Alert.alert(t("error"), otpRes.error || "SMS tasdiqlash kodini yuborishda xatolik yuz berdi.");
      return false;
    }
    setOtpSent(true);
    setOtpCode("");
    setResendTimer(otpRes.resendIn || 60);
    return true;
  };

  const handleCheckout = async () => {
    if (!customerName.trim()) {
      Alert.alert(t("error"), "Iltimos, ismingizni kiriting.");
      return;
    }
    const digits = phone.replace(/\D/g, "");
    if (!(digits.length === 12 && digits.startsWith("998")) && digits.length !== 9) {
      Alert.alert(t("error"), "Iltimos, to'liq telefon raqamini kiriting (+998 __ ___ __ __).");
      return;
    }
    // Mehmon: avval SMS kod
    if (!token && !otpSent) {
      await requestOtp();
      return;
    }
    if (!token && otpCode.trim().length !== 6) {
      Alert.alert(t("error"), "SMS orqali kelgan 6 xonali kodni kiriting.");
      return;
    }

    setLoading(true);
    const res = await submitOrder({
      customerName: customerName.trim(),
      phone: phone.trim(),
      deliveryAddress: t("contact_address") || "Namangan sh., Ozod MFY, Abu Rayhon Beruniy ko'chasi, 2-uy",
      comment: comment.trim(),
      paymentMethod: PAY_METHOD,
      items: items.map((i) => ({ productId: i.product.id, quantity: i.quantity })),
      code: !token ? otpCode.trim() : undefined,
    });
    setLoading(false);

    if (res.ok) {
      setSuccessCode(String(res.code || res.orderId || ""));
      clearCart();
      setOtpSent(false);
      setOtpCode("");
      setComment("");
      return;
    }
    // Sessiya eskirgan bo'lsa: chiqib, mehmon sifatida SMS kod bilan davom etamiz
    if (token && res.error && (res.error.includes("SMS tasdiqlash kodini") || res.error.includes("401"))) {
      await logout();
      if (await requestOtp()) {
        Alert.alert("Sessiya yangilandi", "Sessiyangiz eskirgan. Telefoningizga tasdiqlash kodi yuborildi, kodni kiritib buyurtmani tasdiqlang.");
      }
      return;
    }
    Alert.alert(t("error"), res.error || "Buyurtma yuborishda xatolik yuz berdi");
  };

  const successModal = (
    <Modal visible={successCode !== null} transparent animationType="fade" onRequestClose={() => setSuccessCode(null)}>
      <View style={[s.scrim, { backgroundColor: colors.scrim }]}>
        <View style={[s.modal, { backgroundColor: colors.card }]}>
          <View style={[s.okCircle, { backgroundColor: colors.successSoft }]}>
            <IcCheck size={28} color={colors.success} strokeWidth={2.4} />
          </View>
          <Text style={[s.modalTitle, { color: colors.text }]}>{c.successTitle}</Text>
          <Text style={[s.modalText, { color: colors.textSecondary }]}>{c.successText.replace("{code}", successCode || "")}</Text>
          {token ? (
            <Button
              title={c.myOrders}
              style={{ marginTop: 20, alignSelf: "stretch" }}
              onPress={() => {
                setSuccessCode(null);
                navigation.navigate("Profil");
              }}
            />
          ) : null}
          <Button
            title={c.ok}
            variant={token ? "ghost" : "primary"}
            style={{ marginTop: token ? 6 : 20, alignSelf: "stretch" }}
            onPress={() => {
              setSuccessCode(null);
              navigation.navigate("Asosiy");
            }}
          />
        </View>
      </View>
    </Modal>
  );

  if (items.length === 0) {
    return (
      <View style={[s.empty, { backgroundColor: colors.bg, paddingTop: insets.top }]}>
        <IconBadge size={72}>
          <CartIcon size={34} color={colors.primary} />
        </IconBadge>
        <Text style={[s.emptyTitle, { color: colors.text }]}>{t("cart_empty_title")}</Text>
        <Text style={[s.emptySub, { color: colors.textMuted }]}>{t("cart_empty_sub")}</Text>
        <Button title={t("cart_go_catalog")} onPress={() => navigation.navigate("Katalog")} style={{ marginTop: 20, paddingHorizontal: 28 }} />
        {successModal}
      </View>
    );
  }

  const ready = !!token || otpSent;

  return (
    <View style={[s.screen, { backgroundColor: colors.bg }]}>
      <View style={[s.header, { paddingTop: insets.top + 10, backgroundColor: colors.headerBg, borderBottomColor: colors.border }]}>
        <Text style={[ui.h1, { color: colors.text }]}>{t("nav_cart")}</Text>
        <TouchableOpacity
          hitSlop={10}
          onPress={() =>
            Alert.alert(t("cart_clear"), c.clearQ, [
              { text: c.cancel, style: "cancel" },
              { text: t("cart_clear"), style: "destructive", onPress: clearCart },
            ])
          }
        >
          <Text style={{ fontSize: 14, fontWeight: "500", color: colors.danger }}>{t("cart_clear")}</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Card>
            {items.map(({ product, quantity }, i) => {
              const img = product.images?.[0]?.thumbUrl || product.images?.[0]?.url;
              const max = Math.min(100, typeof product.stock === "number" ? product.stock : 100);
              return (
                <View key={product.id} style={[s.item, i > 0 && { borderTopWidth: 1, borderTopColor: colors.border }]}>
                  <View style={[s.thumb, { backgroundColor: colors.inputBg }]}>
                    {img ? <Image source={{ uri: getImageUrl(img) }} style={s.thumbImg} /> : <IcImage size={22} color={colors.textMuted} strokeWidth={1.4} />}
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <View style={{ flexDirection: "row", gap: 8 }}>
                      <Text style={[s.itemName, { color: colors.text }]} numberOfLines={2}>
                        {localizeProductName(product, lang)}
                      </Text>
                      <TouchableOpacity onPress={() => removeFromCart(product.id)} hitSlop={10} accessibilityLabel={c.remove}>
                        <IcTrash size={18} color={colors.textMuted} strokeWidth={1.8} />
                      </TouchableOpacity>
                    </View>
                    <View style={s.itemBottom}>
                      <Text style={[s.itemPrice, { color: colors.text }]}>
                        {priceLabel(product.priceFrom ? Number(product.priceFrom) * quantity : null, lang)}
                      </Text>
                      <View style={[s.stepper, { borderColor: colors.borderStrong }]}>
                        <TouchableOpacity style={s.stepBtn} onPress={() => updateQuantity(product.id, quantity - 1)} accessibilityLabel="Kamaytirish">
                          <IcMinus size={16} color={colors.text} strokeWidth={2} />
                        </TouchableOpacity>
                        <Text style={[s.stepText, { color: colors.text }]}>{quantity}</Text>
                        <TouchableOpacity
                          style={s.stepBtn}
                          onPress={() => updateQuantity(product.id, quantity + 1)}
                          disabled={quantity >= max}
                          accessibilityLabel="Ko'paytirish"
                        >
                          <IcPlus size={16} color={quantity >= max ? colors.textMuted : colors.text} strokeWidth={2} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                </View>
              );
            })}
          </Card>

          <Card style={{ padding: 16, paddingBottom: 4, marginTop: 14 }}>
            <Text style={[s.cardTitle, { color: colors.text }]}>{c.buyer}</Text>
            <Field label={t("cart_name_label")} value={customerName} onChangeText={setCustomerName} placeholder="Ism va familiya" autoComplete="name" />
            <Field
              label={t("cart_phone_label")}
              value={phone}
              onChangeText={handlePhoneChange}
              keyboardType="phone-pad"
              locked={!!token}
              hint={token ? c.lockedHint : c.phoneHint}
            />
            <Field label={t("cart_comment_label")} value={comment} onChangeText={setComment} placeholder={c.commentPh} multiline style={{ height: 76, paddingTop: 12, textAlignVertical: "top" }} />
            <View style={[s.pickup, { borderTopColor: colors.border }]}>
              <IcPin size={18} color={colors.primary} strokeWidth={1.9} />
              <Text style={[s.pickupText, { color: colors.textSecondary }]}>
                <Text style={{ fontWeight: "600", color: colors.text }}>{c.pickupTitle} </Text>
                {c.pickupText}
              </Text>
            </View>
          </Card>

          {!token && otpSent ? (
            <Card style={{ padding: 16, marginTop: 14, borderColor: colors.primary }}>
              <Text style={[s.cardTitle, { color: colors.text, marginBottom: 4 }]}>{t("cart_otp_title")}</Text>
              <Text style={{ fontSize: 13.5, color: colors.textSecondary, marginBottom: 12 }}>
                {phone} {c.codeHint}
              </Text>
              <TextInput
                value={otpCode}
                onChangeText={(v) => setOtpCode(v.replace(/\D/g, ""))}
                keyboardType="number-pad"
                maxLength={6}
                textContentType="oneTimeCode"
                autoComplete="sms-otp"
                placeholder="000000"
                placeholderTextColor={colors.textMuted}
                accessibilityLabel={c.codeLabel}
                style={[s.otp, { color: colors.text, borderColor: colors.primary, backgroundColor: colors.card }]}
              />
              <TouchableOpacity disabled={resendTimer > 0 || loading} onPress={requestOtp} style={{ paddingVertical: 10 }}>
                <Text style={{ fontSize: 14, fontWeight: "500", color: resendTimer > 0 ? colors.textMuted : colors.primary }}>
                  {t("cart_resend_code")}
                  {resendTimer > 0 ? ` (${resendTimer}s)` : ""}
                </Text>
              </TouchableOpacity>
            </Card>
          ) : null}
        </ScrollView>

        <View style={[s.summary, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
          <View style={s.totalRow}>
            <Text style={{ fontSize: 14, color: colors.textSecondary }}>
              {c.total}, {totalItems} {c.pcs}
            </Text>
            <Text style={[s.totalValue, { color: colors.text }]}>{priceLabel(totalPrice || null, lang)}</Text>
          </View>
          <Button title={ready ? t("cart_confirm_btn") : t("cart_get_code_btn")} loading={loading} onPress={handleCheckout} />
        </View>
      </KeyboardAvoidingView>
      {successModal}
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 12, borderBottomWidth: 1, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  content: { padding: 20, paddingTop: 14, paddingBottom: 24 },
  item: { flexDirection: "row", gap: 12, padding: 12 },
  thumb: { width: 64, height: 64, borderRadius: 10, overflow: "hidden", alignItems: "center", justifyContent: "center" },
  thumbImg: { width: "100%", height: "100%" },
  itemName: { flex: 1, fontSize: 14, lineHeight: 19, fontWeight: "500" },
  itemBottom: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 8 },
  itemPrice: { fontSize: 14.5, fontWeight: "600", flexShrink: 1, marginRight: 8 },
  stepper: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderRadius: 10, height: 38 },
  stepBtn: { width: 38, height: 36, alignItems: "center", justifyContent: "center" },
  stepText: { minWidth: 22, textAlign: "center", fontSize: 14, fontWeight: "600" },
  cardTitle: { fontSize: 15, fontWeight: "600", marginBottom: 12 },
  pickup: { flexDirection: "row", gap: 10, paddingTop: 12, paddingBottom: 12, borderTopWidth: 1, marginTop: 2 },
  pickupText: { flex: 1, fontSize: 13.5, lineHeight: 19 },
  otp: { height: 56, borderWidth: 1.5, borderRadius: 12, textAlign: "center", fontSize: 24, fontWeight: "600", letterSpacing: 10 },
  summary: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 12, borderTopWidth: 1 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 },
  totalValue: { fontSize: 17, fontWeight: "700" },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 },
  emptyTitle: { fontSize: 18, fontWeight: "600", marginTop: 18, textAlign: "center" },
  emptySub: { fontSize: 14.5, lineHeight: 21, marginTop: 6, textAlign: "center" },
  scrim: { flex: 1, alignItems: "center", justifyContent: "center", padding: 28 },
  modal: { width: "100%", borderRadius: 20, padding: 24, paddingBottom: 18, alignItems: "center" },
  okCircle: { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center", marginBottom: 14 },
  modalTitle: { fontSize: 20, fontWeight: "700", textAlign: "center" },
  modalText: { fontSize: 15, lineHeight: 22, marginTop: 8, textAlign: "center" },
});
