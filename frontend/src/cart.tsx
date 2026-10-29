import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from "react";
import type { Product } from "./api";

export interface CartItem {
  productId: number;
  slug: string;
  name: string;
  nameRu?: string | null;
  nameEn?: string | null;
  thumb?: string;
  priceFrom?: string | null;
  quantity: number;
}

export interface CartToastItem {
  id: number;
  productName: string;
  nameRu?: string | null;
  nameEn?: string | null;
  thumb?: string;
  priceFrom?: string | null;
  quantity: number;
}

interface CartCtx {
  items: CartItem[];
  count: number;
  totalQuantity: number;
  toast: CartToastItem | null;
  dismissToast: () => void;
  add: (p: Product, qty?: number) => void;
  setQty: (productId: number, qty: number) => void;
  remove: (productId: number) => void;
  clear: () => void;
}

const Ctx = createContext<CartCtx | null>(null);
const KEY = "mt_cart";

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(KEY) || "[]");
    } catch {
      return [];
    }
  });

  const [toast, setToast] = useState<CartToastItem | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(items));
    } catch {
      /* private mode */
    }
  }, [items]);

  const dismissToast = () => setToast(null);

  const value = useMemo<CartCtx>(
    () => ({
      items,
      count: items.length,
      totalQuantity: items.reduce((s, i) => s + i.quantity, 0),
      toast,
      dismissToast,
      add: (p, qty = 1) => {
        setToast({
          id: Date.now(),
          productName: p.name,
          nameRu: p.nameRu,
          nameEn: p.nameEn,
          thumb: p.images?.[0]?.thumbUrl,
          priceFrom: p.priceFrom || null,
          quantity: qty,
        });
        setItems((cur) => {
          const found = cur.find((i) => i.productId === p.id);
          if (found) return cur.map((i) => (i.productId === p.id ? { ...i, quantity: Math.min(100, i.quantity + qty) } : i));
          if (cur.length >= 20) return cur;
          return [
            ...cur,
            {
              productId: p.id,
              slug: p.slug,
              name: p.name,
              nameRu: p.nameRu,
              nameEn: p.nameEn,
              thumb: p.images[0]?.thumbUrl,
              priceFrom: p.priceFrom || null,
              quantity: Math.min(100, qty),
            },
          ];
        });
      },
      setQty: (productId, qty) =>
        setItems((cur) => cur.map((i) => (i.productId === productId ? { ...i, quantity: Math.max(1, Math.min(100, qty || 1)) } : i))),
      remove: (productId) => setItems((cur) => cur.filter((i) => i.productId !== productId)),
      clear: () => setItems([]),
    }),
    [items, toast]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart() {
  const c = useContext(Ctx);
  if (!c) throw new Error("CartProvider yo'q");
  return c;
}
