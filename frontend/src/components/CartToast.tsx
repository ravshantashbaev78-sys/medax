import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useCart } from "../cart";
import { useI18n } from "../context/I18nContext";
import { localizeProductName } from "../utils/localize";
import { DeviceIcon } from "./Shell";

/** Savatga qo'shilganda chiqadigan oyna: rasm, nom, narx, savatdagi jami soni va "Savatga o'tish" */
export function CartToast() {
  const { toast, dismissToast, totalQuantity } = useCart();
  const { lang } = useI18n();
  const [closing, setClosing] = useState(false);
  const [paused, setPaused] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  const tr = (uz: string, ru: string, en: string) => (lang === "ru" ? ru : lang === "en" ? en : uz);

  const close = () => {
    setClosing(true);
    window.setTimeout(dismissToast, 220);
  };

  useEffect(() => {
    if (!toast) return;
    setClosing(false);
    window.clearTimeout(timer.current);
    if (!paused) timer.current = window.setTimeout(close, 4000);
    return () => window.clearTimeout(timer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toast?.id, paused]);

  if (!toast) return null;

  const name = localizeProductName({ name: toast.productName, nameRu: toast.nameRu, nameEn: toast.nameEn }, lang);
  const price = toast.priceFrom ? Number(toast.priceFrom) : null;

  return (
    <aside
      className={`ctoast${closing ? " closing" : ""}`}
      role="status"
      aria-live="polite"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="ctoast-head">
        <span className="ctoast-check" aria-hidden="true">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </span>
        <span className="ctoast-title">{tr("Savatga qo'shildi", "Добавлено в корзину", "Added to cart")}</span>
        <button type="button" className="ctoast-x" onClick={close} aria-label={tr("Yopish", "Закрыть", "Close")}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="ctoast-item">
        <span className="ctoast-img">{toast.thumb ? <img src={toast.thumb} alt="" /> : <DeviceIcon />}</span>
        <span className="ctoast-info">
          <span className="ctoast-name" title={name}>{name}</span>
          <span className="ctoast-sub">
            {toast.quantity} {tr("dona", "шт", "pcs")}
            {price ? ` · ${(price * toast.quantity).toLocaleString("ru-RU").replace(/ |,/g, " ")} ${tr("so'm", "сум", "UZS")}` : ""}
          </span>
        </span>
      </div>

      <div className="ctoast-actions">
        <button type="button" className="ctoast-btn ghost" onClick={close}>
          {tr("Xaridni davom ettirish", "Продолжить", "Keep shopping")}
        </button>
        <Link to="/cart" className="ctoast-btn" onClick={close}>
          {tr("Savat", "Корзина", "Cart")} · {totalQuantity}
        </Link>
      </div>
      {!paused && <span className="ctoast-progress" key={toast.id} />}
    </aside>
  );
}
