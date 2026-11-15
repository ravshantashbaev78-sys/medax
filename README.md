# MedTex: tibbiy uskunalar katalogi va buyurtma tizimi

React + TypeScript (frontend), Node.js + Express + Prisma (backend), PostgreSQL, rasmlar uchun WebP optimizatsiya.

## Ishga tushirish (Docker, tavsiya etiladi)

```bash
cp .env.example .env      # ichidagi parol va JWT_SECRET ni o'zgartiring
docker compose up -d --build
```

- Sayt: http://localhost:8080
- Admin panel: http://localhost:8080/admin (email va parol `.env` dagi `ADMIN_EMAIL` / `ADMIN_PASSWORD`)
- Birinchi ishga tushishda namunaviy kategoriya, brend va 8 ta mahsulot yaratiladi. Admin paneldan o'chirib, o'zingiznikini kiriting.

## Ishlab chiqish rejimi (Docker'siz)

```bash
# 1) PostgreSQL ishlab turishi kerak. backend/.env.example ni backend/.env ga nusxalang
cd backend
npm install
npx prisma db push
npx prisma db execute --file prisma/search.sql --schema prisma/schema.prisma   # tezkor qidiruv indekslari
npm run seed
npm run dev            # http://localhost:4000

# 2) Boshqa terminalda
cd frontend
npm install
npm run dev            # http://localhost:5173
```

## Soxta va keraksiz buyurtmalardan himoya

Mijoz buyurtma bera olishi uchun quyidagi tekshiruvlardan o'tishi kerak:

| Himoya | Qanday ishlaydi |
|---|---|
| SMS tasdiqlash | Buyurtma faqat telefonga kelgan 6 xonali kod kiritilgandan keyin yaratiladi. Kod 5 daqiqa amal qiladi, 5 marta xato kiritilsa bekor bo'ladi. |
| Kod limitlari | Bir raqamga 60 soniyada 1 ta, soatiga 4 ta kod. Bir IP dan 10 daqiqada 6 ta kod so'rovi. |
| Buyurtma limitlari | Bir raqamdan kuniga 3 tagacha buyurtma. Ko'rib chiqilmagan (Yangi) 2 ta buyurtma turganda yangisi qabul qilinmaydi. Bir IP dan soatiga 10 tagacha. |
| Takroriy buyurtma | 24 soat ichida bir xil mahsulot va sondagi buyurtma rad etiladi. |
| Bot tuzog'i | Ko'rinmas maydon va forma ochilgandan keyingi minimal vaqt. Bot bo'lsa jim "muvaffaqiyat" ko'rsatiladi, hech narsa saqlanmaydi. |
| Matn tekshiruvi | Ism, tashkilot va izohda havola (spam) bo'lsa rad etiladi. |
| Cheklovlar | Bir buyurtmada 20 tagacha mahsulot, har biridan 100 tagacha. |
| Menejer tasdig'i | Buyurtma "Yangi" holatida turadi. Menejer qo'ng'iroq qilib tasdiqlamaguncha hech narsa jo'natilmaydi. |
| Soxta belgisi | Menejer "Soxta" desa, shu raqamdagi soxta buyurtmalar soni `FAKE_STRIKE_LIMIT` (standart 2) ga yetganda raqam avtomatik bloklanadi. |
| Qo'lda bloklash | Admin paneldagi "Bloklanganlar" bo'limida telefon yoki IP qo'shish mumkin. |
| Mijoz tarixi | Buyurtmada "Birinchi buyurtma" yoki "Ishonchli mijoz" (oldin bajarilgan buyurtmasi bor) belgisi chiqadi. |

### Haqiqiy SMS (Eskiz.uz)

