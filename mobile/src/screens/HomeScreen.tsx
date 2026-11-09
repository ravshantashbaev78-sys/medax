import React, { useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, Linking } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Category, fetchCategories, fetchProductsPage, Product } from "../api";
import { useCart } from "../context/CartContext";
import { useTheme } from "../context/ThemeContext";
import { useI18n, localizeCategoryName } from "../context/I18nContext";
import { ProductCard } from "../components/ProductCard";
import { BrandMark, Button, Card, CategoryIcon, IconBadge, IconButton, IcBell, IcPin, IcSearch, SectionHeader } from "../components/ui";

const MAP_URL = "https://maps.app.goo.gl/Fi3DDmU1kWqHVST4A";

const L = {
  uz: { pickup: "Do'kondan olib ketish", addr: "Namangan sh., Beruniy ko'chasi, 2-uy", cats: "Kategoriyalar", all: "Barchasi", fresh: "Yangi kelganlar", offline: "Internet aloqasi yo'q", retry: "Qayta urinish", empty: "Hozircha mahsulotlar yo'q" },
  ru: { pickup: "Самовывоз из магазина", addr: "г. Наманган, ул. Беруни, 2", cats: "Категории", all: "Все", fresh: "Новинки", offline: "Нет подключения к интернету", retry: "Повторить", empty: "Пока нет товаров" },
  en: { pickup: "Store pickup", addr: "Namangan, Beruniy street 2", cats: "Categories", all: "See all", fresh: "New arrivals", offline: "No internet connection", retry: "Try again", empty: "No products yet" },
};

export function HomeScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { lang, t } = useI18n();
  const c = L[lang] || L.uz;
  const { addToCart } = useCart();

  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [failed, setFailed] = useState(false);
  const [addedId, setAddedId] = useState<number | null>(null);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    const [cats, page] = await Promise.all([fetchCategories(), fetchProductsPage({ page: 1, limit: 6 })]);
    setCategories(cats);
    setProducts(page.items);
    setFailed(!page.ok && cats.length === 0);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleAdd = (p: Product) => {
    addToCart(p, 1);
    setAddedId(p.id);
    setTimeout(() => setAddedId((cur) => (cur === p.id ? null : cur)), 1200);
  };

  const rows: Product[][] = [];
  for (let i = 0; i < products.length; i += 2) rows.push(products.slice(i, i + 2));

  return (
    <View style={[s.screen, { backgroundColor: colors.bg }]}>
      <View style={[s.header, { paddingTop: insets.top + 10, backgroundColor: colors.headerBg, borderBottomColor: colors.border }]}>
        <View style={s.headerRow}>
          <BrandMark />
          <IconButton label={t("notif_title")} onPress={() => navigation.navigate("Profil")}>
            <IcBell size={20} color={colors.text} strokeWidth={1.8} />
          </IconButton>
        </View>
        <TouchableOpacity
          style={[s.search, { backgroundColor: colors.inputBg }]}
          activeOpacity={0.8}
          onPress={() => navigation.navigate("Katalog", { focusSearch: Date.now() })}
          accessibilityRole="search"
        >
          <IcSearch size={18} color={colors.textMuted} strokeWidth={2} />
          <Text style={{ fontSize: 15, color: colors.textMuted }}>{t("cat_search_ph")}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} colors={[colors.primary]} tintColor={colors.primary} />}
      >
        <TouchableOpacity activeOpacity={0.85} onPress={() => Linking.openURL(MAP_URL)} accessibilityRole="link">
          <Card style={s.pickup}>
            <IconBadge>
              <IcPin size={20} color={colors.primary} strokeWidth={1.8} />
            </IconBadge>
            <View style={{ flex: 1 }}>
              <Text style={[s.pickupTitle, { color: colors.text }]}>{c.pickup}</Text>
              <Text style={[s.pickupText, { color: colors.textSecondary }]}>{c.addr}</Text>
            </View>
          </Card>
        </TouchableOpacity>

        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
        ) : failed ? (
          <View style={s.empty}>
            <Text style={[s.emptyTitle, { color: colors.text }]}>{c.offline}</Text>
            <Button title={c.retry} onPress={() => load()} style={{ marginTop: 14, alignSelf: "center", paddingHorizontal: 28 }} />
          </View>
        ) : (
          <>
            {categories.length > 0 && (
              <View style={s.section}>
                <SectionHeader title={c.cats} action={c.all} onAction={() => navigation.navigate("Katalog", { categoryId: 0 })} />
                <View style={s.catGrid}>
                  {categories.map((cat) => (
                    <TouchableOpacity
                      key={cat.id}
                      activeOpacity={0.8}
                      onPress={() => navigation.navigate("Katalog", { categoryId: cat.id })}
                      style={[s.catTile, { backgroundColor: colors.card, borderColor: colors.border }]}
                    >
                      <IconBadge size={32}>
                        <CategoryIcon slug={cat.slug} color={colors.primary} />
                      </IconBadge>
                      <Text style={[s.catName, { color: colors.text }]} numberOfLines={2}>
                        {localizeCategoryName(cat.slug || cat.name, lang)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            <View style={s.section}>
              <SectionHeader title={c.fresh} action={products.length ? c.all : undefined} onAction={() => navigation.navigate("Katalog", { categoryId: 0 })} />
              {products.length === 0 ? (
                <Text style={{ color: colors.textMuted, fontSize: 14.5 }}>{c.empty}</Text>
              ) : (
                rows.map((row, i) => (
                  <View key={i} style={s.row}>
                    {row.map((p) => (
                      <ProductCard
                        key={p.id}
                        product={p}
                        showStock={false}
                        added={addedId === p.id}
                        onAdd={() => handleAdd(p)}
                        onPress={() => navigation.navigate("ProductDetail", { slug: p.slug })}
                      />
                    ))}
                    {row.length === 1 ? <View style={{ flex: 1 }} /> : null}
                  </View>
                ))
              )}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 14, borderBottomWidth: 1 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  search: { marginTop: 14, height: 46, borderRadius: 12, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", gap: 10 },
  content: { padding: 20, paddingTop: 16, paddingBottom: 32 },
  pickup: { flexDirection: "row", alignItems: "center", gap: 14, padding: 14 },
  pickupTitle: { fontSize: 15, fontWeight: "600" },
  pickupText: { fontSize: 13.5, marginTop: 3 },
  section: { marginTop: 22 },
  catGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  catTile: { width: "48.8%", minHeight: 56, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, flexDirection: "row", alignItems: "center", gap: 10 },
  catName: { flex: 1, fontSize: 13.5, fontWeight: "500", lineHeight: 17 },
  row: { flexDirection: "row", gap: 10, marginBottom: 10 },
  empty: { alignItems: "center", marginTop: 40 },
  emptyTitle: { fontSize: 16, fontWeight: "600" },
});
