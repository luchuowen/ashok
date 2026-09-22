"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

/**
 * Cart state lives in React state, persisted to localStorage so it
 * survives a page refresh or reopening the tab later — without this, any
 * full navigation (typing a URL, refreshing, following an external link
 * back in) silently emptied the cart, a real dead end mid-shop. No
 * Firestore/server persistence yet — this is still a per-browser cart.
 */

const CART_STORAGE_KEY = "ashok-cart";
/** Mirrors MAX_QTY_PER_ITEM in app/api/checkout/create-invoice/route.ts. */
export const MAX_QTY_PER_LINE = 20;

export interface CartItem {
  productId: string;
  variantId: string;
  variantLabel: string;
  slug: string;
  name: string;
  price: number;
  currency: string;
  qty: number;
}

interface CartContextValue {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "qty">, qty?: number) => void;
  removeItem: (productId: string, variantId: string) => void;
  setQty: (productId: string, variantId: string, qty: number) => void;
  clear: () => void;
  subtotal: number;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);

function sameLine(a: { productId: string; variantId: string }, b: { productId: string; variantId: string }): boolean {
  return a.productId === b.productId && a.variantId === b.variantId;
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // Load any cart saved from a previous visit once, on mount. This has to
  // happen in an effect (not the initial useState) because localStorage
  // doesn't exist during server rendering — reading it in the initial
  // state would mismatch the server-rendered HTML.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(CART_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        // Drop malformed lines from an older/corrupt save rather than
        // letting them crash the cart page or fail checkout.
        if (Array.isArray(parsed)) {
          setItems(
            parsed.filter(
              (i): i is CartItem =>
                i &&
                typeof i.productId === "string" &&
                typeof i.variantId === "string" &&
                typeof i.price === "number" &&
                Number.isFinite(i.qty) &&
                i.qty >= 1,
            ),
          );
        }
      }
    } catch {
      // Corrupt or inaccessible storage — start with an empty cart.
    } finally {
      setHydrated(true);
    }
  }, []);

  // Persist on every change, but only once the load above has run — so we
  // never overwrite a just-loaded saved cart with the empty initial state.
  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    } catch {
      // Private browsing / storage disabled / quota — cart still works for
      // the rest of this session, it just won't survive a reload.
    }
  }, [items, hydrated]);

  const addItem = (item: Omit<CartItem, "qty">, qty = 1) => {
    setItems((prev) => {
      const existing = prev.find((i) => sameLine(i, item));
      if (existing) {
        return prev.map((i) =>
          sameLine(i, item) ? { ...i, qty: Math.min(MAX_QTY_PER_LINE, i.qty + qty) } : i,
        );
      }
      return [...prev, { ...item, qty }];
    });
  };

  const removeItem = (productId: string, variantId: string) => {
    setItems((prev) => prev.filter((i) => !sameLine(i, { productId, variantId })));
  };

  // Clamped to 1..MAX_QTY_PER_LINE (the checkout API's own per-line cap);
  // removing a line is removeItem's job.
  const setQty = (productId: string, variantId: string, qty: number) => {
    const next = Math.min(MAX_QTY_PER_LINE, Math.max(1, Math.floor(qty)));
    setItems((prev) => prev.map((i) => (sameLine(i, { productId, variantId }) ? { ...i, qty: next } : i)));
  };

  const clear = () => {
    setItems([]);
    try {
      window.localStorage.removeItem(CART_STORAGE_KEY);
    } catch {
      // ignore
    }
  };

  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + item.price * item.qty, 0),
    [items],
  );

  const value = useMemo<CartContextValue>(
    () => ({ items, addItem, removeItem, setQty, clear, subtotal }),
    [items, subtotal],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return ctx;
}
