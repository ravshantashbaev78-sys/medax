import React from "react";
import { View, Image, StyleSheet, Text } from "react-native";
import Svg, { Path, Circle, Rect, Line, Polyline, Defs, LinearGradient, Stop } from "react-native-svg";

interface IconProps {
  size?: number;
  color?: string;
}

// 1. Asosiy sahifa ikonkasi (Home)
export function HomeIcon({ size = 22, color = "#64748b" }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 10.182V20a2 2 0 002 2h4.5a1 1 0 001-1v-4.5a1 1 0 011-1h3a1 1 0 011 1V21a1 1 0 001 1H19a2 2 0 002-2v-9.818a2 2 0 00-.735-1.554l-7-5.727a2 2 0 00-2.53 0l-7 5.727A2 2 0 003 10.182z"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// 2. Katalog ikonkasi (Grid)
export function CatalogIcon({ size = 22, color = "#64748b" }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="3" y="3" width="7" height="7" rx="2" stroke={color} strokeWidth="2" />
      <Rect x="14" y="3" width="7" height="7" rx="2" stroke={color} strokeWidth="2" />
      <Rect x="14" y="14" width="7" height="7" rx="2" stroke={color} strokeWidth="2" />
      <Rect x="3" y="14" width="7" height="7" rx="2" stroke={color} strokeWidth="2" />
    </Svg>
  );
}

// 3. Savatcha ikonkasi (Cart)
export function CartIcon({ size = 22, color = "#64748b" }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="9" cy="21" r="1" stroke={color} strokeWidth="2" />
      <Circle cx="20" cy="21" r="1" stroke={color} strokeWidth="2" />
      <Path
        d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// 4. Profil ikonkasi (User)
export function UserIcon({ size = 22, color = "#64748b" }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx="12" cy="7" r="4" stroke={color} strokeWidth="2" />
    </Svg>
  );
}

// 5. Qidiruv ikonkasi (Search)
export function SearchIcon({ size = 18, color = "#94a3b8" }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="11" cy="11" r="8" stroke={color} strokeWidth="2" />
      <Line x1="21" y1="21" x2="16.65" y2="16.65" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </Svg>
  );
}

// 6. Tozalash / Yopish ikonkasi (Close / Clear)
export function CloseIcon({ size = 16, color = "#94a3b8" }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Line x1="18" y1="6" x2="6" y2="18" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <Line x1="6" y1="6" x2="18" y2="18" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </Svg>
  );
}

// 8. Rasmiy Kafolat (Shield)
export function ShieldIcon({ size = 18, color = "#0284c7" }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// 9. Yetkazib berish (Truck)
export function TruckIcon({ size = 18, color = "#0284c7" }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="1" y="3" width="15" height="13" stroke={color} strokeWidth="2" />
      <Polyline points="16 8 20 8 23 11 23 16 16 16" stroke={color} strokeWidth="2" />
      <Circle cx="5.5" cy="18.5" r="2.5" stroke={color} strokeWidth="2" />
      <Circle cx="18.5" cy="18.5" r="2.5" stroke={color} strokeWidth="2" />
    </Svg>
  );
}

// 10. Tezkor xizmat (Lightning/Bolt)
export function BoltIcon({ size = 18, color = "#0284c7" }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Polyline points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

// 11. Sertifikat / Stetoskop
export function CertificateIcon({ size = 18, color = "#0284c7" }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="8" r="6" stroke={color} strokeWidth="2" />
      <Path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

// 12. Medax Asl Logotipi (Emblem)
export function MedaxEmblem({ size = 36 }: { size?: number }) {
  return (
    <Image
      source={{ uri: "https://medax.uz/favicon.png" }}
      style={{ width: size, height: size, borderRadius: size / 4 }}
      resizeMode="contain"
    />
  );
}

// 13. Medax To'liq Brend Logotipi (Logo + Text)
export function MedaxHeaderBrand() {
  return (
    <View style={brandStyles.wrap}>
      <MedaxEmblem size={34} />
      <View style={brandStyles.textWrap}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Text style={brandStyles.brandMed}>Med</Text>
          <Text style={brandStyles.brandAx}>ax</Text>
        </View>
        <Text style={brandStyles.tagline}>MEDTEXNIKA MARKAZI</Text>
      </View>
    </View>
  );
}

// 14. Stetoskop (Tibbiy apparatlar)
export function StethoscopeIcon({ size = 20, color = "#0284c7" }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4.5 3v5a4.5 4.5 0 009 0V3"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx="4.5" cy="3" r="1.5" fill={color} />
      <Circle cx="13.5" cy="3" r="1.5" fill={color} />
      <Path
        d="M9 12.5v2.5a5 5 0 005 5h1a4 4 0 004-4v-1"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx="19" cy="12" r="3" stroke={color} strokeWidth="2" />
    </Svg>
  );
}

// 15. Narx tegi (Factory / Direct Price)
export function PriceTagIcon({ size = 20, color = "#0284c7" }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12.5 2H4a2 2 0 00-2 2v8.5a2 2 0 00.58 1.42l8 8a2 2 0 002.83 0l6.67-6.67a2 2 0 000-2.83l-8-8A2 2 0 0012.5 2z"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx="7.5" cy="7.5" r="1.5" fill={color} />
    </Svg>
  );
}

