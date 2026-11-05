import React, { useState, useEffect } from "react";
import { View, ActivityIndicator, LogBox } from "react-native";
import { registerRootComponent } from "expo";
import { NavigationContainer, DefaultTheme, DarkTheme } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AuthProvider } from "./src/context/AuthContext";
import { CartProvider } from "./src/context/CartContext";
import { ThemeProvider, useTheme } from "./src/context/ThemeContext";
import { I18nProvider } from "./src/context/I18nContext";
import { AppNavigator } from "./src/navigation/AppNavigator";
import { OnboardingScreen, ONBOARDING_KEY } from "./src/screens/OnboardingScreen";
import { AuthGateScreen } from "./src/screens/AuthGateScreen";
import { MedaxEmblem } from "./src/components/Icons";

// Suppress harmless Expo CLI connection warning banner from development
LogBox.ignoreLogs([
  "Cannot connect to Expo CLI",
  "Could not connect to development server",
]);

function MainApp() {
  const { theme, colors } = useTheme();
  const [initLoading, setInitLoading] = useState(true);
  const [step, setStep] = useState<"onboarding" | "auth" | "app">("app");

  useEffect(() => {
    AsyncStorage.getItem(ONBOARDING_KEY)
      .then((seen) => {
        if (!seen) {
          setStep("onboarding");
        } else {
          setStep("app");
        }
      })
      .catch(() => setStep("app"))
      .finally(() => setInitLoading(false));
  }, []);

  if (initLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: "center", alignItems: "center" }}>
        <MedaxEmblem size={64} />
        <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: 20 }} />
      </View>
    );
  }

  const navTheme = theme === "dark" ? DarkTheme : DefaultTheme;

  return (
    <>
      <StatusBar style={colors.statusBar} />
      {step === "onboarding" ? (
        <OnboardingScreen onFinish={() => setStep("app")} />
      ) : step === "auth" ? (
        <AuthGateScreen onContinue={() => setStep("app")} />
      ) : (
        <NavigationContainer theme={navTheme}>
          <AppNavigator />
        </NavigationContainer>
      )}
    </>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <I18nProvider>
          <AuthProvider>
            <CartProvider>
              <MainApp />
            </CartProvider>
          </AuthProvider>
        </I18nProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

registerRootComponent(App);
