import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useI18n } from "../context/I18nContext";
import { api, Product, Category, money } from "../api";
import { DeviceIcon } from "./Shell";

interface UzumSearchBarProps {
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function useAnimatedPresence(isOpen: boolean, durationMs = 280) {
  const [mounted, setMounted] = useState(isOpen);
  const [animState, setAnimState] = useState<"entering" | "leaving">(isOpen ? "entering" : "leaving");

  useEffect(() => {
    if (isOpen) {
      setMounted(true);
      setAnimState("entering");
    } else if (mounted) {
      setAnimState("leaving");
      const timer = setTimeout(() => {
        setMounted(false);
      }, durationMs);
      return () => clearTimeout(timer);
    }
  }, [isOpen, mounted, durationMs]);

  return { mounted, animState };
}

export function UzumSearchBar({ isOpen: controlledIsOpen, onOpenChange }: UzumSearchBarProps = {}) {
  const { lang, t } = useI18n();
  const navigate = useNavigate();
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;

  const setIsOpen = (val: boolean) => {
    if (onOpenChange) {
      onOpenChange(val);
    } else {
      setInternalIsOpen(val);
    }
  };

  const { mounted, animState } = useAnimatedPresence(isOpen, 280);

  const [query, setQuery] = useState("");
  const [history, setHistory] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("medax_search_history");
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return [];
  });

  const [popularProducts, setPopularProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [liveResults, setLiveResults] = useState<Product[]>([]);
  const [isSearchingLive, setIsSearchingLive] = useState(false);

  const wrapperRef = useRef<HTMLDivElement>(null);

  // Close dropdown on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Fetch real popular products and categories when search opens
  useEffect(() => {
    if (isOpen) {
      api<{ items: Product[] }>("/products?limit=6&flag=hit")
        .then((res) => {
          if (res.items && res.items.length > 0) {
            setPopularProducts(res.items);
          } else {
            api<{ items: Product[] }>("/products?limit=6").then((r2) => {
              setPopularProducts(r2.items || []);
            });
          }
        })
        .catch(() => {});

      api<Category[]>("/categories")
        .then((cats) => setCategories(cats || []))
        .catch(() => {});
    }
  }, [isOpen]);

  // Live search when typing
  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setLiveResults([]);
      setIsSearchingLive(false);
      return;
    }
    setIsSearchingLive(true);
    const timer = setTimeout(() => {
      api<{ items: Product[] }>(`/products?q=${encodeURIComponent(trimmed)}&limit=6`)
        .then((res) => {
          setLiveResults(res.items || []);
        })
        .catch(() => setLiveResults([]))
        .finally(() => setIsSearchingLive(false));
    }, 220);
    return () => clearTimeout(timer);
  }, [query]);

  const saveAndSearch = (term: string) => {
    const trimmed = term.trim();
    if (!trimmed) {
      setIsOpen(false);
      navigate("/catalog");
      return;
    }

    const updated = [trimmed, ...history.filter((h) => h.toLowerCase() !== trimmed.toLowerCase())].slice(0, 6);
    setHistory(updated);
    try {
      localStorage.setItem("medax_search_history", JSON.stringify(updated));
    } catch {
      // ignore
    }

    setIsOpen(false);
    navigate(`/catalog?q=${encodeURIComponent(trimmed)}`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveAndSearch(query);
  };

  const handleRemoveHistory = (e: React.MouseEvent, item: string) => {
    e.stopPropagation();
    const updated = history.filter((h) => h !== item);
    setHistory(updated);
    try {
      localStorage.setItem("medax_search_history", JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  const handleClearHistory = (e: React.MouseEvent) => {
    e.stopPropagation();
    setHistory([]);
    try {
      localStorage.setItem("medax_search_history", JSON.stringify([]));
    } catch {
      // ignore
    }
  };

  return (
    <div className="uz-search-wrap" ref={wrapperRef}>
      <form
        className={`uz-search-form ${isOpen ? "is-open" : ""}`}
        role="search"
        onSubmit={handleSubmit}
      >
        <input
          type="search"
          name="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsOpen(true)}
          className="uz-search-input"
          placeholder={t("search_input_ph")}
          aria-label={t("search_input_ph")}
          autoComplete="off"
        />
        <button type="submit" className="uz-search-btn" aria-label={t("btn_search")}>
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
        </button>
      </form>

      {/* Uzum-style Search Dropdown with smooth entrance and exit animations */}
      {mounted && (
        <div
          className={`uz-search-dropdown ${animState}`}
          role="dialog"
          aria-label="Qidiruv takliflari"
        >
          {query.trim().length >= 2 ? (
            /* Live Search Results */
            <div className="uz-search-section">
              <div className="uz-search-section-header">
                <h4 className="uz-search-section-title">
                  {lang === "ru" ? "Результаты поиска" : lang === "en" ? "Search results" : "Qidiruv natijalari"}
                </h4>
                {liveResults.length > 0 && (
                  <span style={{ fontSize: 12, color: "var(--ink2)" }}>
                    {liveResults.length} {lang === "ru" ? "найдено" : "ta mahsulot"}
                  </span>
                )}
              </div>

              {isSearchingLive ? (
                <div style={{ padding: "14px 10px", color: "var(--ink2)", fontSize: 13 }}>
                  {lang === "ru" ? "Поиск по каталогу..." : "Katalogdan qidirilmoqda..."}
                </div>
              ) : liveResults.length === 0 ? (
                <div style={{ padding: "16px 10px", color: "var(--ink2)", fontSize: 13.5, textAlign: "center" }}>
                  {lang === "ru" ? "По вашему запросу ничего не найдено" : "So'rovingiz bo'yicha mahsulot topilmadi"}
                </div>
              ) : (
                <div className="uz-search-popular-grid">
                  {liveResults.map((p) => {
                    const img = p.images?.[0]?.thumbUrl || p.images?.[0]?.url;
                    const localizedName = lang === "ru" ? (p.nameRu || p.name) : lang === "en" ? (p.nameEn || p.name) : p.name;
                    return (
                      <div
                        key={p.id}
                        className="uz-search-popular-card"
                        onClick={() => {
                          setIsOpen(false);
                          navigate(`/product/${p.slug}`);
                        }}
                      >
                        <div className="uz-popular-thumb-wrap">
                          {img ? (
                            <img src={img} alt={localizedName} className="uz-popular-thumb" loading="lazy" />
                          ) : (
                            <span style={{ width: 28, height: 28, opacity: 0.6, display: "inline-grid" }}><DeviceIcon /></span>
                          )}
                        </div>
                        <div className="uz-popular-info">
                          <span className="uz-popular-price">{money(p.priceFrom)}</span>
                          <span className="uz-popular-title">{localizedName}</span>
                          {p.brand?.name && (
                            <span className="uz-popular-badge">
                              <span>⚡</span> {p.brand.name}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            /* Default Dropdown (Recent searches + Real Popular products / Categories) */
            <>
              {/* Section 1: Recent Searches (Only real searches made by user) */}
              {history.length > 0 && (
                <div className="uz-search-section">
                  <div className="uz-search-section-header">
                    <h4 className="uz-search-section-title">{t("search_recent")}</h4>
                    <button
                      type="button"
                      className="uz-search-clear-btn"
                      onClick={handleClearHistory}
                    >
                      {t("search_clear")}
                    </button>
                  </div>

                  <div className="uz-search-history-list">
                    {history.map((item) => (
                      <div
                        key={item}
                        className="uz-search-history-item"
                        onClick={() => {
                          setQuery(item);
                          saveAndSearch(item);
                        }}
                      >
                        <div className="uz-search-history-left">
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="uz-clock-icon"
                          >
                            <circle cx="12" cy="12" r="10" />
                            <polyline points="12 6 12 12 16 14" />
                          </svg>
                          <span className="uz-search-history-text">{item}</span>
                        </div>
                        <button
                          type="button"
                          className="uz-search-remove-btn"
                          onClick={(e) => handleRemoveHistory(e, item)}
                          aria-label={`${item} qidiruvini o'chirish`}
                        >
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Section 2: Real Popular Products or Real Categories from Database */}
              {popularProducts.length > 0 ? (
                <div className={`uz-search-section ${history.length > 0 ? "popular-section" : ""}`}>
                  <h4 className="uz-search-section-title">{t("search_popular")}</h4>
                  <div className="uz-search-popular-grid">
                    {popularProducts.map((p) => {
                      const img = p.images?.[0]?.thumbUrl || p.images?.[0]?.url;
                      const localizedName = lang === "ru" ? (p.nameRu || p.name) : lang === "en" ? (p.nameEn || p.name) : p.name;
                      const badgeText = p.isHit
                        ? (lang === "ru" ? "Хит продаж" : "Xit mahsulot")
                        : p.isNew
                        ? (lang === "ru" ? "Новинка" : "Yangi model")
                        : (lang === "ru" ? "В наличии" : "Do'konda bor");

                      return (
                        <div
                          key={p.id}
                          className="uz-search-popular-card"
                          onClick={() => {
                            setIsOpen(false);
                            navigate(`/product/${p.slug}`);
                          }}
                        >
                          <div className="uz-popular-thumb-wrap">
                            {img ? (
                              <img
                                src={img}
                                alt={localizedName}
                                className="uz-popular-thumb"
                                loading="lazy"
                              />
                            ) : (
                              <span style={{ width: 28, height: 28, opacity: 0.6, display: "inline-grid" }}><DeviceIcon /></span>
                            )}
                          </div>
                          <div className="uz-popular-info">
                            <span className="uz-popular-price">{money(p.priceFrom)}</span>
                            <span className="uz-popular-title">{localizedName}</span>
                            <span className="uz-popular-badge">
                              <span>⚡</span> {badgeText}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : categories.length > 0 ? (
                <div className={`uz-search-section ${history.length > 0 ? "popular-section" : ""}`}>
                  <h4 className="uz-search-section-title">
                    {lang === "ru" ? "Категории каталога" : lang === "en" ? "Catalog Categories" : "Katalog toifalari"}
                  </h4>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
                    {categories.slice(0, 8).map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => {
                          setIsOpen(false);
                          navigate(`/catalog?category=${cat.slug}`);
                        }}
                        style={{
                          padding: "7px 14px",
                          borderRadius: 20,
                          border: "1px solid var(--line, #e2e8f0)",
                          background: "var(--card, #f8fafc)",
                          fontSize: 13,
                          fontWeight: 600,
                          color: "var(--ink, #1e293b)",
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          transition: "all 0.15s ease",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = "#0284c7";
                          e.currentTarget.style.color = "#0284c7";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = "var(--line, #e2e8f0)";
                          e.currentTarget.style.color = "var(--ink, #1e293b)";
                        }}
                      >
                        <span>📁</span> {cat.name}
                      </button>
                    ))}
                  </div>
                </div>
              ) : history.length === 0 ? (
                <div style={{ padding: "20px 10px", textAlign: "center", color: "var(--ink2)", fontSize: 13.5 }}>
                  <span style={{ fontSize: 28, display: "block", marginBottom: 6 }}>🔍</span>
                  {lang === "ru"
                    ? "Введите название оборудования для поиска по каталогу"
                    : "Katalogdan kerakli uskunani topish uchun nomini yozing"}
                </div>
              ) : null}
            </>
          )}
        </div>
      )}
    </div>
  );
}
