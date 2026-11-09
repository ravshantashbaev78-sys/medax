import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from "react";
import type { Product } from "./api";
import { toast as notify } from "./components/Toaster";

export interface CartItem {
  productId: number;
  slug: string;
  name: string;
  nameRu?: string | null;
  nameEn?: string | null;
  thumb?: string;
  priceFrom?: string | null;
  stock?: number;
  quantity: number;
  /** Server bo'yicha mahsulot endi sotuvda yo'q (o'chirilgan yoki yashirilgan) */
  unavailable?: boolean;
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
  /** Savatni serverdagi joriy narx, nom va qoldiq bilan yangilaydi */
  sync: (fresh: Product[]) => void;
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
        // Haqiqatda qo'shilmasa, "qo'shildi" deb aldamaymiz
        const existing = items.find((i) => i.productId === p.id);
        const cap = Math.min(100, p.stock !== undefined && p.stock !== null ? p.stock : 100);
        let ru = false;
        try {
          ru = localStorage.getItem("med_lang") === "ru";
        } catch {
          /* private mode */
        }
        if (cap <= 0) {
          notify.error(ru ? "Товар закончился" : "Bu mahsulot omborda tugagan");
          return;
        }
        if (existing && existing.quantity >= cap) {
          notify.info(ru ? `В корзине уже максимум: ${cap} шт` : `Savatda allaqachon ${cap} dona bor (ombordagi maksimum)`);
          return;
        }
        if (!existing && items.length >= 20) {
          notify.error(ru ? "В корзине может быть не более 20 товаров" : "Savatga 20 tadan ortiq mahsulot qo'shib bo'lmaydi");
          return;
        }
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
          const maxStock = p.stock !== undefined && p.stock !== null ? p.stock : 100;
          if (found) {
            return cur.map((i) =>
              i.productId === p.id
                ? { ...i, stock: p.stock, quantity: Math.min(maxStock, i.quantity + qty) }
                : i
            );
          }
          if (cur.length >= 20) return cur;
          return [
            ...cur,
            {
              productId: p.id,
              slug: p.slug,
              name: p.name,
              nameRu: p.nameRu,
              nameEn: p.nameEn,
              thumb: p.images?.[0]?.thumbUrl,
              priceFrom: p.priceFrom || null,
              stock: p.stock,
              quantity: Math.min(maxStock, Math.max(1, qty)),
            },
          ];
        });
      },
      setQty: (productId, qty) =>
        setItems((cur) =>
          cur.map((i) => {
            if (i.productId !== productId) return i;
            const maxStock = i.stock !== undefined && i.stock !== null ? i.stock : 100;
            return { ...i, quantity: Math.max(1, Math.min(maxStock, qty || 1)) };
          })
        ),
      remove: (productId) => setItems((cur) => cur.filter((i) => i.productId !== productId)),
      clear: () => setItems([]),
      sync: (fresh) =>
        setItems((cur) => {
          const byId = new Map(fresh.map((p) => [p.id, p]));
          return cur.map((i) => {
            const p = byId.get(i.productId);
            if (!p) return { ...i, unavailable: true };
            return {
              ...i,
              unavailable: false,
              slug: p.slug,
              name: p.name,
              nameRu: p.nameRu,
              nameEn: p.nameEn,
              thumb: p.images?.[0]?.thumbUrl || i.thumb,
              priceFrom: p.priceFrom || null,
              stock: p.stock,
            };
          });
        }),
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
