import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api, Brand, Category, Paged, Product } from "../api";
import { Pager, ProductCard } from "../components/Shell";
import { useI18n } from "../context/I18nContext";
import { localizeCategory } from "../utils/localize";

/** Narx oraliqlari (so'm): tez tanlash uchun */
const PRICE_PRESETS: { min: string; max: string; uz: string; ru: string; en: string }[] = [
  { min: "", max: "1000000", uz: "1 mln gacha", ru: "до 1 млн", en: "under 1M" },
  { min: "1000000", max: "10000000", uz: "1–10 mln", ru: "1–10 млн", en: "1–10M" },
  { min: "10000000", max: "", uz: "10 mln dan", ru: "от 10 млн", en: "10M+" },
];

const fmtMoney = (v: string) => Number(v).toLocaleString("ru-RU").replace(/ |,/g, " ");

function CloseIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

function Section({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <section className="ct-sec">
      {title && <h3 className="ct-sec-title">{title}</h3>}
      {children}
    </section>
  );
}

export default function Catalog() {
  const { lang, t } = useI18n();
  const tr = (uz: string, ru: string, en: string) => (lang === "ru" ? ru : lang === "en" ? en : uz);
  const [sp, setSp] = useSearchParams();
  const [cats, setCats] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [data, setData] = useState<Paged<Product> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [brandQuery, setBrandQuery] = useState("");
  const [showAllBrands, setShowAllBrands] = useState(false);

  const category = sp.get("category") || "";
  const brandParam = sp.get("brand") || "";
  const selectedBrands = useMemo(() => brandParam.split(",").filter(Boolean), [brandParam]);
  const flag = sp.get("flag") || "";
  const minPrice = sp.get("minPrice") || "";
  const maxPrice = sp.get("maxPrice") || "";
  const inStock = sp.get("inStock") === "1";
  const sort = sp.get("sort") || "new";
  const page = Number(sp.get("page") || 1);
  const qs = sp.get("q") || "";

  const [q, setQ] = useState(qs);
  const [localMin, setLocalMin] = useState(minPrice);
  const [localMax, setLocalMax] = useState(maxPrice);
  useEffect(() => setQ(qs), [qs]);
  useEffect(() => {
    setLocalMin(minPrice);
    setLocalMax(maxPrice);
  }, [minPrice, maxPrice]);

  useEffect(() => {
    api<Category[]>("/categories").then((r) => setCats(Array.isArray(r) ? r : [])).catch(() => {});
    api<Brand[]>("/brands").then((r) => setBrands(Array.isArray(r) ? r : [])).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    setError("");
    const params = new URLSearchParams();
    if (qs) params.set("q", qs);
    if (category) params.set("category", category);
    if (brandParam) params.set("brand", brandParam);
    if (flag) params.set("flag", flag);
    if (minPrice) params.set("minPrice", minPrice);
    if (maxPrice) params.set("maxPrice", maxPrice);
    if (inStock) params.set("inStock", "1");
    params.set("sort", sort);
    params.set("page", String(page));
    api<Paged<Product>>(`/products?${params}`)
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [qs, category, brandParam, flag, minPrice, maxPrice, inStock, sort, page]);

  // Eski havola (masalan ?page=3) mavjud sahifalardan katta bo'lsa, oxirgi sahifaga o'tamiz
  useEffect(() => {
    if (!loading && data && data.items.length === 0 && data.total > 0 && page > data.pages) {
      const next = new URLSearchParams(sp);
      if (data.pages > 1) next.set("page", String(data.pages));
      else next.delete("page");
      setSp(next, { replace: true });
    }
  }, [loading, data, page]); // eslint-disable-line react-hooks/exhaustive-deps

  // Telefonda ochiq filtr oynasi orqasidagi sahifa aylanmasin
  useEffect(() => {
    if (!sheetOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setSheetOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [sheetOpen]);

  /** Filtr o'zgarsa 1-sahifaga qaytamiz: aks holda 3-sahifada bo'sh natija ko'rinardi */
  const set = (patch: Record<string, string>, keepPage = false) => {
    const next = new URLSearchParams(sp);
    Object.entries(patch).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    if (!keepPage) next.delete("page");
    setSp(next);
    if (!sheetOpen) window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const toggleBrand = (slug: string) => {
    const next = selectedBrands.includes(slug) ? selectedBrands.filter((b) => b !== slug) : [...selectedBrands, slug];
    set({ brand: next.join(",") });
  };

  const applyPrice = (e?: FormEvent) => {
    e?.preventDefault();
    const clean = (v: string) => v.replace(/\D/g, "");
    set({ minPrice: clean(localMin), maxPrice: clean(localMax) });
  };

  const resetAll = () => {
    setQ("");
    setBrandQuery("");
    setSp(new URLSearchParams(sort !== "new" ? { sort } : {}));
  };

  const totalAll = cats.reduce((s, c) => s + (c.count || 0), 0);
  const activeCat = cats.find((c) => c.slug === category);
  // Mahsuloti yo'q brendlar ro'yxatni to'ldirmasin (tanlanganlari bundan mustasno)
  const brandList = brands
    .filter((b) => (b.count || 0) > 0 || selectedBrands.includes(b.slug))
    .filter((b) => !brandQuery || b.name.toLowerCase().includes(brandQuery.toLowerCase()));
  const visibleBrands = showAllBrands || brandQuery ? brandList : brandList.slice(0, 6);

  const flags = [
    { v: "discount", label: tr("Chegirma", "Скидки", "Discount") },
    { v: "new", label: tr("Yangi", "Новинки", "New") },
    { v: "hit", label: tr("Ommabop", "Хиты", "Popular") },
  ];

  const priceLabel =
    minPrice || maxPrice
      ? PRICE_PRESETS.find((p) => p.min === minPrice && p.max === maxPrice)?.[lang === "ru" ? "ru" : lang === "en" ? "en" : "uz"] ||
        `${minPrice ? fmtMoney(minPrice) : "0"} – ${maxPrice ? fmtMoney(maxPrice) : "∞"}`
      : "";

  const chips: { key: string; label: string; clear: () => void }[] = [];
  if (qs) chips.push({ key: "q", label: `“${qs}”`, clear: () => set({ q: "" }) });
  if (activeCat) chips.push({ key: "cat", label: localizeCategory(activeCat.name || activeCat.slug, lang), clear: () => set({ category: "" }) });
  selectedBrands.forEach((slug) => {
    const b = brands.find((x) => x.slug === slug);
    chips.push({ key: `b-${slug}`, label: b?.name || slug, clear: () => toggleBrand(slug) });
  });
  if (inStock) chips.push({ key: "stock", label: tr("Mahsulot mavjud", "В наличии", "In stock"), clear: () => set({ inStock: "" }) });
  if (flag) chips.push({ key: "flag", label: flags.find((f) => f.v === flag)?.label || flag, clear: () => set({ flag: "" }) });
  if (priceLabel) chips.push({ key: "price", label: priceLabel, clear: () => set({ minPrice: "", maxPrice: "" }) });
  const filterCount = chips.filter((c) => c.key !== "q").length;

  const filters = (mobile: boolean) => (
    <>
      <Section title={tr("Toifa", "Категория", "Category")}>
        {mobile ? (
          <div className="ct-pills">
            <button type="button" className={`ct-pill${!category ? " on" : ""}`} onClick={() => set({ category: "" })}>
              {tr("Barchasi", "Все", "All")}
            </button>
            {cats.map((c) => (
              <button key={c.id} type="button" className={`ct-pill${category === c.slug ? " on" : ""}`} onClick={() => set({ category: c.slug })}>
                {localizeCategory(c.name || c.slug, lang)} · {c.count}
              </button>
            ))}
          </div>
        ) : (
          <div className="ct-cats">
            <button type="button" className={`ct-cat${!category ? " on" : ""}`} onClick={() => set({ category: "" })}>
              <span>{tr("Barcha toifalar", "Все категории", "All categories")}</span>
              <span className="ct-count">{totalAll}</span>
            </button>
            {cats.map((c) => (
              <button
                key={c.id}
                type="button"
                className={`ct-cat${category === c.slug ? " on" : ""}`}
                onClick={() => set({ category: c.slug })}
                aria-pressed={category === c.slug}
              >
                <span>{localizeCategory(c.name || c.slug, lang)}</span>
                <span className="ct-count">{c.count}</span>
              </button>
            ))}
          </div>
        )}
      </Section>

      <Section>
        <label className="ct-switch">
          <span>{tr("Faqat mavjud mahsulotlar", "Только в наличии", "In stock only")}</span>
          <input type="checkbox" checked={inStock} onChange={(e) => set({ inStock: e.target.checked ? "1" : "" })} />
          <span className="ct-switch-track" aria-hidden="true">
            <span />
          </span>
        </label>
      </Section>

      <Section title={tr("Narx, so'm", "Цена, сум", "Price, UZS")}>
        <form className="ct-price" onSubmit={applyPrice}>
          <label>
            <span>{tr("dan", "от", "from")}</span>
            <input
              inputMode="numeric"
              value={localMin ? fmtMoney(localMin.replace(/\D/g, "") || "0") : ""}
              onChange={(e) => setLocalMin(e.target.value.replace(/\D/g, ""))}
              onBlur={() => applyPrice()}
              placeholder="0"
            />
          </label>
          <label>
            <span>{tr("gacha", "до", "to")}</span>
            <input
              inputMode="numeric"
              value={localMax ? fmtMoney(localMax.replace(/\D/g, "") || "0") : ""}
              onChange={(e) => setLocalMax(e.target.value.replace(/\D/g, ""))}
              onBlur={() => applyPrice()}
              placeholder={tr("cheksiz", "без ограничений", "any")}
            />
          </label>
          <button type="submit" className="ct-hidden-submit" tabIndex={-1} aria-hidden="true" />
        </form>
        <div className="ct-pills">
          {PRICE_PRESETS.map((p) => {
            const on = minPrice === p.min && maxPrice === p.max;
            return (
              <button
                key={p.uz}
                type="button"
                className={`ct-pill soft${on ? " on" : ""}`}
                onClick={() => set(on ? { minPrice: "", maxPrice: "" } : { minPrice: p.min, maxPrice: p.max })}
                aria-pressed={on}
              >
                {p[lang === "ru" ? "ru" : lang === "en" ? "en" : "uz"]}
              </button>
            );
          })}
        </div>
      </Section>

      <Section title={tr("Belgilar", "Метки", "Labels")}>
        <div className="ct-pills">
          {flags.map((f) => (
            <button
              key={f.v}
              type="button"
              className={`ct-pill soft${flag === f.v ? " on" : ""}`}
              onClick={() => set({ flag: flag === f.v ? "" : f.v })}
              aria-pressed={flag === f.v}
            >
              {f.label}
            </button>
          ))}
        </div>
      </Section>

      {brandList.length > 0 || brandQuery ? (
        <Section title={tr("Brend", "Бренд", "Brand")}>
          {brands.filter((b) => (b.count || 0) > 0).length > 6 && (
            <input
              className="ct-brand-search"
              type="search"
              value={brandQuery}
              onChange={(e) => setBrandQuery(e.target.value)}
              placeholder={tr("Brendni qidirish", "Поиск бренда", "Find a brand")}
              aria-label={tr("Brendni qidirish", "Поиск бренда", "Find a brand")}
            />
          )}
          <div className="ct-checks">
            {visibleBrands.map((b) => (
              <label key={b.id} className="ct-check">
                <input type="checkbox" checked={selectedBrands.includes(b.slug)} onChange={() => toggleBrand(b.slug)} />
                <span className="ct-box" aria-hidden="true">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </span>
                <span className="ct-check-name">{b.name}</span>
                <span className="ct-count">{b.count}</span>
              </label>
            ))}
            {!brandQuery && brandList.length > 6 && (
              <button type="button" className="ct-more" onClick={() => setShowAllBrands((v) => !v)}>
                {showAllBrands ? tr("Kamroq", "Свернуть", "Show less") : tr(`Yana ${brandList.length - 6} ta`, `Ещё ${brandList.length - 6}`, `${brandList.length - 6} more`)}
              </button>
            )}
            {brandQuery && !visibleBrands.length && <p className="ct-muted">{tr("Topilmadi", "Не найдено", "Nothing found")}</p>}
          </div>
        </Section>
      ) : null}
    </>
  );

  const sortSelect = (
    <select className="ct-sort" value={sort} onChange={(e) => set({ sort: e.target.value }, false)} aria-label={tr("Saralash", "Сортировка", "Sort")}>
      <option value="new">{tr("Avval yangilari", "Сначала новые", "Newest first")}</option>
      <option value="price_asc">{tr("Arzonroq", "Сначала дешёвые", "Price: low to high")}</option>
      <option value="price_desc">{tr("Qimmatroq", "Сначала дорогие", "Price: high to low")}</option>
      <option value="name">{tr("Nomi bo'yicha", "По названию", "By name")}</option>
    </select>
  );

  const total = data?.total ?? 0;

  return (
    <main className="wrap ct-page">
      <nav className="ct-crumbs" aria-label={tr("Yo'l", "Навигация", "Breadcrumb")}>
        <Link to="/">{tr("Bosh sahifa", "Главная", "Home")}</Link>
        <span aria-hidden="true">/</span>
        {activeCat ? (
          <>
            <button type="button" onClick={() => set({ category: "" })}>
              {t("nav_catalog")}
            </button>
            <span aria-hidden="true">/</span>
            <span aria-current="page">{localizeCategory(activeCat.name || activeCat.slug, lang)}</span>
          </>
        ) : (
          <span aria-current="page">{t("nav_catalog")}</span>
        )}
      </nav>

      <header className="ct-head">
        <div>
          <h1>{activeCat ? localizeCategory(activeCat.name || activeCat.slug, lang) : t("nav_catalog")}</h1>
          <p className="ct-total">{loading && !data ? "…" : tr(`${total} ta mahsulot`, `${total} товаров`, `${total} products`)}</p>
        </div>
        <div className="ct-tools">
          <form
            className="ct-search"
            role="search"
            onSubmit={(e) => {
              e.preventDefault();
              set({ q: q.trim() });
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3.5-3.5" />
            </svg>
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={tr("Nomi, brend yoki artikul", "Название, бренд или артикул", "Name, brand or SKU")}
              aria-label={t("search_placeholder")}
            />
          </form>
          <div className="ct-desk-sort">{sortSelect}</div>
        </div>
        <div className="ct-mob-bar">
          <button type="button" className="ct-mob-btn" onClick={() => setSheetOpen(true)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M4 6h16M7 12h10M10 18h4" />
            </svg>
            {tr("Filtrlar", "Фильтры", "Filters")}
            {filterCount > 0 && <span className="ct-badge">{filterCount}</span>}
          </button>
          {sortSelect}
        </div>
      </header>

      <div className="ct-layout">
        <aside className="ct-side" aria-label={tr("Filtrlar", "Фильтры", "Filters")}>
          {filters(false)}
          {chips.length > 0 && (
            <div className="ct-side-foot">
              <button type="button" className="ct-reset" onClick={resetAll}>
                {tr("Filtrlarni tozalash", "Сбросить фильтры", "Reset filters")}
              </button>
            </div>
          )}
        </aside>

        <section className="ct-main">
          {chips.length > 0 && (
            <div className="ct-chips">
              {chips.map((c) => (
                <span key={c.key} className="ct-chip">
                  {c.label}
                  <button type="button" onClick={c.clear} aria-label={tr(`${c.label} filtrini olib tashlash`, `Убрать ${c.label}`, `Remove ${c.label}`)}>
                    <CloseIcon />
                  </button>
                </span>
              ))}
              <button type="button" className="ct-clear" onClick={resetAll}>
                {tr("Barchasini tozalash", "Сбросить всё", "Clear all")}
              </button>
            </div>
          )}

          {error && <p className="err">{error}</p>}

          {loading && !data ? (
            <div className="ct-grid" aria-busy="true">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="ct-skel">
                  <span className="ct-skel-img" />
                  <span className="ct-skel-line w60" />
                  <span className="ct-skel-line" />
                  <span className="ct-skel-line w40" />
                </div>
              ))}
            </div>
          ) : data && data.items.length > 0 ? (
            <div className={`ct-grid${loading ? " is-loading" : ""}`}>
              {data.items.map((p) => (
                <ProductCard key={p.id} p={p} />
              ))}
            </div>
          ) : (
            <div className="ct-empty">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
                <circle cx="11" cy="11" r="7" />
                <path d="M20 20l-3.5-3.5" />
              </svg>
              <h2>{tr("Hech narsa topilmadi", "Ничего не найдено", "Nothing found")}</h2>
              <p>{tr("Filtrlarni o'zgartiring yoki tozalang.", "Измените или сбросьте фильтры.", "Change or reset the filters.")}</p>
              {chips.length > 0 && (
                <button type="button" className="ct-reset primary" onClick={resetAll}>
                  {tr("Filtrlarni tozalash", "Сбросить фильтры", "Reset filters")}
                </button>
              )}
            </div>
          )}

          {data && data.pages > 1 && <Pager page={data.page} pages={data.pages} onPage={(n) => set({ page: String(n) }, true)} />}
        </section>
      </div>

      {sheetOpen && (
        <div className="ct-sheet-wrap">
          <button type="button" className="ct-scrim" aria-label={tr("Yopish", "Закрыть", "Close")} onClick={() => setSheetOpen(false)} />
          <div className="ct-sheet" role="dialog" aria-modal="true" aria-label={tr("Filtrlar", "Фильтры", "Filters")}>
            <div className="ct-sheet-head">
              <h2>{tr("Filtrlar", "Фильтры", "Filters")}</h2>
              <button type="button" className="ct-sheet-x" onClick={() => setSheetOpen(false)} aria-label={tr("Yopish", "Закрыть", "Close")}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="ct-sheet-body">{filters(true)}</div>
            <div className="ct-sheet-foot">
              <button type="button" className="ct-reset" onClick={resetAll} disabled={!filterCount}>
                {tr("Tozalash", "Сбросить", "Reset")}
              </button>
              <button type="button" className="ct-apply" onClick={() => setSheetOpen(false)}>
                {loading ? "…" : tr(`${total} ta mahsulotni ko'rish`, `Показать ${total}`, `Show ${total} products`)}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
