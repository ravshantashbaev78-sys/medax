import React from "react";
import {
  View,
  Text,
  Image,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  TextInputProps,
  ViewStyle,
  StyleProp,
} from "react-native";
import Svg, { Path, Circle, Rect } from "react-native-svg";
import { useTheme } from "../context/ThemeContext";

/* ------------------------------------------------------------------ */
/* Logo                                                                */
/* ------------------------------------------------------------------ */

const LOGO = require("../../assets/logo.png"); // 724 x 454, asl Medax logotipi
const EMBLEM = require("../../assets/emblem.png");

/** Asl logotip: emblema + "Medax" + "Medtexnika markazi" */
export function BrandLogo({ width = 200 }: { width?: number }) {
  return <Image source={LOGO} style={{ width, height: (width * 454) / 724 }} resizeMode="contain" accessibilityLabel="Medax" />;
}

/** Sarlavha uchun: emblema va asl logotipdan qirqilgan "Medax" yozuvi */
export function BrandMark() {
  const w = 104; // logotip eni shu o'lchamga kichraytiriladi
  const scale = w / 724;
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }} accessibilityLabel="Medax">
      <Image source={EMBLEM} style={{ width: 32, height: 32, borderRadius: 6 }} />
      <View style={{ width: w, height: Math.round(135 * scale), overflow: "hidden" }}>
        <Image source={LOGO} style={{ width: w, height: 454 * scale, marginTop: -Math.round(257 * scale) }} resizeMode="contain" />
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Ikonkalar (bir xil uslubdagi chiziqli SVG)                          */
/* ------------------------------------------------------------------ */

type IconProps = { size?: number; color?: string; strokeWidth?: number };
const icon =
  (draw: (c: string) => React.ReactNode) =>
  ({ size = 20, color = "#101828", strokeWidth = 1.9 }: IconProps) =>
    (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        {draw(color)}
      </Svg>
    );

