import React, { createContext, useContext, useState } from "react";

export type Lang = "uz" | "ru" | "en";

export interface Translations {
  // Navigation & Header
  nav_catalog: string;
  nav_brands: string;
  nav_contact: string;
  nav_cart: string;
  btn_login: string;
  nav_account: string;
  nav_wishlist: string;
  nav_home: string;
  theme_toggle: string;
  theme_light: string;
  theme_dark: string;
  language: string;

  // Topbar
  topbar_city: string;
  topbar_city_val: string;
  topbar_pickup: string;
  topbar_faq: string;
  topbar_my_orders: string;

  // Category Strip
  strip_guaranteed_prices: string;
  strip_new_models: string;
  strip_wheelchairs: string;
  strip_surgery: string;
  strip_furniture: string;
  strip_laboratory: string;
  strip_consumables: string;
  strip_all: string;

  // Search Dropdown & Badges
  search_input_ph: string;
  search_recent: string;
  search_clear: string;
  search_popular: string;
  search_in_stock: string;
  search_guaranteed: string;
  search_ready_pickup: string;
  badge_hit: string;
  badge_new: string;
  official_store: string;

  // Quick Category Tiles
  quick_ventilator_title: string;
  quick_ventilator_sub: string;
  quick_ultrasound_title: string;
  quick_ultrasound_sub: string;
  quick_surgery_title: string;
  quick_surgery_sub: string;
  quick_furniture_title: string;
  quick_furniture_sub: string;

  // Product Meta
  mfd_label: string;
  exp_label: string;

  // Hero Section
  hero_title: string;
  hero_desc: string;
  hero_brands_metric: string;
  hero_equip_metric: string;
  hero_delivery_metric: string;
  search_placeholder: string;
  btn_search: string;
  popular_cats: string;

  // Trust Cards
  trust_1_title: string;
  trust_1_desc: string;
  trust_2_title: string;
  trust_2_desc: string;
  trust_3_title: string;
  trust_3_desc: string;
  trust_4_title: string;
  trust_4_desc: string;

  // Categories Section
  categories_title: string;
  categories_sub: string;
  items_count: string;

  // Products Section
  products_title: string;
  tab_latest: string;
  tab_hits: string;
  btn_details: string;
  btn_order: string;
  in_stock: string;
  view_all_catalog: string;
  price_from: string;
  sum_currency: string;

  // B2B Inquiry Form
  inquiry_title: string;
  inquiry_sub: string;
  inquiry_name: string;
  inquiry_phone: string;
  inquiry_equip: string;
  inquiry_submit: string;
  inquiry_sent_title: string;
  inquiry_sent_desc: string;

  // Brands Section
  brands_title: string;
  brands_sub: string;

  // Footer
  footer_tagline: string;
  footer_catalog: string;
  footer_services: string;
  footer_contacts: string;
  footer_address: string;
  footer_hours: string;
  footer_rights: string;
  how_to_order: string;
  partners: string;
  engineering_service: string;
  installation: string;
  official_warranty: string;

  // Catalog Page
  catalog_title: string;
  filter_categories: string;
  filter_brands: string;
  filter_all: string;
  sort_default: string;
  sort_price_asc: string;
  sort_price_desc: string;
  not_found_products: string;

  // Cart & Checkout
  cart_title: string;
  cart_empty_title: string;
  cart_empty_desc: string;
  cart_go_catalog: string;
  cart_total: string;
  cart_checkout: string;
  cart_name_label: string;
  cart_phone_label: string;
  cart_org_label: string;
  cart_comment_label: string;
  cart_submit_btn: string;
  cart_submitting: string;
  cart_success_title: string;
  cart_success_desc: string;
  cart_order_code: string;

  // Product Details Page
  pd_sku: string;
  pd_brand: string;
  pd_category: string;
  pd_country: string;
  pd_warranty: string;
  pd_delivery: string;
  pd_add_to_cart: string;
  pd_in_cart: string;
  pd_specifications: string;
  pd_description: string;
  pd_back_to_catalog: string;

  // Admin Navigation & Dash
  admin_panel: string;
  dashboard: string;
  orders: string;
  products: string;
  taxonomy: string;
  import_excel: string;
  blocklist: string;
  users: string;
  view_site: string;
  logout: string;
  logged_as: string;

  stat_new_orders: string;
  stat_new_orders_sub: string;
  stat_confirmed: string;
  stat_confirmed_sub: string;
  stat_completed: string;
  stat_completed_sub: string;
  stat_products: string;
  stat_products_sub: string;
  stat_fake_rate: string;
  stat_fake_sub: string;
  stat_blocked: string;
  stat_blocked_sub: string;

  quick_actions: string;
  action_add_product: string;
  action_add_category: string;
  action_view_orders: string;
  action_excel_import: string;
  recent_orders: string;
  no_orders_yet: string;
  system_health: string;
  sys_server: string;
  sys_database: string;
  sys_security: string;
  sys_online: string;
  sys_active: string;
  security_notice: string;

  order_code: string;
  customer: string;
  phone: string;
  status: string;
  date: string;
  actions: string;
  view: string;
  loading: string;
  all: string;
  filter: string;

  st_new: string;
  st_confirmed: string;
  st_done: string;
  st_canceled: string;
  st_fake: string;

  role_admin: string;
  role_manager: string;

  // Contact Page
  contact_page_title: string;
  contact_page_sub: string;
  contact_info_title: string;
  contact_office_title: string;
  contact_phone_title: string;
  contact_email_title: string;
  contact_hours_title: string;
  contact_route_btn: string;
  contact_yandex_btn: string;
  contact_gmail_btn: string;
  contact_form_title: string;
  contact_form_sub: string;
  contact_form_name: string;
  contact_form_email: string;
  contact_form_phone: string;
  contact_form_subject: string;
  contact_form_msg: string;
  contact_form_send_gmail: string;
  contact_form_direct_btn: string;
  contact_copied_toast: string;
  contact_map_badge: string;
  contact_success_title: string;
  contact_success_desc: string;
  contact_send_btn: string;
  contact_send_busy: string;
  contact_via_gmail: string;
  stock_in_count: string;
  stock_out_badge: string;

  // Floating Contact Hub
  float_hub_btn: string;
  float_hub_title: string;
  float_hub_sub: string;
  float_call_btn: string;
  float_call_sub: string;
  float_gmail_btn: string;
  float_gmail_sub: string;
  float_map_btn: string;
  float_map_sub: string;

  // Auth Modal
  auth_login_title: string;
  auth_register_title: string;
  auth_sms_title: string;
  auth_login_sub: string;
  auth_register_sub: string;
  auth_sms_sub: string;
  auth_tab_pwd: string;
  auth_tab_reg: string;
  auth_phone_label: string;
  auth_pwd_label: string;
  auth_forgot_pwd: string;
  auth_pwd_ph: string;
  auth_btn_login: string;
  auth_btn_logging: string;
  auth_sms_login_btn: string;
  auth_open_reg: string;
  auth_reg_hint: string;
  auth_btn_get_sms: string;
  auth_btn_sending: string;
  auth_has_account: string;
  auth_enter_code: string;
  auth_change_phone: string;
  auth_otp_ph: string;
  auth_name_label: string;
  auth_name_ph: string;
  auth_org_label: string;
  auth_org_ph: string;
  auth_new_pwd: string;
  auth_min_chars: string;
  auth_pwd_hint: string;
  auth_confirm_pwd: string;
  auth_confirm_pwd_ph: string;
  auth_btn_create: string;
  auth_resend: string;
  auth_resend_btn: string;
  auth_terms_note: string;
  auth_back_to_pwd: string;
  auth_new_pwd_opt: string;
  auth_new_pwd_opt_ph: string;
  auth_new_pwd_opt_hint: string;
  auth_modal_close: string;

