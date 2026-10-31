import { Lang, I18nProvider, useI18n, Translations } from "../context/I18nContext";

export type AdminLang = Lang;
export type { Translations };
export const AdminI18nProvider = I18nProvider;

export const ADMIN_TEXTS = {
  // Navigation & Headers
  dashboard: { uz: "Boshqaruv paneli", ru: "Панель управления", en: "Dashboard" },
  orders: { uz: "Buyurtmalar", ru: "Заказы", en: "Orders" },
  products: { uz: "Mahsulotlar", ru: "Товары", en: "Products" },
  customers: { uz: "Mijozlar", ru: "Клиенты", en: "Customers" },
  customers_list: { uz: "Mijozlar ro'yxati", ru: "Список клиентов", en: "Customers List" },
  taxonomy: { uz: "Toifalar va brendlar", ru: "Категории и бренды", en: "Taxonomy & Brands" },
  categories: { uz: "Toifalar", ru: "Категории", en: "Categories" },
  brands: { uz: "Brendlar", ru: "Бренды", en: "Brands" },
  users: { uz: "Xodimlar va Ega", ru: "Сотрудники и Владелец", en: "Staff & Owner" },
  contacts: { uz: "Xabarlar", ru: "Сообщения", en: "Messages" },
  contact_inquiries: { uz: "Murojaatlar", ru: "Обращения", en: "Inquiries" },
  blocklist: { uz: "Bloklanganlar", ru: "Черный список", en: "Blocklist" },
  logout: { uz: "Chiqish", ru: "Выйти", en: "Logout" },
  admin_panel: { uz: "Medax Admin", ru: "Medax Панель", en: "Medax Admin" },
  import_excel: { uz: "Excel orqali yuklash", ru: "Загрузка через Excel", en: "Import via Excel" },
  view_site: { uz: "Saytni ko'rish", ru: "Перейти на сайт", en: "View Site" },

  // Contact Inquiries Page
  inquiries_title: { uz: "Mijozlar Murojaatlari", ru: "Обращения клиентов", en: "Customer Inquiries" },
  inquiries_sub: {
    uz: "Saytdagi aloqa formasi orqali yuborilgan rasmiy so'rovlar va takliflar.",
    ru: "Официальные запросы и предложения через форму обратной связи на сайте.",
    en: "Official inquiries and feedback submitted via the website contact form.",
  },
  filter_all: { uz: "Barchasi", ru: "Все", en: "All" },
  filter_unread: { uz: "Yangi (o'qilmagan)", ru: "Новые (непрочитанные)", en: "New (unread)" },
  filter_read: { uz: "Ko'rib chiqilgan", ru: "Просмотренные", en: "Reviewed" },
  col_status: { uz: "Holat", ru: "Статус", en: "Status" },
  col_customer: { uz: "Mijoz", ru: "Клиент", en: "Customer" },
  col_phone: { uz: "Telefon", ru: "Телефон", en: "Phone" },
  col_subject_msg: { uz: "Mavzu & Xabar", ru: "Тема и Сообщение", en: "Subject & Message" },
  col_date: { uz: "Sana", ru: "Дата", en: "Date" },
  col_actions: { uz: "Amallar", ru: "Действия", en: "Actions" },
  st_unread: { uz: "Yangi", ru: "Новый", en: "New" },
  st_read: { uz: "O'qilgan", ru: "Прочитано", en: "Read" },
  action_mark_unread: { uz: "O'qilmagan qilish", ru: "Сделать непрочитанным", en: "Mark as unread" },
  action_mark_read: { uz: "O'qildi ✓", ru: "Прочитано ✓", en: "Mark read ✓" },
  no_inquiries: { uz: "Murojaatlar mavjud emas.", ru: "Обращений пока нет.", en: "No inquiries found." },
  confirm_delete_inquiry: { uz: "Ushbu murojaatni o'chirmoqchimisiz?", ru: "Удалить это обращение?", en: "Delete this message?" },
  prev_page: { uz: "← Oldingi", ru: "← Назад", en: "← Previous" },
  next_page: { uz: "Keyingi →", ru: "Вперед →", en: "Next →" },

  // Buttons & Actions
  add_new: { uz: "Qo'shish", ru: "Добавить", en: "Add New" },
  add_product: { uz: "+ Yangi mahsulot", ru: "+ Добавить товар", en: "+ Add Product" },
  save: { uz: "Saqlash", ru: "Сохранить", en: "Save" },
  saving: { uz: "Saqlanmoqda…", ru: "Сохранение…", en: "Saving…" },
  edit: { uz: "Tahrirlash", ru: "Редактировать", en: "Edit" },
  delete: { uz: "O'chirish", ru: "Удалить", en: "Delete" },
  search: { uz: "Qidirish...", ru: "Поиск...", en: "Search..." },
  back: { uz: "Ro'yxatga qaytish", ru: "Вернуться к списку", en: "Back to list" },
  cancel: { uz: "Bekor qilish", ru: "Отмена", en: "Cancel" },
  confirm: { uz: "Tasdiqlash", ru: "Подтвердить", en: "Confirm" },
  loading: { uz: "Yuklanmoqda...", ru: "Загрузка...", en: "Loading..." },
  not_found: { uz: "Topilmadi", ru: "Не найдено", en: "Not found" },

  // Table Columns
  name: { uz: "Nomi", ru: "Название", en: "Name" },
  price: { uz: "Narxi", ru: "Цена", en: "Price" },
  category: { uz: "Toifa", ru: "Категория", en: "Category" },
  brand: { uz: "Brend", ru: "Бренд", en: "Brand" },
  status: { uz: "Holati", ru: "Статус", en: "Status" },
  actions: { uz: "Amallar", ru: "Действия", en: "Actions" },
  date: { uz: "Sana", ru: "Дата", en: "Date" },
  customer: { uz: "Mijoz", ru: "Клиент", en: "Customer" },
  phone: { uz: "Telefon", ru: "Телефон", en: "Phone" },
  total: { uz: "Jami summa", ru: "Итоговая сумма", en: "Total amount" },
  items_count: { uz: "Mahsulotlar soni", ru: "Количество товаров", en: "Items count" },
  role: { uz: "Rol", ru: "Роль", en: "Role" },

  // Product Fields
  description: { uz: "Tavsif va qo'llanish sohasi", ru: "Описание и область применения", en: "Description & usage" },
  unit: { uz: "O'lchov birligi", ru: "Единица измерения", en: "Unit of measure" },
  unit_dona: { uz: "dona (1 dona)", ru: "шт (1 штука)", en: "pcs (1 piece)" },
  unit_quti: { uz: "quti (blok)", ru: "упаковка (блок)", en: "box (pack)" },
  unit_pachka: { uz: "pachka", ru: "пачка", en: "pack" },
  unit_oram: { uz: "o'ram (rulon)", ru: "рулон", en: "roll" },
  unit_komplekt: { uz: "komplekt / to'plam", ru: "комплект / набор", en: "set" },
  unit_juft: { uz: "juft (qo'lqop uchun)", ru: "пара (для перчаток)", en: "pair" },
  unit_flakon: { uz: "flakon / ampula", ru: "флакон / ампула", en: "vial / ampoule" },
  unit_metr: { uz: "metr", ru: "метр", en: "meter" },
  warranty: { uz: "Kafolat muddati", ru: "Срок гарантии", en: "Warranty period" },
  specs: { uz: "Texnik xususiyatlar", ru: "Характеристики", en: "Technical specs" },
  add_spec: { uz: "+ Xususiyat qo'shish", ru: "+ Добавить характеристику", en: "+ Add specification" },
  images: { uz: "Mahsulot rasmlari", ru: "Изображения товара", en: "Product images" },
  docs: { uz: "Hujjatlar (PDF)", ru: "Документы (PDF)", en: "Documents (PDF)" },

  // Badges & Roles
  role_owner: { uz: "👑 Ega (Owner)", ru: "👑 Владелец (Owner)", en: "👑 Owner" },
  role_admin: { uz: "Administrator", ru: "Администратор", en: "Administrator" },
  role_manager: { uz: "Menejer", ru: "Менеджер", en: "Manager" },
  badge_active: { uz: "🟢 Faol", ru: "🟢 Активен", en: "🟢 Active" },
  badge_hidden: { uz: "🔴 Yashirin", ru: "🔴 Скрыт", en: "🔴 Hidden" },
  badge_hit: { uz: "🔥 Xit", ru: "🔥 Хит", en: "🔥 Hit" },
  badge_new: { uz: "✨ Yangi", ru: "✨ Новинка", en: "✨ New" },

  // Order Statuses
  st_new: { uz: "Yangi", ru: "Новый", en: "New" },
  st_confirmed: { uz: "Tasdiqlangan", ru: "Подтвержден", en: "Confirmed" },
  st_ready: { uz: "Tayyor", ru: "Готов", en: "Ready" },
  st_done: { uz: "Bajarildi", ru: "Выполнен", en: "Done" },
  st_canceled: { uz: "Bekor qilindi", ru: "Отменен", en: "Canceled" },
  st_fake: { uz: "Soxta (Spam)", ru: "Фейк (Спам)", en: "Fake (Spam)" },
};

export type AdminTextKey = keyof typeof ADMIN_TEXTS;

export function useAdminI18n() {
  const i18n = useI18n();
  const aT = (k: AdminTextKey): string => {
    return ADMIN_TEXTS[k]?.[i18n.lang] || ADMIN_TEXTS[k]?.uz || String(k);
  };
  const t = (k: any): string => {
    if (k in ADMIN_TEXTS) {
      return ADMIN_TEXTS[k as AdminTextKey]?.[i18n.lang] || ADMIN_TEXTS[k as AdminTextKey]?.uz || String(k);
    }
    return (i18n.t as any)(k);
  };
  return { ...i18n, aT, t };
}