export const IcPin = icon(() => (
  <>
    <Path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z" />
    <Circle cx="12" cy="10" r="2.5" />
  </>
));
export const IcGrid = icon(() => (
  <>
    <Rect x="3" y="3" width="7" height="7" rx="1.5" />
    <Rect x="14" y="3" width="7" height="7" rx="1.5" />
    <Rect x="3" y="14" width="7" height="7" rx="1.5" />
    <Rect x="14" y="14" width="7" height="7" rx="1.5" />
  </>
));
export const IcPhone = icon(() => (
  <>
    <Rect x="6" y="2" width="12" height="20" rx="2" />
    <Path d="M11 18h2" />
  </>
));
export const IcBell = icon(() => (
  <>
    <Path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
    <Path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
  </>
));
export const IcSearch = icon(() => (
  <>
    <Circle cx="11" cy="11" r="7" />
    <Path d="M20 20l-3.5-3.5" />
  </>
));
export const IcPlus = icon(() => <Path d="M12 5v14M5 12h14" />);
export const IcMinus = icon(() => <Path d="M5 12h14" />);
export const IcBack = icon(() => <Path d="M15 18l-6-6 6-6" />);
export const IcChevron = icon(() => <Path d="M9 6l6 6-6 6" />);
export const IcExternal = icon(() => <Path d="M7 17L17 7M9 7h8v8" />);
export const IcClose = icon(() => <Path d="M6 6l12 12M18 6L6 18" />);
export const IcCheck = icon(() => <Path d="M5 12.5l4.5 4.5L19 7.5" />);
export const IcImage = icon(() => (
  <>
    <Rect x="3" y="4" width="18" height="16" rx="2" />
    <Circle cx="9" cy="10" r="2" />
    <Path d="M21 16l-5-5-9 9" />
  </>
));
export const IcEye = icon(() => (
  <>
    <Path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
    <Circle cx="12" cy="12" r="3" />
  </>
));
export const IcEyeOff = icon(() => (
  <>
    <Path d="M3 3l18 18" />
    <Path d="M10.6 5.1A10.4 10.4 0 0 1 12 5c6.4 0 10 7 10 7a17.6 17.6 0 0 1-3.2 4.1M6.6 6.6C3.9 8.4 2 12 2 12s3.6 7 10 7a9.9 9.9 0 0 0 5.4-1.6" />
    <Path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
  </>
));
export const IcSort = icon(() => <Path d="M7 4v16M7 20l-3-3M7 20l3-3M17 20V4M17 4l-3 3M17 4l3 3" />);
export const IcMail = icon(() => (
  <>
    <Rect x="3" y="5" width="18" height="14" rx="2" />
    <Path d="M3 7l9 6 9-6" />
  </>
));
export const IcSend = icon(() => <Path d="M21 3L10 14M21 3l-7 18-4-7-7-4z" />);
export const IcCamera = icon(() => (
  <>
    <Path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z" />
    <Circle cx="12" cy="13" r="3.5" />
  </>
));
export const IcShield = icon(() => <Path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" />);
export const IcSun = icon(() => (
  <>
    <Circle cx="12" cy="12" r="4" />
    <Path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </>
));
export const IcGlobe = icon(() => (
  <>
    <Circle cx="12" cy="12" r="9" />
    <Path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
  </>
));
export const IcTrash = icon(() => <Path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />);

/** Kategoriya ikonkalari (slug bo'yicha) */
const IcMonitor = icon(() => (
  <>
    <Rect x="3" y="4" width="18" height="12" rx="2" />
    <Path d="M7 10h2l1.5-3 2 6 1.5-3H17" />
    <Path d="M9 20h6M12 16v4" />
  </>
));
const IcBed = icon(() => (
  <>
    <Path d="M3 18V8M3 14h18v4M21 14v-2a3 3 0 0 0-3-3h-7v5" />
    <Circle cx="7" cy="11" r="2" />
  </>
));
const IcFlask = icon(() => (
  <>
    <Path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.8 3h10.4a2 2 0 0 0 1.8-3l-5-9V3" />
    <Path d="M7.5 15h9" />
  </>
));
const IcWheel = icon(() => (
  <>
    <Circle cx="10" cy="17" r="4" />
    <Path d="M8 4h3l2 9h5l2 4" />
    <Path d="M11 9h5" />
  </>
));
const IcBandage = icon(() => (
  <>
    <Rect x="2.5" y="8" width="19" height="8" rx="4" transform="rotate(-45 12 12)" />
    <Path d="M10.5 10.5h.01M13.5 13.5h.01M13.5 10.5h.01M10.5 13.5h.01" />
  </>
));

export function CategoryIcon({ slug, size = 18, color }: { slug?: string; size?: number; color: string }) {
  switch (slug) {
    case "tibbiy-apparaturalar":
      return <IcMonitor size={size} color={color} strokeWidth={1.8} />;
    case "tibbiy-jihozlar":
      return <IcBed size={size} color={color} strokeWidth={1.8} />;
    case "laboratoriya-reagentlari":
      return <IcFlask size={size} color={color} strokeWidth={1.8} />;
    case "ortopedik-mahsulotlar":
      return <IcWheel size={size} color={color} strokeWidth={1.8} />;
    case "tibbiy-buyumlar":
      return <IcBandage size={size} color={color} strokeWidth={1.8} />;
    default:
      return <IcGrid size={size} color={color} strokeWidth={1.8} />;
  }
}

/* ------------------------------------------------------------------ */
/* Asosiy komponentlar                                                 */
/* ------------------------------------------------------------------ */

export function Button({
  title,
  onPress,
  loading,
  disabled,
  variant = "primary",
  style,
}: {
  title: string;
  onPress?: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useTheme();
  const bg =
    variant === "primary" ? colors.button : variant === "secondary" ? colors.inputBg : variant === "danger" ? colors.dangerSoft : "transparent";
  const fg = variant === "primary" ? "#FFFFFF" : variant === "danger" ? colors.danger : variant === "ghost" ? colors.primary : colors.text;
  const off = disabled || loading;
  return (
    <TouchableOpacity
      accessibilityRole="button"
      onPress={onPress}
      disabled={off}
      activeOpacity={0.85}
      style={[ui.btn, { backgroundColor: bg, opacity: disabled && !loading ? 0.45 : 1 }, style]}
    >
      {loading ? <ActivityIndicator color={fg} /> : <Text style={[ui.btnText, { color: fg }]}>{title}</Text>}
    </TouchableOpacity>
  );
}

export function Field({
  label,
  hint,
  right,
  locked,
  style,
  ...input
}: TextInputProps & { label: string; hint?: string; right?: React.ReactNode; locked?: boolean }) {
  const { colors } = useTheme();
  const [focus, setFocus] = React.useState(false);
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={[ui.label, { color: colors.textSecondary }]}>{label}</Text>
      <View style={{ justifyContent: "center" }}>
        <TextInput
          {...input}
          editable={!locked && input.editable !== false}
          onFocus={(e) => {
            setFocus(true);
            input.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocus(false);
            input.onBlur?.(e);
          }}
          placeholderTextColor={colors.textMuted}
          style={[
            ui.input,
            {
              color: locked ? colors.textSecondary : colors.text,
              backgroundColor: locked ? colors.inputBg : colors.card,
              borderColor: focus ? colors.primary : colors.borderStrong,
              paddingRight: right ? 52 : 14,
            },
            style,
          ]}
        />
        {right ? <View style={ui.fieldRight}>{right}</View> : null}
      </View>
      {hint ? <Text style={[ui.hint, { color: colors.textMuted }]}>{hint}</Text> : null}
    </View>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();
  return <View style={[ui.card, { backgroundColor: colors.card, borderColor: colors.border }, style]}>{children}</View>;
}

export function IconBadge({ children, size = 40 }: { children: React.ReactNode; size?: number }) {
  const { colors } = useTheme();
  return (
    <View style={{ width: size, height: size, borderRadius: size / 4, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" }}>
      {children}
    </View>
  );
}

export function IconButton({
  onPress,
  label,
  children,
  style,
}: {
  onPress?: () => void;
  label: string;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useTheme();
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={6}
      style={[ui.iconBtn, { borderColor: colors.border, backgroundColor: colors.card }, style]}
    >
      {children}
    </TouchableOpacity>
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  const { colors } = useTheme();
  return (
    <View style={[ui.seg, { backgroundColor: colors.inputBg }]} accessibilityRole="tablist">
      {options.map((o) => {
        const on = o.value === value;
        return (
          <TouchableOpacity
            key={o.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            onPress={() => onChange(o.value)}
            style={[ui.segItem, on && { backgroundColor: colors.card, elevation: 1, shadowColor: "#101828", shadowOpacity: 0.08, shadowRadius: 2, shadowOffset: { width: 0, height: 1 } }]}
          >
            <Text style={{ fontSize: 14, fontWeight: on ? "600" : "500", color: on ? colors.text : colors.textSecondary }}>{o.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export function SectionHeader({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  const { colors } = useTheme();
  return (
    <View style={ui.sectionHead}>
      <Text style={[ui.sectionTitle, { color: colors.text }]}>{title}</Text>
      {action ? (
        <TouchableOpacity onPress={onAction} hitSlop={10}>
          <Text style={{ fontSize: 14, fontWeight: "500", color: colors.primary }}>{action}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

export function StatusPill({ label, tone }: { label: string; tone: "info" | "success" | "danger" | "neutral" | "warn" }) {
  const { colors, theme } = useTheme();
  const map = {
    info: [colors.badgeBg, colors.badgeText],
    success: [colors.successSoft, colors.success],
    danger: [colors.dangerSoft, colors.danger],
    neutral: [colors.inputBg, colors.textSecondary],
    warn: [theme === "dark" ? "#3A2A0E" : "#FEF0C7", theme === "dark" ? "#FDB022" : "#93370D"],
  } as const;
  const [bg, fg] = map[tone];
  return (
    <View style={{ backgroundColor: bg, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 }}>
      <Text style={{ fontSize: 12.5, fontWeight: "600", color: fg }}>{label}</Text>
    </View>
  );
}

export const ui = StyleSheet.create({
  btn: { height: 52, borderRadius: 12, alignItems: "center", justifyContent: "center", paddingHorizontal: 18 },
  btnText: { fontSize: 16, fontWeight: "600" },
  label: { fontSize: 13, fontWeight: "500", marginBottom: 6 },
  input: { height: 50, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, fontSize: 16 },
  hint: { fontSize: 12.5, marginTop: 6, lineHeight: 17 },
  fieldRight: { position: "absolute", right: 3, top: 3, width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  card: { borderWidth: 1, borderRadius: 16 },
  iconBtn: { width: 44, height: 44, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  seg: { flexDirection: "row", padding: 4, borderRadius: 12, gap: 4 },
  segItem: { flex: 1, height: 40, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  sectionHead: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", marginBottom: 10 },
  sectionTitle: { fontSize: 17, fontWeight: "600" },
  h1: { fontSize: 24, fontWeight: "700", letterSpacing: -0.4 },
});
