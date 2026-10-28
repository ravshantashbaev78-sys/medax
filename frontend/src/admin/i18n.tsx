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
  taxonomy: { uz: "Katalog tuzilmasi", ru: "Структура каталога", en: "Catalog Taxonomy" },
  categories: { uz: "Kategoriyalar", ru: "Категории", en: "Categories" },
  brands: { uz: "Brendlar", ru: "Бренды", en: "Brands" },
  users: { uz: "Xodimlar va Ega", ru: "Сотрудники и Владелец", en: "Staff & Owner" },
  contacts: { uz: "Xabarlar", ru: "Сообщения", en: "Messages" },
  blocklist: { uz: "Bloklanganlar", ru: "Черный список", en: "Blocklist" },
  logout: { uz: "Chiqish", ru: "Выйти", en: "Logout" },
  admin_panel: { uz: "Medax Admin", ru: "Medax Панель", en: "Medax Admin" },

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
  category: { uz: "Kategoriya", ru: "Категория", en: "Category" },
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
  return { ...i18n, aT };
}
