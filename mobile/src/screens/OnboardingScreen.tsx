import React, { useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  FlatList,
  Image,
  ScrollView,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  MedaxEmblem,
  StethoscopeIcon,
  PriceTagIcon,
  FilterSearchIcon,
  ShieldCheckIcon,
  WrenchToolIcon,
  MapPinCheckIcon,
} from "../components/Icons";
import { useI18n, Language } from "../context/I18nContext";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const isCompactScreen = SCREEN_HEIGHT < 720;

export const ONBOARDING_KEY = "@medax_has_seen_onboarding";

interface FeaturePoint {
  icon: (props: { size?: number; color?: string }) => React.JSX.Element;
  title: Record<Language, string>;
  desc: Record<Language, string>;
}

interface MultilingualSlide {
  id: string;
  badge: Record<Language, string>;
  title: Record<Language, string>;
  titleHighlight: Record<Language, string>;
  desc: Record<Language, string>;
  themeColor: string;
  image: any;
  features: FeaturePoint[];
}

const SLIDES: MultilingualSlide[] = [
  {
    id: "1",
    badge: {
      uz: "RASMIY KATALOG",
      ru: "ОФИЦИАЛЬНЫЙ КАТАЛОГ",
      en: "OFFICIAL CATALOG",
    },
    title: {
      uz: "Klinika va Shifoxonalar Uchun",
      ru: "Для Клиник и Медцентров",
      en: "For Clinics & Hospitals",
    },
    titleHighlight: {
      uz: "Zamonaviy Medtexnika",
      ru: "Современная Медтехника",
      en: "Modern Medical Equipment",
    },
    desc: {
      uz: "Medax — tibbiy uskunalar markazi. Diagnostika apparatlari, laboratoriya tizimlari va tibbiy sarflov materiallarining rasmiy katalogi.",
      ru: "Medax — центр медицинского оборудования. Официальный каталог диагностических приборов, лабораторных систем и медицинских расходных материалов.",
      en: "Medax — medical equipment center. Official catalog of diagnostic devices, laboratory analyzers, and medical supplies.",
    },
    themeColor: "#0284c7",
    image: require("../../assets/onboarding_1.png"),
    features: [
      {
        icon: StethoscopeIcon,
        title: {
          uz: "Tibbiy texnika katalogi",
          ru: "Каталог медтехники",
          en: "Medical Equipment Catalog",
        },
        desc: {
          uz: "UZI, rentgen, laboratoriya va jarrohlik uskunalari",
          ru: "УЗИ, рентген, лабораторное и хирургическое оборудование",
          en: "Ultrasound, digital X-ray, lab analyzers, and surgical devices",
        },
      },
      {
        icon: PriceTagIcon,
        title: {
          uz: "Shaffof narxlar va buyurtma",
          ru: "Прозрачные цены и заказ",
          en: "Transparent Pricing & Orders",
        },
        desc: {
          uz: "To'g'ridan-to'g'ri narxlar va barcha rasmiy hisob-fakturalar",
          ru: "Прямые цены и официальное оформление документов",
          en: "Direct pricing with official documentation and invoices",
        },
      },
      {
        icon: FilterSearchIcon,
        title: {
          uz: "Qulay qidiruv va filtrlar",
          ru: "Удобный поиск и фильтры",
          en: "Convenient Search & Filters",
        },
        desc: {
          uz: "Toifalar va texnik parametrlar bo'yicha tezkor topish",
          ru: "Быстрый подбор по категориям и техническим параметрам",
          en: "Fast filtering by clinical categories and technical specs",
        },
      },
    ],
  },
  {
    id: "2",
    badge: {
      uz: "KAFOLAT VA XIZMAT",
      ru: "ГАРАНТИЯ И СЕРВИС",
      en: "WARRANTY & SERVICE",
    },
    title: {
      uz: "Rasmiy Zavod Kafolati &",
      ru: "Заводская Гарантия &",
      en: "Official Warranty &",
    },
    titleHighlight: {
      uz: "Muhandis Maslahati",
      ru: "Поддержка Инженеров",
      en: "Engineering Support",
    },
    desc: {
      uz: "Barcha uskunalarga rasmiy kafolat beriladi. Namangan shahridagi do'konimizdan olib ketish yoki kelishuv asosida yetkazish imkoniyati mavjud.",
      ru: "Официальная заводская гарантия на всё оборудование. Самовывоз из нашего магазина в Намангане или доставка по договоренности.",
      en: "Official manufacturer warranty on all equipment. In-store pickup from our Namangan center or coordinated delivery.",
    },
    themeColor: "#0d9488",
    image: require("../../assets/onboarding_2.png"),
    features: [
      {
        icon: ShieldCheckIcon,
        title: {
          uz: "Rasmiy kafolat taloni",
          ru: "Официальный гарантийный талон",
          en: "Official Warranty Certificate",
        },
        desc: {
          uz: "Davlat muvofiqlik sertifikati va rasmiy kafolat taqdim etiladi",
          ru: "Сертификаты соответствия и гарантийный талон производителя",
          en: "Full compliance certificates and official warranty documentation",
        },
      },
      {
        icon: WrenchToolIcon,
        title: {
          uz: "O'rnatish va texnik ko'rik",
          ru: "Монтаж и настройка",
          en: "Setup & Technical Support",
        },
        desc: {
          uz: "Uskunani ishga tushirish va mutaxassislar konsultatsiyasi",
          ru: "Помощь в пусконаладке и консультация профильных инженеров",
          en: "Device commissioning and specialist engineering assistance",
        },
      },
      {
        icon: MapPinCheckIcon,
        title: {
          uz: "Do'kondan olib ketish",
          ru: "Самовывоз из магазина",
          en: "In-Store Pickup",
        },
        desc: {
          uz: "Namangan do'konimizdan tekshirib olib ketish yoki yetkazish",
          ru: "Проверка и самовывоз из шоурума в Намангане или доставка",
          en: "Inspection and pickup at our Namangan showroom or delivery",
        },
      },
    ],
  },
];

