import React, { useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  FlatList,
  Image,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { MedaxEmblem } from "../components/Icons";
import { useI18n, Language } from "../context/I18nContext";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export const ONBOARDING_KEY = "@medax_has_seen_onboarding";

interface MultilingualSlide {
  id: string;
  badge: Record<Language, string>;
  title: Record<Language, string>;
  titleHighlight: Record<Language, string>;
  desc: Record<Language, string>;
  themeColor: string;
  image: any;
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
      uz: "Klinikalar uchun",
      ru: "Для клиник и врачей",
      en: "For Clinics & Doctors",
    },
    titleHighlight: {
      uz: "Zamonaviy Medtexnika",
      ru: "Современная Медтехника",
      en: "Modern Medical Tech",
    },
    desc: {
      uz: "UZI, rentgen, laboratoriya analizatorlari, jarrohlik stollari va sertifikatlangan tibbiy uskunalar katalogi.",
      ru: "Каталог сертифицированного оборудования: УЗИ, рентген, анализаторы, хирургические столы и расходные материалы.",
      en: "Catalog of certified medical equipment: ultrasound, X-ray, lab analyzers, surgical tables, and supplies.",
    },
    themeColor: "#0284c7",
    image: require("../../assets/onboarding_1.png"),
  },
  {
    id: "2",
    badge: {
      uz: "ZAVOD KAFOLATI",
      ru: "ЗАВОДСКАЯ ГАРАНТИЯ",
      en: "FACTORY WARRANTY",
    },
    title: {
      uz: "100% Rasmiy Kafolat &",
      ru: "100% Официальная Гарантия &",
      en: "100% Official Warranty &",
    },
    titleHighlight: {
      uz: "Professional Muhandislar",
      ru: "Сервисные Инженеры",
      en: "Certified Engineers",
    },
    desc: {
      uz: "Har bir uskunaga ishlab chiqaruvchining rasmiy kafolati beriladi va malakali mutaxassislar tomonidan o'rnatib sozlanadi.",
      ru: "Официальная гарантия от производителя, профессиональный монтаж, ввод в эксплуатацию и сервисное обслуживание.",
      en: "Official manufacturer warranty, professional installation, expert commissioning, and full technical service.",
    },
    themeColor: "#0d9488",
    image: require("../../assets/onboarding_2.png"),
  },
  {
    id: "3",
    badge: {
      uz: "TEZKOR VA XAVFSIZ",
      ru: "БЫСТРО И БЕЗОПАСНО",
      en: "FAST & SECURE",
    },
    title: {
      uz: "1 Daqiqada SMS Bilan",
      ru: "Вход по SMS Коду",
      en: "1-Minute SMS Login",
    },
    titleHighlight: {
      uz: "Xavfsiz Ro'yxatdan O'tish",
      ru: "За 1 Минуту Без Паролей",
      en: "Secure Verification",
    },
    desc: {
      uz: "Ortiqcha parollarsiz telefon raqamingiz orqali SMS kod bilan xavfsiz kiring, buyurtma holatini onlayn kuzatib boring.",
      ru: "Входите по номеру телефона через SMS код без сложных паролей и отслеживайте свои заказы в реальном времени.",
      en: "Log in securely using your phone number and SMS code without passwords, and track your orders in real time.",
    },
    themeColor: "#6366f1",
    image: require("../../assets/onboarding_3.png"),
  },
  {
    id: "4",
    badge: {
      uz: "MAXSUS LOGISTIKA",
      ru: "СПЕЦ-ДОСТАВКА",
      en: "SPECIAL LOGISTICS",
    },
    title: {
      uz: "Toshkent va Viloyatlarga",
      ru: "По Ташкенту и Регионам",
      en: "Across All Regions",
    },
    titleHighlight: {
      uz: "Ishonchli Yetkazib Berish",
      ru: "Надёжная Доставка",
      en: "Safe & Fast Delivery",
    },
    desc: {
      uz: "Nozik va qimmatbaho tibbiy apparatlar maxsus transportda xavfsiz va sug'urtalangan holda to'g'ridan-to'g'ri klinikangizga yetkaziladi.",
      ru: "Бережная и застрахованная доставка сложного медицинского оборудования в спецтранспорте прямо в вашу клинику.",
      en: "Fragile and high-value medical devices delivered securely and fully insured directly to your medical facility.",
    },
    themeColor: "#059669",
    image: require("../../assets/onboarding_4.png"),
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

  // Rock-solid scroll listener: avoids "Changing onViewableItemsChanged on the fly" crash completely
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
    <View style={[styles.container, { paddingTop: insets.top + 6, paddingBottom: Math.max(insets.bottom, 16) }]}>
      {/* Top Header: Logo + Lang Switcher + Skip */}
      <View style={styles.topHeader}>
        <View style={styles.logoRow}>
          <MedaxEmblem size={32} />
          <View style={{ marginLeft: 8 }}>
            <View style={{ flexDirection: "row" }}>
              <Text style={styles.logoMed}>Med</Text>
              <Text style={styles.logoAx}>ax</Text>
            </View>
            <Text style={styles.logoSub}>{t("onboarding_slogan")}</Text>
          </View>
        </View>

        {/* Right Header: Language Pills & Skip Button */}
        <View style={styles.headerRight}>
          <View style={styles.langSwitchWrap}>
            {(["uz", "ru", "en"] as const).map((l) => (
              <TouchableOpacity
                key={l}
                style={[styles.langPill, lang === l && styles.langPillActive]}
                onPress={() => setLang(l)}
                activeOpacity={0.7}
              >
                <Text style={[styles.langText, lang === l && styles.langTextActive]}>
                  {l.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {currentIndex < SLIDES.length - 1 ? (
            <TouchableOpacity onPress={handleComplete} style={styles.skipBtn} activeOpacity={0.7}>
              <Text style={styles.skipText}>{t("onboarding_skip")}</Text>
            </TouchableOpacity>
          ) : (
            <View style={{ width: 68 }} />
          )}
        </View>
      </View>

      {/* Carousel: 100% Crash-Proof FlatList */}
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
            <View style={styles.slide}>
              {/* Visual Card (Centered, Perfectly Balanced, Soft Ambient Glow) */}
              <View
                style={[
                  styles.artBox,
                  {
                    backgroundColor: `${item.themeColor}0a`,
                    borderColor: `${item.themeColor}22`,
                  },
                ]}
              >
                <Image
                  source={item.image}
                  style={styles.slideImage}
                  resizeMode="contain"
                />
              </View>

              {/* Slide Text Content (Perfect Center Harmony) */}
              <View style={styles.textContent}>
                <View style={[styles.badgePill, { backgroundColor: `${item.themeColor}15` }]}>
                  <Text style={[styles.badgeText, { color: item.themeColor }]}>
                    {badgeText}
                  </Text>
                </View>

                <Text style={styles.slideTitle}>{titleText}</Text>
                <Text style={[styles.slideTitleHighlight, { color: item.themeColor }]}>
                  {highlightText}
                </Text>
                <Text style={styles.slideDesc}>{descText}</Text>
              </View>
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
    paddingVertical: 8,
  },
  logoRow: { flexDirection: "row", alignItems: "center" },
  logoMed: { fontSize: 20, fontWeight: "900", color: "#0284c7" },
  logoAx: { fontSize: 20, fontWeight: "900", color: "#0f172a" },
  logoSub: { fontSize: 8, fontWeight: "800", color: "#64748b", letterSpacing: 0.7 },
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
    fontSize: 10,
    fontWeight: "700",
    color: "#94a3b8",
  },
  langTextActive: {
    color: "#0284c7",
    fontWeight: "900",
  },
  skipBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 16,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  skipText: { fontSize: 12, fontWeight: "700", color: "#64748b" },

  slide: {
    width: SCREEN_WIDTH,
    alignItems: "center",
    paddingHorizontal: 20,
    justifyContent: "center",
  },
  artBox: {
    width: Math.min(SCREEN_WIDTH - 40, 340),
    height: Math.min(SCREEN_WIDTH - 40, 290),
    borderRadius: 28,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    overflow: "hidden",
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 3,
    padding: 10,
  },
  slideImage: {
    width: "100%",
    height: "100%",
  },

  textContent: {
    alignItems: "center",
    paddingHorizontal: 12,
  },
  badgePill: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 20,
    marginBottom: 10,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.9,
  },
  slideTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0f172a",
    textAlign: "center",
    lineHeight: 28,
  },
  slideTitleHighlight: {
    fontSize: 22,
    fontWeight: "900",
    textAlign: "center",
    lineHeight: 28,
    marginBottom: 8,
  },
  slideDesc: {
    fontSize: 13.5,
    color: "#64748b",
    textAlign: "center",
    lineHeight: 20,
    maxWidth: 330,
  },

  bottomControls: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 6,
  },
  dotsRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    marginBottom: 18,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    width: 26,
  },
  dotInactive: {
    width: 8,
    backgroundColor: "#cbd5e1",
  },

  actionBtn: {
    width: "100%",
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 4,
  },
  actionBtnText: {
    color: "#ffffff",
    fontSize: 15.5,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
});