// 16. Qidiruv va filtr (Filter Search)
export function FilterSearchIcon({ size = 20, color = "#0284c7" }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="11" cy="11" r="7" stroke={color} strokeWidth="2" />
      <Line x1="16.5" y1="16.5" x2="21.5" y2="21.5" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <Line x1="8" y1="9" x2="14" y2="9" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      <Line x1="9.5" y1="12" x2="12.5" y2="12" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    </Svg>
  );
}

// 17. Kafolat qalqoni tekshiruv belgisi bilan (Shield Check)
export function ShieldCheckIcon({ size = 20, color = "#0d9488" }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Polyline
        points="9 12 11 14 15 10"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// 18. Muhandis kaliti (Wrench Tool / Service)
export function WrenchToolIcon({ size = 20, color = "#0d9488" }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.77 3.77z"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// 19. Mijozlarni qo'llab-quvvatlash / Quloqchin (Support Headset)
export function SupportIcon({ size = 20, color = "#0d9488" }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 18v-6a9 9 0 0118 0v6"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Rect x="2" y="14" width="4" height="6" rx="2" stroke={color} strokeWidth="2" />
      <Rect x="18" y="14" width="4" height="6" rx="2" stroke={color} strokeWidth="2" />
      <Path
        d="M19 20v1a2 2 0 01-2 2h-3"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </Svg>
  );
}

// 20. SMS va qulf xavfsizlik (Lock Check)
export function LockCheckIcon({ size = 20, color = "#6366f1" }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="3" y="11" width="18" height="11" rx="2" stroke={color} strokeWidth="2" />
      <Path
        d="M7 11V7a5 5 0 0110 0v4"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <Polyline
        points="9 16.5 11 18.5 15 14.5"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// 21. Shaxsiy profil va shifokor tekshiruvi (User Check)
export function UserCheckIcon({ size = 20, color = "#6366f1" }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx="8.5" cy="7" r="4" stroke={color} strokeWidth="2" />
      <Polyline
        points="16 11 18 13 22 9"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// 22. Jonli xabardorlik va qo'ng'iroq (Bell Ring)
export function BellRingIcon({ size = 20, color = "#6366f1" }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M13.73 21a2 2 0 01-3.46 0"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <Circle cx="18" cy="4" r="2.5" fill={color} />
    </Svg>
  );
}

// 23. Tezkor maxsus yuk mashinasi (Truck Fast)
export function TruckFastIcon({ size = 20, color = "#059669" }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M2 5h13v11H2z" stroke={color} strokeWidth="2" strokeLinejoin="round" />
      <Path d="M15 9h4l3 3v4h-7V9z" stroke={color} strokeWidth="2" strokeLinejoin="round" />
      <Circle cx="6.5" cy="18.5" r="2" stroke={color} strokeWidth="2" />
      <Circle cx="17.5" cy="18.5" r="2" stroke={color} strokeWidth="2" />
      <Line x1="1" y1="8" x2="2" y2="8" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <Line x1="0" y1="12" x2="2" y2="12" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </Svg>
  );
}

// 24. Sug'urtalangan qadoq / Quti (Box Shield)
export function BoxShieldIcon({ size = 20, color = "#059669" }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 2l8 4.5v11L12 22 4 17.5v-11L12 2z"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Line x1="12" y1="12" x2="20" y2="7.5" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <Line x1="12" y1="12" x2="12" y2="22" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <Line x1="12" y1="12" x2="4" y2="7.5" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <Polyline points="9 8 12 9.5 15 8" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
    </Svg>
  );
}

