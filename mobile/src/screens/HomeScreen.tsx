import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Category, fetchCategories, fetchProducts, Product, getImageUrl, formatPrice } from "../api";
import { useCart } from "../context/CartContext";
import { useI18n, localizeCategoryName, localizeProductName, Language } from "../context/I18nContext";
import {
  MedaxHeaderBrand,
  SearchIcon,
  TruckIcon,
  ShieldIcon,
  CertificateIcon,
  BoltIcon,
  CartIcon,
} from "../components/Icons";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// Web saytdagi 4 ta asosiy banner rasmlari va matnlari
function getBannerSlides(lang: Language) {
  return [
    {
      id: 1,
      tag: lang === "ru" ? "ИНВАЛИДНЫЕ КОЛЯСКИ" : lang === "en" ? "WHEELCHAIRS" : "NOGIRONLAR ARAVACHALARI",
      title1: lang === "ru" ? "Электроколяски" : lang === "en" ? "Electric Wheelchairs" : "Pultli nogironlar",
      title2: lang === "ru" ? "в наличии в Medax" : lang === "en" ? "available at Medax" : "aravachasi Medax’da",
      desc: lang === "ru" ? "Легкие аккумуляторные, удобное и безопасное управление" : lang === "en" ? "Lightweight battery-powered, convenient and safe control" : "Yengil akkumulyatorli, qulay va xavfsiz boshqaruv",
      badges: lang === "ru" ? ["✓ Оригинал", "🛡 1 год гарантии"] : lang === "en" ? ["✓ Original", "🛡 1 Year Warranty"] : ["✓ Original", "🛡 1 yil kafolat"],
      img: "https://medax.uz/banners/wheelchair-remote.png",
      bg: "#0f172a",
      accent: "#38bdf8",
    },
    {
      id: 2,
      tag: "DIAGNOSTIKA & UZI",
      title1: lang === "ru" ? "Современные УЗИ" : lang === "en" ? "Advanced Ultrasound" : "Zamonaviy UZI",
      title2: lang === "ru" ? "аппараты в Medax" : lang === "en" ? "scanners at Medax" : "apparatlari Medax’da",
      desc: lang === "ru" ? "Высокоточные 4D датчики и цветной допплер" : lang === "en" ? "High-precision 4D probes and color Doppler" : "Yuqori aniqlikdagi 4D datchiklar va rangli doppler",
      badges: lang === "ru" ? ["✓ Оригинал", "🛡 Официальный сервис"] : lang === "en" ? ["✓ Original", "🛡 Official Service"] : ["✓ Original", "🛡 Rasmiy servis"],
      img: "https://medax.uz/banners/medical-diag.jpg",
      bg: "#0369a1",
      accent: "#bae6fd",
    },
    {
      id: 3,
      tag: lang === "ru" ? "РЕАНИМАЦИЯ И ИВЛ" : lang === "en" ? "ICU & VENTILATORS" : "REANIMATSIYA & IVL",
      title1: lang === "ru" ? "Реанимация и" : lang === "en" ? "ICU and" : "Reanimatsiya va",
      title2: lang === "ru" ? "аппараты ИВЛ в Medax" : lang === "en" ? "Ventilators at Medax" : "IVL jihozlari Medax’da",
      desc: lang === "ru" ? "Искусственная вентиляция легких и мониторинг" : lang === "en" ? "Artificial lung ventilation and vital monitoring" : "O'pkani sun'iy shamollatish va hayotiy monitoring",
      badges: lang === "ru" ? ["✓ Сертифицировано", "🛡 24/7 сервис"] : lang === "en" ? ["✓ Certified", "🛡 24/7 Service"] : ["✓ Sertifikatlangan", "🛡 24/7 servis"],
      img: "https://medax.uz/banners/medical-surgery.jpg",
      bg: "#065f46",
      accent: "#6ee7b7",
    },
    {
      id: 4,
      tag: lang === "ru" ? "МЕДИЦИНСКАЯ МЕБЕЛЬ" : lang === "en" ? "MEDICAL FURNITURE" : "TIBBIY MEBEL",
      title1: lang === "ru" ? "Функциональные" : lang === "en" ? "Functional Medical" : "Funksional tibbiy",
      title2: lang === "ru" ? "кровати в Medax" : lang === "en" ? "Beds at Medax" : "kravatlar Medax’da",
      desc: lang === "ru" ? "Электропривод и максимальный комфорт для пациента" : lang === "en" ? "Electric drive and maximum patient comfort" : "Elektroprivodli boshqaruv va bemor uchun maksimal qulaylik",
      badges: lang === "ru" ? ["✓ С гарантией", "🛡 1 год гарантии"] : lang === "en" ? ["✓ Guaranteed", "🛡 1 Year Warranty"] : ["✓ Kafolatlangan", "🛡 1 yil kafolat"],
      img: "https://medax.uz/banners/medical-bed.jpg",
      bg: "#1e1b4b",
      accent: "#c7d2fe",
    },
  ];
}

