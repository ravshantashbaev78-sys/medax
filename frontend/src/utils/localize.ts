import { Lang } from "../context/I18nContext";

// ============================================================================
// 1. O'lchov birliklarini tarjima qilish (dona, quti, pachka, flakon va h.k.)
// ============================================================================
const UNIT_MAP: Record<string, Record<Lang, string>> = {
  dona: { uz: "dona", ru: "шт", en: "pcs" },
  ta: { uz: "ta", ru: "шт", en: "pcs" },
  quti: { uz: "quti", ru: "упак", en: "box" },
  pachka: { uz: "pachka", ru: "пачка", en: "pack" },
  "o'ram": { uz: "o'ram", ru: "рулон", en: "roll" },
  komplekt: { uz: "komplekt", ru: "комплект", en: "set" },
  "to'plam": { uz: "to'plam", ru: "комплект", en: "set" },
  juft: { uz: "juft", ru: "пара", en: "pair" },
  flakon: { uz: "flakon", ru: "флакон", en: "vial" },
  metr: { uz: "metr", ru: "м", en: "m" },
  litr: { uz: "litr", ru: "л", en: "l" },
  kg: { uz: "kg", ru: "кг", en: "kg" },
};

export function localizeUnit(unit: string | undefined | null, lang: Lang): string {
  if (!unit) return "";
  const key = unit.trim().toLowerCase();
  return (
    UNIT_MAP[key]?.[lang] ||
    (lang === "ru" ? (key === "dona" ? "шт" : key) : lang === "en" ? (key === "dona" ? "pcs" : key) : key)
  );
}

