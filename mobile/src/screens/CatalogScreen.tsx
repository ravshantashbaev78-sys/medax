import React, { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, ActivityIndicator, RefreshControl } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Category, fetchCategories, fetchProductsPage, Product } from "../api";
import { useCart } from "../context/CartContext";
import { useTheme } from "../context/ThemeContext";
import { useI18n, localizeCategoryName } from "../context/I18nContext";
import { ProductCard } from "../components/ProductCard";
import { Button, IcClose, IcSearch, ui } from "../components/ui";

const L = {
  uz: { all: "Barchasi", offline: "Internet aloqasi yo'q", offlineSub: "Tarmoqni tekshirib, qayta urinib ko'ring.", retry: "Qayta urinish", count: "ta mahsulot" },
  ru: { all: "Все", offline: "Нет подключения к интернету", offlineSub: "Проверьте сеть и попробуйте снова.", retry: "Повторить", count: "товаров" },
  en: { all: "All", offline: "No internet connection", offlineSub: "Check your connection and try again.", retry: "Try again", count: "products" },
};

export function CatalogScreen({ navigation, route }: any) {
  const insets = useSafeAreaInsets();
  const { lang, t } = useI18n();
  const { colors } = useTheme();
  const c = L[lang] || L.uz;
  const { addToCart } = useCart();

  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCat, setSelectedCat] = useState<number | undefined>(route?.params?.categoryId || undefined);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [addedId, setAddedId] = useState<number | null>(null);
  const requestId = useRef(0);
  const searchRef = useRef<TextInput>(null);

  // Bosh sahifadan kategoriya yoki qidiruv bilan kelinganda
  useEffect(() => {
    if (route?.params?.categoryId !== undefined) setSelectedCat(route.params.categoryId || undefined);
  }, [route?.params?.categoryId]);
  useEffect(() => {
    if (route?.params?.focusSearch) setTimeout(() => searchRef.current?.focus(), 250);
  }, [route?.params?.focusSearch]);

  // Har bir harf uchun so'rov yubormaslik uchun qidiruvni kechiktiramiz
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(timer);
  }, [search]);

  const loadFirstPage = async (isRefresh = false) => {
    const myId = ++requestId.current;
    if (isRefresh || categories.length === 0) fetchCategories().then((cs) => cs.length && setCategories(cs));
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    const res = await fetchProductsPage({ categoryId: selectedCat, search: debouncedSearch, page: 1 });
    if (myId !== requestId.current) return; // eskirgan javob
    setProducts(res.items);
    setPage(1);
    setPages(res.pages);
    setTotal(res.total);
    setLoadError(!res.ok);
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    loadFirstPage();
  }, [selectedCat, debouncedSearch]);

  const loadMore = async () => {
    if (loading || loadingMore || page >= pages) return;
    const myId = requestId.current;
    setLoadingMore(true);
    const res = await fetchProductsPage({ categoryId: selectedCat, search: debouncedSearch, page: page + 1 });
    if (myId === requestId.current && res.ok) {
      setProducts((prev) => {
        const ids = new Set(prev.map((p) => p.id));
        return [...prev, ...res.items.filter((p) => !ids.has(p.id))];
      });
      setPage(res.page);
      setPages(res.pages);
    }
    setLoadingMore(false);
  };

  const handleAdd = (p: Product) => {
    addToCart(p, 1);
    setAddedId(p.id);
    setTimeout(() => setAddedId((cur) => (cur === p.id ? null : cur)), 1200);
  };

  const chips = [{ id: 0, name: c.all, slug: "" } as Category, ...categories];

  return (
    <View style={[s.screen, { backgroundColor: colors.bg }]}>
      <View style={[s.header, { paddingTop: insets.top + 10, backgroundColor: colors.headerBg, borderBottomColor: colors.border }]}>
        <Text style={[ui.h1, { color: colors.text, paddingHorizontal: 20, marginBottom: 12 }]}>{t("cat_title")}</Text>
        <View style={[s.search, { backgroundColor: colors.inputBg }]}>
          <IcSearch size={18} color={colors.textMuted} strokeWidth={2} />
          <TextInput
            ref={searchRef}
            style={[s.searchInput, { color: colors.text }]}
            placeholder={t("cat_search_ph")}
            placeholderTextColor={colors.textMuted}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
            accessibilityLabel={t("cat_search_ph")}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")} hitSlop={10} accessibilityLabel="Tozalash">
              <IcClose size={18} color={colors.textMuted} strokeWidth={2} />
            </TouchableOpacity>
          )}
        </View>
        <FlatList
          horizontal
          data={chips}
          keyExtractor={(i) => String(i.id)}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, gap: 8, paddingTop: 12 }}
          renderItem={({ item }) => {
            const on = (item.id === 0 && !selectedCat) || selectedCat === item.id;
            return (
              <TouchableOpacity
                onPress={() => setSelectedCat(item.id === 0 ? undefined : item.id)}
                accessibilityState={{ selected: on }}
                style={[
                  s.chip,
                  on ? { backgroundColor: colors.chipActiveBg, borderColor: colors.chipActiveBg } : { backgroundColor: colors.card, borderColor: colors.borderStrong },
                ]}
              >
                <Text style={{ fontSize: 13.5, fontWeight: on ? "600" : "500", color: on ? colors.chipActiveText : colors.textSecondary }}>
                  {item.id === 0 ? c.all : localizeCategoryName(item.slug || item.name, lang)}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
      ) : products.length === 0 && loadError ? (
        <View style={s.empty}>
          <Text style={[s.emptyTitle, { color: colors.text }]}>{c.offline}</Text>
          <Text style={[s.emptySub, { color: colors.textMuted }]}>{c.offlineSub}</Text>
          <Button title={c.retry} onPress={() => loadFirstPage()} style={{ marginTop: 16, paddingHorizontal: 28 }} />
        </View>
      ) : products.length === 0 ? (
        <View style={s.empty}>
          <Text style={[s.emptyTitle, { color: colors.text }]}>{t("cat_not_found")}</Text>
          <Text style={[s.emptySub, { color: colors.textMuted }]}>{t("cat_not_found_sub")}</Text>
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={(i) => String(i.id)}
          numColumns={2}
          columnWrapperStyle={{ gap: 10 }}
          contentContainerStyle={{ padding: 20, paddingTop: 0, gap: 10, paddingBottom: 28 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            <Text style={{ fontSize: 13.5, color: colors.textSecondary, paddingTop: 14, paddingBottom: 2 }}>
              {total} {c.count}
            </Text>
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadFirstPage(true)} colors={[colors.primary]} tintColor={colors.primary} />}
          ListFooterComponent={loadingMore ? <ActivityIndicator color={colors.primary} style={{ marginVertical: 18 }} /> : null}
          renderItem={({ item, index }) => (
            <View style={{ flex: 1, maxWidth: index === products.length - 1 && products.length % 2 === 1 ? "48.6%" : undefined }}>
              <ProductCard
                product={item}
                added={addedId === item.id}
                onAdd={() => handleAdd(item)}
                onPress={() => navigation.navigate("ProductDetail", { slug: item.slug })}
              />
            </View>
          )}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1 },
  header: { paddingBottom: 12, borderBottomWidth: 1 },
  search: { marginHorizontal: 20, height: 46, borderRadius: 12, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", gap: 10 },
  searchInput: { flex: 1, fontSize: 15, paddingVertical: 0 },
  chip: { height: 36, paddingHorizontal: 14, borderRadius: 18, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  empty: { alignItems: "center", paddingHorizontal: 32, marginTop: 64 },
  emptyTitle: { fontSize: 17, fontWeight: "600", textAlign: "center" },
  emptySub: { fontSize: 14.5, marginTop: 6, textAlign: "center", lineHeight: 21 },
});
