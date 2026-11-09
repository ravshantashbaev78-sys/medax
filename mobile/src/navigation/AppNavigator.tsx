import React from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { HomeScreen } from "../screens/HomeScreen";
import { CatalogScreen } from "../screens/CatalogScreen";
import { ProductDetailScreen } from "../screens/ProductDetailScreen";
import { CartScreen } from "../screens/CartScreen";
import { ProfileScreen } from "../screens/ProfileScreen";
import { useCart } from "../context/CartContext";
import { useTheme } from "../context/ThemeContext";
import { useI18n } from "../context/I18nContext";
import { HomeIcon, CatalogIcon, CartIcon, UserIcon } from "../components/Icons";

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

type TabName = "Asosiy" | "Katalog" | "Savatcha" | "Profil";

function MainTabs({ initialTab }: { initialTab: TabName }) {
  const { totalItems } = useCart();
  const { colors } = useTheme();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom, 10);

  return (
    <Tab.Navigator
      initialRouteName={initialTab}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          height: 58 + bottomPadding,
          paddingBottom: bottomPadding,
          paddingTop: 6,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
      }}
    >
      <Tab.Screen
        name="Asosiy"
        component={HomeScreen}
        options={{ tabBarLabel: t("nav_home"), tabBarIcon: ({ color }) => <HomeIcon size={22} color={color} /> }}
      />
      <Tab.Screen
        name="Katalog"
        component={CatalogScreen}
        options={{ tabBarLabel: t("nav_catalog"), tabBarIcon: ({ color }) => <CatalogIcon size={22} color={color} /> }}
      />
      <Tab.Screen
        name="Savatcha"
        component={CartScreen}
        options={{
          tabBarLabel: t("nav_cart"),
          tabBarBadge: totalItems > 0 ? (totalItems > 99 ? "99+" : totalItems) : undefined,
          tabBarBadgeStyle: { backgroundColor: "#D92D20", color: "#FFFFFF", fontSize: 10, fontWeight: "700" },
          tabBarIcon: ({ color }) => <CartIcon size={22} color={color} />,
        }}
      />
      <Tab.Screen
        name="Profil"
        component={ProfileScreen}
        options={{ tabBarLabel: t("nav_profile"), tabBarIcon: ({ color }) => <UserIcon size={22} color={color} /> }}
      />
    </Tab.Navigator>
  );
}

export function AppNavigator({ initialTab = "Asosiy" }: { initialTab?: TabName }) {
  const { colors } = useTheme();
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
      <Stack.Screen name="MainTabs">{() => <MainTabs initialTab={initialTab} />}</Stack.Screen>
      <Stack.Screen name="ProductDetail" component={ProductDetailScreen} />
    </Stack.Navigator>
  );
}
