import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useCart } from "../cart";
import { useI18n } from "../context/I18nContext";
import { localizeProductName } from "../utils/localize";

export function CartToast() {
  const { toast, dismissToast } = useCart();
  const { lang } = useI18n();
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (!toast) return;
    setClosing(false);
    const timer = setTimeout(() => {
      setClosing(true);
      setTimeout(dismissToast, 350);
    }, 3800);
    return () => clearTimeout(timer);
  }, [toast, dismissToast]);

  if (!toast) return null;

  const handleClose = () => {
    setClosing(true);
    setTimeout(dismissToast, 350);
  };

  const title = lang === "ru" ? "Добавлено в корзину!" : lang === "en" ? "Added to cart!" : "Savatga qo'shildi!";
  const goToCart = lang === "ru" ? "Перейти в корзину →" : lang === "en" ? "View cart →" : "Savatga o'tish →";
  const qtyAddedText = lang === "ru"
    ? (toast.quantity > 1 ? `Добавлено: ${toast.quantity} шт` : "Добавлено: 1 шт")
    : lang === "en"
    ? (toast.quantity > 1 ? `Added: ${toast.quantity} pcs` : "Added: 1 pc")
    : (toast.quantity > 1 ? `${toast.quantity} dona qo'shildi` : "1 dona qo'shildi");

  const localizedToastName = localizeProductName({ name: toast.productName, nameRu: toast.nameRu, nameEn: toast.nameEn }, lang);

  return (
    <aside
      className={`cart-toast-side ${closing ? "closing" : ""}`}
      role="status"
      aria-live="polite"
    >
      <div className="cart-toast-body">
        <div className="cart-toast-header">
          <div className="cart-toast-badge">
            <span className="cart-toast-check">✓</span>
            <span className="cart-toast-title">{title}</span>
          </div>
          <button
            type="button"
            className="cart-toast-close"
            onClick={handleClose}
            aria-label="Yopish"
          >
            ✕
          </button>
        </div>

        <div className="cart-toast-content">
          {toast.thumb ? (
            <img src={toast.thumb} alt="" className="cart-toast-img" />
          ) : (
            <div className="cart-toast-no-img">🩺</div>
          )}
          <div className="cart-toast-details">
            <span className="cart-toast-pname" title={localizedToastName}>
              {localizedToastName}
            </span>
            <span className="cart-toast-pqty">
              {qtyAddedText}
            </span>
          </div>
        </div>

        <div className="cart-toast-actions">
          <Link to="/cart" className="cart-toast-btn" onClick={handleClose}>
            {goToCart}
          </Link>
        </div>
      </div>
      <div className="cart-toast-progress" />
    </aside>
  );
}
