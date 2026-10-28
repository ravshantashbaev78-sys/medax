import { FormEvent, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, Brand, Category, Product } from "../api";
import { ProductCard } from "../components/Shell";
import { useI18n } from "../context/I18nContext";
import { useTheme } from "../context/ThemeContext";
import { MedaxEmblem } from "../components/MedaxLogo";
import { localizeCategory } from "../utils/localize";

interface HomeData {
  total: number;
  categories: Category[];
  brands: Brand[];
  hits: Product[];
  news: Product[];
  latest: Product[];
}

export interface BannerBadge {
  type: "original" | "warranty";
  label: Record<"uz" | "ru" | "en", string>;
}

export interface HeroSlide {
  id: number;
  titleLines: Record<"uz" | "ru" | "en", [string, string]>;
  badges: BannerBadge[];
  img: string;
  alt: string;
  link: string;
  bg: string;
  darkBg: string;
}

export const HERO_SLIDES: HeroSlide[] = [
  {
    id: 1,
    titleLines: {
      uz: ["Pultli nogironlar aravachasi", "Endi Medax’da"],
      ru: ["Коляски с электроприводом", "Теперь в Medax"],
      en: ["Powered Wheelchairs", "Now at Medax"],
    },
    badges: [
      { type: "original", label: { uz: "Original", ru: "Оригинал", en: "Original" } },
      { type: "warranty", label: { uz: "1 yil kafolat", ru: "Гарантия 1 год", en: "1 Year Warranty" } },
    ],
    img: "/banners/wheelchair-remote.png",
    alt: "Pultli nogironlar aravachasi",
    link: "/catalog?category=reabilitatsiya-va-invalit-aravachalari",
    bg: "#eef1f7",
    darkBg: "#111c2a",
  },
  {
    id: 2,
    titleLines: {
      uz: ["Zamonaviy UZI apparatlari", "Endi Medax’da"],
      ru: ["Современные аппараты УЗИ", "Теперь в Medax"],
      en: ["Advanced Ultrasound Systems", "Now at Medax"],
    },
    badges: [
      { type: "original", label: { uz: "Original", ru: "Оригинал", en: "Original" } },
      { type: "warranty", label: { uz: "Rasmiy kafolat", ru: "Официальная гарантия", en: "Official Warranty" } },
    ],
    img: "/banners/medical-diag.jpg",
    alt: "Zamonaviy UZI apparatlari",
    link: "/catalog?category=ultratovush-diagnostikasi",
    bg: "#eaf0f6",
    darkBg: "#141e2b",
  },
  {
    id: 3,
    titleLines: {
      uz: ["Reanimatsiya va IVL jihozlari", "Endi Medax’da"],
      ru: ["Оборудование ИВЛ и реанимации", "Теперь в Medax"],
      en: ["ICU & Ventilators", "Now at Medax"],
    },
    badges: [
      { type: "original", label: { uz: "Original", ru: "Оригинал", en: "Original" } },
      { type: "warranty", label: { uz: "24/7 servis", ru: "Сервис 24/7", en: "24/7 Service" } },
    ],
    img: "/banners/medical-surgery.jpg",
    alt: "Reanimatsiya va IVL jihozlari",
    link: "/catalog?category=reanimatsiya-va-anesteziologiya",
    bg: "#f3eff1",
    darkBg: "#1e141a",
  },
  {
    id: 4,
    titleLines: {
      uz: ["Funksional tibbiy kravatlar", "Endi Medax’da"],
      ru: ["Функциональные койки и кровати", "Теперь в Medax"],
      en: ["Functional Hospital Beds", "Now at Medax"],
    },
    badges: [
      { type: "original", label: { uz: "Original", ru: "Оригинал", en: "Original" } },
      { type: "warranty", label: { uz: "1 yil kafolat", ru: "Гарантия 1 год", en: "1 Year Warranty" } },
    ],
    img: "/banners/medical-bed.jpg",
    alt: "Funksional tibbiy kravatlar",
    link: "/catalog?category=tibbiy-mebel",
    bg: "#ebf3ef",
    darkBg: "#122019",
  },
];

