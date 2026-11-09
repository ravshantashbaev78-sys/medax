import React, { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type ThemeType = "light" | "dark";

export interface ThemeColors {
  bg: string;
  card: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  border: string;
  borderStrong: string;
  primary: string; // matn, ikonka, havola
  primaryDark: string;
  primarySoft: string; // ikonka foni, tanlangan holat
  button: string; // asosiy tugma foni (oq matn bilan kontrast >= 4.5)
  badgeBg: string;
  badgeText: string;
  inputBg: string;
  headerBg: string;
  success: string;
  successSoft: string;
  danger: string;
  dangerSoft: string;
  chipActiveBg: string;
  chipActiveText: string;
  scrim: string;
  statusBar: "dark" | "light";
}

// Brend ranglari Medax logotipidan: ko'k #0A72BF, yashil (logo) #74B21C
const lightColors: ThemeColors = {
  bg: "#F5F6F8",
  card: "#FFFFFF",
  text: "#101828",
  textSecondary: "#475467",
  textMuted: "#5B6474",
  border: "#E4E7EC",
  borderStrong: "#D0D5DD",
  primary: "#0A72BF",
  primaryDark: "#085C9C",
  primarySoft: "#EAF3FB",
  button: "#0A72BF",
  badgeBg: "#EAF3FB",
  badgeText: "#0A5E9E",
  inputBg: "#F2F4F7",
  headerBg: "#FFFFFF",
  success: "#3B7A17",
  successSoft: "#E8F5E1",
  danger: "#B42318",
  dangerSoft: "#FEE4E2",
  chipActiveBg: "#101828",
  chipActiveText: "#FFFFFF",
  scrim: "rgba(16,24,40,0.45)",
  statusBar: "dark",
};

const darkColors: ThemeColors = {
  bg: "#0B1218",
  card: "#121C25",
  text: "#F2F4F7",
  textSecondary: "#B6C0CC",
  textMuted: "#8D99A8",
  border: "#22303D",
  borderStrong: "#33424F",
  primary: "#6CB4EA",
  primaryDark: "#4BA3E3",
  primarySoft: "#14293A",
  button: "#0A72BF",
  badgeBg: "#14293A",
  badgeText: "#8CC6F0",
  inputBg: "#18242F",
  headerBg: "#121C25",
  success: "#7FC25A",
  successSoft: "#1A2E14",
  danger: "#F97066",
  dangerSoft: "#3A1715",
  chipActiveBg: "#F2F4F7",
  chipActiveText: "#101828",
  scrim: "rgba(0,0,0,0.6)",
  statusBar: "light",
};

interface ThemeContextValue {
  theme: ThemeType;
  colors: ThemeColors;
  setTheme: (t: ThemeType) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "light",
  colors: lightColors,
  setTheme: () => {},
  toggleTheme: () => {},
});

const THEME_KEY = "@medax_mobile_theme";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeType>("light");

  useEffect(() => {
    AsyncStorage.getItem(THEME_KEY).then((saved) => {
      if (saved === "dark" || saved === "light") {
        setThemeState(saved);
      }
    });
  }, []);

  const setTheme = (t: ThemeType) => {
    setThemeState(t);
    AsyncStorage.setItem(THEME_KEY, t);
  };

  const toggleTheme = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
  };

  const colors = theme === "dark" ? darkColors : lightColors;

  return (
    <ThemeContext.Provider value={{ theme, colors, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
