import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { fetchProductDetail, Product, getImageUrl, formatPrice } from "../api";
import { useCart } from "../context/CartContext";
import { useI18n, localizeCategoryName } from "../context/I18nContext";
import { ShieldIcon, CartIcon } from "../components/Icons";

export function ProductDetailScreen({ route, navigation }: any) {
  const insets = useSafeAreaInsets();
  const { lang, t } = useI18n();
  const { slug } = route.params;
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const { addToCart } = useCart();

  useEffect(() => {
    fetchProductDetail(slug).then((data) => {
      setProduct(data);
      setLoading(false);
    });
  }, [slug]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0284c7" />
      </View>
    );
  }

  if (!product) {
    return (
      <View style={styles.center}>
        <Text style={styles.notFound}>Mahsulot topilmadi</Text>
      </View>
    );
  }

  const imgUrl = getImageUrl(product.images?.[0]?.url);

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: 120 + insets.bottom }]}
      >
        {/* Main Product Image */}
        <View style={styles.mainImgWrap}>
          <Image source={{ uri: imgUrl }} style={styles.mainImg} resizeMode="contain" />
          {product.isHit && (
            <View style={styles.hitBadge}>
              <Text style={styles.hitBadgeText}>XIT MAHSULOT</Text>
            </View>
          )}
        </View>

        <View style={styles.body}>
          {product.category && (
            <Text style={styles.catName}>
              {localizeCategoryName(product.category.slug || product.category.name, lang)}
            </Text>
          )}

          <Text style={styles.title}>{product.name}</Text>

          <View style={styles.priceRow}>
            <Text style={styles.price}>{formatPrice(product.priceFrom)}</Text>
            {product.country && (
              <View style={styles.countryBadge}>
                <Text style={styles.countryText}>🌍 {product.country}</Text>
              </View>
            )}
          </View>

          {/* Description */}
          {product.description ? (
            <View style={styles.section}>
              <Text style={styles.sectionHeader}>Tavsif va ma'lumot</Text>
              <Text style={styles.desc}>{product.description}</Text>
            </View>
          ) : null}

          {/* Specs Table */}
          {Array.isArray(product.specs) && product.specs.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionHeader}>Xususiyatlari</Text>
              <View style={styles.specsWrap}>
                {product.specs.map((spec: any, idx: number) => (
                  <View key={idx} style={[styles.specRow, idx % 2 === 1 && styles.specRowAlt]}>
                    <Text style={styles.specName}>{spec.name || spec.key}:</Text>
                    <Text style={styles.specValue}>{spec.value}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Kafolat va yetkazib berish (Web sayt kabi) */}
          <View style={styles.guaranteeBox}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 }}>
              <ShieldIcon size={17} color="#065f46" />
              <Text style={styles.guaranteeTitle}>Medax Rasmiy Kafolati</Text>
            </View>
            <Text style={styles.guaranteeDesc}>
              Barcha uskunalarimiz 100% sertifikatlangan, rasmiy zavod kafolatiga ega va butun O'zbekiston bo'ylab mutaxassislarimiz tomonidan yetkazib o'rnatiladi.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Bar: Quantity & Add to Cart */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <View style={styles.qtyControl}>
          <TouchableOpacity
            style={styles.qtyBtn}
            onPress={() => setQuantity((q) => Math.max(1, q - 1))}
          >
            <Text style={styles.qtyBtnText}>-</Text>
          </TouchableOpacity>
          <Text style={styles.qtyText}>{quantity}</Text>
          <TouchableOpacity
            style={styles.qtyBtn}
            onPress={() => setQuantity((q) => q + 1)}
          >
            <Text style={styles.qtyBtnText}>+</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.addToCartBtn}
          onPress={() => {
            addToCart(product, quantity);
            navigation.navigate("Savatcha");
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <CartIcon size={18} color="#ffffff" />
            <Text style={styles.addToCartText}>Savatchaga qo'shish</Text>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#ffffff" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  notFound: { fontSize: 16, color: "#64748b" },
  scroll: { backgroundColor: "#ffffff" },
  mainImgWrap: {
    width: "100%",
    height: 300,
    backgroundColor: "#f8fafc",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    position: "relative",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  mainImg: { width: "100%", height: "100%" },
  hitBadge: {
    position: "absolute",
    top: 14,
    left: 14,
    backgroundColor: "#ef4444",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  hitBadgeText: { color: "#ffffff", fontSize: 10, fontWeight: "900" },
  body: { padding: 18 },
  catName: { fontSize: 11.5, fontWeight: "800", color: "#0284c7", textTransform: "uppercase", marginBottom: 6 },
  title: { fontSize: 20, fontWeight: "800", color: "#0f172a", lineHeight: 28, marginBottom: 12 },
  priceRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  price: { fontSize: 22, fontWeight: "900", color: "#0284c7" },
  countryBadge: { backgroundColor: "#f1f5f9", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  countryText: { fontSize: 12, fontWeight: "600", color: "#334155" },
  section: { marginTop: 14, borderTopWidth: 1, borderTopColor: "#f1f5f9", paddingTop: 14 },
  sectionHeader: { fontSize: 15, fontWeight: "800", color: "#0f172a", marginBottom: 8 },
  desc: { fontSize: 13.5, color: "#334155", lineHeight: 21 },
  specsWrap: { backgroundColor: "#f8fafc", borderRadius: 12, overflow: "hidden", borderWidth: 1, borderColor: "#e2e8f0" },
  specRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 9, paddingHorizontal: 12 },
  specRowAlt: { backgroundColor: "#f1f5f9" },
  specName: { fontSize: 12, color: "#64748b", fontWeight: "600", flex: 1 },
  specValue: { fontSize: 12, color: "#0f172a", fontWeight: "700", flex: 1, textAlign: "right" },
  guaranteeBox: {
    marginTop: 18,
    backgroundColor: "rgba(16, 185, 129, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.25)",
    borderRadius: 14,
    padding: 14,
  },
  guaranteeTitle: { fontSize: 13.5, fontWeight: "800", color: "#065f46", marginBottom: 4 },
  guaranteeDesc: { fontSize: 12, color: "#047857", lineHeight: 17 },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#ffffff",
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    paddingHorizontal: 16,
    paddingTop: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 8,
  },
  qtyControl: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f1f5f9",
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  qtyBtn: { width: 34, height: 34, borderRadius: 8, backgroundColor: "#ffffff", justifyContent: "center", alignItems: "center" },
  qtyBtnText: { fontSize: 18, fontWeight: "700", color: "#0f172a" },
  qtyText: { marginHorizontal: 12, fontSize: 15, fontWeight: "800", color: "#0f172a" },
  addToCartBtn: {
    flex: 1,
    backgroundColor: "#0284c7",
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: "center",
  },
  addToCartText: { color: "#ffffff", fontSize: 14.5, fontWeight: "800" },
});
