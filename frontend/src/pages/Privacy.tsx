import { Link } from "react-router-dom";
import { useI18n } from "../context/I18nContext";

export default function Privacy() {
  const { lang } = useI18n();

  return (
    <div className="container" style={{ maxWidth: 860, margin: "40px auto", padding: "0 20px", color: "var(--ink, #0f172a)" }}>
      <div style={{ marginBottom: 24 }}>
        <Link to="/" style={{ color: "var(--brand, #0284c7)", fontWeight: 700, textDecoration: "none", fontSize: 14 }}>
          ← {lang === "ru" ? "Главная страница" : lang === "en" ? "Home" : "Bosh sahifa"}
        </Link>
      </div>

      <h1 style={{ fontSize: 32, fontWeight: 900, marginBottom: 8 }}>
        {lang === "ru"
          ? "Политика конфиденциальности"
          : lang === "en"
          ? "Privacy Policy"
          : "Maxfiylik siyosati (Privacy Policy)"}
      </h1>
      <p style={{ color: "var(--ink-muted, #64748b)", fontSize: 14, marginBottom: 30 }}>
        {lang === "ru"
          ? "Последнее обновление: 28 октября 2026 г. Официальная политика мобильного приложения и веб-платформы Medax."
          : lang === "en"
          ? "Last updated: October 28, 2026. Official Privacy Policy for Medax Web and Mobile App."
          : "Oxirgi yangilanish: 2026-yil 28-oktabr. Medax mobil ilovasi va veb-platformasining rasmiy maxfiylik siyosati."}
      </p>

      {lang === "ru" ? (
        <article style={{ lineHeight: 1.8, fontSize: 15 }}>
          <section style={{ marginBottom: 28 }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 12 }}>1. Общие положения</h2>
            <p>
              Настоящая Политика конфиденциальности определяет порядок обработки и защиты персональных данных пользователей мобильного приложения <strong>Medax</strong> и веб-сайта <strong>medax.uz</strong>. Мы со всей ответственностью относимся к безопасности ваших данных.
            </p>
          </section>

          <section style={{ marginBottom: 28 }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 12 }}>2. Какие данные мы собираем</h2>
            <ul style={{ paddingLeft: 20 }}>
              <li><strong>Номер телефона:</strong> используется для безопасного входа через SMS OTP и подтверждения заказов.</li>
              <li><strong>Имя и наименование клиники/организации:</strong> для оформления договоров, гарантийных талонов и счетов-фактур.</li>
              <li><strong>Адрес доставки:</strong> для своевременной транспортировки медицинского оборудования.</li>
              <li><strong>История заказов:</strong> для отслеживания статусов поставок и сервисного обслуживания.</li>
            </ul>
          </section>

          <section style={{ marginBottom: 28 }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 12 }}>3. Цели обработки данных</h2>
            <p>
              Персональные данные используются исключительно для:
            </p>
            <ul style={{ paddingLeft: 20 }}>
              <li>Аутентификации пользователя в личном кабинете;</li>
              <li>Обработки заказов и доставки медицинского оборудования;</li>
              <li>Предоставления гарантийного и постгарантийного сервисного обслуживания;</li>
              <li>Связи с клиентом при возникновении вопросов по заказу.</li>
            </ul>
          </section>

          <section style={{ marginBottom: 28 }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 12 }}>4. Безопасность и защита данных</h2>
            <p>
              Мы используем современные протоколы шифрования SSL/TLS для защиты всех передаваемых данных. Ваши персональные данные никогда не продаются и не передаются третьим лицам, за исключением случаев, предусмотренных законодательством Республики Узбекистан.
            </p>
          </section>

          <section style={{ marginBottom: 28 }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 12 }}>5. Удаление данных и контакты</h2>
            <p>
              Пользователь имеет право в любой момент запросить удаление своего аккаунта и всех связанных данных. Для этого отправьте запрос на электронную почту: <strong>info@medax.uz</strong> или свяжитесь с нами по телефону: <strong>+998 71 200 00 00</strong>.
            </p>
          </section>
        </article>
      ) : (
        <article style={{ lineHeight: 1.8, fontSize: 15 }}>
          <section style={{ marginBottom: 28 }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 12 }}>1. Umumiy qoidalar</h2>
            <p>
              Ushbu Maxfiylik siyosati <strong>Medax</strong> mobil ilovasi va <strong>medax.uz</strong> veb-saytidan foydalanuvchilarning shaxsiy maʼlumotlarini yigʻish, qayta ishlash va himoya qilish tartibini belgilaydi. Biz foydalanuvchilarimizning xavfsizligini toʻliq kafolatlaymiz.
            </p>
          </section>

          <section style={{ marginBottom: 28 }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 12 }}>2. Biz qanday maʼlumotlarni toʻplaymiz</h2>
            <ul style={{ paddingLeft: 20 }}>
              <li><strong>Telefon raqam:</strong> SMS OTP orqali xavfsiz kirish va buyurtmalarni tasdiqlash uchun;</li>
              <li><strong>Ism-familiya va klinika/tashkilot nomi:</strong> shartnomalar, hisob-fakturalar va rasmiy kafolat hujjatlarini rasmiylashtirish uchun;</li>
              <li><strong>Yetkazib berish manzili:</strong> tibbiy apparat va uskunalarni toʻgʻri manzilga xavfsiz yetkazish uchun;</li>
              <li><strong>Buyurtmalar tarixi:</strong> yetkazib berish holatini kuzatish va servis kafolat xizmatini koʻrsatish uchun.</li>
            </ul>
          </section>

          <section style={{ marginBottom: 28 }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 12 }}>3. Maʼlumotlardan foydalanish maqsadi</h2>
            <p>Toʻplangan maʼlumotlar faqat quyidagi maqsadlarda ishlatiladi:</p>
            <ul style={{ paddingLeft: 20 }}>
              <li>Foydalanuvchini shaxsiy kabinetga xavfsiz kiritish;</li>
              <li>Tibbiyot muassasalari va shifokorlarning buyurtmalarini qayta ishlash va yetkazib berish;</li>
              <li>Rasmiy muhandislik va kafolatli servis xizmatlarini koʻrsatish;</li>
              <li>Buyurtma holati yuzasidan mijoz bilan tezkor aloqa oʻrnatish.</li>
            </ul>
          </section>

          <section style={{ marginBottom: 28 }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 12 }}>4. Maʼlumotlar xavfsizligi</h2>
            <p>
              Barcha maʼlumotlar zamonaviy SSL/TLS shifrlash protokollari orqali himoyalanadi. Sizning maʼlumotlaringiz hech qachon uchinchi shaxslarga sotilmaydi yoki noqonuniy tarqatilmaydi.
            </p>
          </section>

          <section style={{ marginBottom: 28 }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 12 }}>5. Hisobni oʻchirish va aloqa</h2>
            <p>
              Foydalanuvchi istalgan vaqtda oʻz hisobi va shaxsiy maʼlumotlarini butunlay oʻchirib tashlashni soʻrash huquqiga ega. Buning uchun <strong>info@medax.uz</strong> elektron pochtasiga xat yuborishingiz yoki <strong>+998 71 200 00 00</strong> raqamiga murojaat qilishingiz mumkin.
            </p>
          </section>
        </article>
      )}
    </div>
  );
}
