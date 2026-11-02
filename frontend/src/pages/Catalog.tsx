import { FormEvent, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api, Brand, Category, Paged, Product } from "../api";
import { Pager, ProductCard } from "../components/Shell";
import { MedaxEmblem } from "../components/MedaxLogo";
import { useI18n } from "../context/I18nContext";
import { localizeCategory } from "../utils/localize";

export default function Catalog() {
  const { lang, t } = useI18n();
  const [sp, setSp] = useSearchParams();
  const [cats, setCats] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [data, setData] = useState<Paged<Product> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState(sp.get("q") || "");

  // URL Query state
  const category = sp.get("category") || "";
  const brand = sp.get("brand") || "";
  const flag = sp.get("flag") || "";
  const minPrice = sp.get("minPrice") || "";
  const maxPrice = sp.get("maxPrice") || "";
  const sort = sp.get("sort") || "new";
  const page = Number(sp.get("page") || 1);
  const qs = sp.get("q") || "";

  // Local inputs for price range
  const [localMin, setLocalMin] = useState(minPrice);
  const [localMax, setLocalMax] = useState(maxPrice);

  useEffect(() => {
    setLocalMin(minPrice);
    setLocalMax(maxPrice);
  }, [minPrice, maxPrice]);

  useEffect(() => {
    api<Category[]>("/categories").then(setCats).catch(() => {});
    api<Brand[]>("/brands").then(setBrands).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    setError("");
    const params = new URLSearchParams();
    if (qs) params.set("q", qs);
    if (category) params.set("category", category);
    if (brand) params.set("brand", brand);
    if (flag) params.set("flag", flag);
    if (minPrice) params.set("minPrice", minPrice);
    if (maxPrice) params.set("maxPrice", maxPrice);
    params.set("sort", sort);
    params.set("page", String(page));

    api<Paged<Product>>(`/products?${params}`)
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [qs, category, brand, flag, minPrice, maxPrice, sort, page]);

  useEffect(() => setQ(qs), [qs]);

  const set = (patch: Record<string, string>) => {
    const next = new URLSearchParams(sp);
    Object.entries(patch).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    setSp(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const submitSearch = (e: FormEvent) => {
    e.preventDefault();
    set({ q: q.trim() });
  };

  const applyPriceFilter = (e?: FormEvent) => {
    e?.preventDefault();
    set({ minPrice: localMin.trim(), maxPrice: localMax.trim() });
  };

  const setPriceRange = (min: string, max: string) => {
    setLocalMin(min);
    setLocalMax(max);
    set({ minPrice: min, maxPrice: max });
  };

  const resetAllFilters = () => {
    setQ("");
    setLocalMin("");
    setLocalMax("");
    setSp(new URLSearchParams());
  };

  const hasAnyFilter = Boolean(category || brand || flag || minPrice || maxPrice || qs);

  const activeCat = Array.isArray(cats) ? cats.find((c) => c.slug === category) : undefined;
  const activeBrand = Array.isArray(brands) ? brands.find((b) => b.slug === brand) : undefined;

  return (
    <main className="wrap">
      {/* Breadcrumbs */}
      <div className="crumbs">
        <Link to="/">{lang === "ru" ? "Главная" : lang === "en" ? "Home" : "Bosh sahifa"}</Link> /{" "}
        <span onClick={resetAllFilters} style={{ cursor: hasAnyFilter ? "pointer" : "default" }}>
          {t("nav_catalog")}
        </span>
        {activeCat && <span> / {localizeCategory(activeCat.name || activeCat.slug, lang)}</span>}
        {activeBrand && <span> / {activeBrand.name}</span>}
      </div>

      <div className="catalog">
        {/* LEFT FILTERS SIDEBAR */}
        <aside className={`filters${open ? " open" : ""}`} aria-label={lang === "ru" ? "Фильтры" : lang === "en" ? "Filters" : "Filtrlar"}>
          <div className="filters-header-row">
            <h2 className="filters-main-title">{lang === "ru" ? "Фильтры" : lang === "en" ? "Filters" : "Filtrlar"}</h2>
            {hasAnyFilter && (
              <button type="button" className="btn-clear-all" onClick={resetAllFilters}>
                {lang === "ru" ? "Сбросить" : lang === "en" ? "Reset" : "Tozalash"}
              </button>
            )}
          </div>

          {/* 1. Kategoriya filtri */}
          <div className="filter-group">
            <h3>{t("filter_categories")}</h3>
            <ul className="filter-cat-list">
              <li>
                <a
                  href="#"
                  className={!category ? "on" : ""}
                  onClick={(e) => {
                    e.preventDefault();
                    set({ category: "" });
                  }}
                >
                  <span className="cat-name">{lang === "ru" ? "Все категории" : lang === "en" ? "All categories" : "Barcha toifalar"}</span>
                  <span className="cat-count-badge">{(Array.isArray(cats) ? cats : []).reduce((s, c) => s + (c.count || 0), 0)}</span>
                </a>
              </li>
              {(Array.isArray(cats) ? cats : []).map((c) => (
                <li key={c.id}>
                  <a
                    href="#"
                    className={category === c.slug ? "on" : ""}
                    onClick={(e) => {
                      e.preventDefault();
                      set({ category: c.slug });
                    }}
                    title={localizeCategory(c.name || c.slug, lang)}
                  >
                    <span className="cat-name">{localizeCategory(c.name || c.slug, lang)}</span>
                    <span className="cat-count-badge">{c.count}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* 2. Maxsus belgilar (Flag: yangi / ommabop) */}
          <div className="filter-group">
            <h3>{lang === "ru" ? "Особенности" : lang === "en" ? "Highlights" : "Maxsus belgilar"}</h3>
            <ul className="filter-radio-list">
              {[
                ["", lang === "ru" ? "Все" : lang === "en" ? "All" : "Barchasi"],
                ["discount", lang === "ru" ? "Скидки и Акции" : lang === "en" ? "Discounts & Offers" : "Chegirmalar va Aksiya %"],
                ["new", lang === "ru" ? "Новые модели" : lang === "en" ? "New equipment" : "Yangi uskunalar"],
                ["hit", lang === "ru" ? "Популярные (Хит)" : lang === "en" ? "Popular (Hit)" : "Ommabop modellar (Xit)"],
              ].map(([val, label]) => {
                const isSelected = (!val && !flag) || (val === flag);
                return (
                  <li key={val}>
                    <a
                      href="#"
                      className={isSelected ? "on" : ""}
                      onClick={(e) => {
                        e.preventDefault();
                        set({ flag: val });
                      }}
                    >
                      <span className="status-label">{label}</span>
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* 3. Narx filtri (Price Range) */}
          <div className="filter-group">
            <h3>{lang === "ru" ? "Цена (сум)" : lang === "en" ? "Price (UZS)" : "Narx (so'm)"}</h3>
            <form onSubmit={applyPriceFilter} className="price-filter-box">
              <div className="price-inputs-row">
                <input
                  type="number"
                  placeholder={lang === "ru" ? "От 0" : lang === "en" ? "From 0" : "0 dan"}
                  value={localMin}
                  onChange={(e) => setLocalMin(e.target.value)}
                  className="price-input"
                  min={0}
                />
                <span className="price-range-sep">—</span>
                <input
                  type="number"
                  placeholder={lang === "ru" ? "До 50 млн" : lang === "en" ? "Up to 50M" : "50 000 000 gacha"}
                  value={localMax}
                  onChange={(e) => setLocalMax(e.target.value)}
                  className="price-input"
                  min={0}
                />
              </div>

              {/* Quick range presets */}
              <div className="price-preset-chips">
                <button
                  type="button"
                  className={`chip ${!minPrice && !maxPrice ? "active" : ""}`}
                  onClick={() => setPriceRange("", "")}
                >
                  {t("filter_all")}
                </button>
                <button
                  type="button"
                  className={`chip ${maxPrice === "10000000" ? "active" : ""}`}
                  onClick={() => setPriceRange("0", "10000000")}
                >
                  &lt; 10 млн
                </button>
                <button
                  type="button"
                  className={`chip ${minPrice === "10000000" && maxPrice === "30000000" ? "active" : ""}`}
                  onClick={() => setPriceRange("10000000", "30000000")}
                >
                  10 - 30 млн
                </button>
                <button
                  type="button"
                  className={`chip ${minPrice === "30000000" ? "active" : ""}`}
                  onClick={() => setPriceRange("30000000", "99000000")}
                >
                  &gt; 30 млн
                </button>
              </div>

              <button type="submit" className="btn btn-apply-price">
                {lang === "ru" ? "Применить" : lang === "en" ? "Apply" : "Qo'llash"}
              </button>
            </form>
          </div>

          {/* 5. Brendlar filtri */}
          <div className="filter-group">
            <h3>{t("filter_brands")}</h3>
            <ul className="filter-brands-list">
              <li>
                <a
                  href="#"
                  className={!brand ? "on" : ""}
                  onClick={(e) => {
                    e.preventDefault();
                    set({ brand: "" });
                  }}
                >
                  <span>{lang === "ru" ? "Все бренды" : lang === "en" ? "All brands" : "Barcha brendlar"}</span>
                  <span className="cat-count-badge">{(Array.isArray(brands) ? brands : []).reduce((s, b) => s + (b.count || 0), 0)}</span>
                </a>
              </li>
              {(Array.isArray(brands) ? brands : []).map((b) => (
                <li key={b.id}>
                  <a
                    href="#"
                    className={brand === b.slug ? "on" : ""}
                    onClick={(e) => {
                      e.preventDefault();
                      set({ brand: b.slug });
                    }}
                  >
                    <span>{b.name}</span>
                    <span className="cat-count-badge">{b.count}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </aside>

        {/* RIGHT PRODUCTS & TOOLBAR AREA */}
        <section className="catalog-main-content">
          {/* Top Search & Sort Toolbar */}
          <div className="toolbar">
            <form className="search medax-search" role="search" onSubmit={submitSearch}>
              <div className="search-logo-indicator" title="Medax">
                <MedaxEmblem size={24} />
              </div>
              <input
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={t("search_placeholder")}
                aria-label={t("search_placeholder")}
              />
              <button className="btn btn-search" type="submit">
                {t("btn_search")}
              </button>
            </form>

            <button className="btn ghost fbtn" onClick={() => setOpen((v) => !v)}>
              {lang === "ru" ? "Фильтры" : lang === "en" ? "Filters" : "Filtrlar"} ({hasAnyFilter ? "1+" : "0"})
            </button>

            <select
              value={sort}
              onChange={(e) => set({ sort: e.target.value })}
              aria-label="Saralash"
              className="catalog-sort-select"
            >
              <option value="new">{lang === "ru" ? "Сначала новые" : lang === "en" ? "Newest first" : "Yangilari avval"}</option>
              <option value="name">{lang === "ru" ? "По названию" : lang === "en" ? "By name" : "Nomi bo'yicha"}</option>
              <option value="price_asc">{t("sort_price_asc")}</option>
              <option value="price_desc">{t("sort_price_desc")}</option>
            </select>
          </div>

          {/* Active Filter Pills Bar */}
          {hasAnyFilter && (
            <div className="active-filter-pills-bar">
              <span className="active-filters-label">{lang === "ru" ? "Активные фильтры:" : lang === "en" ? "Active filters:" : "Faol filtrlar:"}</span>
              {activeCat && (
                <span className="active-pill" onClick={() => set({ category: "" })}>
                  {localizeCategory(activeCat.name || activeCat.slug, lang)} <span className="pill-x">✕</span>
                </span>
              )}
              {activeBrand && (
                <span className="active-pill" onClick={() => set({ brand: "" })}>
                  Brend: {activeBrand.name} <span className="pill-x">✕</span>
                </span>
              )}
              {flag === "discount" && (
                <span className="active-pill" onClick={() => set({ flag: "" })}>
                  {lang === "ru" ? "Скидки" : lang === "en" ? "Discounts" : "Chegirmalar %"} <span className="pill-x">✕</span>
                </span>
              )}
              {flag === "new" && (
                <span className="active-pill" onClick={() => set({ flag: "" })}>
                  {lang === "ru" ? "Новые" : lang === "en" ? "New" : "Yangi uskunalar"} <span className="pill-x">✕</span>
                </span>
              )}
              {flag === "hit" && (
                <span className="active-pill" onClick={() => set({ flag: "" })}>
                  {lang === "ru" ? "Популярные" : lang === "en" ? "Popular" : "Ommabop (Xit)"} <span className="pill-x">✕</span>
                </span>
              )}
              {(minPrice || maxPrice) && (
                <span className="active-pill" onClick={() => set({ minPrice: "", maxPrice: "" })}>
                  Narx: {minPrice ? `${Number(minPrice) / 1_000_000} mln` : "0"} —{" "}
                  {maxPrice ? `${Number(maxPrice) / 1_000_000} mln` : "max"}{" "}
                  <span className="pill-x">✕</span>
                </span>
              )}
              {qs && (
                <span className="active-pill" onClick={() => set({ q: "" })}>
                  "{qs}" <span className="pill-x">✕</span>
                </span>
              )}
              <button type="button" className="btn-clear-inline" onClick={resetAllFilters}>
                {lang === "ru" ? "Сбросить всё" : lang === "en" ? "Clear all" : "Barchasini tozalash"}
              </button>
            </div>
          )}

          {error && <p className="err">{error}</p>}

          {/* Results count bar */}
          <div className="catalog-status-bar">
            <span className="results-badge">
              <span className="live-radar-dot" />
              {loading
                ? (lang === "ru" ? "Каталог обновляется…" : lang === "en" ? "Updating catalog…" : "Medax katalogi yangilanmoqda…")
                : `${data?.total ?? 0} ${t("items_count")}`}
            </span>
          </div>

          {/* Loading or Products Grid */}
          {loading ? (
            <div className="med-catalog-loader">
              <div className="med-loader-emblem">
                <MedaxEmblem size={48} />
                <span className="med-loader-radar-ring" />
              </div>
              <div className="med-loader-heartbeat">
                <svg viewBox="0 0 120 40" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M0,20 L30,20 L40,8 L50,32 L60,14 L70,24 L80,20 L120,20" />
                </svg>
              </div>
              <p>{lang === "ru" ? "Загрузка каталога..." : lang === "en" ? "Loading equipment catalog..." : "Medax katalogidan tibbiy uskunalar yuklanmoqda…"}</p>
            </div>
          ) : data?.items && data.items.length > 0 ? (
            <div className="grid catalog-products-grid">
              {data.items.map((p) => (
                <ProductCard key={p.id} p={p} />
              ))}
            </div>
          ) : (
            /* Modern Medical Empty State */
            <div className="medax-empty-catalog">
              <div className="empty-radar-emblem">
                <div className="empty-pulse-radar" />
                <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </div>
              <h2>{t("not_found_products")}</h2>
              <p>
                {lang === "ru"
                  ? "По вашему запросу медицинское оборудование не найдено. Попробуйте сбросить фильтры."
                  : lang === "en"
                  ? "No equipment found matching your criteria. Try resetting filters."
                  : "Tanlangan filtrlar bo'yicha hech qanday tibbiy uskuna topilmadi. Filtrlarni tozalab ko'ring."}
              </p>
              <div className="empty-catalog-actions">
                <button type="button" className="btn btn-primary-sheen" onClick={resetAllFilters}>
                  {lang === "ru" ? "Сбросить фильтры" : lang === "en" ? "Reset filters" : "Filtrlarni tozalash"}
                </button>
                <Link to="/" className="btn ghost">
                  {lang === "ru" ? "На главную" : lang === "en" ? "Go Home" : "Bosh sahifaga qaytish"}
                </Link>
              </div>
            </div>
          )}

          {/* Pagination */}
          {data && !loading && data.pages > 1 && (
            <Pager page={data.page} pages={data.pages} onPage={(n) => set({ page: String(n) })} />
          )}
        </section>
      </div>
    </main>
  );
}
