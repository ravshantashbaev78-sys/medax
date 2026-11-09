import { ReactNode, useEffect, useState } from "react";

/**
 * Yengil bildirishnomalar (toast). Istalgan joydan chaqiriladi:
 *   toast.success("Saqlandi"); toast.error(err.message);
 * <Toaster /> ilovaning ildizida bir marta joylashadi (sayt va admin uchun umumiy).
 */
type Kind = "success" | "error" | "info";
interface Item {
  id: number;
  kind: Kind;
  text: string;
  closing?: boolean;
}

let seq = 0;
const listeners = new Set<(item: Item) => void>();

function push(kind: Kind, text: string) {
  const item = { id: ++seq, kind, text: String(text || "").slice(0, 300) };
  listeners.forEach((l) => l(item));
}

export const toast = {
  success: (text: string) => push("success", text),
  error: (text: string) => push("error", text),
  info: (text: string) => push("info", text),
};

const ICONS: Record<Kind, ReactNode> = {
  success: <polyline points="20 6 9 17 4 12" />,
  error: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v5M12 16h.01" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 8h.01" />
    </>
  ),
};

export function Toaster() {
  const [items, setItems] = useState<Item[]>([]);

  useEffect(() => {
    const onPush = (item: Item) => {
      setItems((cur) => [...cur.slice(-3), item]);
      // Xatolar uzoqroq turadi: o'qib ulgurish uchun
      const ttl = item.kind === "error" ? 6000 : 3200;
      setTimeout(() => close(item.id), ttl);
    };
    listeners.add(onPush);
    return () => {
      listeners.delete(onPush);
    };
  }, []);

  const close = (id: number) => {
    setItems((cur) => cur.map((i) => (i.id === id ? { ...i, closing: true } : i)));
    setTimeout(() => setItems((cur) => cur.filter((i) => i.id !== id)), 220);
  };

  if (!items.length) return null;
  return (
    <div className="toaster" role="region" aria-label="Bildirishnomalar">
      {items.map((i) => (
        <div key={i.id} className={`toast toast-${i.kind}${i.closing ? " closing" : ""}`} role={i.kind === "error" ? "alert" : "status"}>
          <span className="toast-icon" aria-hidden="true">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              {ICONS[i.kind]}
            </svg>
          </span>
          <span className="toast-text">{i.text}</span>
          <button type="button" className="toast-x" aria-label="Yopish" onClick={() => close(i.id)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}
