import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  FlatList,
  Animated,
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
  imageKey?: string;
}

const SLIDES: OnboardingSlide[] = [
  {
    id: "1",
    badge: "RASMIY KATALOG",
    title: "Klinikalar uchun",
    titleHighlight: "Zamonaviy Medtexnika",
    desc: "UZI, rentgen, laboratoriya analizatorlari, jarrohlik stollari va bir martalik tibbiy vositalarning eng katta katalogi.",
    icon: "🏥",
    bgGrad: "#0284c7",
    imageKey: "onboarding_1",
  },
  {
    id: "2",
    badge: "ZAVOD KAFOLATI",
    title: "100% Rasmiy Kafolat &",
    titleHighlight: "Professional Muhandislar",
    desc: "Har bir uskunaga ishlab chiqaruvchining rasmiy kafolati beriladi va malakali mutaxassislar tomonidan o'rnatib sozlanadi.",
    icon: "🛡️",
    bgGrad: "#0d9488",
    imageKey: "onboarding_2",
  },
  {
    id: "3",
    badge: "TEZKOR VA XAVFSIZ",
    title: "1 Daqiqada SMS Bilan",
    titleHighlight: "Xavfsiz Ro'yxatdan O'tish",
    desc: "Ortiqcha parollarsiz telefon raqamingiz orqali SMS kod bilan xavfsiz kiring, buyurtma holatini onlayn kuzatib boring.",
    icon: "⚡",
    bgGrad: "#6366f1",
    imageKey: "onboarding_3",
  },
  {
    id: "4",
    badge: "MAXSUS LOGISTIKA",
    title: "Toshkent va Viloyatlarga",
    titleHighlight: "Ishonchli Yetkazib Berish",
    desc: "Nozik va qimmatbaho tibbiy uskunalar maxsus transportda xavfsiz va sug'urtalangan holda to'g'ridan-to'g'ri klinikangizga yetkaziladi.",
    icon: "🚚",
    bgGrad: "#059669",
    imageKey: "onboarding_4",
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
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, 16) }]}>
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

        {currentIndex < SLIDES.length - 1 && (
          <TouchableOpacity onPress={handleComplete} style={styles.skipBtn}>
            <Text style={styles.skipText}>O'tkazish</Text>
          </TouchableOpacity>
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
            {/* Visual Art Box (Men keyin rasim dizayn tashlab beraman degan joy) */}
            <View style={[styles.artBox, { backgroundColor: `${item.bgGrad}15`, borderColor: `${item.bgGrad}30` }]}>
              <View style={[styles.artBadgeCircle, { backgroundColor: item.bgGrad }]}>
                <Text style={styles.artEmoji}>{item.icon}</Text>
              </View>
              <View style={styles.artDottedPulse} />
            </View>

            {/* Slide Text Content */}
            <View style={styles.textContent}>
              <View style={[styles.badgePill, { backgroundColor: `${item.bgGrad}18` }]}>
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
                currentIndex === idx && [styles.dotActive, { backgroundColor: SLIDES[currentIndex].bgGrad }],
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
            {currentIndex === SLIDES.length - 1 ? "Boshlash →" : "Keyingisi →"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#ffffff", justifyContent: "space-between" },
  topHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  logoRow: { flexDirection: "row", alignItems: "center" },
  logoMed: { fontSize: 20, fontWeight: "900", color: "#0284c7" },
  logoAx: { fontSize: 20, fontWeight: "900", color: "#0f172a" },
  logoSub: { fontSize: 8, fontWeight: "800", color: "#64748b", letterSpacing: 0.8 },
  skipBtn: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 16, backgroundColor: "#f1f5f9" },
  skipText: { fontSize: 12.5, fontWeight: "600", color: "#64748b" },

  slide: { width: SCREEN_WIDTH, alignItems: "center", paddingHorizontal: 24, justifyContent: "center" },
  artBox: {
    width: SCREEN_WIDTH - 64,
    height: 250,
    borderRadius: 28,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
    position: "relative",
    overflow: "hidden",
  },
  artBadgeCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 14,
    elevation: 8,
  },
  artEmoji: { fontSize: 44 },
  artDottedPulse: {
    position: "absolute",
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 1,
    borderColor: "rgba(2, 132, 199, 0.2)",
    borderStyle: "dashed",
  },

  textContent: { alignItems: "center", paddingHorizontal: 8 },
  badgePill: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, marginBottom: 12 },
  badgeText: { fontSize: 10.5, fontWeight: "800", letterSpacing: 0.8 },
  slideTitle: { fontSize: 23, fontWeight: "800", color: "#0f172a", textAlign: "center", lineHeight: 29 },
  slideTitleHighlight: { fontSize: 23, fontWeight: "900", textAlign: "center", lineHeight: 29, marginBottom: 10 },
  slideDesc: { fontSize: 13.5, color: "#64748b", textAlign: "center", lineHeight: 20 },

  bottomControls: { paddingHorizontal: 24, paddingTop: 10, paddingBottom: 6 },
  dotsRow: { flexDirection: "row", justifyContent: "center", gap: 7, marginBottom: 18 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#e2e8f0" },
  dotActive: { width: 26, borderRadius: 4 },
  actionBtn: {
    paddingVertical: 15,
    borderRadius: 16,
    alignItems: "center",
    shadowColor: "#0284c7",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  actionBtnText: { color: "#ffffff", fontSize: 16, fontWeight: "800" },
});