  // Customer Account & Profile
  acc_login_prompt_title: string;
  acc_login_prompt_desc: string;
  acc_login_prompt_btn: string;
  acc_my_orders: string;
  acc_profile_settings: string;
  acc_logout: string;
  acc_logout_confirm: string;
  acc_loading_orders: string;
  acc_no_orders_title: string;
  acc_no_orders_desc: string;
  acc_go_catalog: string;
  acc_order_title: string;
  acc_qty_items: string;
  acc_order_comment: string;
  acc_order_canceled_badge: string;
  acc_order_cancel_reason: string;
  acc_btn_cancel_order: string;
  acc_cancel_prompt: string;
  acc_cancel_reason_ph: string;
  acc_confirm_cancel_btn: string;
  acc_back_btn: string;
  acc_personal_info_title: string;
  acc_personal_info_desc: string;
  acc_name_label: string;
  acc_org_label: string;
  acc_org_ph: string;
  acc_phone_label: string;
  acc_phone_hint: string;
  acc_save_changes_btn: string;
  acc_saving_btn: string;
  acc_profile_saved_ok: string;
  acc_pwd_title: string;
  acc_pwd_desc: string;
  acc_curr_pwd_label: string;
  acc_curr_pwd_ph: string;
  acc_new_pwd_label: string;
  acc_new_pwd_ph: string;
  acc_conf_pwd_label: string;
  acc_conf_pwd_ph: string;
  acc_save_pwd_btn: string;
  acc_pwd_saved_ok: string;
  acc_app_settings_title: string;
  acc_app_settings_desc: string;
  acc_ui_lang_label: string;
  acc_ui_theme_label: string;
  acc_theme_light: string;
  acc_theme_dark: string;
  acc_security_title: string;
  acc_security_desc: string;
  acc_st_new: string;
  acc_st_confirmed: string;
  acc_st_ready: string;
  acc_st_done: string;
  acc_st_canceled: string;
}

