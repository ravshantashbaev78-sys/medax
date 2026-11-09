import React from "react";
import { View, Text, Image, TouchableOpacity, StyleSheet } from "react-native";
import { Product, getImageUrl } from "../api";
import { useTheme } from "../context/ThemeContext";
import { useI18n, localizeCategoryName, localizeProductName } from "../context/I18nContext";
import { IcPlus, IcCheck, IcImage } from "./ui";

export function priceLabel(price: Product["priceFrom"], lang: string): string {
  const n = typeof price === "number" ? price : parseFloat(String(price ?? ""));
  if (!Number.isFinite(n) || n <= 0) return lang === "ru" ? "По запросу" : lang === "en" ? "On request" : "Kelishiladi";
  return n.toLocaleString("ru-RU").replace(/,/g, " ") + (lang === "ru" ? " сум" : lang === "en" ? " UZS" : " so'm");
}

export function ProductCard({
  product,
  onPress,
  onAdd,
  added,
  showStock = true,
}: {
  product: Product;
  onPress: () => void;
  onAdd?: () => void;
  added?: boolean;
  showStock?: boolean;
}) {
  const { colors } = useTheme();
  const { lang, t } = useI18n();
  const img = product.images?.[0]?.thumbUrl || product.images?.[0]?.url;
  const outOfStock = typeof product.stock === "number" && product.stock <= 0;
  const name = localizeProductName(product, lang);

  return (
    <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <TouchableOpacity onPress={onPress} activeOpacity={0.85} accessibilityRole="button" accessibilityLabel={name}>
        <View style={[s.imgWrap, { backgroundColor: colors.inputBg }]}>
          {img ? (
            <Image source={{ uri: getImageUrl(img) }} style={s.img} resizeMode="cover" />
          ) : (
            <IcImage size={28} color={colors.textMuted} strokeWidth={1.4} />
          )}
        </View>
        <View style={s.body}>
          {product.category?.name ? (
            <Text style={[s.cat, { color: colors.textMuted }]} numberOfLines={1}>
              {localizeCategoryName(product.category.slug || product.category.name, lang)}
            </Text>
          ) : null}
          <Text style={[s.name, { color: colors.text }]} numberOfLines={2}>
            {name}
          </Text>
          <Text style={[s.price, { color: colors.text }]} numberOfLines={1}>
            {priceLabel(product.priceFrom, lang)}
          </Text>
        </View>
      </TouchableOpacity>
      <View style={s.footer}>
        {showStock && typeof product.stock === "number" ? (
          <Text style={[s.stock, { color: outOfStock ? colors.danger : colors.success }]} numberOfLines={1}>
            {outOfStock ? t("stock_out") : t("stock_in").replace("{n}", String(product.stock))}
          </Text>
        ) : (
          <View style={{ flex: 1 }} />
        )}
        {onAdd && !outOfStock ? (
          <TouchableOpacity
            onPress={onAdd}
            accessibilityRole="button"
            accessibilityLabel={t("prod_add_cart")}
            style={[s.add, { backgroundColor: added ? colors.success : colors.primarySoft }]}
          >
            {added ? <IcCheck size={20} color="#FFFFFF" strokeWidth={2.2} /> : <IcPlus size={20} color={colors.primary} strokeWidth={2} />}
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  card: { flex: 1, borderWidth: 1, borderRadius: 14, overflow: "hidden" },
  imgWrap: { height: 124, alignItems: "center", justifyContent: "center" },
  img: { width: "100%", height: "100%" },
  body: { paddingHorizontal: 12, paddingTop: 10, gap: 3 },
  cat: { fontSize: 12 },
  name: { fontSize: 14, lineHeight: 19, fontWeight: "500", minHeight: 38 },
  stock: { fontSize: 12, fontWeight: "500", flex: 1, marginRight: 6 },
  footer: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingLeft: 12, paddingRight: 6, paddingBottom: 6, minHeight: 50 },
  price: { fontSize: 15, fontWeight: "600", marginTop: 4 },
  add: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
});
