import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  Share,
  useWindowDimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { fetchProductDetail, getImageUrl, Product } from "../api";
import { useCart } from "../context/CartContext";
import { useTheme } from "../context/ThemeContext";
import { useI18n, localizeCategoryName, localizeProductName, localizeProductDescription } from "../context/I18nContext";
import { priceLabel } from "../components/ProductCard";
import { Button, IcBack, IcExternal, IcImage, IcMinus, IcPlus } from "../components/ui";

const L = {
  uz: { desc: "Tavsif", specs: "Xususiyatlari", more: "Ko'proq", less: "Yig'ish", notFound: "Mahsulot topilmadi", back: "Orqaga", share: "Ulashish" },
  ru: { desc: "Описание", specs: "Характеристики", more: "Подробнее", less: "Свернуть", notFound: "Товар не найден", back: "Назад", share: "Поделиться" },
  en: { desc: "Description", specs: "Specifications", more: "Show more", less: "Show less", notFound: "Product not found", back: "Back", share: "Share" },
};

export function ProductDetailScreen({ route, navigation }: any) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { lang, t } = useI18n();
  const { colors } = useTheme();
  const c = L[lang] || L.uz;
  const { slug } = route.params;
  const { addToCart } = useCart();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [imgIndex, setImgIndex] = useState(0);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    fetchProductDetail(slug).then((data) => {
      setProduct(data);
      setLoading(false);
    });
  }, [slug]);

  const back = () => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate("MainTabs"));

  if (loading || !product) {
    return (
      <View style={[s.center, { backgroundColor: colors.bg, paddingTop: insets.top }]}>
        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} />
        ) : (
          <>
            <Text style={{ fontSize: 16, color: colors.textSecondary }}>{c.notFound}</Text>
            <Button title={c.back} variant="secondary" onPress={back} style={{ marginTop: 16, paddingHorizontal: 28 }} />
          </>
        )}
      </View>
    );
  }

  const images = product.images?.length ? product.images : [];
  const stock = typeof product.stock === "number" ? product.stock : undefined;
  const outOfStock = stock !== undefined && stock <= 0;
  const maxQty = Math.min(100, stock ?? 100);
  const name = localizeProductName(product, lang);
  const description = localizeProductDescription(product, lang);
  const specs: { name?: string; key?: string; value?: string }[] = Array.isArray(product.specs) ? product.specs : [];

  const onImageScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setImgIndex(Math.round(e.nativeEvent.contentOffset.x / width));
  };

  return (
    <View style={[s.screen, { backgroundColor: colors.card }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 110 + insets.bottom }}>
        <View style={{ height: 340, backgroundColor: colors.inputBg }}>
          {images.length ? (
            <FlatList
              data={images}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={onImageScroll}
              keyExtractor={(_, i) => String(i)}
              renderItem={({ item }) => <Image source={{ uri: getImageUrl(item.url) }} style={{ width, height: 340 }} resizeMode="cover" />}
            />
          ) : (
            <View style={[s.center, { flex: 1 }]}>
              <IcImage size={44} color={colors.textMuted} strokeWidth={1.3} />
            </View>
          )}
          {images.length > 1 ? (
            <View style={s.dots} pointerEvents="none">
              {images.map((_, i) => (
                <View key={i} style={[s.dot, i === imgIndex ? { width: 18, backgroundColor: "#101828" } : { backgroundColor: "#C2C8D0" }]} />
              ))}
            </View>
          ) : null}
          <TouchableOpacity style={[s.floatBtn, { top: insets.top + 8, left: 16 }]} onPress={back} accessibilityRole="button" accessibilityLabel={c.back}>
            <IcBack size={20} color="#101828" strokeWidth={2} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.floatBtn, { top: insets.top + 8, right: 16 }]}
            onPress={() => Share.share({ message: `${name} — https://medax.uz/product/${product.slug}` })}
            accessibilityRole="button"
            accessibilityLabel={c.share}
          >
            <IcExternal size={19} color="#101828" strokeWidth={1.9} />
          </TouchableOpacity>
        </View>

        <View style={s.body}>
          {product.category ? (
            <Text style={[s.meta, { color: colors.textMuted }]}>
              {localizeCategoryName(product.category.slug || product.category.name, lang)}
              {product.country ? ` · ${product.country}` : ""}
            </Text>
          ) : null}
          <Text style={[s.name, { color: colors.text }]}>{name}</Text>
          <View style={s.priceRow}>
            <Text style={[s.price, { color: colors.text }]}>{priceLabel(product.priceFrom, lang)}</Text>
            {stock !== undefined ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: outOfStock ? colors.danger : colors.success }} />
                <Text style={{ fontSize: 13, fontWeight: "500", color: outOfStock ? colors.danger : colors.success }}>
                  {outOfStock ? t("stock_out") : t("stock_in").replace("{n}", String(stock))}
                </Text>
              </View>
            ) : null}
          </View>

          {description ? (
            <>
              <Text style={[s.h2, { color: colors.text }]}>{c.desc}</Text>
              <Text style={[s.desc, { color: colors.textSecondary }]} numberOfLines={expanded ? undefined : 4}>
                {description}
              </Text>
              {description.length > 180 ? (
                <TouchableOpacity onPress={() => setExpanded((v) => !v)} hitSlop={8} style={{ paddingVertical: 8 }}>
                  <Text style={{ fontSize: 14, fontWeight: "500", color: colors.primary }}>{expanded ? c.less : c.more}</Text>
                </TouchableOpacity>
              ) : null}
            </>
          ) : null}

          {specs.length > 0 ? (
            <>
              <Text style={[s.h2, { color: colors.text }]}>{c.specs}</Text>
              <View style={[s.specs, { borderColor: colors.border }]}>
                {specs.map((sp, i) => (
                  <View key={i} style={[s.specRow, i > 0 && { borderTopWidth: 1, borderTopColor: colors.border }]}>
                    <Text style={[s.specKey, { color: colors.textMuted }]}>{sp.name || sp.key}</Text>
                    <Text style={[s.specVal, { color: colors.text }]}>{sp.value}</Text>
                  </View>
                ))}
              </View>
            </>
          ) : null}
        </View>
      </ScrollView>

      <View style={[s.bottom, { backgroundColor: colors.card, borderTopColor: colors.border, paddingBottom: Math.max(insets.bottom, 12) + 4 }]}>
        {outOfStock ? (
          <View style={[s.soldOut, { backgroundColor: colors.dangerSoft }]}>
            <Text style={{ color: colors.danger, fontWeight: "600", fontSize: 15 }}>{t("stock_cart_empty")}</Text>
          </View>
        ) : (
          <>
            <View style={[s.qty, { borderColor: colors.borderStrong }]}>
              <TouchableOpacity style={s.qtyBtn} onPress={() => setQuantity((q) => Math.max(1, q - 1))} accessibilityLabel="Kamaytirish">
                <IcMinus size={18} color={colors.text} strokeWidth={2} />
              </TouchableOpacity>
              <Text style={[s.qtyText, { color: colors.text }]}>{quantity}</Text>
              <TouchableOpacity style={s.qtyBtn} onPress={() => setQuantity((q) => Math.min(maxQty, q + 1))} disabled={quantity >= maxQty} accessibilityLabel="Ko'paytirish">
                <IcPlus size={18} color={quantity >= maxQty ? colors.textMuted : colors.text} strokeWidth={2} />
              </TouchableOpacity>
            </View>
            <Button
              title={t("prod_add_cart")}
              style={{ flex: 1 }}
              onPress={() => {
                addToCart(product, quantity);
                navigation.navigate("MainTabs", { screen: "Savatcha" });
              }}
            />
          </>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  floatBtn: { position: "absolute", width: 44, height: 44, borderRadius: 22, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center", elevation: 2, shadowColor: "#101828", shadowOpacity: 0.12, shadowRadius: 3, shadowOffset: { width: 0, height: 1 } },
  dots: { position: "absolute", bottom: 14, left: 0, right: 0, flexDirection: "row", justifyContent: "center", gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  body: { paddingHorizontal: 20, paddingTop: 18 },
  meta: { fontSize: 13 },
  name: { fontSize: 21, lineHeight: 27, fontWeight: "600", marginTop: 6, letterSpacing: -0.3 },
  priceRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 12, gap: 12 },
  price: { fontSize: 21, fontWeight: "700", letterSpacing: -0.3, flexShrink: 1 },
  h2: { fontSize: 15, fontWeight: "600", marginTop: 22, marginBottom: 6 },
  desc: { fontSize: 14.5, lineHeight: 22 },
  specs: { borderWidth: 1, borderRadius: 12, overflow: "hidden" },
  specRow: { flexDirection: "row", justifyContent: "space-between", gap: 12, paddingHorizontal: 14, paddingVertical: 11 },
  specKey: { fontSize: 13.5, flex: 1 },
  specVal: { fontSize: 13.5, fontWeight: "500", flex: 1, textAlign: "right" },
  bottom: { position: "absolute", left: 0, right: 0, bottom: 0, flexDirection: "row", gap: 10, paddingHorizontal: 20, paddingTop: 12, borderTopWidth: 1 },
  qty: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderRadius: 12, height: 52 },
  qtyBtn: { width: 44, height: 50, alignItems: "center", justifyContent: "center" },
  qtyText: { minWidth: 28, textAlign: "center", fontSize: 16, fontWeight: "600" },
  soldOut: { flex: 1, height: 52, borderRadius: 12, alignItems: "center", justifyContent: "center" },
});