export const translations: Record<Lang, Translations> = {
  uz: {
    nav_catalog: "Katalog",
    nav_brands: "Brendlar",
    nav_contact: "Aloqa",
    nav_cart: "Savat",
    btn_login: "Kirish",
    nav_account: "Kabinet",
    nav_wishlist: "Saralangan",
    nav_home: "Asosiy",
    theme_toggle: "Mavzuni almashtirish",
    theme_light: "Yorug' rejim",
    theme_dark: "Tungi rejim",
    language: "Til",

    topbar_city: "Shahar:",
    topbar_city_val: "Namangan",
    topbar_pickup: "Olib ketish punkti",
    topbar_faq: "Savol-javob",
    topbar_my_orders: "Buyurtmalarim",

    strip_guaranteed_prices: "Kafolatli narxlar",
    strip_new_models: "Yangi modellar",
    strip_wheelchairs: "Ortopedik mahsulotlar",
    strip_surgery: "Tibbiy apparaturalar",
    strip_furniture: "Tibbiy jihozlar",
    strip_laboratory: "Laboratoriya reagentlari",
    strip_consumables: "Tibbiy buyumlar",
    strip_all: "Barchasi →",

    search_input_ph: "Mahsulotlar va turkumlar izlash (masalan: UZI, IVL, Jarrohlik)...",
    search_recent: "Yaqinda izlaganlaringiz",
    search_clear: "Tozalash",
    search_popular: "Ommabop uskunalar",
    search_in_stock: "Do'konda bor",
    search_guaranteed: "Kafolatli",
    search_ready_pickup: "Olib ketishga tayyor",
    badge_hit: "Xit",
    badge_new: "Yangi",
    official_store: "Rasmiy do'kon",

    quick_ventilator_title: "Tibbiy buyumlar",
    quick_ventilator_sub: "Shpritslar, qo'lqoplar, bog'lovlar va bir martalik buyumlar",
    quick_ultrasound_title: "Tibbiy apparaturalar",
    quick_ultrasound_sub: "UZI, EKG, IVL ventilyatorlari va bemor monitorlari",
    quick_surgery_title: "Tibbiy jihozlar",
    quick_surgery_sub: "Operatsiya stollari, karavotlar va jarrohlik yoritgichlari",
    quick_furniture_title: "Ortopedik mahsulotlar",
    quick_furniture_sub: "Korsetlar, fiksatorlar, bandajlar va aravachalar",

    mfd_label: "Ishlab chiqarilgan (Mfd)",
    exp_label: "Yaroqlilik muddati (Exp)",

    hero_title: "Xorijiy tibbiy uskunalar katalogi",
    hero_desc: "Yaponiya, Germaniya va AQSh ishlab chiqaruvchilarining tibbiy uskunalari. O'zbekiston bo'ylab to'g'ridan-to'g'ri yetkazib berish, o'rnatish va rasmiy texnik servis xizmati.",
    hero_brands_metric: "ta xorijiy brend",
    hero_equip_metric: "ta uskuna",
    hero_delivery_metric: "1-3 ish kunida yetkazish",
    search_placeholder: "Uskuna nomi, brend yoki model bo'yicha qidirish...",
    btn_search: "Qidirish",
    popular_cats: "Ommabop:",

    trust_1_title: "To'g'ridan-to'g'ri import",
    trust_1_desc: "Zavoddan rasmiy original uskunalar",
    trust_2_title: "Tezkor yetkazish",
    trust_2_desc: "1-3 ish kunida O'zbekiston bo'ylab",
    trust_3_title: "Muhandislik servisi",
    trust_3_desc: "O'rnatish, sozlash va texnik xizmat",
    trust_4_title: "To'liq hujjatlar",
    trust_4_desc: "Pasport, sertifikat va kafolat",

    categories_title: "Toifalar bo'yicha tanlang",
    categories_sub: "Kasalxona va klinikalar uchun yo'nalishlar bo'yicha to'liq uskunalar",
    items_count: "ta uskuna",

    products_title: "Tibbiy uskunalar",
    tab_latest: "Yangi kelganlar",
    tab_hits: "Ommabop uskunalar",
    btn_details: "Batafsil",
    btn_order: "Buyurtma berish",
    in_stock: "Omborda mavjud",
    view_all_catalog: "Barcha uskunalarni ko'rish",
    price_from: "dan",
    sum_currency: "so'm",

    inquiry_title: "Klinikangiz uchun uskuna kerakmi?",
    inquiry_sub: "Mutaxassisimiz 15 daqiqada siz bilan bog'lanib, texnik spetsifikatsiya va narxlar bo'yicha tijoriy taklif tayyorlab beradi.",
    inquiry_name: "Ismingiz yoki mas'ul shaxs",
    inquiry_phone: "Telefon raqamingiz",
    inquiry_equip: "Qaysi uskuna yoki yo'nalish qiziqtirmoqda?",
    inquiry_submit: "Tijoriy taklif olish",
    inquiry_sent_title: "So'rovingiz qabul qilindi!",
    inquiry_sent_desc: "Mutaxassisimiz tez orada siz bilan bog'lanadi.",

    brands_title: "Yetakchi ishlab chiqaruvchi brendlar",
    brands_sub: "Kompaniyamiz faqat xalqaro sifat sertifikatiga ega ishonchli zavodlar bilan hamkorlik qiladi",

    footer_tagline: "Tibbiy uskunalarni import qilish, o'rnatish va rasmiy texnik servis.",
    footer_catalog: "Katalog",
    footer_services: "Xizmatlar",
    footer_contacts: "Aloqa va manzil",
    footer_address: "Namangan viloyati, Namangan sh., Ozod MFY, Abu Rayhon Beruniy ko'chasi, 2-uy",
    footer_hours: "Du - Sha: 09:00 - 18:00",
    footer_rights: "Barcha huquqlar himoyalangan.",
    how_to_order: "Qanday buyurtma beriladi?",
    partners: "Rasmiy hamkorlar",
    engineering_service: "Muhandislik servisi",
    installation: "O'rnatish va sozlash",
    official_warranty: "Rasmiy kafolat",

    catalog_title: "Tibbiy uskunalar katalogi",
    filter_categories: "Toifalar",
    filter_brands: "Brendlar",
    filter_all: "Hammasi",
    sort_default: "Standart tartib",
    sort_price_asc: "Narx: arzonroqdan",
    sort_price_desc: "Narx: qimmatroqdan",
    not_found_products: "Hech qanday mahsulot topilmadi",

    cart_title: "Savat",
    cart_empty_title: "Savatingiz bo'sh",
    cart_empty_desc: "Katalogdan kerakli tibbiy uskunalarni tanlang va buyurtma bering.",
    cart_go_catalog: "Katalogga o'tish",
    cart_total: "Jami hisob:",
    cart_checkout: "Buyurtmani rasmiylashtirish",
    cart_name_label: "Ismingiz yoki mas'ul shaxs",
    cart_phone_label: "Telefon raqam",
    cart_org_label: "Tashkilot / Klinika nomi (ixtiyoriy)",
    cart_comment_label: "Izoh yoki yetkazish manzili",
    cart_submit_btn: "Buyurtmani tasdiqlash",
    cart_submitting: "Yuborilmoqda...",
    cart_success_title: "Buyurtmangiz qabul qilindi!",
    cart_success_desc: "Menejerimiz qisqa vaqt ichida siz bilan bog'lanadi.",
    cart_order_code: "Buyurtma kodi:",

    pd_sku: "Artikul",
    pd_brand: "Ishlab chiqaruvchi",
    pd_category: "Toifa",
    pd_country: "Mamlakat",
    pd_warranty: "Rasmiy kafolat",
    pd_delivery: "Yetkazib berish",
    pd_add_to_cart: "Savatga qo'shish",
    pd_in_cart: "Savatda mavjud",
    pd_specifications: "Texnik xususiyatlar",
    pd_description: "Batafsil tavsif",
    pd_back_to_catalog: "Katalogga qaytish",

    admin_panel: "Boshqaruv paneli",
    dashboard: "Bosh panel",
    orders: "Buyurtmalar",
    products: "Mahsulotlar",
    taxonomy: "Toifalar va brendlar",
    import_excel: "Excel import",
    blocklist: "Bloklanganlar",
    users: "Xodimlar",
    view_site: "Saytni ko'rish",
    logout: "Chiqish",
    logged_as: "Tizimda",

    stat_new_orders: "Yangi buyurtmalar",
    stat_new_orders_sub: "Qo'ng'iroq kutayotgan arizalar",
    stat_confirmed: "Tasdiqlangan",
    stat_confirmed_sub: "Jarayondagi shartnomalar",
    stat_completed: "Bajarilgan",
    stat_completed_sub: "Yetkazilgan va topshirilgan",
    stat_products: "Jami uskunalar",
    stat_products_sub: "Katalogdagi faol modellar",
    stat_fake_rate: "Soxta arizalar ulushi",
    stat_fake_sub: "Oxirgi 30 kunlik ko'rsatkich",
    stat_blocked: "Bloklanganlar",
    stat_blocked_sub: "Spam telefon va IP manzillar",

    quick_actions: "Tezkor amallar",
    action_add_product: "Yangi uskuna qo'shish",
    action_add_category: "Yangi toifa",
    action_view_orders: "Buyurtmalar tahlili",
    action_excel_import: "Excel orqali yuklash",
    recent_orders: "So'nggi buyurtmalar",
    no_orders_yet: "Hozircha buyurtmalar mavjud emas",
    system_health: "Tizim holati",
    sys_server: "Asosiy server",
    sys_database: "PostgreSQL bazasi",
    sys_security: "Spam va xavfsizlik filtri",
    sys_online: "Faol va barqaror",
    sys_active: "Himoya yoqilgan",
    security_notice:
      "Har bir buyurtma SMS orqali tasdiqlangan raqamdan keladi. Soxta deb belgilangan raqam limitdan oshgach avtomatik bloklanadi.",

    order_code: "Kod",
    customer: "Mijoz",
    phone: "Telefon",
    status: "Holati",
    date: "Sana",
    actions: "Amallar",
    view: "Ko'rish",
    loading: "Yuklanmoqda...",
    all: "Hammasi",
    filter: "Filtr",

    st_new: "Yangi",
    st_confirmed: "Tasdiqlangan",
    st_done: "Bajarildi",
    st_canceled: "Bekor qilingan",
    st_fake: "Soxta",

    role_admin: "Administrator",
    role_manager: "Menejer",

    contact_page_title: "Biz bilan bog'lanish va manzilimiz",
    contact_page_sub: "Namangan shahridagi bosh ofisimiz, ko'rgazma zali (show-room) hamda xalqaro buyurtmalar bo'yicha to'g'ridan-to'g'ri aloqa.",
    contact_info_title: "Aloqa rekvizitlari",
    contact_office_title: "Bosh ofis va ko'rgazma zali",
    contact_phone_title: "Telefon va Call-markaz",
    contact_email_title: "Rasmiy elektron pochta (Gmail)",
    contact_hours_title: "Ish vaqti tartibi",
    contact_route_btn: "Google Xaritada ochish / Marshrut",
    contact_yandex_btn: "Yandex Xaritada ko'rish",
    contact_gmail_btn: "Gmail orqali xat yozish",
    contact_form_title: "Xabar yoki so'rov yuborish",
    contact_form_sub: "Quyidagi formani to'ldirsangiz, xabaringiz to'g'ridan-to'g'ri Gmail orqali rasmiy pochta manzilimizga jo'natiladi.",
    contact_form_name: "Ism sharifingiz / Mas'ul shaxs",
    contact_form_email: "Sizning elektron pochtangiz",
    contact_form_phone: "Telefon raqamingiz",
    contact_form_subject: "Xat mavzusi",
    contact_form_msg: "Xabaringiz matni yoki kerakli uskunalar ro'yxati",
    contact_form_send_gmail: "Gmail orqali xat yuborish",
    contact_form_direct_btn: "Pochta manzilini nusxalash",
    contact_copied_toast: "Email nusxalandi!",
    contact_map_badge: "Interaktiv Google Xaritasi",
    contact_success_title: "Murojaatingiz muvaffaqiyatli qabul qilindi! ✓",
    contact_success_desc: "Xabaringiz rasmiy pochtamizga (medaxuz@gmail.com) yuborildi. Menejerimiz tez orada bog'lanadi.",
    contact_send_btn: "Murojaatni yuborish ✓",
    contact_send_busy: "Yuborilmoqda…",
    contact_via_gmail: "Gmail orqali",
    stock_in_count: "Omborda: {n} dona mavjud",
    stock_out_badge: "Omborda qolmagan (Tugagan)",

    float_hub_btn: "Tezkor aloqa",
    float_hub_title: "Medax bilan bog'lanish",
    float_hub_sub: "15 daqiqada tezkor muhandislik javobi",
    float_call_btn: "To'g'ridan-to'g'ri qo'ng'iroq",
    float_call_sub: "+998 91 186 66 61",
    float_gmail_btn: "Gmail orqali xat yozish",
    float_gmail_sub: "medaxuz@gmail.com",
    float_map_btn: "Xaritadan manzilni ko'rish",
    float_map_sub: "Namangan, Beruniy ko'chasi, 2-uy",

    // Auth Modal
    auth_login_title: "Shaxsiy kabinetga kirish",
    auth_register_title: "Yangi akkaunt ochish",
    auth_sms_title: "SMS orqali kirish",
    auth_login_sub: "Telefon raqamingiz va parolingiz orqali 1 soniyada kiring",
    auth_register_sub: "Telefon raqamni SMS bilan tasdiqlab, kirish uchun parol belgilang",
    auth_sms_sub: "Telefon raqamingizga kelgan 6 xonali kod orqali kiring",
    auth_tab_pwd: "Parol bilan kirish",
    auth_tab_reg: "Ro'yxatdan o'tish",
    auth_phone_label: "Telefon raqamingiz",
    auth_pwd_label: "Parolingiz",
    auth_forgot_pwd: "Parolni unutdingizmi?",
    auth_pwd_ph: "Parolingizni kiriting",
    auth_btn_login: "Kabinetga kirish →",
    auth_btn_logging: "Kirilmoqda…",
    auth_sms_login_btn: "SMS kod orqali kirish",
    auth_open_reg: "Yangi akkaunt ochish →",
    auth_reg_hint: "Ushbu raqamga bir martalik 6 xonali tasdiqlash kodi yuboriladi",
    auth_btn_get_sms: "SMS kodni olish →",
    auth_btn_sending: "Yuborilmoqda…",
    auth_has_account: "Allaqachon akkauntingiz bormi?",
    auth_enter_code: "SMS kod:",
    auth_change_phone: "Raqamni o'zgartirish",
    auth_otp_ph: "6 xonali kod (masalan: 123456)",
    auth_name_label: "Ism-familiyangiz",
    auth_name_ph: "Masalan: Dr. Sardor",
    auth_org_label: "Klinika / Tashkilot (ixtiyoriy)",
    auth_org_ph: "Klinika yoki MCHJ",
    auth_new_pwd: "Yangi parol belgilang",
    auth_min_chars: "Kamida 6 ta belgi",
    auth_pwd_hint: "Keyingi safar tizimga kirish uchun ushbu paroldan foydalanasiz",
    auth_confirm_pwd: "Parolni qayta tering",
    auth_confirm_pwd_ph: "Parolni tasdiqlang",
    auth_btn_create: "Akkauntni yaratish va Kirish ✓",
    auth_resend: "Qayta yuborish:",
    auth_resend_btn: "Yangi kod yuborish",
    auth_terms_note: "Tizimga kirish orqali siz Medax xizmat ko'rsatish shartlariga rozilik bildirasiz.",
    auth_back_to_pwd: "← Parol orqali kirishga qaytish",
    auth_new_pwd_opt: "Yangi parol (ixtiyoriy)",
    auth_new_pwd_opt_ph: "Parolni yangilamoqchi bo'lsangiz yozing",
    auth_new_pwd_opt_hint: "Agar parol kiritsangiz, kelgusida parol orqali kirishingiz mumkin bo'ladi",
    auth_modal_close: "Yopish",

    acc_login_prompt_title: "Shaxsiy kabinetga xush kelibsiz",
    acc_login_prompt_desc: "Buyurtmalaringiz tarixini ko'rish va ma'lumotlaringizni boshqarish uchun tizimga kiring.",
    acc_login_prompt_btn: "Kirish yoki Ro'yxatdan o'tish →",
    acc_my_orders: "Buyurtmalarim",
    acc_profile_settings: "Profil sozlamalari",
    acc_logout: "Hisobdan chiqish",
    acc_logout_confirm: "Haqiqatan ham hisobingizdan chiqmoqchimisiz?",
    acc_loading_orders: "Buyurtmalar yuklanmoqda…",
    acc_no_orders_title: "Hozircha buyurtmalaringiz yo'q",
    acc_no_orders_desc: "Katalogdan kerakli uskunalarni tanlab buyurtma ro'yxatiga qo'shing.",
    acc_go_catalog: "Katalogga o'tish →",
    acc_order_title: "Buyurtma",
    acc_qty_items: "dona",
    acc_order_comment: "Ma'lumot",
    acc_order_canceled_badge: "Buyurtma bekor qilingan",
    acc_order_cancel_reason: "Sababi",
    acc_btn_cancel_order: "Buyurtmani bekor qilish",
    acc_cancel_prompt: "Bekor qilish sababini yozing:",
    acc_cancel_reason_ph: "Masalan: Boshqa modelni tanlamoqchiman...",
    acc_confirm_cancel_btn: "Bekor qilishni tasdiqlash",
    acc_back_btn: "Orqaga",
    acc_personal_info_title: "Klinika va shaxsiy ma'lumotlar",
    acc_personal_info_desc: "Ushbu ma'lumotlar hisob-fakturalar va kafolat hujjatlarida avtomatik aks etadi.",
    acc_name_label: "Ism-familiyangiz",
    acc_org_label: "Klinika / Tashkilot nomi",
    acc_org_ph: "Masalan: Shifo Medikal Servis MCHJ",
    acc_phone_label: "Telefon raqam (SMS bilan tasdiqlangan)",
    acc_phone_hint: "Telefon raqam hisobingizning asosiy xavfsiz kalitidir.",
    acc_save_changes_btn: "O'zgarishlarni saqlash ✓",
    acc_saving_btn: "Saqlanmoqda…",
    acc_profile_saved_ok: "Ma'lumotlar muvaffaqiyatli saqlandi!",
    acc_pwd_title: "Kirish parolini o'rnatish / yangilash",
    acc_pwd_desc: "Ushbu parol orqali SMS kutmasdan telefon raqam va parol yordamida tezkor kira olasiz.",
    acc_curr_pwd_label: "Joriy parolingiz",
    acc_curr_pwd_ph: "Amaldagi parolingiz",
    acc_new_pwd_label: "Yangi parol",
    acc_new_pwd_ph: "Kamida 6 ta belgi",
    acc_conf_pwd_label: "Yangi parolni tasdiqlang",
    acc_conf_pwd_ph: "Parolni qayta tering",
    acc_save_pwd_btn: "Parolni saqlash ✓",
    acc_pwd_saved_ok: "Parol muvaffaqiyatli saqlandi!",
    acc_app_settings_title: "Ilova sozlamalari",
    acc_app_settings_desc: "Interfeys tili va dizayn mavzusini o'zingizga moslashtiring.",
    acc_ui_lang_label: "Interfeys tili:",
    acc_ui_theme_label: "Ilova mavzusi (Dizayn):",
    acc_theme_light: "☀️ Kunduzgi (Yorug')",
    acc_theme_dark: "🌙 Tungi (Qorong'i)",
    acc_security_title: "Hisob xavfsizligi va Seans",
    acc_security_desc: "Ushbu qurilmadagi shaxsiy kabinet seansini yakunlash uchun hisobdan chiqish tugmasini bosing.",
    acc_st_new: "Yangi (Kutilmoqda)",
    acc_st_confirmed: "Tasdiqlangan (Tayyorlanmoqda)",
    acc_st_ready: "Do'kondan olib ketishga tayyor ✓",
    acc_st_done: "Qabul qilingan (Olib ketildi) ✓",
    acc_st_canceled: "Bekor qilingan",
  },
  ru: {
    nav_catalog: "Каталог",
    nav_brands: "Бренды",
    nav_contact: "Контакты",
    nav_cart: "Корзина",
    btn_login: "Войти",
    nav_account: "Кабинет",
    nav_wishlist: "Избранное",
    nav_home: "Главная",
    theme_toggle: "Переключить тему",
    theme_light: "Светлая тема",
    theme_dark: "Тёмная тема",
    language: "Язык",

    topbar_city: "Город:",
    topbar_city_val: "Наманган",
    topbar_pickup: "Пункт выдачи",
    topbar_faq: "Вопрос-ответ",
    topbar_my_orders: "Мои заказы",

    strip_guaranteed_prices: "Гарантированные цены",
    strip_new_models: "Новые модели",
    strip_wheelchairs: "Ортопедическая продукция",
    strip_surgery: "Медицинская аппаратура",
    strip_furniture: "Медицинское оборудование",
    strip_laboratory: "Лабораторные реагенты",
    strip_consumables: "Медицинские изделия",
    strip_all: "Все →",

    search_input_ph: "Искать товары и категории (например: УЗИ, ИВЛ, Хирургия)...",
    search_recent: "Недавние поиски",
    search_clear: "Очистить",
    search_popular: "Популярное оборудование",
    search_in_stock: "В наличии",
    search_guaranteed: "С гарантией",
    search_ready_pickup: "Готово к выдаче",
    badge_hit: "Хит",
    badge_new: "Новинка",
    official_store: "Официальный магазин",

    quick_ventilator_title: "Медицинские изделия",
    quick_ventilator_sub: "Шприцы, перчатки, перевязочные средства и расходники",
    quick_ultrasound_title: "Медицинская аппаратура",
    quick_ultrasound_sub: "УЗИ, ЭКГ, аппараты ИВЛ и мониторы пациента",
    quick_surgery_title: "Медицинское оборудование",
    quick_surgery_sub: "Операционные столы, кровати и бестеневые светильники",
    quick_furniture_title: "Ортопедическая продукция",
    quick_furniture_sub: "Корсеты, фиксаторы, бандажи и инвалидные коляски",

    mfd_label: "Дата производства (Mfd)",
    exp_label: "Срок годности (Exp)",

    hero_title: "Каталог зарубежного медицинского оборудования",
    hero_desc: "Медицинское оборудование ведущих производителей Японии, Германии и США. Прямые поставки по всему Узбекистану, профессиональный монтаж и официальный сервис.",
    hero_brands_metric: "зарубежных брендов",
    hero_equip_metric: "ед. оборудования",
    hero_delivery_metric: "Доставка за 1-3 рабочих дня",
    search_placeholder: "Поиск по названию оборудования, бренду или модели...",
    btn_search: "Найти",
    popular_cats: "Популярные:",

    trust_1_title: "Прямой импорт",
    trust_1_desc: "Официальное оригинальное оборудование с завода",
    trust_2_title: "Быстрая доставка",
    trust_2_desc: "За 1-3 рабочих дня по всему Узбекистану",
    trust_3_title: "Инженерный сервис",
    trust_3_desc: "Монтаж, калибровка и сервисное обслуживание",
    trust_4_title: "Полный пакет документов",
    trust_4_desc: "Технический паспорт, сертификаты и гарантия",

    categories_title: "Выберите по категориям",
    categories_sub: "Полное оснащение клиник и больниц по медицинским направлениям",
    items_count: "ед. оборудования",

    products_title: "Медицинское оборудование",
    tab_latest: "Новые поступления",
    tab_hits: "Популярные",
    btn_details: "Подробнее",
    btn_order: "Заказать",
    in_stock: "В наличии",
    view_all_catalog: "Смотреть весь каталог",
    price_from: "от",
    sum_currency: "сум",

    inquiry_title: "Нужно оборудование для вашей клиники?",
    inquiry_sub: "Наш специалист свяжется с вами в течение 15 минут и подготовит персональное коммерческое предложение с технической спецификацией.",
    inquiry_name: "Ваше имя или контактное лицо",
    inquiry_phone: "Номер телефона",
    inquiry_equip: "Какое оборудование вас интересует?",
    inquiry_submit: "Получить КП",
    inquiry_sent_title: "Заявка успешно принята!",
    inquiry_sent_desc: "Наш специалист свяжется с вами в ближайшее время.",

    brands_title: "Ведущие мировые бренды",
    brands_sub: "Мы сотрудничаем напрямую только с заводами, имеющими международные сертификаты ISO и CE",

    footer_tagline: "Импорт медицинского оборудования, профессиональный монтаж и официальный сервис.",
    footer_catalog: "Каталог",
    footer_services: "Услуги",
    footer_contacts: "Контакты и адрес",
    footer_address: "Наманганская область, г. Наманган, сгм Озод, улица Абу Райхона Беруни, дом 2",
    footer_hours: "Пн - Сб: 09:00 - 18:00",
    footer_rights: "Все права защищены.",
    how_to_order: "Как сделать заказ?",
    partners: "Официальные партнеры",
    engineering_service: "Инженерный сервис",
    installation: "Установка и настройка",
    official_warranty: "Официальная гарантия",

    catalog_title: "Каталог медицинского оборудования",
    filter_categories: "Категории",
    filter_brands: "Бренды",
    filter_all: "Все",
    sort_default: "По умолчанию",
    sort_price_asc: "Сначала дешевле",
    sort_price_desc: "Сначала дороже",
    not_found_products: "Товары не найдены",

    cart_title: "Корзина",
    cart_empty_title: "Ваша корзина пуста",
    cart_empty_desc: "Выберите необходимое оборудование в каталоге и оформите заказ.",
    cart_go_catalog: "Перейти в каталог",
    cart_total: "Итого:",
    cart_checkout: "Оформить заказ",
    cart_name_label: "Ваше имя или контактное лицо",
    cart_phone_label: "Номер телефона",
    cart_org_label: "Название организации / клиники (необязательно)",
    cart_comment_label: "Комментарий или адрес доставки",
    cart_submit_btn: "Подтвердить заказ",
    cart_submitting: "Отправка...",
    cart_success_title: "Заказ успешно принят!",
    cart_success_desc: "Наш менеджер свяжется с вами в ближайшее время.",
    cart_order_code: "Код заказа:",

    pd_sku: "Артикул",
    pd_brand: "Производитель",
    pd_category: "Категория",
    pd_country: "Страна",
    pd_warranty: "Гарантия",
    pd_delivery: "Доставка",
    pd_add_to_cart: "Добавить в корзину",
    pd_in_cart: "В корзине",
    pd_specifications: "Технические характеристики",
    pd_description: "Описание",
    pd_back_to_catalog: "Назад в каталог",

    admin_panel: "Панель управления",
    dashboard: "Дашборд",
    orders: "Заказы",
    products: "Товары",
    taxonomy: "Категории и бренды",
    import_excel: "Импорт из Excel",
    blocklist: "Черный список",
    users: "Сотрудники",
    view_site: "Перейти на сайт",
    logout: "Выйти",
    logged_as: "Вы вошли как",

    stat_new_orders: "Новые заявки",
    stat_new_orders_sub: "Ожидают обработки менеджером",
    stat_confirmed: "Подтвержденные",
    stat_confirmed_sub: "В процессе оформления",
    stat_completed: "Выполненные",
    stat_completed_sub: "Доставлены и переданы",
    stat_products: "Всего оборудования",
    stat_products_sub: "Активные позиции каталога",
    stat_fake_rate: "Доля ложных заявок",
    stat_fake_sub: "Показатель за последние 30 дней",
    stat_blocked: "Заблокировано",
    stat_blocked_sub: "Спам телефоны и IP адреса",

    quick_actions: "Быстрые действия",
    action_add_product: "Добавить товар",
    action_add_category: "Новая категория",
    action_view_orders: "Просмотр заказов",
    action_excel_import: "Загрузить из Excel",
    recent_orders: "Последние заказы",
    no_orders_yet: "Заказов пока нет",
    system_health: "Состояние системы",
    sys_server: "Основной сервер",
    sys_database: "База данных PostgreSQL",
    sys_security: "Антиспам и безопасность",
    sys_online: "В сети и стабильно",
    sys_active: "Защита активна",
    security_notice:
      "Каждый заказ подтверждается SMS-кодом. Номера с ложными заявками блокируются автоматически.",

    order_code: "Код",
    customer: "Клиент",
    phone: "Телефон",
    status: "Статус",
    date: "Дата",
    actions: "Действия",
    view: "Смотреть",
    loading: "Загрузка...",
    all: "Все",
    filter: "Фильтр",

    st_new: "Новый",
    st_confirmed: "Подтвержден",
    st_done: "Выполнен",
    st_canceled: "Отменен",
    st_fake: "Ложный",

    role_admin: "Администратор",
    role_manager: "Менеджер",

    contact_page_title: "Связаться с нами и наш адрес",
    contact_page_sub: "Главный офис в городе Наманган, выставочный зал (шоурум) и прямая связь по международным поставкам медоборудования.",
    contact_info_title: "Контактная информация",
    contact_office_title: "Главный офис и шоурум",
    contact_phone_title: "Телефон и колл-центр",
    contact_email_title: "Официальная почта (Gmail)",
    contact_hours_title: "Режим работы",
    contact_route_btn: "Открыть в Google Maps / Маршрут",
    contact_yandex_btn: "Смотреть на Яндекс Карте",
    contact_gmail_btn: "Написать через Gmail",
    contact_form_title: "Отправить сообщение или запрос",
    contact_form_sub: "Заполните форму ниже, и ваше сообщение будет мгновенно направлено на наш официальный Gmail.",
    contact_form_name: "Ваше имя / ответственное лицо",
    contact_form_email: "Ваш Email",
    contact_form_phone: "Номер телефона",
    contact_form_subject: "Тема обращения",
    contact_form_msg: "Текст обращения или требуемое оборудование",
    contact_form_send_gmail: "Отправить через Gmail",
    contact_form_direct_btn: "Скопировать Email",
    contact_copied_toast: "Email скопирован!",
    contact_map_badge: "Интерактивная карта Google",
    contact_success_title: "Ваше обращение успешно принято! ✓",
    contact_success_desc: "Сообщение отправлено на нашу официальную почту (medaxuz@gmail.com). Менеджер свяжется с вами в ближайшее время.",
    contact_send_btn: "Отправить обращение ✓",
    contact_send_busy: "Отправка…",
    contact_via_gmail: "Через Gmail",
    stock_in_count: "В наличии: {n} шт",
    stock_out_badge: "Нет в наличии (Закончился)",

    float_hub_btn: "Быстрая связь",
    float_hub_title: "Связаться с Medax",
    float_hub_sub: "Ответ инженера за 15 минут",
    float_call_btn: "Прямой звонок",
    float_call_sub: "+998 91 186 66 61",
    float_gmail_btn: "Написать в Gmail",
    float_gmail_sub: "medaxuz@gmail.com",
    float_map_btn: "Смотреть адрес на карте",
    float_map_sub: "Наманган, ул. Беруни, 2",

    // Auth Modal
    auth_login_title: "Вход в личный кабинет",
    auth_register_title: "Регистрация аккаунта",
    auth_sms_title: "Вход через SMS",
    auth_login_sub: "Войдите по номеру телефона и паролю за 1 секунду",
    auth_register_sub: "Подтвердите номер через SMS и установите пароль для входа",
    auth_sms_sub: "Войдите по 6-значному коду, отправленному на ваш телефон",
    auth_tab_pwd: "Вход по паролю",
    auth_tab_reg: "Регистрация",
    auth_phone_label: "Номер телефона",
    auth_pwd_label: "Ваш пароль",
    auth_forgot_pwd: "Забыли пароль?",
    auth_pwd_ph: "Введите ваш пароль",
    auth_btn_login: "Войти в кабинет →",
    auth_btn_logging: "Вход…",
    auth_sms_login_btn: "Вход по SMS коду",
    auth_open_reg: "Создать аккаунт →",
    auth_reg_hint: "На этот номер будет отправлен 6-значный код подтверждения",
    auth_btn_get_sms: "Получить SMS-код →",
    auth_btn_sending: "Отправка…",
    auth_has_account: "Уже есть аккаунт?",
    auth_enter_code: "SMS код:",
    auth_change_phone: "Изменить номер",
    auth_otp_ph: "6-значный код (например: 123456)",
    auth_name_label: "Имя и фамилия",
    auth_name_ph: "Например: Доктор Сардор",
    auth_org_label: "Клиника / Организация (необязательно)",
    auth_org_ph: "Клиника или ООО",
    auth_new_pwd: "Установите новый пароль",
    auth_min_chars: "Минимум 6 символов",
    auth_pwd_hint: "В следующий раз вы будете использовать этот пароль для входа",
    auth_confirm_pwd: "Повторите пароль",
    auth_confirm_pwd_ph: "Подтвердите пароль",
    auth_btn_create: "Создать аккаунт и Войти ✓",
    auth_resend: "Отправить повторно через:",
    auth_resend_btn: "Отправить новый код",
    auth_terms_note: "Входя в систему, вы соглашаетесь с условиями обслуживания Medax.",
    auth_back_to_pwd: "← Вернуться ко входу по паролю",
    auth_new_pwd_opt: "Новый пароль (необязательно)",
    auth_new_pwd_opt_ph: "Введите, если хотите обновить пароль",
    auth_new_pwd_opt_hint: "Если вы укажете пароль, в будущем сможете входить по нему",
    auth_modal_close: "Закрыть",

    acc_login_prompt_title: "Добро пожаловать в личный кабинет",
    acc_login_prompt_desc: "Войдите в систему, чтобы просматривать историю заказов и управлять данными.",
    acc_login_prompt_btn: "Войти или Зарегистрироваться →",
    acc_my_orders: "Мои заказы",
    acc_profile_settings: "Настройки профиля",
    acc_logout: "Выйти из аккаунта",
    acc_logout_confirm: "Вы действительно хотите выйти из своего аккаунта?",
    acc_loading_orders: "Загрузка заказов…",
    acc_no_orders_title: "У вас пока нет заказов",
    acc_no_orders_desc: "Выберите необходимое оборудование в каталоге и оформите заказ.",
    acc_go_catalog: "Перейти в каталог →",
    acc_order_title: "Заказ",
    acc_qty_items: "шт.",
    acc_order_comment: "Примечание",
    acc_order_canceled_badge: "Заказ отменен",
    acc_order_cancel_reason: "Причина",
    acc_btn_cancel_order: "Отменить заказ",
    acc_cancel_prompt: "Укажите причину отмены:",
    acc_cancel_reason_ph: "Например: хочу выбрать другую модель...",
    acc_confirm_cancel_btn: "Подтвердить отмену",
    acc_back_btn: "Назад",
    acc_personal_info_title: "Данные клиники и профиля",
    acc_personal_info_desc: "Эти данные автоматически указываются в счетах-фактурах и гарантийных документах.",
    acc_name_label: "Ваше имя и фамилия",
    acc_org_label: "Название клиники / организации",
    acc_org_ph: "Например: ООО Shifo Medikal Servis",
    acc_phone_label: "Номер телефона (подтвержден по SMS)",
    acc_phone_hint: "Номер телефона является основным ключом безопасности вашего аккаунта.",
    acc_save_changes_btn: "Сохранить изменения ✓",
    acc_saving_btn: "Сохранение…",
    acc_profile_saved_ok: "Данные успешно сохранены!",
    acc_pwd_title: "Установка / смена пароля",
    acc_pwd_desc: "С паролем вы сможете входить мгновенно без ожидания SMS-кода.",
    acc_curr_pwd_label: "Текущий пароль",
    acc_curr_pwd_ph: "Действующий пароль",
    acc_new_pwd_label: "Новый пароль",
    acc_new_pwd_ph: "Не менее 6 символов",
    acc_conf_pwd_label: "Подтвердите новый пароль",
    acc_conf_pwd_ph: "Повторите пароль",
    acc_save_pwd_btn: "Сохранить пароль ✓",
    acc_pwd_saved_ok: "Пароль успешно сохранен!",
    acc_app_settings_title: "Настройки приложения",
    acc_app_settings_desc: "Настройте язык интерфейса и тему оформления под себя.",
    acc_ui_lang_label: "Язык интерфейса:",
    acc_ui_theme_label: "Тема оформления (Дизайн):",
    acc_theme_light: "☀️ Светлая",
    acc_theme_dark: "🌙 Темная",
    acc_security_title: "Безопасность аккаунта и сеанс",
    acc_security_desc: "Нажмите кнопку выхода, чтобы завершить текущий сеанс на этом устройстве.",
    acc_st_new: "Новый (В обработке)",
    acc_st_confirmed: "Подтвержден (Готовится)",
    acc_st_ready: "Готов к выдаче в магазине ✓",
    acc_st_done: "Получен (Выдан) ✓",
    acc_st_canceled: "Отменен",
  },
  en: {
    nav_catalog: "Catalog",
    nav_brands: "Brands",
    nav_contact: "Contact",
    nav_cart: "Cart",
    btn_login: "Sign In",
    nav_account: "Account",
    nav_wishlist: "Favorites",
    nav_home: "Home",
    theme_toggle: "Toggle Theme",
    theme_light: "Light Mode",
    theme_dark: "Dark Mode",
    language: "Language",

    topbar_city: "City:",
    topbar_city_val: "Namangan",
    topbar_pickup: "Pickup Point",
    topbar_faq: "FAQ",
    topbar_my_orders: "My Orders",

    strip_guaranteed_prices: "Guaranteed Prices",
    strip_new_models: "New Models",
    strip_wheelchairs: "Orthopedic Products",
    strip_surgery: "Medical Apparatus",
    strip_furniture: "Medical Equipment",
    strip_laboratory: "Laboratory Reagents",
    strip_consumables: "Medical Supplies",
    strip_all: "All →",

    search_input_ph: "Search products & categories (e.g., Ultrasound, Ventilator, Surgery)...",
    search_recent: "Recent Searches",
    search_clear: "Clear",
    search_popular: "Popular Equipment",
    search_in_stock: "In Stock",
    search_guaranteed: "Warranty",
    search_ready_pickup: "Ready for Pickup",
    badge_hit: "Hit",
    badge_new: "New",
    official_store: "Official Store",

    quick_ventilator_title: "Medical Supplies",
    quick_ventilator_sub: "Syringes, gloves, dressings, and disposable items",
    quick_ultrasound_title: "Medical Apparatus",
    quick_ultrasound_sub: "Ultrasound, ECG, ventilators, and patient monitors",
    quick_surgery_title: "Medical Equipment",
    quick_surgery_sub: "Operating tables, beds, and surgical lights",
    quick_furniture_title: "Orthopedic Products",
    quick_furniture_sub: "Corsets, braces, supports, and wheelchairs",

    mfd_label: "Manufacture Date (Mfd)",
    exp_label: "Expiry Date (Exp)",

    hero_title: "Foreign Medical Equipment Catalog",
    hero_desc: "Medical equipment from top manufacturers in Japan, Germany and the USA. Direct delivery across Uzbekistan, professional installation and official service.",
    hero_brands_metric: "foreign brands",
    hero_equip_metric: "equipment units",
    hero_delivery_metric: "Delivery in 1-3 business days",
    search_placeholder: "Search by equipment name, brand or model...",
    btn_search: "Search",
    popular_cats: "Popular:",

    trust_1_title: "Direct Import",
    trust_1_desc: "Official authentic factory equipment",
    trust_2_title: "Fast Delivery",
    trust_2_desc: "1-3 business days across Uzbekistan",
    trust_3_title: "Engineering Service",
    trust_3_desc: "Installation, calibration and technical maintenance",
    trust_4_title: "Full Documentation",
    trust_4_desc: "Passport, certificates and warranty",

    categories_title: "Browse by Category",
    categories_sub: "Comprehensive equipment across medical specialties for hospitals and clinics",
    items_count: "items",

    products_title: "Medical Equipment",
    tab_latest: "New Arrivals",
    tab_hits: "Most Popular",
    btn_details: "Details",
    btn_order: "Order",
    in_stock: "In Stock",
    view_all_catalog: "View full catalog",
    price_from: "from",
    sum_currency: "UZS",

    inquiry_title: "Need equipment for your clinic?",
    inquiry_sub: "Our specialist will contact you within 15 minutes and prepare a tailored commercial offer with technical specifications.",
    inquiry_name: "Your name or contact person",
    inquiry_phone: "Phone number",
    inquiry_equip: "What equipment are you interested in?",
    inquiry_submit: "Get Commercial Offer",
    inquiry_sent_title: "Request received!",
    inquiry_sent_desc: "Our specialist will reach out to you shortly.",

    brands_title: "Leading Global Brands",
    brands_sub: "We partner directly with certified international factories holding ISO and CE standards",

    footer_tagline: "Medical equipment import, professional installation and official technical service.",
    footer_catalog: "Catalog",
    footer_services: "Services",
    footer_contacts: "Contacts & Address",
    footer_address: "Namangan region, Namangan city, Ozod MCC, Abu Rayhon Beruniy street, 2",
    footer_hours: "Mon - Sat: 09:00 - 18:00",
    footer_rights: "All rights reserved.",
    how_to_order: "How to order?",
    partners: "Official partners",
    engineering_service: "Engineering service",
    installation: "Installation & Setup",
    official_warranty: "Official warranty",

    catalog_title: "Medical Equipment Catalog",
    filter_categories: "Categories",
    filter_brands: "Brands",
    filter_all: "All",
    sort_default: "Default",
    sort_price_asc: "Price: Low to High",
    sort_price_desc: "Price: High to Low",
    not_found_products: "No products found",

    cart_title: "Shopping Cart",
    cart_empty_title: "Your cart is empty",
    cart_empty_desc: "Select the required medical equipment from the catalog and place your order.",
    cart_go_catalog: "Go to Catalog",
    cart_total: "Total:",
    cart_checkout: "Checkout",
    cart_name_label: "Your name or contact person",
    cart_phone_label: "Phone number",
    cart_org_label: "Organization / Clinic name (optional)",
    cart_comment_label: "Notes or delivery address",
    cart_submit_btn: "Submit Order",
    cart_submitting: "Submitting...",
    cart_success_title: "Order placed successfully!",
    cart_success_desc: "Our manager will contact you shortly.",
    cart_order_code: "Order code:",

    pd_sku: "SKU",
    pd_brand: "Manufacturer",
    pd_category: "Category",
    pd_country: "Country",
    pd_warranty: "Warranty",
    pd_delivery: "Delivery",
    pd_add_to_cart: "Add to Cart",
    pd_in_cart: "In Cart",
    pd_specifications: "Technical Specifications",
    pd_description: "Description",
    pd_back_to_catalog: "Back to catalog",

    admin_panel: "Admin Panel",
    dashboard: "Dashboard",
    orders: "Orders",
    products: "Products",
    taxonomy: "Categories & Brands",
    import_excel: "Excel Import",
    blocklist: "Blocklist",
    users: "Staff",
    view_site: "View Storefront",
    logout: "Log Out",
    logged_as: "Signed in as",

    stat_new_orders: "New Orders",
    stat_new_orders_sub: "Awaiting manager call",
    stat_confirmed: "Confirmed",
    stat_confirmed_sub: "Under processing",
    stat_completed: "Completed",
    stat_completed_sub: "Delivered and signed",
    stat_products: "Total Equipment",
    stat_products_sub: "Active catalog items",
    stat_fake_rate: "Spam Rate",
    stat_fake_sub: "Last 30 days metric",
    stat_blocked: "Blocked",
    stat_blocked_sub: "Spam phones and IP addresses",

    quick_actions: "Quick Actions",
    action_add_product: "Add Equipment",
    action_add_category: "Add Category",
    action_view_orders: "Review Orders",
    action_excel_import: "Import from Excel",
    recent_orders: "Recent Orders",
    no_orders_yet: "No orders yet",
    system_health: "System Health",
    sys_server: "Main REST API Server",
    sys_database: "PostgreSQL Database",
    sys_security: "Spam & SMS Shield",
    sys_online: "Online & Healthy",
    sys_active: "Protection active",
    security_notice:
      "Every order requires SMS OTP verification. Repeat spam numbers are automatically blocked.",

    order_code: "Code",
    customer: "Customer",
    phone: "Phone",
    status: "Status",
    date: "Date",
    actions: "Actions",
    view: "View",
    loading: "Loading...",
    all: "All",
    filter: "Filter",

    st_new: "New",
    st_confirmed: "Confirmed",
    st_done: "Done",
    st_canceled: "Canceled",
    st_fake: "Fake",

    role_admin: "Administrator",
    role_manager: "Manager",

    contact_page_title: "Contact Us & Location",
    contact_page_sub: "Headquarters and showroom in Namangan, direct contact for international medical equipment supply.",
    contact_info_title: "Contact Details",
    contact_office_title: "Headquarters & Showroom",
    contact_phone_title: "Phone & Call Center",
    contact_email_title: "Official Email (Gmail)",
    contact_hours_title: "Business Hours",
    contact_route_btn: "Open in Google Maps / Directions",
    contact_yandex_btn: "View on Yandex Maps",
    contact_gmail_btn: "Send Email via Gmail",
    contact_form_title: "Send a Message or Inquiry",
    contact_form_sub: "Fill in the form below to send an email directly to our official Gmail inbox.",
    contact_form_name: "Your Name / Contact Person",
    contact_form_email: "Your Email Address",
    contact_form_phone: "Your Phone Number",
    contact_form_subject: "Subject",
    contact_form_msg: "Message / List of Required Equipment",
    contact_form_send_gmail: "Send via Gmail",
    contact_form_direct_btn: "Copy Email Address",
    contact_copied_toast: "Email copied!",
    contact_map_badge: "Interactive Google Maps",
    contact_success_title: "Your message has been received! ✓",
    contact_success_desc: "Your message was sent to our official email (medaxuz@gmail.com). Our team will contact you shortly.",
    contact_send_btn: "Submit Inquiry ✓",
    contact_send_busy: "Sending…",
    contact_via_gmail: "Via Gmail",
    stock_in_count: "In stock: {n} pcs",
    stock_out_badge: "Out of stock",

    float_hub_btn: "Quick Contact",
    float_hub_title: "Contact Medax",
    float_hub_sub: "Quick engineer response in 15 mins",
    float_call_btn: "Direct Phone Call",
    float_call_sub: "+998 91 186 66 61",
    float_gmail_btn: "Email via Gmail",
    float_gmail_sub: "medaxuz@gmail.com",
    float_map_btn: "View Office Location",
    float_map_sub: "Namangan, Beruniy St., 2",

    // Auth Modal
    auth_login_title: "Sign in to Account",
    auth_register_title: "Create an Account",
    auth_sms_title: "Sign in via SMS",
    auth_login_sub: "Sign in with your phone and password in 1 second",
    auth_register_sub: "Verify your phone via SMS and set a password",
    auth_sms_sub: "Sign in using the 6-digit code sent to your phone",
    auth_tab_pwd: "Password Login",
    auth_tab_reg: "Registration",
    auth_phone_label: "Phone number",
    auth_pwd_label: "Password",
    auth_forgot_pwd: "Forgot password?",
    auth_pwd_ph: "Enter your password",
    auth_btn_login: "Sign In →",
    auth_btn_logging: "Signing in…",
    auth_sms_login_btn: "Sign in with SMS code",
    auth_open_reg: "Create new account →",
    auth_reg_hint: "A 6-digit confirmation code will be sent to this number",
    auth_btn_get_sms: "Get SMS Code →",
    auth_btn_sending: "Sending…",
    auth_has_account: "Already have an account?",
    auth_enter_code: "SMS code:",
    auth_change_phone: "Change number",
    auth_otp_ph: "6-digit code (e.g. 123456)",
    auth_name_label: "Full Name",
    auth_name_ph: "E.g.: Dr. Sardor",
    auth_org_label: "Clinic / Organization (optional)",
    auth_org_ph: "Clinic or LLC",
    auth_new_pwd: "Set a new password",
    auth_min_chars: "At least 6 characters",
    auth_pwd_hint: "You will use this password to sign in next time",
    auth_confirm_pwd: "Confirm password",
    auth_confirm_pwd_ph: "Confirm password",
    auth_btn_create: "Create Account & Sign In ✓",
    auth_resend: "Resend code in:",
    auth_resend_btn: "Send new code",
    auth_terms_note: "By signing in, you agree to the Medax Terms of Service.",
    auth_back_to_pwd: "← Back to password login",
    auth_new_pwd_opt: "New password (optional)",
    auth_new_pwd_opt_ph: "Enter if you want to update password",
    auth_new_pwd_opt_hint: "If you set a password, you can use it to sign in later",
    auth_modal_close: "Close",

    acc_login_prompt_title: "Welcome to your Account",
    acc_login_prompt_desc: "Sign in to view your order history and manage your profile details.",
    acc_login_prompt_btn: "Sign In or Register →",
    acc_my_orders: "My Orders",
    acc_profile_settings: "Profile Settings",
    acc_logout: "Log Out",
    acc_logout_confirm: "Are you sure you want to log out of your account?",
    acc_loading_orders: "Loading orders…",
    acc_no_orders_title: "You have no orders yet",
    acc_no_orders_desc: "Choose equipment from the catalog and place an order.",
    acc_go_catalog: "Go to Catalog →",
    acc_order_title: "Order",
    acc_qty_items: "pcs",
    acc_order_comment: "Note",
    acc_order_canceled_badge: "Order Canceled",
    acc_order_cancel_reason: "Reason",
    acc_btn_cancel_order: "Cancel Order",
    acc_cancel_prompt: "Enter cancellation reason:",
    acc_cancel_reason_ph: "For example: I would like to choose another model...",
    acc_confirm_cancel_btn: "Confirm Cancellation",
    acc_back_btn: "Back",
    acc_personal_info_title: "Clinic & Personal Information",
    acc_personal_info_desc: "This information will automatically appear on invoices and warranty certificates.",
    acc_name_label: "Full Name",
    acc_org_label: "Clinic / Organization Name",
    acc_org_ph: "e.g., Shifo Medical Service LLC",
    acc_phone_label: "Phone Number (Verified via SMS)",
    acc_phone_hint: "Your phone number is the primary security key of your account.",
    acc_save_changes_btn: "Save Changes ✓",
    acc_saving_btn: "Saving…",
    acc_profile_saved_ok: "Information saved successfully!",
    acc_pwd_title: "Set / Update Password",
    acc_pwd_desc: "With a password, you can log in quickly with phone and password without waiting for SMS.",
    acc_curr_pwd_label: "Current Password",
    acc_curr_pwd_ph: "Existing password",
    acc_new_pwd_label: "New Password",
    acc_new_pwd_ph: "At least 6 characters",
    acc_conf_pwd_label: "Confirm New Password",
    acc_conf_pwd_ph: "Re-enter password",
    acc_save_pwd_btn: "Save Password ✓",
    acc_pwd_saved_ok: "Password saved successfully!",
    acc_app_settings_title: "Application Settings",
    acc_app_settings_desc: "Customize the interface language and design theme to your preference.",
    acc_ui_lang_label: "Interface Language:",
    acc_ui_theme_label: "App Theme (Design):",
    acc_theme_light: "☀️ Light Mode",
    acc_theme_dark: "🌙 Dark Mode",
    acc_security_title: "Account Security & Session",
    acc_security_desc: "Click log out to end your session on this device.",
    acc_st_new: "New (Pending)",
    acc_st_confirmed: "Confirmed (In Preparation)",
    acc_st_ready: "Ready for Store Pickup ✓",
    acc_st_done: "Completed (Picked Up) ✓",
    acc_st_canceled: "Canceled",
  },
};

interface I18nContextType {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: keyof Translations) => string;
}

const I18nContext = createContext<I18nContextType>({
  lang: "uz",
  setLang: () => {},
  t: (k) => String(k),
});

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<Lang>(() => {
    const saved = (localStorage.getItem("med_lang") || localStorage.getItem("adm_lang")) as Lang;
    if (saved === "uz" || saved === "ru" || saved === "en") return saved;
    return "uz";
  });

  const setLang = (newLang: Lang) => {
    setLangState(newLang);
    localStorage.setItem("med_lang", newLang);
    localStorage.setItem("adm_lang", newLang);
  };

  const t = (key: keyof Translations): string => {
    return translations[lang]?.[key] || translations.uz[key] || String(key);
  };

  return <I18nContext.Provider value={{ lang, setLang, t }}>{children}</I18nContext.Provider>;
};

export const useI18n = () => useContext(I18nContext);
