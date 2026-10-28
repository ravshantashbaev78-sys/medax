import React, { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type Language = "uz" | "ru" | "en";

const translations: Record<Language, Record<string, string>> = {
  uz: {
    // Nav
    nav_home: "Asosiy",
    nav_catalog: "Katalog",
    nav_cart: "Savat",
    nav_profile: "Profil",

    // Common
    loading: "Yuklanmoqda...",
    save: "Saqlash",
    cancel: "Bekor qilish",
    error: "Xatolik",
    success: "Muvaffaqiyatli",
    all: "Barchasi",
    uzs: "UZS",
    sum: "so'm",
    on_request: "Kelishuv asosida",

    // Profile Screen
    profile_title: "Shaxsiy kabinet",
    profile_login_sub: "Buyurtmalaringizni kuzatish va tezkor xarid qilish uchun telefon raqamingiz bilan kiring",
    profile_tg_btn: "SMS kod orqali kirish",
    profile_waiting_bot: "SMS kod kutilmoqda...",
    profile_waiting_sub: "Telefoningizga kelgan 6 xonali kodni kiriting",
    profile_reopen_bot: "Kodni qayta yuborish →",
    profile_benefit_1: "Tezkor va xavfsiz SMS tasdiqlash",
    profile_benefit_2: "100% xavfsiz va rasmiy avtorizatsiya",
    profile_benefit_3: "Kafolatli tibbiy uskunalar xaridi",
    profile_info_title: "Mijoz ma'lumotlari",
    profile_auth_type: "Autentifikatsiya",
    profile_auth_val: "SMS bilan tasdiqlangan",
    profile_status: "Holati",
    profile_status_active: "Faol mijoz",
    profile_logout: "Profildan chiqish",
    profile_change_photo: "Rasmni almashtirish",

    // Settings Section in Profile
    settings_title: "Ilova sozlamalari",
    settings_theme: "Mavzu",
    settings_theme_light: "Yorug'",
    settings_theme_dark: "Qorong'i",
    settings_lang: "Ilova tili",

    // Contacts
    contact_title: "Medax aloqa markazi",
    contact_sub: "Savollar, takliflar yoki servis xizmati uchun biz bilan bog'laning:",
    contact_phone: "Aloqa telefoni",
    contact_tg_channel: "Rasmiy Telegram kanal",
    contact_store: "Do'kon va ombor",

    // Home
    home_search_ph: "Uskuna yoki sarflov materiallarini qidirish...",
    home_banner_title: "Medax Tibbiyot Markazi",
    home_banner_sub: "Tibbiyot uskunalari va jihozlarining keng assortimenti",
    home_popular: "Ommabop uskunalar",
    home_all_cat: "Barcha kategoriyalar",
    home_badges_warranty: "Rasmiy kafolat",
    home_badges_delivery: "Tezkor yetkazish",
    home_badges_certified: "Sertifikatlangan",

    // Cart
    cart_empty_title: "Savatchangiz bo'sh",
    cart_empty_sub: "Katalogimizdan tibbiyot uskunalari va asbob-uskunalarni tanlang",
    cart_go_catalog: "Katalogni ko'rish →",
    cart_clear: "Tozalash",
    cart_checkout_title: "Buyurtmani rasmiylashtirish",
    cart_checkout_sub: "Ma'lumotlarni to'ldiring va to'lov usulini tanlang",
    cart_name_label: "Ism va Familiya *",
    cart_phone_label: "Telefon raqamingiz *",
    cart_address_label: "Yetkazib berish / Olib ketish manzili *",
    cart_comment_label: "Qo'shimcha izoh (ixtiyoriy)",
    cart_pay_method: "To'lov usuli *",
    cart_inpay_title: "inPAY — Onlayn to'lov",
    cart_inpay_desc: "Click, Payme, Uzcard, Humo kartalari orqali to'lov.",
    cart_cash_title: "Qabul qilishda to'lash",
    cart_cash_desc: "Do'kondan olib ketishda yoki topshirilganda naqd/karta bilan to'lov.",
    cart_total_label: "Jami to'lov:",
    cart_order_btn: "Buyurtmani tasdiqlash →",
    cart_inpay_btn: "inPAY orqali to'lash →",

    // Catalog
    cat_title: "Katalog",
    cat_search_ph: "Uskunalar nomi bo'yicha qidirish...",
    cat_not_found: "Uskuna topilmadi",
    cat_not_found_sub: "Boshqa kategoriya yoki kalit so'z bilan qidirib ko'ring",
    cat_all_count: "Barchasi",

    // Onboarding
    onboarding_skip: "O'tkazish",
    onboarding_next: "Keyingisi →",
    onboarding_start: "Boshlash ✓",
    onboarding_slogan: "TIBBIY USKUNALAR",
  },
  ru: {
    // Nav
    nav_home: "Главная",
    nav_catalog: "Каталог",
    nav_cart: "Корзина",
    nav_profile: "Профиль",

    // Common
    loading: "Загрузка...",
    save: "Сохранить",
    cancel: "Отмена",
    error: "Ошибка",
    success: "Успешно",
    all: "Все",
    uzs: "UZS",
    sum: "сум",
    on_request: "По запросу",

    // Profile Screen
    profile_title: "Личный кабинет",
    profile_login_sub: "Войдите по номеру телефона для отслеживания заказов и быстрых покупок",
    profile_tg_btn: "Войти по SMS коду",
    profile_waiting_bot: "Ожидание SMS кода...",
    profile_waiting_sub: "Введите 6-значный код подтверждения из SMS",
    profile_reopen_bot: "Отправить код повторно →",
    profile_benefit_1: "Быстрый и безопасный вход по SMS",
    profile_benefit_2: "100% безопасная и официальная авторизация",
    profile_benefit_3: "Гарантия на медицинское оборудование",
    profile_info_title: "Данные клиента",
    profile_auth_type: "Авторизация",
    profile_auth_val: "Подтверждено по SMS",
    profile_status: "Статус",
    profile_status_active: "Активный клиент",
    profile_logout: "Выйти из аккаунта",
    profile_change_photo: "Сменить фото",

    // Settings Section in Profile
    settings_title: "Настройки приложения",
    settings_theme: "Тема оформления",
    settings_theme_light: "Светлая",
    settings_theme_dark: "Тёмная",
    settings_lang: "Язык приложения",

    // Contacts
    contact_title: "Контактный центр Medax",
    contact_sub: "Свяжитесь с нами по любым вопросам, сервису или заказам:",
    contact_phone: "Телефон для связи",
    contact_tg_channel: "Официальный Telegram-канал",
    contact_store: "Магазин и склад",

    // Home
    home_search_ph: "Поиск оборудования или расходных материалов...",
    home_banner_title: "Медицинский Центр Medax",
    home_banner_sub: "Широкий ассортимент медицинского оборудования и приборов",
    home_popular: "Популярные товары",
    home_all_cat: "Все категории",
    home_badges_warranty: "Официальная гарантия",
    home_badges_delivery: "Быстрая доставка",
    home_badges_certified: "Сертифицировано",

    // Cart
    cart_empty_title: "Ваша корзина пуста",
    cart_empty_sub: "Выберите медицинское оборудование и принадлежности из каталога",
    cart_go_catalog: "Перейти в каталог →",
    cart_clear: "Очистить",
    cart_checkout_title: "Оформление заказа",
    cart_checkout_sub: "Заполните данные и выберите способ оплаты",
    cart_name_label: "Имя и Фамилия *",
    cart_phone_label: "Номер телефона *",
    cart_address_label: "Адрес доставки / самовывоза *",
    cart_comment_label: "Дополнительный комментарий (необязательно)",
    cart_pay_method: "Способ оплаты *",
    cart_inpay_title: "inPAY — Онлайн оплата",
    cart_inpay_desc: "Оплата картами Click, Payme, Uzcard, Humo.",
    cart_cash_title: "Оплата при получении",
    cart_cash_desc: "Оплата при самовывозе или доставке наличными / картой.",
    cart_total_label: "Итого к оплате:",
    cart_order_btn: "Подтвердить заказ →",
    cart_inpay_btn: "Оплатить через inPAY →",

    // Catalog
    cat_title: "Каталог",
    cat_search_ph: "Поиск по названию оборудования...",
    cat_not_found: "Оборудование не найдено",
    cat_not_found_sub: "Попробуйте изменить категорию или поисковый запрос",
    cat_all_count: "Все",

    // Onboarding
    onboarding_skip: "Пропустить",
    onboarding_next: "Далее →",
    onboarding_start: "Начать ✓",
    onboarding_slogan: "МЕДИЦИНСКАЯ ТЕХНИКА",
  },
  en: {
    // Nav
    nav_home: "Home",
    nav_catalog: "Catalog",
    nav_cart: "Cart",
    nav_profile: "Profile",

    // Common
    loading: "Loading...",
    save: "Save",
    cancel: "Cancel",
    error: "Error",
    success: "Success",
    all: "All",
    uzs: "UZS",
    sum: "UZS",
    on_request: "On request",

    // Profile Screen
    profile_title: "Personal Account",
    profile_login_sub: "Log in with your phone number to track orders and make quick purchases",
    profile_tg_btn: "Log in via SMS Code",
    profile_waiting_bot: "Waiting for SMS code...",
    profile_waiting_sub: "Enter the 6-digit verification code sent to your phone",
    profile_reopen_bot: "Resend Code →",
    profile_benefit_1: "Fast and secure SMS verification",
    profile_benefit_2: "100% secure official authorization",
    profile_benefit_3: "Certified medical equipment warranty",
    profile_info_title: "Customer Details",
    profile_auth_type: "Authentication",
    profile_auth_val: "Verified via SMS",
    profile_status: "Status",
    profile_status_active: "Active Customer",
    profile_logout: "Log out",
    profile_change_photo: "Change Photo",

    // Settings Section in Profile
    settings_title: "App Settings",
    settings_theme: "Theme",
    settings_theme_light: "Light",
    settings_theme_dark: "Dark",
    settings_lang: "App Language",

    // Contacts
    contact_title: "Medax Contact Center",
    contact_sub: "Get in touch with us for equipment inquiry, service or orders:",
    contact_phone: "Contact phone",
    contact_tg_channel: "Official Telegram channel",
    contact_store: "Store and warehouse",

    // Home
    home_search_ph: "Search equipment or medical supplies...",
    home_banner_title: "Medax Medical Center",
    home_banner_sub: "Wide range of professional medical equipment and devices",
    home_popular: "Popular Equipment",
    home_all_cat: "All categories",
    home_badges_warranty: "Official Warranty",
    home_badges_delivery: "Fast Delivery",
    home_badges_certified: "Certified Quality",

    // Cart
    cart_empty_title: "Your cart is empty",
    cart_empty_sub: "Browse our catalog to select medical equipment and supplies",
    cart_go_catalog: "Browse Catalog →",
    cart_clear: "Clear",
    cart_checkout_title: "Checkout",
    cart_checkout_sub: "Fill in your details and select payment method",
    cart_name_label: "Full Name *",
    cart_phone_label: "Phone Number *",
    cart_address_label: "Delivery / Pickup Address *",
    cart_comment_label: "Order Note (optional)",
    cart_pay_method: "Payment Method *",
    cart_inpay_title: "inPAY — Online Payment",
    cart_inpay_desc: "Pay securely via Click, Payme, Uzcard, Humo.",
    cart_cash_title: "Pay on Delivery / Pickup",
    cart_cash_desc: "Pay by cash or card upon receipt or pickup.",
    cart_total_label: "Order Total:",
    cart_order_btn: "Confirm Order →",
    cart_inpay_btn: "Pay with inPAY →",

    // Catalog
    cat_title: "Catalog",
    cat_search_ph: "Search by equipment name...",
    cat_not_found: "No equipment found",
    cat_not_found_sub: "Try searching with another category or keyword",
    cat_all_count: "All",

    // Onboarding
    onboarding_skip: "Skip",
    onboarding_next: "Next →",
    onboarding_start: "Get Started ✓",
    onboarding_slogan: "MEDICAL EQUIPMENT",
  },
};

interface I18nContextValue {
  lang: Language;
  setLang: (l: Language) => void;
  t: (key: string) => string;
}

const I18nContext = createContext<I18nContextValue>({
  lang: "uz",
  setLang: () => {},
  t: (k) => k,
});

const LANG_KEY = "@medax_mobile_lang";

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Language>("uz");

  useEffect(() => {
    AsyncStorage.getItem(LANG_KEY).then((saved) => {
      if (saved === "uz" || saved === "ru" || saved === "en") {
        setLangState(saved);
      }
    });
  }, []);

  const setLang = (l: Language) => {
    setLangState(l);
    AsyncStorage.setItem(LANG_KEY, l);
  };

  const t = (key: string): string => {
    return translations[lang]?.[key] || translations.uz[key] || key;
  };

  return (
    <I18nContext.Provider value={{ lang, setLang, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export const useI18n = () => useContext(I18nContext);

// ============================================================================
// Asosiy 5 ta toifani 3 tilda tarjima qilish (UZ, RU, EN)
// ============================================================================
export const CATEGORY_TRANSLATIONS: Record<string, Record<Language, string>> = {
  "tibbiy-buyumlar": {
    uz: "Tibbiy buyumlar",
    ru: "Медицинские изделия",
    en: "Medical Supplies",
  },
  "tibbiy-apparaturalar": {
    uz: "Tibbiy apparaturalar",
    ru: "Медицинская аппаратура",
    en: "Medical Equipment",
  },
  "tibbiy-jihozlar": {
    uz: "Tibbiy jihozlar",
    ru: "Медицинское оборудование",
    en: "Medical Devices & Furniture",
  },
  "laboratoriya-reagentlari": {
    uz: "Laboratoriya reagentlari",
    ru: "Лабораторные реагенты",
    en: "Laboratory Reagents",
  },
  "ortopedik-mahsulotlar": {
    uz: "Ortopedik mahsulotlar",
    ru: "Ортопедические изделия",
    en: "Orthopedic Products",
  },
  "all": {
    uz: "Barchasi",
    ru: "Все",
    en: "All",
  },
  // Eski toifalar uchun moslashtirish (Backwards compatibility)
  "reabilitatsiya-va-invalit-aravachalari": {
    uz: "Reabilitatsiya va aravachalar",
    ru: "Реабилитация и инвалидные коляски",
    en: "Rehabilitation & Wheelchairs",
  },
  "ultratovush-diagnostikasi": {
    uz: "Ultratovush diagnostikasi (UZI)",
    ru: "Ультразвуковая диагностика (УЗИ)",
    en: "Ultrasound Diagnostics (USG)",
  },
  "reanimatsiya-va-anesteziologiya": {
    uz: "Reanimatsiya va anesteziologiya",
    ru: "Реанимация и анестезиология",
    en: "ICU & Anesthesiology",
  },
  "jarrohlik": {
    uz: "Jarrohlik jihozlari",
    ru: "Хирургическое оборудование",
    en: "Surgical Equipment",
  },
  "tibbiy-mebel": {
    uz: "Tibbiy mebel",
    ru: "Медицинская мебель",
    en: "Medical Furniture",
  },
  "operatsion-raqamli-integratsiya": {
    uz: "Operatsion integratsiya",
    ru: "Операционная интеграция",
    en: "Operating Room Integration",
  },
};

export function localizeCategoryName(slugOrName: string | undefined | null, lang: Language): string {
  if (!slugOrName) return "";
  const key = slugOrName.toLowerCase().trim();

  // 1. To'g'ridan-to'g'ri slug orqali tekshirish
  if (CATEGORY_TRANSLATIONS[key]) {
    return CATEGORY_TRANSLATIONS[key][lang];
  }

  // 2. Toifa nomi bo'yicha qidirish
  for (const item of Object.values(CATEGORY_TRANSLATIONS)) {
    if (
      item.uz.toLowerCase() === key ||
      item.ru.toLowerCase() === key ||
      item.en.toLowerCase() === key
    ) {
      return item[lang];
    }
  }

  // 3. Probeldan defisga o'girilgan holat
  const slugified = key.replace(/\s+/g, "-");
  if (CATEGORY_TRANSLATIONS[slugified]) {
    return CATEGORY_TRANSLATIONS[slugified][lang];
  }

  return slugOrName;
}
