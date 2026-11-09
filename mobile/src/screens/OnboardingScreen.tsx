import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useI18n, Language } from "../context/I18nContext";
import { useTheme } from "../context/ThemeContext";
import { BrandLogo, Button, IconBadge, IcGrid, IcPhone, IcPin, Segmented } from "../components/ui";

export const ONBOARDING_KEY = "@medax_has_seen_onboarding";

const COPY: Record<Language, { title: string; text: string; points: [string, string, string]; start: string; login: string }> = {
  uz: {
    title: "Tibbiy uskunalar klinika va shifoxonalar uchun",
    text: "Katalogni ko'ring, buyurtmani ilovada bering va Namangandagi do'konimizdan tekshirib olib keting.",
    points: ["Narx va qoldiq ko'rsatilgan katalog", "Buyurtma SMS kod bilan tasdiqlanadi", "Do'kondan olib ketish, Namangan"],
    start: "Boshlash",
    login: "Hisobim bor — kirish",
  },
  ru: {
    title: "Медицинское оборудование для клиник и больниц",
    text: "Смотрите каталог, оформляйте заказ в приложении и забирайте его в нашем магазине в Намангане.",
    points: ["Каталог с ценами и наличием", "Заказ подтверждается SMS-кодом", "Самовывоз из магазина, Наманган"],
    start: "Начать",
    login: "У меня есть аккаунт — войти",
  },
  en: {
    title: "Medical equipment for clinics and hospitals",
    text: "Browse the catalog, order in the app and pick it up at our store in Namangan.",
    points: ["Catalog with prices and stock", "Orders confirmed by SMS code", "Store pickup in Namangan"],
    start: "Get started",
    login: "I have an account — sign in",
  },
};

export function OnboardingScreen({ onFinish }: { onFinish: (openProfile?: boolean) => void }) {
  const insets = useSafeAreaInsets();
  const { lang, setLang } = useI18n();
  const { colors } = useTheme();
  const c = COPY[lang] || COPY.uz;

  const finish = async (openProfile: boolean) => {
    try {
      await AsyncStorage.setItem(ONBOARDING_KEY, "true");
    } catch {}
    onFinish(openProfile);
  };

  const icons = [IcGrid, IcPhone, IcPin];

  return (
    <View style={[s.screen, { backgroundColor: colors.card, paddingTop: insets.top + 12, paddingBottom: Math.max(insets.bottom, 16) + 8 }]}>
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false} bounces={false}>
        <View style={{ alignSelf: "flex-end", width: 168 }}>
          <Segmented<Language>
            value={lang}
            onChange={setLang}
            options={[
              { value: "uz", label: "UZ" },
              { value: "ru", label: "RU" },
              { value: "en", label: "EN" },
            ]}
          />
        </View>

        <View style={s.logo}>
          <BrandLogo width={210} />
        </View>

        <Text style={[s.title, { color: colors.text }]}>{c.title}</Text>
        <Text style={[s.text, { color: colors.textSecondary }]}>{c.text}</Text>

        <View style={s.points}>
          {c.points.map((p, i) => {
            const Icon = icons[i];
            return (
              <View key={p} style={s.point}>
                <IconBadge size={36}>
                  <Icon size={19} color={colors.primary} />
                </IconBadge>
                <Text style={[s.pointText, { color: colors.textSecondary }]}>{p}</Text>
              </View>
            );
          })}
        </View>
      </ScrollView>

      <View style={s.actions}>
        <Button title={c.start} onPress={() => finish(false)} />
        <Button title={c.login} variant="ghost" onPress={() => finish(true)} style={{ height: 48, marginTop: 6 }} />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: 24, paddingBottom: 12 },
  logo: { alignItems: "center", marginTop: 32 },
  title: { marginTop: 36, fontSize: 27, lineHeight: 33, fontWeight: "700", letterSpacing: -0.5 },
  text: { marginTop: 12, fontSize: 16, lineHeight: 24 },
  points: { marginTop: 24, gap: 16 },
  point: { flexDirection: "row", alignItems: "center", gap: 14 },
  pointText: { fontSize: 15, flex: 1 },
  actions: { paddingHorizontal: 24 },
});
