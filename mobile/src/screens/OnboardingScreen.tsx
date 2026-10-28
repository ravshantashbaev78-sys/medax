import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  FlatList,
  Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { MedaxEmblem } from "../components/Icons";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export const ONBOARDING_KEY = "@medax_has_seen_onboarding";

export interface OnboardingSlide {
  id: string;
  badge: string;
  title: string;
  titleHighlight: string;
  desc: string;
  icon: string;
  bgGrad: string;
}

const SLIDES: OnboardingSlide[] = [
  {
    id: "1",
    badge: "RASMIY KATALOG",
    title: "Klinikalar uchun",
    titleHighlight: "Zamonaviy Medtexnika",
    desc: "UZI, rentgen, laboratoriya analizatorlari, jarrohlik stollari va sertifikatlangan tibbiy uskunalar katalogi.",
    icon: "🏥",
    bgGrad: "#0284c7",
  },
  {
    id: "2",
    badge: "ZAVOD KAFOLATI",
    title: "100% Rasmiy Kafolat &",
    titleHighlight: "Professional Muhandislar",
    desc: "Har bir uskunaga ishlab chiqaruvchining rasmiy kafolati beriladi va malakali mutaxassislar tomonidan o'rnatib sozlanadi.",
    icon: "🛡️",
    bgGrad: "#0d9488",
  },
  {
    id: "3",
    badge: "TEZKOR VA XAVFSIZ",
    title: "1 Daqiqada SMS Bilan",
    titleHighlight: "Xavfsiz Ro'yxatdan O'tish",
    desc: "Ortiqcha parollarsiz telefon raqamingiz orqali SMS kod bilan xavfsiz kiring, buyurtma holatini onlayn kuzatib boring.",
    icon: "⚡",
    bgGrad: "#6366f1",
  },
  {
    id: "4",
    badge: "MAXSUS LOGISTIKA",
    title: "Toshkent va Viloyatlarga",
    titleHighlight: "Ishonchli Yetkazib Berish",
    desc: "Nozik va qimmatbaho tibbiy apparatlar maxsus transportda xavfsiz va sug'urtalangan holda to'g'ridan-to'g'ri klinikangizga yetkaziladi.",
    icon: "🚚",
    bgGrad: "#059669",
  },
];

interface OnboardingScreenProps {
  onFinish: () => void;
}

export function OnboardingScreen({ onFinish }: OnboardingScreenProps) {
  const insets = useSafeAreaInsets();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const handleNext = async () => {
    if (currentIndex < SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
    } else {
      await handleComplete();
    }
  };

  const handleComplete = async () => {
    try {
      await AsyncStorage.setItem(ONBOARDING_KEY, "true");
    } catch {}
    onFinish();
  };

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems && viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index || 0);
    }
  }).current;

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8, paddingBottom: Math.max(insets.bottom, 16) }]}>
      {/* Top Header: Logo + Skip */}
      <View style={styles.topHeader}>
        <View style={styles.logoRow}>
          <MedaxEmblem size={34} />
          <View style={{ marginLeft: 8 }}>
            <View style={{ flexDirection: "row" }}>
              <Text style={styles.logoMed}>Med</Text>
              <Text style={styles.logoAx}>ax</Text>
            </View>
            <Text style={styles.logoSub}>TIBBIY USKUNALAR</Text>
          </View>
        </View>

        {currentIndex < SLIDES.length - 1 ? (
          <TouchableOpacity onPress={handleComplete} style={styles.skipBtn} activeOpacity={0.7}>
            <Text style={styles.skipText}>O'tkazish</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 70 }} />
        )}
      </View>

      {/* Slides Carousel */}
      <FlatList
        ref={flatListRef}
        data={SLIDES}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ viewAreaCoveragePercentThreshold: 50 }}
        renderItem={({ item }) => (
          <View style={styles.slide}>
            {/* Visual Art Box (Centered Image with Glass Frame) */}
            <View style={[styles.artBox, { backgroundColor: `${item.bgGrad}10`, borderColor: `${item.bgGrad}25` }]}>
              <Image
                source={
                  item.id === "1"
                    ? require("../../assets/onboarding_1.png")
                    : item.id === "2"
                    ? require("../../assets/onboarding_2.png")
                    : item.id === "3"
                    ? require("../../assets/onboarding_3.png")
                    : require("../../assets/onboarding_4.png")
                }
                style={styles.slideImage}
                resizeMode="contain"
              />
            </View>

            {/* Slide Text Content (Perfect Center Harmony) */}
            <View style={styles.textContent}>
              <View style={[styles.badgePill, { backgroundColor: `${item.bgGrad}15` }]}>
                <Text style={[styles.badgeText, { color: item.bgGrad }]}>{item.badge}</Text>
              </View>

              <Text style={styles.slideTitle}>{item.title}</Text>
              <Text style={[styles.slideTitleHighlight, { color: item.bgGrad }]}>
                {item.titleHighlight}
              </Text>
              <Text style={styles.slideDesc}>{item.desc}</Text>
            </View>
          </View>
        )}
      />

      {/* Bottom Controls */}
      <View style={styles.bottomControls}>
        {/* Pagination Dots */}
        <View style={styles.dotsRow}>
          {SLIDES.map((_, idx) => (
            <View
              key={idx}
              style={[
                styles.dot,
                currentIndex === idx
                  ? [styles.dotActive, { backgroundColor: SLIDES[currentIndex].bgGrad }]
                  : styles.dotInactive,
              ]}
            />
          ))}
        </View>

        {/* Action Button */}
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: SLIDES[currentIndex].bgGrad }]}
          onPress={handleNext}
          activeOpacity={0.88}
        >
          <Text style={styles.actionBtnText}>
            {currentIndex === SLIDES.length - 1 ? "Boshlash ✓" : "Keyingisi →"}
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
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  logoRow: { flexDirection: "row", alignItems: "center" },
  logoMed: { fontSize: 21, fontWeight: "900", color: "#0284c7" },
  logoAx: { fontSize: 21, fontWeight: "900", color: "#0f172a" },
  logoSub: { fontSize: 8.5, fontWeight: "800", color: "#64748b", letterSpacing: 0.8 },
  skipBtn: {
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: "#f1f5f9",
  },
  skipText: { fontSize: 13, fontWeight: "700", color: "#64748b" },

  slide: {
    width: SCREEN_WIDTH,
    alignItems: "center",
    paddingHorizontal: 24,
    justifyContent: "center",
  },
  artBox: {
    width: Math.min(SCREEN_WIDTH - 48, 360),
    height: Math.min(SCREEN_WIDTH - 48, 300),
    borderRadius: 32,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
    overflow: "hidden",
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 4,
    padding: 12,
  },
  slideImage: {
    width: "100%",
    height: "100%",
  },

  textContent: {
    alignItems: "center",
    paddingHorizontal: 10,
  },
  badgePill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 12,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.9,
  },
  slideTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#0f172a",
    textAlign: "center",
    lineHeight: 30,
  },
  slideTitleHighlight: {
    fontSize: 24,
    fontWeight: "900",
    textAlign: "center",
    lineHeight: 30,
    marginBottom: 10,
  },
  slideDesc: {
    fontSize: 14,
    color: "#64748b",
    textAlign: "center",
    lineHeight: 21,
    maxWidth: 340,
  },

  bottomControls: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 8,
  },
  dotsRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    marginBottom: 20,
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
    paddingVertical: 15,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 4,
  },
  actionBtnText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
});
