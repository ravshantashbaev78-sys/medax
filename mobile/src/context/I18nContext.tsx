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
    contact_email: "Rasmiy Gmail pochta",
    contact_store: "Bizning manzil",
    contact_address: "Namangan viloyati, Namangan sh., Ozod MFY, Abu Rayhon Beruniy ko'chasi, 2-uy",
    stock_in: "Omborda: {n} dona mavjud",
    stock_out: "Omborda qolmagan (Tugagan)",
    stock_cart_empty: "Omborda tugagan",

    // Home
    home_search_ph: "Uskuna yoki sarflov materiallarini qidirish...",
    home_banner_title: "Medax Tibbiyot Markazi",
    home_banner_sub: "Tibbiyot uskunalari va jihozlarining keng assortimenti",
    home_popular: "Ommabop uskunalar",
    home_all_cat: "Barcha toifalar",
    home_badges_warranty: "Rasmiy kafolat",
    home_badges_delivery: "Tezkor yetkazish",
    home_badges_certified: "Sertifikatlangan",

    // Orders
    my_orders_title: "Mening buyurtmalarim",
    my_orders_empty: "Hozircha buyurtmalar berilmagan",
    my_orders_total: "Jami",

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
    cart_cash_title: "Qabul qilishda to'lash",
    cart_cash_desc: "Do'kondan olib ketishda yoki topshirilganda naqd/karta bilan to'lov.",
    cart_total_label: "Jami to'lov:",
    cart_order_btn: "Buyurtmani tasdiqlash →",

    // Catalog
    cat_title: "Katalog",
    cat_search_ph: "Uskunalar nomi bo'yicha qidirish...",
    cat_not_found: "Uskuna topilmadi",
    cat_not_found_sub: "Boshqa toifa yoki kalit so'z bilan qidirib ko'ring",
    cat_all_count: "Barchasi",

    // Onboarding
    onboarding_skip: "O'tkazish",
    onboarding_next: "Keyingisi →",
    onboarding_start: "Boshlash ✓",
    onboarding_slogan: "TIBBIY USKUNALAR",

    // Notifications
    notif_title: "Bildirishnomalar",
    notif_mark_read: "O'qildi deb belgilash",
    notif_empty: "Hozircha yangi bildirishnomalar yo'q",

    // Home Extra
    home_cabinet: "Kabinet 👤",
    home_popular_sub: "Klinikalar va shifokorlar tanlovi",
    home_no_products: "Hozircha mahsulotlar yuklanmadi",
    home_questions_title: "Savollaringiz bormi?",
    home_questions_sub: "Malakali muhandis va mutaxassislarimiz uskuna tanlashda yordam beradi.",
    home_work_hours: "Du-Sha: 09:00 - 18:00",
    trust_delivery: "Tezkor yetkazish",
    trust_delivery_sub: "Butun O'zbekiston",
    trust_warranty: "Rasmiy kafolat",
    trust_warranty_sub: "Zavod servisi",
    trust_cert: "Sertifikat",
    trust_cert_sub: "100% asl uskunalar",
    trust_eng: "24/7 Muhandis",
    trust_eng_sub: "O'rnatib berish",
    prod_add_cart: "Savatchaga",
    prod_added: "Qo'shildi",
    home_catalog_btn: "Katalog →",

    // Cart Extra
    cart_pay_cash_title: "🏪 Do'konda to'lash (Olib ketishda)",
    cart_pay_cash_desc: "Uskunani ko'rib, tekshirib olgach to'laysiz (Naqd pul, karta/terminal yoki hisob-faktura).",
    cart_sec_note: "Barcha to'lovlar va ma'lumotlar 256-bit shifrlangan",
    cart_otp_title: "SMS tasdiqlash kodi *",
    cart_otp_sub: "raqamiga yuborilgan 6 xonali kodni kiriting",
    cart_resend_code: "Kodni qayta yuborish",
    cart_get_code_btn: "SMS kod olish va buyurtma berish →",
    cart_confirm_btn: "Buyurtmani tasdiqlash →",

    // Auth & Modal
    auth_success_title: "Muvaffaqiyatli! 🎉",
    auth_welcome: "Xush kelibsiz",
    btn_continue: "Davom etish →",
    order_success_title: "Buyurtmangiz qabul qilindi! 🎉",
    order_success_sub: "Buyurtma raqami: #{code}.\nAdmin buyurtmangizni ko'rib chiqadi va sizga SMS xabarnoma boradi.",
    auth_phone_label: "Telefon raqamingiz",
    auth_name_label: "Ism-familiyangiz (ixtiyoriy)",
    auth_get_code: "SMS kodni olish →",
    auth_password_link: "Parol orqali kirish",
    auth_otp_title: "SMS kod (6 xonali)",
    auth_verify_btn: "Tasdiqlash va kirish ✓",
    auth_change_phone: "Raqamni o'zgartirish",
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
    contact_email: "Официальная почта Gmail",
    contact_store: "Наш адрес",
    contact_address: "Наманганская область, г. Наманган, сгм Озод, улица Абу Райхона Беруни, дом 2",
    stock_in: "В наличии: {n} шт",
    stock_out: "Нет в наличии (Закончился)",
    stock_cart_empty: "Закончился",

    // Home
    home_search_ph: "Поиск оборудования или расходных материалов...",
    home_banner_title: "Медицинский Центр Medax",
    home_banner_sub: "Широкий ассортимент медицинского оборудования и приборов",
    home_popular: "Популярные товары",
    home_all_cat: "Все категории",
    home_badges_warranty: "Официальная гарантия",
    home_badges_delivery: "Быстрая доставка",
    home_badges_certified: "Сертифицировано",

    // Orders
    my_orders_title: "Мои заказы",
    my_orders_empty: "Заказов пока нет",
    my_orders_total: "Итого",

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
    cart_cash_title: "Оплата при получении",
    cart_cash_desc: "Оплата при самовывозе или доставке наличными / картой.",
    cart_total_label: "Итого к оплате:",
    cart_order_btn: "Подтвердить заказ →",

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

    // Notifications
    notif_title: "Уведомления",
    notif_mark_read: "Отметить прочитанным",
    notif_empty: "Новых уведомлений пока нет",

    // Home Extra
    home_cabinet: "Кабинет 👤",
    home_popular_sub: "Выбор клиник и врачей",
    home_no_products: "Товары пока не загружены",
    home_questions_title: "Есть вопросы?",
    home_questions_sub: "Наши инженеры и специалисты помогут с выбором оборудования.",
    home_work_hours: "Пн-Сб: 09:00 - 18:00",
    trust_delivery: "Быстрая доставка",
    trust_delivery_sub: "По всему Узбекистану",
    trust_warranty: "Официальная гарантия",
    trust_warranty_sub: "Заводской сервис",
    trust_cert: "Сертификаты",
    trust_cert_sub: "100% подлинное",
    trust_eng: "24/7 Инженер",
    trust_eng_sub: "Установка и наладка",
    prod_add_cart: "В корзину",
    prod_added: "Добавлено",
    home_catalog_btn: "В каталог →",

    // Cart Extra
    cart_pay_cash_title: "🏪 Оплата в магазине (Самовывоз)",
    cart_pay_cash_desc: "Оплата после осмотра оборудования (Наличные, карта или перечисление).",
    cart_sec_note: "Все платежи и данные защищены 256-битным шифрованием",
    cart_otp_title: "Код подтверждения из SMS *",
    cart_otp_sub: "введите 6-значный код, отправленный на номер",
    cart_resend_code: "Отправить код повторно",
    cart_get_code_btn: "Получить SMS код и заказать →",
    cart_confirm_btn: "Подтвердить заказ →",

    // Auth & Modal
    auth_success_title: "Успешно! 🎉",
    auth_welcome: "Добро пожаловать",
    btn_continue: "Продолжить →",
    order_success_title: "Ваш заказ принят! 🎉",
    order_success_sub: "Номер заказа: #{code}.\nАдминистратор обработает заказ, и вам поступит SMS уведомление.",
    auth_phone_label: "Номер телефона",
    auth_name_label: "Ваше имя (необязательно)",
    auth_get_code: "Получить SMS код →",
    auth_password_link: "Войти по паролю",
    auth_otp_title: "SMS код (6 цифр)",
    auth_verify_btn: "Подтвердить и войти ✓",
    auth_change_phone: "Изменить номер",
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
    contact_email: "Official Gmail Email",
    contact_store: "Our address",
    contact_address: "Namangan region, Namangan city, Ozod MCC, Abu Rayhon Beruniy street, 2",
    stock_in: "In stock: {n} pcs",
    stock_out: "Out of stock",
    stock_cart_empty: "Out of stock",

    // Home
    home_search_ph: "Search equipment or medical supplies...",
    home_banner_title: "Medax Medical Center",
    home_banner_sub: "Wide range of professional medical equipment and devices",
    home_popular: "Popular Equipment",
    home_all_cat: "All Categories",
    home_badges_warranty: "Official Warranty",
    home_badges_delivery: "Fast Delivery",
    home_badges_certified: "Certified Quality",

    // Orders
    my_orders_title: "My Orders",
    my_orders_empty: "No orders yet",
    my_orders_total: "Total",

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
    cart_cash_title: "Pay on Delivery / Pickup",
    cart_cash_desc: "Pay by cash or card upon receipt or pickup.",
    cart_total_label: "Order Total:",
    cart_order_btn: "Confirm Order →",

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

    // Notifications
    notif_title: "Notifications",
    notif_mark_read: "Mark all as read",
    notif_empty: "No new notifications yet",

    // Home Extra
    home_cabinet: "Account 👤",
    home_popular_sub: "Top choice of clinics & doctors",
    home_no_products: "No products loaded yet",
    home_questions_title: "Have questions?",
    home_questions_sub: "Our certified engineers and specialists will assist you in selecting equipment.",
    home_work_hours: "Mon-Sat: 09:00 - 18:00",
    trust_delivery: "Fast Delivery",
    trust_delivery_sub: "Across Uzbekistan",
    trust_warranty: "Official Warranty",
    trust_warranty_sub: "Factory Service",
    trust_cert: "Certified",
    trust_cert_sub: "100% Original",
    trust_eng: "24/7 Engineers",
    trust_eng_sub: "Installation & Setup",
    prod_add_cart: "Add to cart",
    prod_added: "Added",
    home_catalog_btn: "Catalog →",

    // Cart Extra
    cart_pay_cash_title: "🏪 Pay at Store (Pickup)",
    cart_pay_cash_desc: "Pay after inspecting the equipment (Cash, card or bank transfer).",
    cart_sec_note: "All data and transactions are 256-bit encrypted",
    cart_otp_title: "SMS Verification Code *",
    cart_otp_sub: "enter the 6-digit code sent to",
    cart_resend_code: "Resend Code",
    cart_get_code_btn: "Get SMS Code & Checkout →",
    cart_confirm_btn: "Confirm Order →",

    // Auth & Modal
    auth_success_title: "Success! 🎉",
    auth_welcome: "Welcome",
    btn_continue: "Continue →",
    order_success_title: "Order Received! 🎉",
    order_success_sub: "Order number: #{code}.\nAdmin will review your order and you will receive an SMS confirmation.",
    auth_phone_label: "Phone Number",
    auth_name_label: "Your Name (optional)",
    auth_get_code: "Get SMS Code →",
    auth_password_link: "Log in with password",
    auth_otp_title: "SMS Code (6 digits)",
    auth_verify_btn: "Verify & Log in ✓",
    auth_change_phone: "Change phone number",
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

export function localizeProductName(
  productOrName: { name: string; nameRu?: string | null; nameEn?: string | null } | string | undefined | null,
  lang: Language
): string {
  if (!productOrName) return "";
  if (typeof productOrName === "object") {
    if (lang === "ru" && productOrName.nameRu?.trim()) return productOrName.nameRu.trim();
    if (lang === "en" && productOrName.nameEn?.trim()) return productOrName.nameEn.trim();
    return productOrName.name || "";
  }
  return productOrName;
}

export function localizeProductDescription(
  productOrDesc: { description?: string | null; descriptionRu?: string | null; descriptionEn?: string | null } | string | undefined | null,
  lang: Language
): string {
  if (!productOrDesc) return "";
  if (typeof productOrDesc === "object") {
    if (lang === "ru" && productOrDesc.descriptionRu?.trim()) return productOrDesc.descriptionRu.trim();
    if (lang === "en" && productOrDesc.descriptionEn?.trim()) return productOrDesc.descriptionEn.trim();
    return productOrDesc.description || "";
  }
  return productOrDesc;
}
