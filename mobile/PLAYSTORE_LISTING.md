# 📱 Medax — Google Play Console uchun tayyor ma'lumotlar to'plami

Ushbu hujjat Google Play Console'ga ilovani joylashtirishda so'raladigan barcha matnlar, havolalar va grafik materiallar parametrlarini o'z ichiga oladi.

---

## 1. Asosiy identifikatorlar va havolalar

- **Ilova nomi (App Name):** `Medax: Tibbiy uskunalar` *(24 / 30 belgi)*
- **Paket nomi (Package Name):** `uz.medax.mobile`
- **Ilova toifasi (Category):** Medical (Медицина / Tibbiyot)
- **Yosh chegarasi (Content rating):** 3+ (Hamma uchun xavfsiz)
- **Maxfiylik siyosati havolasi (Privacy Policy URL):** `https://medax.uz/privacy`
- **Aloqa emaili:** `info@medax.uz`
- **Veb-sayt:** `https://medax.uz`
- **Qo'llab-quvvatlash telefoni:** `+998 91 186 66 61`

---

## 2. Play Store matnlari (O'zbek tilida)

### Qisqa tavsif (Short Description) — Maksimal 80 belgi
```text
Tibbiy uskunalar, laboratoriya apparatlari va jihozlar onlayn katalogi.
```
*(Uzunligi: 73 belgi)*

### To'liq tavsif (Full Description) — Maksimal 4000 belgi
```text
Medax — shifoxonalar, xususiy klinikalar, diagnostika markazlari va shifokorlar uchun professional tibbiy uskunalar va jihozlar rasmiy platformasi.

Ilova orqali siz jahonning yetakchi brendlariga tegishli tibbiy uskunalarni to'g'ridan-to'g'ri ishlab chiqaruvchi kafolati bilan tanlashingiz, texnik xarakteristikalarni o'rganishingiz va qulay buyurtma berishingiz mumkin.

ASOSIY IMKONIYATLAR:
• Keng qamrovli katalog: UZI apparatlari, reanimatsiya va sun'iy nafas berish (IVL), jarrohlik stollari va operatsiya chiroqlari, laboratoriya analizatorlari, ginekologiya, ortopediya va bir martalik sarflov buyumlari.
• To'liq texnik xususiyatlar: Har bir uskunaning aniq parametrlari, ishlab chiqarilgan davlati, konfiguratsiyasi va rasmiy fotosuratlari.
• 100% rasmiy kafolat: Barcha uskunalarga ishlab chiqaruvchi va Medax servis markazining rasmiy kafolati beriladi.
• Tezkor buyurtma va SMS tasdiqlash: Telefon raqamingiz orqali 1 daqiqada SMS kod bilan xavfsiz ro'yxatdan o'ting va buyurtma holatini kuzatib boring.
• Professional muhandislik xizmati: Uskunalarni o'rnatish, sozlash, tibbiyot xodimlarini o'qitish va kafolatdan keyingi texnik ko'rik.
• Butun O'zbekiston bo'ylab yetkazib berish: Toshkent shahri va barcha viloyatlar bo'ylab maxsus transportda xavfsiz yetkazish.

KIMLAR UCHUN:
• Xususiy va davlat klinikalari rahbarlari;
• Shifokorlar, diagnostlar va jarrohlar;
• Tibbiy laboratoriyalar va diagnostika markazlari;
• Tibbiyot muassasalarining ta'minot bo'limlari.

Medax — tibbiyot sohasida sizning ishonchli hamkoringiz!
```

---

## 3. Play Store matnlari (Rus tilida)

### Краткое описание (Short Description) — До 80 символов
```text
Каталог медицинского оборудования, аппаратов и расходных материалов.
```

### Полное описание (Full Description) — До 4000 символов
```text
Medax — официальная платформа профессионального медицинского оборудования и техники для клиник, диагностических центров, больниц и врачей.

В приложении представлен широкий ассортимент сертифицированного медицинского оборудования от ведущих мировых производителей с официальной гарантией и сервисным сопровождением.

ОСНОВНЫЕ ВОЗМОЖНОСТИ:
• Полный каталог: УЗИ-сканеры, аппараты ИВЛ, мониторы пациента, операционные столы и светильники, биохимические и гематологические анализаторы, медицинская мебель и расходные материалы.
• Подробные характеристики: Официальные технические описания, комплектации, фотографии высокого разрешения и инструкции.
• 100% официальная гарантия: Сертифицированное оборудование с гарантийным обслуживанием от сервисного центра Medax.
• Быстрый заказ и вход по SMS OTP: Безопасный вход по номеру телефона за считанные секунды без лишних паролей.
• Инженерный сервис: Доставка, квалифицированный монтаж, настройка оборудования и обучение персонала.
• Доставка по всему Узбекистану: Надежная транспортировка в Ташкент и все регионы Республики.

Medax — ваш надежный партнер в оснащении современного здравоохранения!
```

---

## 4. Tayyor grafik fayllar (mobile/assets papkasida saqlangan)

1. **Ilova belgisi (App Icon):**
   - Fayl: `mobile/assets/playstore-icon-512.png`
   - Hajmi: 512 × 512 px, 32-bit PNG (shaffof bo'lmagan, orqa foni oq).
2. **Katta reklama banneri (Feature Graphic):**
   - Fayl: `mobile/assets/playstore-feature-graphic-1024x500.png`
   - Hajmi: 1024 × 500 px, 24-bit PNG.
3. **Splash screen (Kirish ekrani):**
   - Fayl: `mobile/assets/splash.png`
   - Hajmi: 1284 × 2778 px.
4. **Adaptive Icon (Android moslashuvchan ikonkasi):**
   - Fayl: `mobile/assets/adaptive-icon.png`
   - Hajmi: 1024 × 1024 px.
5. **Ekran rasmlari (Phone Screenshots):**
   - `mobile/assets/screenshots/screenshot_1_home.png` (1080 × 2400)
   - `mobile/assets/screenshots/screenshot_2_catalog.png` (1080 × 2400)
   - `mobile/assets/screenshots/screenshot_3_warranty.png` (1080 × 2400)
   - `mobile/assets/screenshots/screenshot_4_order.png` (1080 × 2400)

---

## 5. EAS orqali Android (.aab va .apk) yaratish buyruqlari

Terminalda quyidagi buyruqlar orqali build qilinadi:

- **Play Market uchun tayyor .aab bundle:**
  ```bash
  cd mobile
  npx eas-cli build --platform android --profile production
  ```

- **Telefonlarga o'rnatib test qilish uchun bevosita .apk:**
  ```bash
  cd mobile
  npx eas-cli build --platform android --profile preview
  ```
