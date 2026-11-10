import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { fetchProductsByIds, Product } from "../api";

export interface CartItem {
  product: Product;
  quantity: number;
}

interface CartContextType {
  items: CartItem[];
  addToCart: (product: Product, quantity?: number) => void;
  removeFromCart: (productId: number) => void;
  updateQuantity: (productId: number, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
  /** Narx va qoldiqni serverdan yangilaydi; sotuvdan olingan yoki tugagan mahsulotlar nomlarini qaytaradi */
  refresh: () => Promise<string[]>;
}

const CartContext = createContext<CartContextType | null>(null);

const CART_KEY = "@medax_cart_items";
// Server bitta mahsulotdan ko'pi bilan 100 dona va bitta buyurtmada 20 xil mahsulot qabul qiladi
const MAX_QTY_PER_ITEM = 100;

/** Miqdorni ombor qoldig'i va server limiti bilan cheklaydi */
function clampQty(product: Product, qty: number): number {
  let max = MAX_QTY_PER_ITEM;
  if (typeof product.stock === "number" && product.stock >= 0) max = Math.min(max, product.stock);
  return Math.max(0, Math.min(max, Math.floor(qty)));
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const loaded = useRef(false);

  useEffect(() => {
    AsyncStorage.getItem(CART_KEY)
      .then((data) => {
        if (!data) return;
        try {
          const saved = JSON.parse(data) as CartItem[];
          if (!Array.isArray(saved)) return;
          // Yuklanish paytida qo'shilgan mahsulotlar yo'qolmasligi uchun birlashtiramiz
          setItems((current) => {
            const ids = new Set(current.map((i) => i.product.id));
            return [...saved.filter((i) => i?.product?.id && !ids.has(i.product.id)), ...current];
          });
        } catch {
          // buzilgan kesh — e'tiborsiz qoldiramiz
        }
      })
      .finally(() => {
        loaded.current = true;
      });
  }, []);

  // Har bir o'zgarishni saqlaymiz (yuklanish tugagandan keyin)
  useEffect(() => {
    if (!loaded.current) return;
    AsyncStorage.setItem(CART_KEY, JSON.stringify(items)).catch(() => {});
  }, [items]);

  const addToCart = (product: Product, quantity = 1) => {
    setItems((prev) => {
      const idx = prev.findIndex((i) => i.product.id === product.id);
      if (idx > -1) {
        const qty = clampQty(product, prev[idx].quantity + quantity);
        return prev.map((it, i) => (i === idx ? { product, quantity: Math.max(1, qty) } : it));
      }
      const qty = clampQty(product, quantity);
      if (qty <= 0) return prev;
      return [...prev, { product, quantity: qty }];
    });
  };

  const removeFromCart = (productId: number) => {
    setItems((prev) => prev.filter((i) => i.product.id !== productId));
  };

  const updateQuantity = (productId: number, quantity: number) => {
    setItems((prev) => {
      if (quantity <= 0) return prev.filter((i) => i.product.id !== productId);
      return prev.map((i) =>
        i.product.id === productId ? { ...i, quantity: Math.max(1, clampQty(i.product, quantity)) } : i
      );
    });
  };

  const clearCart = () => {
    setItems([]);
  };

  const itemsRef = useRef(items);
  itemsRef.current = items;
  const refresh = async (): Promise<string[]> => {
    const ids = itemsRef.current.map((i) => i.product.id);
    const fresh = await fetchProductsByIds(ids);
    if (!fresh) return []; // oflayn: savatni o'zgartirmaymiz
    const byId = new Map(fresh.map((p) => [p.id, p]));
    const removed: string[] = [];
    setItems((prev) =>
      prev.flatMap((it) => {
        const p = byId.get(it.product.id);
        if (!p || (typeof p.stock === "number" && p.stock <= 0)) {
          removed.push(it.product.name);
          return [];
        }
        // Rasm kabi qo'shimcha maydonlarni saqlab, narx va qoldiqni yangilaymiz
        const product = { ...it.product, ...p };
        return [{ product, quantity: Math.max(1, clampQty(product, it.quantity)) }];
      })
    );
    return removed;
  };

  useEffect(() => {
    // Ilova ochilganda saqlangan savat bir marta yangilanadi
    const t = setTimeout(() => {
      if (itemsRef.current.length) refresh().catch(() => {});
    }, 800);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
  const totalPrice = items.reduce((sum, i) => {
    const price = typeof i.product.priceFrom === "number" ? i.product.priceFrom : parseFloat(String(i.product.priceFrom || 0));
    return sum + (Number.isFinite(price) ? price : 0) * i.quantity;
  }, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        totalItems,
        totalPrice,
        refresh,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within CartProvider");
  return context;
}