// ============================================================================
// 1. Kategoriya nomlarini tarjima qilish (UZ, RU, EN)
// ============================================================================
const CATEGORY_MAP: Record<string, Record<Lang, string>> = {
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

export function localizeCategory(slugOrName: string | undefined | null, lang: Lang): string {
  if (!slugOrName) return "";
  const key = slugOrName.toLowerCase().trim();
  
  // 1. Direct slug match
  if (CATEGORY_MAP[key]) {
    return CATEGORY_MAP[key][lang];
  }

  // 2. Name match in values
  for (const item of Object.values(CATEGORY_MAP)) {
    if (
      item.uz.toLowerCase() === key ||
      item.ru.toLowerCase() === key ||
      item.en.toLowerCase() === key
    ) {
      return item[lang];
    }
  }

  // 3. Fallback
  return slugOrName;
}

// ============================================================================
// 2. Texnik xususiyat (Specs) nomlarini tarjima qilish (UZ, RU, EN)
// ============================================================================
const SPEC_KEY_MAP: Record<string, Record<Lang, string>> = {
  "turi": { uz: "Turi", ru: "Тип", en: "Type" },
  "o'lchash tezligi": { uz: "O'lchash tezligi", ru: "Скорость измерения", en: "Measurement Speed" },
  "kafolat": { uz: "Kafolat", ru: "Гарантия", en: "Warranty" },
  "mavjudligi": { uz: "Mavjudligi", ru: "Наличие", en: "Availability" },
  "holati": { uz: "Holati", ru: "Состояние", en: "Condition" },
  "ishlab chiqaruvchi": { uz: "Ishlab chiqaruvchi", ru: "Производитель", en: "Manufacturer" },
  "hajmi": { uz: "Hajmi", ru: "Объём / Вместимость", en: "Volume / Capacity" },
  "qadoq": { uz: "Qadoq", ru: "Упаковка", en: "Packaging" },
  "ventilyatsiya turlari": { uz: "Ventilyatsiya turlari", ru: "Режимы вентиляции", en: "Ventilation Modes" },
  "ekran": { uz: "Ekran", ru: "Дисплей", en: "Display" },
  "parametrlar": { uz: "Parametrlar", ru: "Параметры", en: "Parameters" },
  "reyting": { uz: "Reyting", ru: "Рейтинг", en: "Rating" },
  "o'lchamlari": { uz: "O'lchamlari", ru: "Размеры", en: "Dimensions" },
  "material": { uz: "Material", ru: "Материал", en: "Material" },
  "saqlash harorati": { uz: "Saqlash harorati", ru: "Температура хранения", en: "Storage Temperature" },
  "qo'llanishi": { uz: "Qo'llanishi", ru: "Применение", en: "Application" },
  "akkumulyator": { uz: "Akkumulyator", ru: "Аккумулятор", en: "Battery" },
  "maksimal yuklama": { uz: "Maksimal yuklama", ru: "Максимальная нагрузка", en: "Max Load Capacity" },
  "tezlik": { uz: "Tezlik", ru: "Скорость", en: "Speed" },
  "boshqaruv": { uz: "Boshqaruv", ru: "Управление", en: "Control" },
  "og'irligi": { uz: "Og'irligi", ru: "Вес", en: "Weight" },
  "quvvat sarfi": { uz: "Quvvat sarfi", ru: "Энергопотребление", en: "Power Consumption" },
  "datchiklar": { uz: "Datchiklar", ru: "Датчики", en: "Probes / Transducers" },
  "kanallar soni": { uz: "Kanallar soni", ru: "Количество каналов", en: "Number of Channels" },
};

export function localizeSpecName(name: string, lang: Lang): string {
  if (lang === "uz") return name;
  const key = name.toLowerCase().trim();
  if (SPEC_KEY_MAP[key]) {
    return SPEC_KEY_MAP[key][lang];
  }
  return name;
}

// ============================================================================
// 3. Texnik xususiyat (Specs) qiymatlarini tarjima qilish (UZ, RU, EN)
// ============================================================================
const SPEC_VALUE_MAP: Record<string, Record<Lang, string>> = {
  "omborda mavjud": {
    uz: "Omborda mavjud",
    ru: "В наличии на складе",
    en: "In stock (ready for dispatch)",
  },
  "yangi": {
    uz: "Yangi",
    ru: "Новый (заводской)",
    en: "Brand new",
  },
  "12 oy rasmiy kafolat": {
    uz: "12 oy rasmiy kafolat",
    ru: "12 месяцев официальной гарантии",
    en: "12 months official warranty",
  },
  "24 oy rasmiy kafolat": {
    uz: "24 oy rasmiy kafolat",
    ru: "24 месяца официальной гарантии",
    en: "24 months official warranty",
  },
  "36 oy rasmiy kafolat": {
    uz: "36 oy rasmiy kafolat",
    ru: "36 месяцев официальной гарантии",
    en: "36 months official warranty",
  },
  "1 soniya": {
    uz: "1 soniya",
    ru: "1 секунда",
    en: "1 second",
  },
  "buyurtma asosida": {
    uz: "Buyurtma asosida",
    ru: "Под заказ",
    en: "On order",
  },
  "klinik-biokimyoviy tahlillar uchun": {
    uz: "Klinik-biokimyoviy tahlillar uchun",
    ru: "Для клинико-биохимических исследований",
    en: "For clinical biochemical diagnostics",
  },
  "+2°c dan +8°c gacha": {
    uz: "+2°C dan +8°C gacha",
    ru: "От +2°C до +8°C",
    en: "+2°C to +8°C",
  },
  "invaziv, noinvaziv, o2 terapiya": {
    uz: "Invaziv, noinvaziv, O2 terapiya",
    ru: "Инвазивная, неинвазивная, О2 терапия",
    en: "Invasive, non-invasive, O2 therapy",
  },
};

export function localizeSpecValue(value: string, lang: Lang): string {
  if (lang === "uz" || !value) return value;
  const key = value.toLowerCase().trim();
  if (SPEC_VALUE_MAP[key]) {
    return SPEC_VALUE_MAP[key][lang];
  }
  // Common phrase replacement
  let res = value;
  if (lang === "ru") {
    res = res
      .replace(/12 oy rasmiy kafolat/gi, "12 месяцев официальной гарантии")
      .replace(/24 oy rasmiy kafolat/gi, "24 месяца официальной гарантии")
      .replace(/36 oy rasmiy kafolat/gi, "36 месяцев официальной гарантии")
      .replace(/oy rasmiy kafolat/gi, "мес. официальной гарантии")
      .replace(/Omborda mavjud/gi, "В наличии на складе")
      .replace(/Yangi/gi, "Новый")
      .replace(/Germaniya/gi, "Германия")
      .replace(/Xitoy/gi, "Китай")
      .replace(/AQSH/gi, "США")
      .replace(/Yaponiya/gi, "Япония")
      .replace(/Belgiya/gi, "Бельгия")
      .replace(/Niderlandiya/gi, "Нидерланды")
      .replace(/Janubiy Koreya/gi, "Южная Корея")
      .replace(/Rossiya/gi, "Россия")
      .replace(/Turkiya/gi, "Турция")
      .replace(/O'zbekiston/gi, "Узбекистан")
      .replace(/dona/gi, "шт")
      .replace(/flakon/gi, "флаконов")
      .replace(/sozlanuvchi/gi, "регулируемый")
      .replace(/sensorli/gi, "сенсорный")
      .replace(/dyuymli/gi, "дюймовый");
  } else if (lang === "en") {
    res = res
      .replace(/12 oy rasmiy kafolat/gi, "12 months official warranty")
      .replace(/24 oy rasmiy kafolat/gi, "24 months official warranty")
      .replace(/36 oy rasmiy kafolat/gi, "36 months official warranty")
      .replace(/oy rasmiy kafolat/gi, "months official warranty")
      .replace(/Omborda mavjud/gi, "In stock")
      .replace(/Yangi/gi, "Brand new")
      .replace(/Germaniya/gi, "Germany")
      .replace(/Xitoy/gi, "China")
      .replace(/AQSH/gi, "USA")
      .replace(/Yaponiya/gi, "Japan")
      .replace(/Belgiya/gi, "Belgium")
      .replace(/Niderlandiya/gi, "Netherlands")
      .replace(/Janubiy Koreya/gi, "South Korea")
      .replace(/Rossiya/gi, "Russia")
      .replace(/Turkiya/gi, "Turkey")
      .replace(/O'zbekiston/gi, "Uzbekistan")
      .replace(/dona/gi, "pcs")
      .replace(/flakon/gi, "vials")
      .replace(/sozlanuvchi/gi, "adjustable")
      .replace(/sensorli/gi, "touchscreen")
      .replace(/dyuymli/gi, "inch");
  }
  return res;
}

// ============================================================================
// 4. Mamlakat nomlarini tarjima qilish (UZ, RU, EN)
// ============================================================================
const COUNTRY_MAP: Record<string, Record<Lang, string>> = {
  "xitoy": { uz: "Xitoy", ru: "Китай", en: "China" },
  "germaniya": { uz: "Germaniya", ru: "Германия", en: "Germany" },
  "belgiya": { uz: "Belgiya", ru: "Бельгия", en: "Belgium" },
  "niderlandiya": { uz: "Niderlandiya", ru: "Нидерланды", en: "Netherlands" },
  "aqsh": { uz: "AQSH", ru: "США", en: "USA" },
  "janubiy koreya": { uz: "Janubiy Koreya", ru: "Южная Корея", en: "South Korea" },
  "yaponiya": { uz: "Yaponiya", ru: "Япония", en: "Japan" },
  "rossiya": { uz: "Rossiya", ru: "Россия", en: "Russia" },
  "turkiya": { uz: "Turkiya", ru: "Турция", en: "Turkey" },
  "o'zbekiston": { uz: "O'zbekiston", ru: "Узбекистан", en: "Uzbekistan" },
};

export function localizeCountry(country: string | null | undefined, lang: Lang): string {
  if (!country) return "";
  if (lang === "uz") return country;
  const key = country.toLowerCase().trim();
  if (COUNTRY_MAP[key]) return COUNTRY_MAP[key][lang];
  return country;
}

// ============================================================================
// 5. Mahsulot tavsiflarini (Descriptions) tarjima qilish (UZ, RU, EN)
// ============================================================================
const PRODUCT_DESC_MAP: Record<string, Record<Lang, string>> = {
  "elektron kontaktsiz termometr va pulsoksimetr to'plami": {
    uz: "Klinika va shaxsiy foydalanish uchun infraqizil tana harorati o'lchagich va qondagi kislorod miqdorini aniqlovchi SpO2 pulsoksimetr to'plami.",
    ru: "Комплект бесконтактного инфракрасного термометра и пульсоксиметра SpO2 для высокоточного измерения температуры тела и уровня насыщения крови кислородом в клиниках и на дому.",
    en: "Non-contact infrared body thermometer and SpO2 pulse oximeter kit for clinical and personal health monitoring with instant high accuracy.",
  },
  "tibbiy bir martalik steril shpritslar to'plami (100 dona)": {
    uz: "Tibbiyot muassasalari uchun yuqori sifatli uch komponentli bir martalik steril shpritslar komplekti (100 dona).",
    ru: "Набор трехкомпонентных одноразовых стерильных медицинских шприцев высочайшего качества для клиник и больниц (100 шт).",
    en: "Premium medical 3-component sterile disposable syringes pack for healthcare institutions and hospitals (100 pcs).",
  },
  "laboratoriya biokimyoviy reagentlar to'plami (dirui)": {
    uz: "Dirui avtomatik biokimyoviy analizatorlari uchun mo'ljallangan yuqori sifatli kalibrator va diagnostik reagentlar komplekti.",
    ru: "Набор калибраторов и диагностических реагентов высокой чистоты для автоматических биохимических анализаторов Dirui.",
    en: "High-grade diagnostic reagents and calibrators set designed for Dirui automated clinical chemistry analyzers.",
  },
  "sun'iy nafas apparati dräger evita v300": {
    uz: "Kattalar va bolalar uchun invaziv va noinvaziv yuqori aniqlikdagi IVL apparati. Smart ventilation rejimlari mavjud.",
    ru: "Высокоточный аппарат ИВЛ для инвазивной и неинвазивной вентиляции легких взрослых и детей с интеллектуальными режимами Smart Ventilation.",
    en: "High-end ICU ventilator for invasive and non-invasive ventilation of adults and pediatrics with intelligent Smart Ventilation modes.",
  },
  "bemor monitori mindray benevision n17": {
    uz: "Reanimatsiya va intensiv terapiya uchun ko'p parametrli yuqori texnologiyali bemor monitori. EKG, SpO2, NIBP, harorat.",
    ru: "Многопараметрический прикроватный монитор пациента для отделений реанимации и интенсивной терапии (ЭКГ, SpO2, НИАД, температура, ЧСС).",
    en: "High-acuity multiparameter patient monitor for ICU and critical care units (ECG, SpO2, NIBP, Temp, respiration).",
  },
  "anesteziya apparati dräger fabius gs": {
    uz: "Zamonaviy operatsiya xonalari uchun ishonchli elektronia anesteziya tizimi. E-vent ventilyatori bilan jihozlangan.",
    ru: "Надежный наркозно-дыхательный аппарат для современных операционных залов, оснащенный электронным поршневым вентилятором E-vent.",
    en: "Reliable anesthesia workstation for operating theaters equipped with precision electronic E-vent ventilator.",
  },
  "ultratovush diagnostika tizimi chison qbit 7": {
    uz: "Yuqori aniqlikdagi 4D rangli doppler UZI apparati. Kardiologiya, akusherlik va umumiy diagnostika uchun mo'ljallangan.",
    ru: "Ультразвуковой диагностический аппарат экспертного класса с 4D цветным доплером для кардиологии, акушерства и общей радиологии.",
    en: "Expert-grade digital 4D color Doppler ultrasound system tailored for cardiology, OB/GYN, and general diagnostic imaging.",
  },
  "ortopedik fiksator korset va dinamik bandaj to'plami": {
    uz: "Umurtqa pog'onasi, bel va bo'g'im jarohatlaridan keyin tiklanish uchun nafas oluvchi tibbiy elastik korset va ortopedik fiksator komplekti.",
    ru: "Комплект дышащего поддерживающего медицинского корсета и динамического ортопедического бандажа для восстановления позвоночника и суставов.",
    en: "Breathable medical lumbar support corset and dynamic orthopedic brace set designed for spine and joint recovery.",
  },
};

export function localizeProductDescription(
  descOrProduct: { description?: string | null; descriptionRu?: string | null; descriptionEn?: string | null } | string | null | undefined,
  lang: Lang,
  productName?: string
): string {
  if (!descOrProduct) return "";

  // 1. Agar to'liq mahsulot obyekti berilgan bo'lsa
  if (typeof descOrProduct === "object") {
    if (lang === "ru" && descOrProduct.descriptionRu?.trim()) return descOrProduct.descriptionRu.trim();
    if (lang === "en" && descOrProduct.descriptionEn?.trim()) return descOrProduct.descriptionEn.trim();
    return localizeProductDescription(descOrProduct.description || "", lang, productName);
  }

  const desc = descOrProduct;
  if (lang === "uz") return desc || "";
  if (!desc && !productName) return "";

  // 2. Lug'atdan qidirish
  if (productName) {
    const key = productName.toLowerCase().trim();
    if (PRODUCT_DESC_MAP[key]) {
      return PRODUCT_DESC_MAP[key][lang];
    }
  }

  // 3. Umumiy klinik iboralarni almashtirish
  if (desc) {
    let t = desc;
    if (lang === "ru") {
      t = t
        .replace(/Klinika va shaxsiy foydalanish uchun/gi, "Для клиник и персонального применения")
        .replace(/Tibbiyot muassasalari uchun/gi, "Для медицинских учреждений")
        .replace(/yuqori sifatli/gi, "высококачественный")
        .replace(/mo'ljallangan/gi, "предназначен")
        .replace(/Kattalar va bolalar uchun/gi, "Для взрослых и детей")
        .replace(/Reanimatsiya va intensiv terapiya uchun/gi, "Для реанимации и интенсивной терапии")
        .replace(/Zamonaviy operatsiya xonalari uchun/gi, "Для современных операционных залов")
        .replace(/Yuqori aniqlikdagi/gi, "Высокоточный")
        .replace(/rasmiy kafolat/gi, "официальная гарантия")
        .replace(/Omborda mavjud/gi, "В наличии на складе")
        .replace(/tiklanish uchun/gi, "для реабилитации и восстановления");
    } else if (lang === "en") {
      t = t
        .replace(/Klinika va shaxsiy foydalanish uchun/gi, "For clinical and personal healthcare use")
        .replace(/Tibbiyot muassasalari uchun/gi, "For medical and clinical facilities")
        .replace(/yuqori sifatli/gi, "high-quality")
        .replace(/mo'ljallangan/gi, "designed for")
        .replace(/Kattalar va bolalar uchun/gi, "For adults and pediatric patients")
        .replace(/Reanimatsiya va intensiv terapiya uchun/gi, "For ICU and critical care therapy")
        .replace(/Zamonaviy operatsiya xonalari uchun/gi, "For modern operating rooms")
        .replace(/Yuqori aniqlikdagi/gi, "High-precision")
        .replace(/rasmiy kafolat/gi, "official warranty")
        .replace(/Omborda mavjud/gi, "In stock")
        .replace(/tiklanish uchun/gi, "for recovery and rehabilitation");
    }
    return t;
  }

  return lang === "ru" ? "Описание уточняется." : "Detailed description available on request.";
}

// ============================================================================
// 6. Mahsulot nomlarini (Titles) tarjima qilish (UZ, RU, EN)
// ============================================================================
const PRODUCT_NAME_MAP: Record<string, Record<Lang, string>> = {
  "elektron kontaktsiz termometr va pulsoksimetr to'plami": {
    uz: "Elektron kontaktsiz termometr va pulsoksimetr to'plami",
    ru: "Комплект бесконтактного электронного термометра и пульсоксиметра",
    en: "Non-contact Electronic Thermometer & Pulse Oximeter Kit",
  },
  "tibbiy bir martalik steril shpritslar to'plami (100 dona)": {
    uz: "Tibbiy bir martalik steril shpritslar to'plami (100 dona)",
    ru: "Набор медицинских одноразовых стерильных шприцев (100 шт)",
    en: "Medical Disposable Sterile Syringes Set (100 pcs)",
  },
  "laboratoriya biokimyoviy reagentlar to'plami (dirui)": {
    uz: "Laboratoriya biokimyoviy reagentlar to'plami (Dirui)",
    ru: "Комплект биохимических реагентов для лаборатории (Dirui)",
    en: "Laboratory Biochemical Reagents Kit (Dirui)",
  },
  "sun'iy nafas apparati dräger evita v300": {
    uz: "Sun'iy nafas apparati Dräger Evita V300",
    ru: "Аппарат ИВЛ (искусственной вентиляции легких) Dräger Evita V300",
    en: "ICU Ventilator Dräger Evita V300",
  },
  "bemor monitori mindray benevision n17": {
    uz: "Bemor monitori Mindray BeneVision N17",
    ru: "Прикроватный монитор пациента Mindray BeneVision N17",
    en: "Patient Monitor Mindray BeneVision N17",
  },
  "anesteziya apparati dräger fabius gs": {
    uz: "Anesteziya apparati Dräger Fabius GS",
    ru: "Наркозно-дыхательный аппарат Dräger Fabius GS",
    en: "Anesthesia Workstation Dräger Fabius GS",
  },
  "ultratovush diagnostika tizimi chison qbit 7": {
    uz: "Ultratovush diagnostika tizimi Chison QBit 7",
    ru: "Ультразвуковая диагностическая система Chison QBit 7 (УЗИ)",
    en: "Ultrasound Diagnostic System Chison QBit 7",
  },
  "ortopedik fiksator korset va dinamik bandaj to'plami": {
    uz: "Ortopedik fiksator korset va dinamik bandaj to'plami",
    ru: "Ортопедический фиксирующий корсет и динамический бандаж",
    en: "Orthopedic Support Corset and Dynamic Brace Kit",
  },
};

export function localizeProductName(
  productOrName: { name: string; nameRu?: string | null; nameEn?: string | null } | string | null | undefined,
  lang: Lang
): string {
  if (!productOrName) return "";

  // 1. Agar obyekt berilgan bo'lsa
  if (typeof productOrName === "object") {
    if (lang === "ru" && productOrName.nameRu?.trim()) return productOrName.nameRu.trim();
    if (lang === "en" && productOrName.nameEn?.trim()) return productOrName.nameEn.trim();
    const raw = productOrName.name || "";
    if (lang === "uz") return raw;
    const key = raw.toLowerCase().trim();
    if (PRODUCT_NAME_MAP[key]?.[lang]) return PRODUCT_NAME_MAP[key][lang];
    return raw;
  }

  const name = productOrName;
  if (lang === "uz" || !name) return name;
  const key = name.toLowerCase().trim();
  if (PRODUCT_NAME_MAP[key]) {
    return PRODUCT_NAME_MAP[key][lang];
  }
  return name;
}
