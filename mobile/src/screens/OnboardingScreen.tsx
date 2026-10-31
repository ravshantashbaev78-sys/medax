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
  SupportIcon,
  LockCheckIcon,
  UserCheckIcon,
  BellRingIcon,
  TruckFastIcon,
  BoxShieldIcon,
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
      en: "Modern Medical Tech",
    },
    desc: {
      uz: "O'zbekistondagi yetakchi tibbiy uskunalar markazi. 500 dan ortiq sertifikatlangan zamonaviy apparatlar, laboratoriya tizimlari va tibbiy sarflov materiallari to'g'ridan-to'g'ri ishlab chiqaruvchilardan.",
      ru: "Ведущий медицинский каталог Узбекистана. Более 500 сертифицированных аппаратов, лабораторных систем и расходных материалов напрямую от заводов-производителей.",
      en: "Uzbekistan's premier medical equipment hub. Over 500 certified diagnostic devices, laboratory analyzers, and surgical supplies directly from certified manufacturers.",
    },
    themeColor: "#0284c7",
    image: require("../../assets/onboarding_1.png"),
    features: [
      {
        icon: StethoscopeIcon,
        title: {
          uz: "500+ Sertifikatlangan apparatlar",
          ru: "500+ Сертифицированных аппаратов",
          en: "500+ Certified Medical Devices",
        },
        desc: {
          uz: "UZI apparatlari, rentgen, EKG, analizatorlar va operatsiya stollari",
          ru: "УЗИ аппараты, рентгены, ЭКГ, анализаторы и операционные столы",
          en: "Ultrasound, digital X-ray, ECG monitors, lab systems & surgical tables",
        },
      },
      {
        icon: PriceTagIcon,
        title: {
          uz: "Birinchi qo'l zavod narxlari",
          ru: "Прямые заводские цены",
          en: "Direct Factory Prices",
        },
        desc: {
          uz: "Vositachilarsiz to'g'ridan-to'g'ri import, eng maqbul va shaffof narxlar",
          ru: "Прямой импорт без посредников, прозрачные и выгодные условия",
          en: "Direct import without middleman margins, transparent terms & discounts",
        },
      },
      {
        icon: FilterSearchIcon,
        title: {
          uz: "Qulay filtr va tezkor qidiruv",
          ru: "Умный поиск и фильтры",
          en: "Smart Search & Filtering",
        },
        desc: {
          uz: "Toifa, brend va texnik parametrlar bo'yicha darhol topish",
          ru: "Быстрый поиск по направлениям, брендам и техническим параметрам",
          en: "Instant filtering by clinical specialty, brand, and technical specs",
        },
      },
    ],
  },
  {
    id: "2",
    badge: {
      uz: "RASMIY KAFOLAT",
      ru: "ОФИЦИАЛЬНАЯ ГАРАНТИЯ",
      en: "OFFICIAL WARRANTY",
    },
    title: {
      uz: "100% Rasmiy Zavod Kafolati &",
      ru: "100% Заводская Гарантия &",
      en: "100% Factory Warranty &",
    },
    titleHighlight: {
      uz: "Sertifikatlangan Muhandislar",
      ru: "Сертифицированный Сервис",
      en: "Certified Engineers",
    },
    desc: {
      uz: "Har bir xarid qilingan uskunaga 1 yildan 3 yilgacha rasmiy kafolat beriladi. Malakali biotibbiy muhandislarimiz uskunani klinikangizda o'rnatib, sozlab, shifokorlaringizga to'liq o'rgatadi.",
      ru: "Официальная заводская гарантия от 1 до 3 лет на всё оборудование. Дипломированные биомедицинские инженеры выполнят монтаж, пусконаладку и проведут инструктаж врачей.",
      en: "Official 1 to 3-year factory warranty on all equipment. Our certified biomedical engineers handle complete installation, calibration, and clinic staff training.",
    },
    themeColor: "#0d9488",
    image: require("../../assets/onboarding_2.png"),
    features: [
      {
        icon: ShieldCheckIcon,
        title: {
          uz: "1-3 Yil to'liq zavod kafolati",
          ru: "1-3 Года заводской гарантии",
          en: "1-3 Years Full Warranty",
        },
        desc: {
          uz: "Davlat muvofiqlik sertifikati va rasmiy kafolat taloni beriladi",
          ru: "Государственные сертификаты и официальный гарантийный талон",
          en: "Official warranty certificate & full regulatory compliance papers",
        },
      },
      {
        icon: WrenchToolIcon,
        title: {
          uz: "Bepul montaj va kalibrovka",
          ru: "Монтаж и пусконаладка",
          en: "Installation & Commissioning",
        },
        desc: {
          uz: "Muhandislar klinikangizga borib uskunani professional sozlab beradi",
          ru: "Выезд сервисного инженера в клинику для настройки и пуска в работу",
          en: "On-site precision calibration and operational readiness by engineers",
        },
      },
      {
        icon: SupportIcon,
        title: {
          uz: "24/7 Texnik servis va ehtiyot qismlar",
          ru: "Сервисная поддержка 24/7",
          en: "24/7 Technical Support",
        },
        desc: {
          uz: "Tezkor texnik maslahat va original butlovchi qismlar doimiy mavjud",
          ru: "Оперативная помощь и постоянный запас оригинальных запчастей на складе",
          en: "Dedicated engineering hotline and permanent local stock of genuine parts",
        },
      },
    ],
  },
  {
    id: "3",
    badge: {
      uz: "XAVFSIZ VA TEZKOR",
      ru: "БЕЗОПАСНО И БЫСТРО",
      en: "FAST & SECURE",
    },
    title: {
      uz: "1 Daqiqada SMS Kod Bilan",
      ru: "Вход за 1 Минуту по SMS",
      en: "1-Minute SMS Login",
    },
    titleHighlight: {
      uz: "Oson va Xavfsiz Kirish",
      ru: "Без Сложных Паролей",
      en: "Instant Secure Access",
    },
    desc: {
      uz: "Hech qanday esdan chiqadigan murakkab parollarsiz! Shaxsiy telefon raqamingizga keladigan 1 martalik SMS kod orqali tizimga xavfsiz kiring va klinikangiz buyurtmalarini boshqaring.",
      ru: "Никаких забытых паролей! Мгновенная и надёжная авторизация по одноразовому SMS коду на ваш номер для легкого управления всеми заказами и счетами клиники.",
      en: "No forgotten passwords! Instant and highly secure authentication via one-time SMS code directly to your phone to manage clinic orders and financial documents.",
    },
    themeColor: "#6366f1",
    image: require("../../assets/onboarding_3.png"),
    features: [
      {
        icon: LockCheckIcon,
        title: {
          uz: "1 Martalik SMS tasdiqlash",
          ru: "Одноразовый SMS код",
          en: "One-Time SMS Passcode",
        },
        desc: {
          uz: "Bank darajasidagi shifrlash va akkauntingizning 100% himoyasi",
          ru: "Банковский уровень защиты и 100% безопасность ваших данных",
          en: "Bank-grade encryption and 100% protection of clinic account",
        },
      },
      {
        icon: UserCheckIcon,
        title: {
          uz: "Klinika shaxsiy kabineti",
          ru: "Кабинет клиники и врача",
          en: "Dedicated Clinic Account",
        },
        desc: {
          uz: "Barcha buyurtmalar tarixi, elektron fakturalar va shartnomalar bir joyda",
          ru: "История заказов, электронные счета и договоры всегда под рукой",
          en: "Complete purchase history, electronic invoices and contracts in one place",
        },
      },
      {
        icon: BellRingIcon,
        title: {
          uz: "Buyurtma holatini jonli kuzatish",
          ru: "Онлайн отслеживание заказа",
          en: "Real-Time Order Tracking",
        },
        desc: {
          uz: "Qabul qilindi, yig'ilmoqda, yetkazilmoqda — har bir bosqich ekranda",
          ru: "Принят, на сборке, передан курьеру — статус доставки всегда на виду",
          en: "Received, prepared, in transit — monitor every delivery step live",
        },
      },
    ],
  },
  {
    id: "4",
    badge: {
      uz: "MAXSUS LOGISTIKA",
      ru: "СПЕЦ-ЛОГИСТИКА",
      en: "SPECIAL LOGISTICS",
    },
    title: {
      uz: "Toshkent va Viloyatlarga",
      ru: "По Ташкенту и Регионам",
      en: "Tashkent & All Regions",
    },
    titleHighlight: {
      uz: "Xavfsiz Yetkazib Berish",
      ru: "Бережная Доставка",
      en: "Insured Safe Transport",
    },
    desc: {
      uz: "Nozik va yuqori aniqlikdagi tibbiy uskunalar maxsus pnevmo-amortizatsiyali transportda, to'liq sug'urtalangan holda to'g'ridan-to'g'ri klinikangiz binosigacha yetkaziladi.",
      ru: "Высокоточное и хрупкое медицинское оборудование доставляется на спецтранспорте с пневмоподвеской и полной страховкой прямо до дверей вашей клиники.",
      en: "Fragile and high-precision medical devices transported in pneumatic shock-absorbing vehicles with full transit insurance right to your medical facility.",
    },
    themeColor: "#059669",
    image: require("../../assets/onboarding_4.png"),
    features: [
      {
        icon: TruckFastIcon,
        title: {
          uz: "Tezkor yetkazish muddati",
          ru: "Экспресс доставка",
          en: "Express Delivery Schedule",
        },
        desc: {
          uz: "Toshkent shahri bo'ylab 24 soatda, viloyat markazlariga 48 soatda",
          ru: "По Ташкенту в течение 24 часов, в областные центры за 48 часов",
          en: "Within 24 hours in Tashkent, 48 hours to all regional centers",
        },
      },
      {
        icon: BoxShieldIcon,
        title: {
          uz: "100% Sug'urta va mustahkam qadoq",
          ru: "100% Страховка и защита",
          en: "100% Insured & Shock-Proof",
        },
        desc: {
          uz: "Uskunaning shikastlanishsiz, soz yetib borishi to'liq kafolatlanadi",
          ru: "Гарантия сохранности и целостности каждого датчика и прибора",
          en: "Guaranteed zero-damage arrival for all sensitive probes and consoles",
        },
      },
      {
        icon: MapPinCheckIcon,
        title: {
          uz: "14 ta Hudud bo'yicha to'liq qamrov",
          ru: "Охват всех 14 регионов",
          en: "All 14 Regions of Uzbekistan",
        },
        desc: {
          uz: "Qoraqalpog'iston va barcha viloyatlar shifoxonalariga yetkazib beramiz",
          ru: "Доставка в Республику Каракалпакстан и все области до дверей",
          en: "Direct delivery across Karakalpakstan and every province of Uzbekistan",
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