`.env` da `SMS_PROVIDER=eskiz` qilib, `ESKIZ_EMAIL`, `ESKIZ_PASSWORD` ni kiriting. Eskiz SMS matnini oldindan tasdiqlatishni talab qiladi, shuning uchun
`backend/src/routes/orders.ts` dagi matn (`MedTex: tasdiqlash kodi ...`) ni Eskiz kabinetida shablon sifatida tasdiqlating.
`SMS_PROVIDER=console` rejimida kod serverda chiqadi va sahifada ko'rsatiladi. Bu faqat test uchun, productionda ishlamaydi.

## Sun'iy intellekt yordamchisi (mahsulot kiritish)

Admin panel → Mahsulotlar → Yangi mahsulot sahifasida "AI yordamchi" bloki bor. Admin oddiy tilda buyruq yozadi
(masalan: `Steril shprits 5 ml, 100 talik quti, narxi 1200, 500 dona bor, yaroqlilik 2027-05`), rasm tashlaydi
va "AI bilan to'ldirish" tugmasini bosadi. Claude nom va tavsifni 3 tilda (UZ/RU/EN), kategoriya, brend, birlik,
narx, qoldiq, yaroqlilik muddati, kafolat va texnik parametrlarni (tarjimalari bilan) qoralama sifatida to'ldiradi.
Admin tekshirib, "Saqlash" ni bosadi — AI hech narsani o'zi saqlamaydi. Narx va qoldiq faqat buyruqda yozilgan
yoki rasmda ko'ringan bo'lsa olinadi.

Sozlash: standart provayder Google Gemini. https://aistudio.google.com da "Get API key" orqali kalit olib,
`.env` ga `GEMINI_API_KEY` sifatida kiriting. Model `GEMINI_MODEL` bilan o'zgartiriladi (standart
`gemini-4-hydrogen`: bepul tarifda ishlaydi, pullik tarifda 1 mln token uchun kirish $1.50, chiqish $7.50;
bitta so'rov odatda 3-6 ming token). Bepul tarifda daqiqasiga so'rovlar soni cheklangan va Google bu
ma'lumotlardan mahsulotlarini yaxshilashda foydalanishi mumkin; pullik tarifda yo'q. `AI_PROVIDER=claude` va
`ANTHROPIC_API_KEY` bilan Claude'ga o'tish mumkin. `AI_HOURLY_LIMIT` bitta xodimning soatlik so'rovlar sonini cheklaydi.

## Imkoniyatlar

**Sayt:** bosh sahifa, katalog (kategoriya, brend, tur bo'yicha filter, qidiruv, saralash, sahifalash), mahsulot sahifasi (galereya, xususiyatlar, PDF hujjatlar, o'xshash mahsulotlar), buyurtma ro'yxati va tasdiqlash.

**Admin panel:** statistika, buyurtmalar (holatlar, izoh, soxta/bloklash), mahsulotlar (rasm va PDF yuklash), kategoriya va brendlar, Excel orqali ommaviy yuklash (10 000 qatorgacha), bloklanganlar, xodimlar (Admin va Menejer rollari).

**Ko'p mahsulot uchun:** sahifalash, PostgreSQL indekslari, `pg_trgm` bilan tez qidiruv, rasmlarning kichik nusxalari (480px) ro'yxatlarda ishlatiladi.

## Papkalar

```
backend/   API, Prisma sxemasi (prisma/schema.prisma), SMS va himoya modullari (src/antispam.ts)
frontend/  React ilova: sayt (src/pages) va admin (src/admin)
docker-compose.yml, .env.example
```

## Productionga chiqarishdan oldin

1. `.env` dagi `JWT_SECRET`, `DB_PASSWORD`, `ADMIN_PASSWORD` ni kuchli qiling.
2. Domen va HTTPS (Caddy yoki nginx + Let's Encrypt) qo'ying. HTTPS orqasida ham IP to'g'ri olinadi (`trust proxy` yoqilgan).
3. `SMS_PROVIDER=eskiz` ni sozlang.
4. Baza va `uploads` hajmini muntazam zaxiralang (`dbdata`, `uploads` Docker volume'lari).
5. Sxema o'zgartirilganda `prisma db push` o'rniga `prisma migrate` ga o'ting.