export default function Home() {
  const nav = useNavigate();
  const { lang, t } = useI18n();
  const { theme } = useTheme();
  const [data, setData] = useState<HomeData | null>(null);
  const [tab, setTab] = useState<"latest" | "hits">("latest");
  const [q, setQ] = useState("");
  const [error, setError] = useState("");
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isCarouselPaused, setIsCarouselPaused] = useState(false);

  // Touch swipe support for mobile
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);
  const touchEndY = useRef<number | null>(null);
  const didSwipe = useRef(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    didSwipe.current = false;
    touchEndX.current = null;
    touchEndY.current = null;
    touchStartX.current = e.targetTouches[0].clientX;
    touchStartY.current = e.targetTouches[0].clientY;
    setIsCarouselPaused(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
    touchEndY.current = e.targetTouches[0].clientY;
  };

  const handleTouchEnd = () => {
    setIsCarouselPaused(false);
    if (touchStartX.current === null || touchEndX.current === null) return;
    const diffX = touchStartX.current - touchEndX.current;
    const diffY = (touchStartY.current || 0) - (touchEndY.current || 0);

    // If swipe was horizontal (> 40px and dominant over vertical)
    if (Math.abs(diffX) > 40 && Math.abs(diffX) > Math.abs(diffY)) {
      didSwipe.current = true;
      if (diffX > 0) {
        // Swiped Left -> Next slide
        setCurrentSlide((prev) => (prev + 1) % HERO_SLIDES.length);
      } else {
        // Swiped Right -> Previous slide
        setCurrentSlide((prev) => (prev === 0 ? HERO_SLIDES.length - 1 : prev - 1));
      }
    }

    touchStartX.current = null;
    touchStartY.current = null;
    touchEndX.current = null;
    touchEndY.current = null;
  };

  // Carousel autoplay timer (every 5 seconds, pauses on hover/touch)
  useEffect(() => {
    if (isCarouselPaused) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % HERO_SLIDES.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [isCarouselPaused]);

  useEffect(() => {
    api<HomeData>("/home").then(setData).catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("visible");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -40px 0px" }
    );
    document.querySelectorAll(".reveal, .reveal-scale").forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [data, tab]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    nav(q.trim() ? `/catalog?q=${encodeURIComponent(q.trim())}` : "/catalog");
  };

  const list = data && data[tab] ? data[tab] : [];

  return (
    <main>
      {/* Uzum-style Big Hero Slider Banner */}
      <section className="uz-hero-section">
        <div className="wrap">
          <div
            className="uz-banner-carousel"
            onMouseEnter={() => setIsCarouselPaused(true)}
            onMouseLeave={() => setIsCarouselPaused(false)}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {/* Prev arrow button */}
            <button
              type="button"
              className="uz-carousel-nav prev"
              onClick={() => setCurrentSlide((prev) => (prev === 0 ? HERO_SLIDES.length - 1 : prev - 1))}
              aria-label="Oldingi slayd"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>

            {/* Active Slide (Uzum Market Style Clean Banner) */}
            <Link
              to={HERO_SLIDES[currentSlide].link}
              className="uz-carousel-slide active"
              key={HERO_SLIDES[currentSlide].id}
              onClick={(e) => {
                if (didSwipe.current) {
                  e.preventDefault();
                  didSwipe.current = false;
                }
              }}
              style={{ background: theme === "dark" ? HERO_SLIDES[currentSlide].darkBg : HERO_SLIDES[currentSlide].bg }}
            >
              <div className="uz-slide-content">
                <div className="uzum-banner-brand">
                  <MedaxEmblem size={20} />
                  <span className="uzum-banner-brand-name">
                    <span className="brand-med">Med</span>
                    <span className="brand-ax">ax</span>
                  </span>
                  <span className="uzum-banner-brand-tag">{t("official_store")}</span>
                </div>

                <h1 className="uzum-banner-title">
                  <span className="title-primary">{HERO_SLIDES[currentSlide].titleLines[lang][0]}</span>
                  <span className="title-secondary">{HERO_SLIDES[currentSlide].titleLines[lang][1]}</span>
                </h1>

                <div className="uzum-banner-badges">
                  {HERO_SLIDES[currentSlide].badges.map((b, idx) => (
                    <div key={idx} className="uzum-badge-pill">
                      {b.type === "original" ? (
                        <svg className="uzum-badge-icon badge-icon-original" width="20" height="20" viewBox="0 0 24 24" fill="none">
                          <defs>
                            <linearGradient id="origBadgeGrad" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
                              <stop stopColor="#10b981" />
                              <stop offset="1" stopColor="#059669" />
                            </linearGradient>
                          </defs>
                          <path
                            d="M12 2l2.3 2.1 3.1-.5 1.5 2.7 3 1.1-.3 3.2 2.1 2.4-1.7 2.7.9 3.1-3 1.2-1.3 2.8-3.1-.3L12 22l-2.5-1.7-3.1.3-1.3-2.8-3-1.2.9-3.1-1.7-2.7 2.1-2.4-.3-3.2 3-1.1 1.5-2.7 3.1.5L12 2z"
                            fill="url(#origBadgeGrad)"
                          />
                          <path d="M8.5 12.2l2.4 2.4 4.8-4.8" stroke="#ffffff" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      ) : (
                        <svg className="uzum-badge-icon badge-icon-warranty" width="20" height="20" viewBox="0 0 24 24" fill="none">
                          <defs>
                            <linearGradient id="warrBadgeGrad" x1="4" y1="2" x2="20" y2="23" gradientUnits="userSpaceOnUse">
                              <stop stopColor="#0ea5e9" />
                              <stop offset="1" stopColor="#0284c7" />
                            </linearGradient>
                          </defs>
                          <path
                            d="M12 2L4 5.5v5.8c0 5.4 3.4 10.4 8 11.7 4.6-1.3 8-6.3 8-11.7V5.5L12 2z"
                            fill="url(#warrBadgeGrad)"
                          />
                          <path d="M9 12l2 2 4.2-4.2" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                      <span>{b.label[lang]}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="uz-slide-visual">
                <div className="uz-slide-visual-showcase">
                  <img
                    src={HERO_SLIDES[currentSlide].img}
                    alt={HERO_SLIDES[currentSlide].alt}
                    className="uzum-slide-product-img"
                  />
                </div>
              </div>
            </Link>

            {/* Next arrow button */}
            <button
              type="button"
              className="uz-carousel-nav next"
              onClick={() => setCurrentSlide((prev) => (prev + 1) % HERO_SLIDES.length)}
              aria-label="Keyingi slayd"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>

            {/* Carousel navigation indicator dots */}
            <div className="uz-carousel-dots">
              {HERO_SLIDES.map((s, idx) => (
                <button
                  key={s.id}
                  type="button"
                  className={`dot ${idx === currentSlide ? "active" : ""}`}
                  onClick={() => setCurrentSlide(idx)}
                  aria-label={`Slayd ${idx + 1}`}
                />
              ))}
            </div>
          </div>

          {/* Uzum-style 4 Quick Category Cards below banner */}
          <div className="uz-quick-tiles">
            <Link to="/catalog?category=tibbiy-buyumlar" className="uz-quick-tile">
              <div className="tile-icon-wrap">🩹</div>
              <div className="tile-info">
                <strong>{t("quick_ventilator_title")}</strong>
                <span>{t("quick_ventilator_sub")}</span>
              </div>
            </Link>

            <Link to="/catalog?category=tibbiy-apparaturalar" className="uz-quick-tile">
              <div className="tile-icon-wrap">🔬</div>
              <div className="tile-info">
                <strong>{t("quick_ultrasound_title")}</strong>
                <span>{t("quick_ultrasound_sub")}</span>
              </div>
            </Link>

            <Link to="/catalog?category=tibbiy-jihozlar" className="uz-quick-tile">
              <div className="tile-icon-wrap">🛏️</div>
              <div className="tile-info">
                <strong>{t("quick_surgery_title")}</strong>
                <span>{t("quick_surgery_sub")}</span>
              </div>
            </Link>

            <Link to="/catalog?category=ortopedik-mahsulotlar" className="uz-quick-tile">
              <div className="tile-icon-wrap">♿</div>
              <div className="tile-info">
                <strong>{t("quick_furniture_title")}</strong>
                <span>{t("quick_furniture_sub")}</span>
              </div>
            </Link>
          </div>
        </div>
      </section>

      <div className="wrap">
        <div className="facts stagger-items">
          <div className="fact-item reveal">
            <div className="fact-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="3" width="20" height="14" rx="2" />
                <path d="M8 21h8M12 17v4M7 10h2l2-3 2 6 2-3h2" />
              </svg>
            </div>
            <div className="fact-text">
              <b>{t("trust_1_title")}</b>
              <span>{t("trust_1_desc")}</span>
            </div>
          </div>

          <div className="fact-item reveal">
            <div className="fact-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1 4-10z" />
              </svg>
            </div>
            <div className="fact-text">
              <b>{t("trust_2_title")}</b>
              <span>{t("trust_2_desc")}</span>
            </div>
          </div>

          <div className="fact-item reveal">
            <div className="fact-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <path d="M9 12l2 2 4-4" />
              </svg>
            </div>
            <div className="fact-text">
              <b>{t("trust_3_title")}</b>
              <span>{t("trust_3_desc")}</span>
            </div>
          </div>

          <div className="fact-item reveal">
            <div className="fact-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
              </svg>
            </div>
            <div className="fact-text">
              <b>{t("trust_4_title")}</b>
              <span>{t("trust_4_desc")}</span>
            </div>
          </div>
        </div>
      </div>

      {error && <div className="wrap"><p className="err">{error}</p></div>}

      <section className="sec">
        <div className="wrap">
          <div className="sec-head-wrap reveal">
            <h2>{t("categories_title")}</h2>
            <span className="sec-sub">{t("categories_sub")}</span>
          </div>
          <div className="cats stagger-items">
            {data?.categories?.map((c) => (
              <Link key={c.id} className="cat reveal" to={`/catalog?category=${c.slug}`}>
                <div className="cat-content">
                  <h3>{localizeCategory(c.slug || c.name, lang)}</h3>
                  <div className="cat-meta">
                    <small>{c.count} {t("items_count")}</small>
                    <span className="cat-arrow" aria-hidden="true">→</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="sec products-sec">
        <div className="wrap">
          <div className="bar reveal">
            <h2>{t("products_title")}</h2>
            <div role="tablist" aria-label="Mahsulot turi">
              {([["latest", t("tab_latest")], ["hits", t("tab_hits")]] as const).map(([k, label]) => (
                <button
                  key={k}
                  className="tab"
                  role="tab"
                  aria-selected={tab === k}
                  onClick={() => setTab(k)}
                >
                  {label}
                </button>
              ))}
            </div>
            <Link className="catalog-text-link" to="/catalog">
              <span>{t("view_all_catalog")}</span>
              <span className="link-arrow">→</span>
            </Link>
          </div>
          <div className="grid stagger-items">
            {list.map((p) => <ProductCard key={p.id} p={p} />)}
            {data && list.length === 0 && <div className="empty">{t("not_found_products")}</div>}
          </div>
        </div>
      </section>

      {/* Rasmiy hamkor brendlar */}
      <section className="sec brands-sec" id="brend">
        <div className="wrap">
          <div className="sec-head-wrap text-center reveal">
            <h2>{t("brands_title")}</h2>
            <span className="sec-sub">{t("brands_sub")}</span>
          </div>

          <div className="brands-clean-grid stagger-items">
            {[
              { id: 1, name: "DIRUI", slug: "dirui", country: "Xitoy", logo: "/brands/dirui.png" },
              { id: 2, name: "Rayto", slug: "rayto", country: "Xitoy", logo: "/brands/rayto.png" },
              { id: 3, name: "CHISON", slug: "chison", country: "Xitoy", logo: "/brands/chison.png" },
              { id: 4, name: "Human Diagnostics", slug: "human", country: "Germaniya", logo: "/brands/human.png" },
              { id: 5, name: "CYPRESS DIAGNOSTICS", slug: "cypress", country: "Belgiya", logo: "/brands/cypress.png" },
              { id: 6, name: "Mindray", slug: "mindray", country: "Xitoy", logo: "/brands/mindray.png" },
            ].map((b) => (
              <Link
                key={b.id}
                className="brand-clean-card reveal"
                to={`/catalog?brand=${b.slug}`}
                title={`${b.name} (${b.country})`}
              >
                <div className="brand-logo-box">
                  <img src={b.logo} alt={b.name} loading="lazy" />
                </div>
                <strong className="brand-clean-name">{b.name}</strong>
                <span className="brand-clean-country">{b.country}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
