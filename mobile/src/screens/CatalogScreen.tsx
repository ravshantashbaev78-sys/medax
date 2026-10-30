import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Category, fetchCategories, fetchProducts, Product, getImageUrl, formatPrice } from "../api";
import { useCart } from "../context/CartContext";
import { useI18n, localizeCategoryName, localizeProductName } from "../context/I18nContext";
import { SearchIcon, CloseIcon, CartIcon } from "../components/Icons";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export function CatalogScreen({ navigation, route }: any) {
  const insets = useSafeAreaInsets();
  const { lang, t } = useI18n();
  const initialCategory = route?.params?.categoryId;
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCat, setSelectedCat] = useState<number | undefined>(initialCategory);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [addedId, setAddedId] = useState<number | null>(null);
  const { addToCart } = useCart();

  useEffect(() => {
    fetchCategories().then(setCategories);
  }, []);

  useEffect(() => {
    if (route?.params?.categoryId !== undefined) {
      setSelectedCat(route.params.categoryId);
    }
  }, [route?.params?.categoryId]);

  useEffect(() => {
    setLoading(true);
    fetchProducts({ categoryId: selectedCat, search }).then((data) => {
      setProducts(data);
      setLoading(false);
    });
  }, [selectedCat, search]);

  const handleAddToCart = (product: Product) => {
    addToCart(product, 1);
    setAddedId(product.id);
    setTimeout(() => setAddedId(null), 1200);
  };

  return (
    <View style={styles.container}>
      {/* Search Header with Safe Area */}
      <View style={[styles.searchWrap, { paddingTop: insets.top + 8 }]}>
        <View style={styles.searchInputRow}>
          <SearchIcon size={18} color="#0284c7" />
          <TextInput
            style={styles.searchInput}
            placeholder={t("cat_search_ph")}
            value={search}
            onChangeText={setSearch}
            placeholderTextColor="#94a3b8"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")} style={styles.clearBtn}>
              <CloseIcon size={16} color="#94a3b8" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Category Pills */}
      <View style={styles.pillsWrap}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={[{ id: 0, name: t("cat_all_count"), slug: "all" }, ...categories]}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ paddingRight: 16 }}
          renderItem={({ item }) => {
            const active = (!selectedCat && item.id === 0) || selectedCat === item.id;
            return (
              <TouchableOpacity
                style={[styles.pill, active && styles.pillActive]}
                onPress={() => setSelectedCat(item.id === 0 ? undefined : item.id)}
              >
                <Text style={[styles.pillText, active && styles.pillTextActive]}>
                  {item.slug === "all" ? t("cat_all_count") : localizeCategoryName(item.slug || item.name, lang)}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* Product List */}
      {loading ? (
        <ActivityIndicator size="large" color="#0284c7" style={{ marginTop: 40 }} />
      ) : products.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={{ fontSize: 40, marginBottom: 12 }}>🔎</Text>
          <Text style={styles.emptyTitle}>{t("cat_not_found")}</Text>
          <Text style={styles.emptySub}>{t("cat_not_found_sub")}</Text>
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => String(item.id)}
          numColumns={2}
          contentContainerStyle={styles.listContent}
          columnWrapperStyle={styles.columnWrapper}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const imgUrl = getImageUrl(item.images?.[0]?.url);
            const isAdded = addedId === item.id;
            return (
              <TouchableOpacity
                style={styles.productCard}
                activeOpacity={0.9}
                onPress={() => navigation.navigate("ProductDetail", { slug: item.slug })}
              >
                <View style={styles.productImgWrap}>
                  <Image source={{ uri: imgUrl }} style={styles.productImg} resizeMode="contain" />
                  {item.isHit && (
                    <View style={styles.hitBadge}>
                      <Text style={styles.hitBadgeText}>XIT</Text>
                    </View>
                  )}
                  {item.isNew && !item.isHit && (
                    <View style={styles.newBadge}>
                      <Text style={styles.newBadgeText}>YANGI</Text>
                    </View>
                  )}
                </View>

                <View style={styles.productBody}>
                  {item.category?.name && (
                    <Text style={styles.productCatName} numberOfLines={1}>
                      {localizeCategoryName(item.category.slug || item.category.name, lang)}
                    </Text>
                  )}
                  <Text style={styles.productName} numberOfLines={2}>
                    {localizeProductName(item, lang)}
                  </Text>
                  {item.country && (
                    <Text style={styles.productCountry}>🌍 {item.country}</Text>
                  )}

                  {item.stock !== undefined && (
                    <Text
                      style={{
                        fontSize: 11,
                        fontWeight: "700",
                        color: (item.stock ?? 0) > 0 ? "#0284c7" : "#ef4444",
                        marginBottom: 4,
                      }}
                    >
                      {(item.stock ?? 0) > 0
                        ? t("stock_in").replace("{n}", String(item.stock))
                        : t("stock_out")}
                    </Text>
                  )}

                  <Text style={styles.productPrice}>{formatPrice(item.priceFrom)}</Text>

                  {item.stock !== undefined && item.stock <= 0 ? (
                    <View style={[styles.addCartBtn, { backgroundColor: "#fee2e2", borderColor: "#fca5a5" }]}>
                      <Text style={[styles.addCartText, { color: "#dc2626" }]}>
                        {t("stock_cart_empty")}
                      </Text>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={[styles.addCartBtn, isAdded && styles.addCartBtnDone]}
                      onPress={() => handleAddToCart(item)}
                    >
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                        <CartIcon size={14} color={isAdded ? "#ffffff" : "#0284c7"} />
                        <Text style={[styles.addCartText, isAdded && styles.addCartTextDone]}>
                          {isAdded ? "Qo'shildi" : "Savatchaga"}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  )}
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  searchWrap: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  searchInputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f1f5f9",
    borderRadius: 14,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 13.5,
    color: "#0f172a",
  },
  clearBtn: { padding: 4 },
  pillsWrap: {
    backgroundColor: "#ffffff",
    paddingVertical: 10,
    paddingLeft: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "#f1f5f9",
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  pillActive: { backgroundColor: "#0284c7", borderColor: "#0284c7" },
  pillText: { fontSize: 12.5, fontWeight: "600", color: "#475569" },
  pillTextActive: { color: "#ffffff", fontWeight: "700" },
  listContent: { padding: 14, paddingBottom: 24 },
  columnWrapper: { justifyContent: "space-between" },
  productCard: {
    width: (SCREEN_WIDTH - 40) / 2,
    backgroundColor: "#ffffff",
    borderRadius: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    overflow: "hidden",
  },
  productImgWrap: {
    height: 140,
    backgroundColor: "#f8fafc",
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
    padding: 8,
  },
  productImg: { width: "100%", height: "100%" },
  hitBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: "#ef4444",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
  },
  hitBadgeText: { color: "#ffffff", fontSize: 9.5, fontWeight: "900" },
  newBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: "#10b981",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
  },
  newBadgeText: { color: "#ffffff", fontSize: 9.5, fontWeight: "900" },
  productBody: { padding: 10 },
  productCatName: { fontSize: 9.5, fontWeight: "700", color: "#0284c7", textTransform: "uppercase", marginBottom: 3 },
  productName: { fontSize: 12.5, fontWeight: "700", color: "#0f172a", minHeight: 34, marginBottom: 4, lineHeight: 17 },
  productCountry: { fontSize: 10, color: "#64748b", marginBottom: 6 },
  productPrice: { fontSize: 13.5, fontWeight: "900", color: "#0284c7", marginBottom: 8 },
  addCartBtn: {
    backgroundColor: "rgba(2, 132, 199, 0.09)",
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: "center",
  },
  addCartBtnDone: { backgroundColor: "#10b981" },
  addCartText: { color: "#0284c7", fontWeight: "800", fontSize: 11.5 },
  addCartTextDone: { color: "#ffffff" },
  emptyWrap: { alignItems: "center", justifyContent: "center", marginTop: 60, paddingHorizontal: 30 },
  emptyTitle: { fontSize: 16, fontWeight: "800", color: "#1e293b", marginBottom: 4 },
  emptySub: { fontSize: 12.5, color: "#94a3b8", textAlign: "center" },
});