// 25. O'zbekiston viloyatlari manzil nishoni (Map Pin Check)
export function MapPinCheckIcon({ size = 20, color = "#059669" }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 2a7 7 0 00-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 00-7-7z"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Polyline
        points="9.5 9 11.2 10.8 14.5 7.5"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// 26. Tayyor / Tasdiq (Check)
export function CheckIcon({ size = 16, color = "#059669" }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Polyline
        points="20 6 9 17 4 12"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// 27. Telegram rasmiy original logotipi
export function TelegramIcon({ size = 22 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="12" fill="#24A1DE" />
      <Path
        d="M17.562 8.161c-.18 1.897-.962 6.502-1.359 8.627-.168.9-.5 1.201-.82 1.23-.697.064-1.228-.461-1.901-.903-1.056-.693-1.653-1.124-2.678-1.8-1.185-.781-.417-1.21.258-1.911.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.493.339-.942.503-1.342.493-.442-.011-1.294-.25-1.927-.456-.777-.25-1.395-.383-1.343-.809.027-.22.321-.444.887-.678 3.475-1.513 5.795-2.489 6.961-3.029 3.313-1.527 4.001-1.793 4.451-1.801.098-.002.317.023.46.14.122.1.159.256.142.361z"
        fill="#ffffff"
      />
    </Svg>
  );
}

// 28. Instagram rasmiy original gradient logotipi
export function InstagramIcon({ size = 22 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Defs>
        <LinearGradient id="igGradient" x1="0%" y1="100%" x2="100%" y2="0%">
          <Stop offset="0%" stopColor="#f09433" />
          <Stop offset="25%" stopColor="#e6683c" />
          <Stop offset="50%" stopColor="#dc2743" />
          <Stop offset="75%" stopColor="#cc2366" />
          <Stop offset="100%" stopColor="#bc1888" />
        </LinearGradient>
      </Defs>
      <Rect x="1" y="1" width="22" height="22" rx="6.5" fill="url(#igGradient)" />
      <Rect x="5" y="5" width="14" height="14" rx="4" stroke="#ffffff" strokeWidth="1.8" />
      <Circle cx="12" cy="12" r="3.4" stroke="#ffffff" strokeWidth="1.8" />
      <Circle cx="15.8" cy="8.2" r="1.1" fill="#ffffff" />
    </Svg>
  );
}

// 29. Maxfiylik va Siyosat (Shield Lock)
export function ShieldLockIcon({ size = 22, color = "#6366f1" }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Rect x="8.5" y="11" width="7" height="5.5" rx="1" stroke={color} strokeWidth="1.8" />
      <Path d="M10 11V9.5a2 2 0 0 1 4 0V11" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    </Svg>
  );
}

// 30. Joylashuv / Bizning manzil (Map Pin)
export function MapPinIcon({ size = 22, color = "#059669" }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx="12" cy="10" r="3" stroke={color} strokeWidth="2" />
    </Svg>
  );
}

// 31. Telefon qo'ng'irog'i (Phone)
export function PhoneIcon({ size = 22, color = "#0284c7" }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// 32. Elektron pochta (Mail)
export function MailIcon({ size = 22, color = "#d97706" }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="2" y="4" width="20" height="16" rx="2" stroke={color} strokeWidth="2" />
      <Path
        d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

const brandStyles = StyleSheet.create({
  wrap: { flexDirection: "row", alignItems: "center", gap: 10 },
  textWrap: { flexDirection: "column" },
  brandMed: { fontSize: 20, fontWeight: "900", color: "#0284c7", letterSpacing: -0.5 },
  brandAx: { fontSize: 20, fontWeight: "900", color: "#16a34a", letterSpacing: -0.5 },
  tagline: { fontSize: 7.5, fontWeight: "900", color: "#0f172a", letterSpacing: 0.8, marginTop: -2 },
});