interface OnboardingScreenProps {
  onFinish: () => void;
}

export function OnboardingScreen({ onFinish }: OnboardingScreenProps) {
  const insets = useSafeAreaInsets();
  const { lang, setLang, t } = useI18n();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList<MultilingualSlide>>(null);

  const activeSlide = SLIDES[currentIndex] || SLIDES[0];

  const handleNext = () => {
    if (currentIndex < SLIDES.length - 1) {
      const nextIndex = currentIndex + 1;
      flatListRef.current?.scrollToOffset({
        offset: nextIndex * SCREEN_WIDTH,
        animated: true,
      });
      setCurrentIndex(nextIndex);
    } else {
      handleComplete();
    }
  };

  const handleDotPress = (index: number) => {
    flatListRef.current?.scrollToOffset({
      offset: index * SCREEN_WIDTH,
      animated: true,
    });
    setCurrentIndex(index);
  };

  const handleComplete = async () => {
    try {
      await AsyncStorage.setItem(ONBOARDING_KEY, "true");
    } catch {}
    onFinish();
  };

  const handleScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offsetX = e.nativeEvent.contentOffset.x;
      const newIndex = Math.round(offsetX / SCREEN_WIDTH);
      if (newIndex >= 0 && newIndex < SLIDES.length && newIndex !== currentIndex) {
        setCurrentIndex(newIndex);
      }
    },
    [currentIndex]
  );

  const getItemLayout = useCallback(
    (_: any, index: number) => ({
      length: SCREEN_WIDTH,
      offset: SCREEN_WIDTH * index,
      index,
    }),
    []
  );

  const onScrollToIndexFailed = useCallback(
    (info: { index: number; highestMeasuredFrameIndex: number; averageItemLength: number }) => {
      flatListRef.current?.scrollToOffset({
        offset: info.index * SCREEN_WIDTH,
        animated: true,
      });
    },
    []
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top + 6, paddingBottom: Math.max(insets.bottom, 14) }]}>
      {/* Top Header: Logo + Lang Switcher + Skip */}
      <View style={styles.topHeader}>
        <View style={styles.logoRow}>
          <MedaxEmblem size={30} />
          <View style={{ marginLeft: 8 }}>
            <View style={{ flexDirection: "row" }}>
              <Text style={styles.logoMed}>Med</Text>
              <Text style={styles.logoAx}>ax</Text>
            </View>
            <Text style={styles.logoSub}>{t("onboarding_slogan")}</Text>
          </View>
        </View>

        {/* Right Header: Skip Button */}
        <View style={styles.headerRight}>
          {currentIndex < SLIDES.length - 1 ? (
            <TouchableOpacity onPress={handleComplete} style={styles.skipBtn} activeOpacity={0.7}>
              <Text style={styles.skipText}>{t("onboarding_skip")}</Text>
            </TouchableOpacity>
          ) : (
            <View style={{ width: 68 }} />
          )}
        </View>
      </View>

      {/* Carousel: 100% Crash-Proof FlatList with Smooth Content Scrolling */}
      <FlatList
        ref={flatListRef}
        data={SLIDES}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        onMomentumScrollEnd={handleScrollEnd}
        getItemLayout={getItemLayout}
        onScrollToIndexFailed={onScrollToIndexFailed}
        initialNumToRender={4}
        maxToRenderPerBatch={4}
        windowSize={5}
        removeClippedSubviews={false}
        renderItem={({ item }) => {
          const badgeText = item.badge[lang] || item.badge.uz;
          const titleText = item.title[lang] || item.title.uz;
          const highlightText = item.titleHighlight[lang] || item.titleHighlight.uz;
          const descText = item.desc[lang] || item.desc.uz;

          return (
            <View style={styles.slidePage}>
              <ScrollView
                style={styles.slideScroll}
                contentContainerStyle={styles.slideScrollContent}
                showsVerticalScrollIndicator={false}
                nestedScrollEnabled={true}
                bounces={false}
              >
                {/* Visual Art Box (Centered, Soft Ambient Tint) */}
                <View
                  style={[
                    styles.artBox,
                    {
                      backgroundColor: `${item.themeColor}0a`,
                      borderColor: `${item.themeColor}25`,
                    },
                  ]}
                >
                  <Image
                    source={item.image}
                    style={styles.slideImage}
                    resizeMode="contain"
                  />
                </View>

                {/* Badge Pill */}
                <View style={[styles.badgePill, { backgroundColor: `${item.themeColor}15` }]}>
                  <Text style={[styles.badgeText, { color: item.themeColor }]}>
                    {badgeText}
                  </Text>
                </View>

                {/* Title & Subtitle Highlight */}
                <Text style={styles.slideTitle}>{titleText}</Text>
                <Text style={[styles.slideTitleHighlight, { color: item.themeColor }]}>
                  {highlightText}
                </Text>

                {/* Expanded Rich Description */}
                <Text style={styles.slideDesc}>{descText}</Text>

                {/* 3 Benefit Feature Points with Crisp React SVG Vector Icons */}
                <View style={styles.featuresContainer}>
                  {item.features.map((feat, idx) => {
                    const FeatIcon = feat.icon;
                    const featTitle = feat.title[lang] || feat.title.uz;
                    const featDesc = feat.desc[lang] || feat.desc.uz;

                    return (
                      <View key={idx} style={styles.featureCard}>
                        <View
                          style={[
                            styles.featureIconWrap,
                            { backgroundColor: `${item.themeColor}14` },
                          ]}
                        >
                          <FeatIcon size={20} color={item.themeColor} />
                        </View>
                        <View style={styles.featureTextWrap}>
                          <Text style={styles.featureTitle}>{featTitle}</Text>
                          <Text style={styles.featureDesc}>{featDesc}</Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </ScrollView>
            </View>
          );
        }}
      />

      {/* Bottom Controls */}
      <View style={styles.bottomControls}>
        {/* Pagination Dots (Tap to navigate) */}
        <View style={styles.dotsRow}>
          {SLIDES.map((_, idx) => (
            <TouchableOpacity
              key={idx}
              onPress={() => handleDotPress(idx)}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
            >
              <View
                style={[
                  styles.dot,
                  currentIndex === idx
                    ? [styles.dotActive, { backgroundColor: activeSlide.themeColor }]
                    : styles.dotInactive,
                ]}
              />
            </TouchableOpacity>
          ))}
        </View>

        {/* Action Button */}
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: activeSlide.themeColor }]}
          onPress={handleNext}
          activeOpacity={0.88}
        >
          <Text style={styles.actionBtnText}>
            {currentIndex === SLIDES.length - 1
              ? t("onboarding_start")
              : t("onboarding_next")}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
    justifyContent: "space-between",
  },
  topHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  logoRow: { flexDirection: "row", alignItems: "center" },
  logoMed: { fontSize: 19, fontWeight: "900", color: "#0284c7" },
  logoAx: { fontSize: 19, fontWeight: "900", color: "#16a34a" },
  logoSub: { fontSize: 7.5, fontWeight: "800", color: "#0f172a", letterSpacing: 0.7 },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  langSwitchWrap: {
    flexDirection: "row",
    backgroundColor: "#f1f5f9",
    borderRadius: 14,
    padding: 2,
  },
  langPill: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 12,
  },
  langPillActive: {
    backgroundColor: "#ffffff",
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  langText: {
    fontSize: 9.5,
    fontWeight: "700",
    color: "#94a3b8",
  },
  langTextActive: {
    color: "#0284c7",
    fontWeight: "900",
  },
  skipBtn: {
    paddingVertical: 5,
    paddingHorizontal: 9,
    borderRadius: 14,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  skipText: { fontSize: 11.5, fontWeight: "700", color: "#64748b" },

  slidePage: {
    width: SCREEN_WIDTH,
    flex: 1,
  },
  slideScroll: {
    flex: 1,
  },
  slideScrollContent: {
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 20,
  },
  artBox: {
    width: Math.min(SCREEN_WIDTH - 44, 320),
    height: isCompactScreen ? 180 : Math.min(SCREEN_WIDTH - 44, 230),
    borderRadius: 24,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
    overflow: "hidden",
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.07,
    shadowRadius: 14,
    elevation: 3,
    padding: 8,
  },
  slideImage: {
    width: "100%",
    height: "100%",
  },

  badgePill: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
    marginBottom: 8,
  },
  badgeText: {
    fontSize: 10.5,
    fontWeight: "900",
    letterSpacing: 0.8,
  },
  slideTitle: {
    fontSize: isCompactScreen ? 19 : 21,
    fontWeight: "800",
    color: "#0f172a",
    textAlign: "center",
    lineHeight: isCompactScreen ? 25 : 27,
  },
  slideTitleHighlight: {
    fontSize: isCompactScreen ? 19 : 21,
    fontWeight: "900",
    textAlign: "center",
    lineHeight: isCompactScreen ? 25 : 27,
    marginBottom: 8,
  },
  slideDesc: {
    fontSize: 12.5,
    color: "#64748b",
    textAlign: "center",
    lineHeight: 18.5,
    maxWidth: 340,
    marginBottom: 16,
  },

  featuresContainer: {
    width: "100%",
    maxWidth: 360,
    gap: 8,
  },
  featureCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#f1f5f9",
    borderRadius: 14,
    paddingVertical: 9,
    paddingHorizontal: 11,
  },
  featureIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },
  featureTextWrap: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#0f172a",
    lineHeight: 17,
  },
  featureDesc: {
    fontSize: 11,
    color: "#64748b",
    marginTop: 1.5,
    lineHeight: 15,
  },

  bottomControls: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
  },
  dotsRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 7,
    marginBottom: 14,
  },
  dot: {
    height: 7,
    borderRadius: 4,
  },
  dotActive: {
    width: 26,
  },
  dotInactive: {
    width: 7,
    backgroundColor: "#cbd5e1",
  },

  actionBtn: {
    width: "100%",
    paddingVertical: 13.5,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 8,
    elevation: 3,
  },
  actionBtnText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
});