export function HomeScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { lang, t } = useI18n();
  const bannerSlides = getBannerSlides(lang);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [addedId, setAddedId] = useState<number | null>(null);
  const { addToCart } = useCart();

  const getCategoryEmoji = (slug: string) => {
    switch (slug) {
      case "tibbiy-buyumlar": return "🩹";
      case "tibbiy-apparaturalar": return "🔬";
      case "tibbiy-jihozlar": return "🛏️";
      case "laboratoriya-reagentlari": return "🧪";
      case "ortopedik-mahsulotlar": return "♿";
      default: return "🏥";
    }
  };

  // Banner avto-o'tishi
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % bannerSlides.length);
    }, 4500);
    return () => clearInterval(timer);
  }, [bannerSlides.length]);

  useEffect(() => {
    Promise.all([fetchCategories(), fetchProducts()]).then(([cats, prods]) => {
      setCategories(cats);
      setProducts(prods);
      setLoading(false);
    });
  }, []);

  const handleAddToCart = (product: Product) => {
    addToCart(product, 1);
    setAddedId(product.id);
    setTimeout(() => setAddedId(null), 1200);
  };

  const activeSlide = bannerSlides[currentSlide] || bannerSlides[0];

  return (
    <View style={styles.screen}>
      {/* 1. Medax Asl Logotipi Header (Web sayt kabi) */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <MedaxHeaderBrand />

        <TouchableOpacity
          style={styles.headerPhoneBtn}
          onPress={() => navigation.navigate("Profil")}
        >
          <Text style={{ fontSize: 12.5, color: "#0284c7", fontWeight: "800" }}>{t("home_cabinet")}</Text>
        </TouchableOpacity>
      </View>

      {/* 2. Original Vektor Qidiruv paneli */}
      <View style={styles.searchContainer}>
        <TouchableOpacity
          style={styles.searchBar}
          activeOpacity={0.8}
          onPress={() => navigation.navigate("Katalog")}
        >
          <SearchIcon size={18} color="#0284c7" />
          <Text style={styles.searchPlaceholder}>{t("home_search_ph")}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 24 }}
      >
        {/* 3. Hero Banner Karusel (Web saytdagi original rasmlari bilan) */}
        <View style={styles.bannerContainer}>
          <View style={[styles.bannerCard, { backgroundColor: activeSlide.bg }]}>
            <View style={styles.bannerInner}>
              {/* Chap matn qismi */}
              <View style={styles.bannerLeftText}>
                <Text style={[styles.bannerTag, { color: activeSlide.accent }]}>
                  {activeSlide.tag}
                </Text>

                <Text style={styles.bannerTitle1}>{activeSlide.title1}</Text>
                <Text style={[styles.bannerTitle2, { color: activeSlide.accent }]}>
                  {activeSlide.title2}
                </Text>

                {/* Badges */}
                <View style={styles.bannerBadgesRow}>
                  {activeSlide.badges.map((b, idx) => (
                    <View key={idx} style={styles.bannerPill}>
                      <Text style={styles.bannerPillText}>{b}</Text>
                    </View>
                  ))}
                </View>

                {/* Action button */}
                <TouchableOpacity
                  style={styles.bannerBtn}
                  onPress={() => navigation.navigate("Katalog")}
                >
                  <Text style={[styles.bannerBtnText, { color: activeSlide.bg }]}>
                    {t("home_catalog_btn")}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* O'ng rasm qismi (Web saytdagi original banner rasmlari) */}
              <View style={styles.bannerRightImgWrap}>
                <Image
                  source={{ uri: activeSlide.img }}
                  style={styles.bannerImg}
                  resizeMode="contain"
                />
              </View>
            </View>
          </View>

          {/* Dots Indicator */}
          <View style={styles.dotsRow}>
            {bannerSlides.map((_, idx) => (
              <TouchableOpacity
                key={idx}
                onPress={() => setCurrentSlide(idx)}
                style={[
                  styles.dot,
                  currentSlide === idx && styles.dotActive,
                ]}
              />
            ))}
          </View>
        </View>

        {/* 4. Medax Afzalliklari (Original Vektor Belgilar) */}
        <View style={styles.trustBadgesRow}>
          <View style={styles.trustItem}>
            <View style={styles.trustIconWrap}>
              <TruckIcon size={19} color="#0284c7" />
            </View>
            <Text style={styles.trustTitle}>{t("trust_delivery")}</Text>
            <Text style={styles.trustSub}>{t("trust_delivery_sub")}</Text>
          </View>
          <View style={styles.trustItem}>
            <View style={styles.trustIconWrap}>
              <ShieldIcon size={19} color="#0d9488" />
            </View>
            <Text style={styles.trustTitle}>{t("trust_warranty")}</Text>
            <Text style={styles.trustSub}>{t("trust_warranty_sub")}</Text>
          </View>
          <View style={styles.trustItem}>
            <View style={styles.trustIconWrap}>
              <CertificateIcon size={19} color="#4f46e5" />
            </View>
            <Text style={styles.trustTitle}>{t("trust_cert")}</Text>
            <Text style={styles.trustSub}>{t("trust_cert_sub")}</Text>
          </View>
          <View style={styles.trustItem}>
            <View style={styles.trustIconWrap}>
              <BoltIcon size={19} color="#eab308" />
            </View>
            <Text style={styles.trustTitle}>{t("trust_eng")}</Text>
            <Text style={styles.trustSub}>{t("trust_eng_sub")}</Text>
          </View>
        </View>

        {/* 5. Kategoriyalar bo'limi */}
        <View style={styles.sectionHeaderWrap}>
          <Text style={styles.sectionTitle}>{t("home_all_cat")}</Text>
          <TouchableOpacity onPress={() => navigation.navigate("Katalog")}>
            <Text style={styles.sectionSeeAll}>{t("cat_all_count")} ({categories.length}) →</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryScroll}
        >
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={styles.categoryCard}
              onPress={() => navigation.navigate("Katalog", { categoryId: cat.id })}
            >
              <View style={styles.catIconWrap}>
                <Text style={{ fontSize: 20 }}>{getCategoryEmoji(cat.slug)}</Text>
              </View>
              <Text style={styles.categoryName} numberOfLines={2}>
                {localizeCategoryName(cat.slug || cat.name, lang)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* 6. Ommabop Mahsulotlar (Web sayt kartochkalari kabi) */}
        <View style={styles.sectionHeaderWrap}>
          <View>
            <Text style={styles.sectionTitle}>{t("home_popular")}</Text>
            <Text style={styles.sectionSub}>{t("home_popular_sub")}</Text>
          </View>
          <TouchableOpacity onPress={() => navigation.navigate("Katalog")}>
            <Text style={styles.sectionSeeAll}>{t("cat_all_count")} →</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#0284c7" style={{ marginTop: 24 }} />
        ) : products.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyText}>{t("home_no_products")}</Text>
          </View>
        ) : (
          <View style={styles.productGrid}>
            {products.slice(0, 12).map((item) => {
              const imgUrl = getImageUrl(item.images?.[0]?.url);
              const isAdded = addedId === item.id;
              return (
                <TouchableOpacity
                  key={item.id}
                  style={styles.productCard}
                  activeOpacity={0.9}
                  onPress={() => navigation.navigate("ProductDetail", { slug: item.slug })}
                >
                  {/* Image Container with Badges */}
                  <View style={styles.productImgWrap}>
                    <Image
                      source={{ uri: imgUrl }}
                      style={styles.productImg}
                      resizeMode="contain"
                    />
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

                  {/* Card Body */}
                  <View style={styles.productBody}>
                    {item.category?.name && (
                      <Text style={styles.productCatName} numberOfLines={1}>
                        {localizeCategoryName(item.category.slug || item.category.name, lang)}
                      </Text>
                    )}

                    <Text style={styles.productTitle} numberOfLines={2}>
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

                    <View style={styles.priceRow}>
                      <Text style={styles.productPrice}>{formatPrice(item.priceFrom)}</Text>
                    </View>

                    {/* Add to Cart Button with SVG Icon */}
                    {item.stock !== undefined && item.stock <= 0 ? (
                      <View style={[styles.addBtn, { backgroundColor: "#fee2e2", borderColor: "#fca5a5" }]}>
                        <Text style={[styles.addBtnText, { color: "#dc2626" }]}>
                          {t("stock_cart_empty")}
                        </Text>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={[styles.addBtn, isAdded && styles.addBtnDone]}
                        onPress={() => handleAddToCart(item)}
                      >
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                          <CartIcon size={14} color={isAdded ? "#ffffff" : "#0284c7"} />
                          <Text style={[styles.addBtnText, isAdded && styles.addBtnTextDone]}>
                            {isAdded ? t("prod_added") : t("prod_add_cart")}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* 7. Callout Aloqa banneri */}
        <View style={styles.contactCallout}>
          <Text style={styles.contactCalloutTitle}>{t("home_questions_title")}</Text>
          <Text style={styles.contactCalloutDesc}>
            {t("home_questions_sub")}
          </Text>
          <View style={styles.contactRow}>
            <Text style={styles.contactPhone}>📞 +998 91 186-66-61</Text>
            <Text style={styles.contactHours}>{t("home_work_hours")}</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f8fafc" },
  scroll: { flex: 1 },

  // Header
  header: {
    backgroundColor: "#ffffff",
    paddingHorizontal: 16,
    paddingBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  headerPhoneBtn: {
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },

  // Search
  searchContainer: { backgroundColor: "#ffffff", paddingHorizontal: 16, paddingTop: 10, paddingBottom: 12 },
  searchBar: {
    backgroundColor: "#f1f5f9",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  searchPlaceholder: { fontSize: 13, color: "#64748b", fontWeight: "500", flex: 1 },

  // Banner
  bannerContainer: { paddingHorizontal: 16, marginTop: 14 },
  bannerCard: {
    borderRadius: 20,
    padding: 16,
    minHeight: 185,
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
    overflow: "hidden",
  },
  bannerInner: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  bannerLeftText: { flex: 1.1, paddingRight: 8 },
  bannerRightImgWrap: { flex: 0.9, height: 140, alignItems: "center", justifyContent: "center" },
  bannerImg: { width: "100%", height: "100%" },

  bannerTag: { fontSize: 9.5, fontWeight: "900", letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 4 },
  bannerTitle1: { fontSize: 17, fontWeight: "800", color: "#ffffff", lineHeight: 22 },
  bannerTitle2: { fontSize: 17, fontWeight: "900", lineHeight: 22, marginBottom: 8 },
  bannerBadgesRow: { flexDirection: "row", flexWrap: "wrap", gap: 5, marginBottom: 12 },
  bannerPill: {
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  bannerPillText: { color: "#ffffff", fontSize: 10, fontWeight: "700" },
  bannerBtn: {
    alignSelf: "flex-start",
    backgroundColor: "#ffffff",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
  },
  bannerBtnText: { fontWeight: "800", fontSize: 12 },
  dotsRow: { flexDirection: "row", justifyContent: "center", gap: 6, marginTop: 10 },
  dot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: "#cbd5e1" },
  dotActive: { width: 22, backgroundColor: "#0284c7" },

  // Trust Badges
  trustBadgesRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#ffffff",
    marginHorizontal: 16,
    marginTop: 14,
    paddingVertical: 12,
    paddingHorizontal: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  trustItem: { flex: 1, alignItems: "center" },
  trustIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  trustTitle: { fontSize: 10, fontWeight: "800", color: "#0f172a", textAlign: "center" },
  trustSub: { fontSize: 8.5, color: "#64748b", textAlign: "center", marginTop: 1 },

  // Sections
  sectionHeaderWrap: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    paddingHorizontal: 16,
    marginTop: 20,
    marginBottom: 10,
  },
  sectionTitle: { fontSize: 18, fontWeight: "800", color: "#0f172a" },
  sectionSub: { fontSize: 11, color: "#64748b", marginTop: 1 },
  sectionSeeAll: { fontSize: 12.5, color: "#0284c7", fontWeight: "700" },

  // Categories
  categoryScroll: { paddingHorizontal: 16, gap: 10 },
  categoryCard: {
    width: 100,
    backgroundColor: "#ffffff",
    padding: 12,
    borderRadius: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  catIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(2, 132, 199, 0.08)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  categoryName: { fontSize: 11, fontWeight: "700", color: "#1e293b", textAlign: "center", lineHeight: 14 },

  // Products Grid
  productGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  productCard: {
    width: (SCREEN_WIDTH - 42) / 2,
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
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  hitBadgeText: { color: "#ffffff", fontSize: 9.5, fontWeight: "900" },
  newBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: "#10b981",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  newBadgeText: { color: "#ffffff", fontSize: 9.5, fontWeight: "900" },

  productBody: { padding: 10 },
  productCatName: { fontSize: 9.5, fontWeight: "700", color: "#0284c7", textTransform: "uppercase", marginBottom: 3 },
  productTitle: { fontSize: 12.5, fontWeight: "700", color: "#0f172a", lineHeight: 17, minHeight: 34, marginBottom: 4 },
  productCountry: { fontSize: 10, color: "#64748b", marginBottom: 6 },
  priceRow: { marginBottom: 8 },
  productPrice: { fontSize: 13.5, fontWeight: "900", color: "#0284c7" },
  addBtn: {
    backgroundColor: "rgba(2, 132, 199, 0.09)",
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  addBtnDone: { backgroundColor: "#10b981" },
  addBtnText: { color: "#0284c7", fontWeight: "800", fontSize: 11 },
  addBtnTextDone: { color: "#ffffff" },

  emptyWrap: { padding: 30, alignItems: "center" },
  emptyText: { color: "#64748b", fontSize: 13 },

  // Contact Callout
  contactCallout: {
    backgroundColor: "rgba(2, 132, 199, 0.07)",
    marginHorizontal: 16,
    marginTop: 20,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(2, 132, 199, 0.2)",
  },
  contactCalloutTitle: { fontSize: 14, fontWeight: "800", color: "#0f172a", marginBottom: 4 },
  contactCalloutDesc: { fontSize: 11.5, color: "#475569", lineHeight: 16, marginBottom: 10 },
  contactRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  contactPhone: { fontSize: 13, fontWeight: "900", color: "#0284c7" },
  contactHours: { fontSize: 10.5, color: "#64748b" },
});
