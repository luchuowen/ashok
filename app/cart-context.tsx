"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { MAX_SUITS_PER_LINE } from "@/lib/suit/catalogue";
import { priceSuit, suitTitle } from "@/lib/suit/pricing";
import { normalizeConfig, validateConfigStrict } from "@/lib/suit/rules";
import { specSummary } from "@/lib/suit/spec";
import type { SuitConfig } from "@/lib/suit/types";

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

/** productId shared by every custom-suit line; variantId is the line's own id. */
export const CUSTOM_SUIT_PRODUCT_ID = "custom-suit";

export interface CartSuit {
  config: SuitConfig;
  /** Set when the saved design no longer validates (a retired cloth or
   *  option). The line is kept as designed, and checkout is blocked until
   *  the customer reopens it — we never silently swap what they chose. */
  issue?: string;
}

export interface CartItem {
  productId: string;
  variantId: string;
  variantLabel: string;
  slug: string;
  name: string;
  price: number;
  currency: string;
  qty: number;
  /** Present only on custom-suit lines (productId === CUSTOM_SUIT_PRODUCT_ID). */
  suit?: CartSuit;
}

export function isSuitLine(item: Pick<CartItem, "productId" | "suit">): item is CartItem & { suit: CartSuit } {
  return item.productId === CUSTOM_SUIT_PRODUCT_ID && Boolean(item.suit?.config);
}

export function maxQtyFor(item: Pick<CartItem, "productId">): number {
  return item.productId === CUSTOM_SUIT_PRODUCT_ID ? MAX_SUITS_PER_LINE : MAX_QTY_PER_LINE;
}

/** Build (or rebuild) a suit line from a config — price always recomputed from the catalogue. */
function suitLine(config: SuitConfig, lineId: string, qty: number): CartItem {
  const checked = validateConfigStrict(config);
  const issue = "error" in checked ? checked.error : undefined;
  const normalized = normalizeConfig(config).config;
  return {
    productId: CUSTOM_SUIT_PRODUCT_ID,
    variantId: lineId,
    variantLabel: specSummary(normalized),
    slug: "custom-suits",
    name: suitTitle(normalized),
    price: priceSuit(normalized).unitTotal,
    currency: "KES",
    qty: Math.min(MAX_SUITS_PER_LINE, Math.max(1, qty)),
    suit: issue ? { config, issue } : { config: normalized },
  };
}

function newLineId(): string {
  const rand = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID().slice(0, 8) : Math.random().toString(36).slice(2, 10);
  return `suit-${Date.now().toString(36)}-${rand}`;
}

interface CartContextValue {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "qty">, qty?: number) => void;
  removeItem: (productId: string, variantId: string) => void;
  setQty: (productId: string, variantId: string, qty: number) => void;
  clear: () => void;
  subtotal: number;
  /** Adds a custom suit and returns its line id. */
  addSuit: (config: SuitConfig, qty?: number) => string;
  /** Replaces the design on an existing suit line (edit from the bag). */
  updateSuit: (lineId: string, config: SuitConfig) => void;
  duplicateLine: (productId: string, variantId: string) => void;
  hydrated: boolean;
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
          const valid = parsed.filter(
            (i): i is CartItem =>
              i &&
              typeof i.productId === "string" &&
              typeof i.variantId === "string" &&
              typeof i.price === "number" &&
              Number.isFinite(i.qty) &&
              i.qty >= 1 &&
              (i.productId !== CUSTOM_SUIT_PRODUCT_ID || Boolean(i.suit?.config)),
          );
          // Suit lines are re-priced from the current catalogue on every
          // load, so a price change never leaves a stale number in the bag.
          setItems(
            valid.map((i) => {
              if (i.productId !== CUSTOM_SUIT_PRODUCT_ID) return i;
              try {
                return suitLine(i.suit!.config, i.variantId, i.qty);
              } catch {
                return i;
              }
            }),
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
    const next = Math.min(maxQtyFor({ productId }), Math.max(1, Math.floor(qty)));
    setItems((prev) => prev.map((i) => (sameLine(i, { productId, variantId }) ? { ...i, qty: next } : i)));
  };

  const addSuit = (config: SuitConfig, qty = 1) => {
    const lineId = newLineId();
    setItems((prev) => [...prev, suitLine(config, lineId, qty)]);
    return lineId;
  };

  const updateSuit = (lineId: string, config: SuitConfig) => {
    setItems((prev) =>
      prev.map((i) => (i.productId === CUSTOM_SUIT_PRODUCT_ID && i.variantId === lineId ? suitLine(config, lineId, i.qty) : i)),
    );
  };

  const duplicateLine = (productId: string, variantId: string) => {
    setItems((prev) => {
      const line = prev.find((i) => sameLine(i, { productId, variantId }));
      if (!line) return prev;
      if (isSuitLine(line)) return [...prev, suitLine(line.suit.config, newLineId(), 1)];
      return prev.map((i) => (sameLine(i, line) ? { ...i, qty: Math.min(MAX_QTY_PER_LINE, i.qty + 1) } : i));
    });
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
    () => ({ items, addItem, removeItem, setQty, clear, subtotal, addSuit, updateSuit, duplicateLine, hydrated }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items, subtotal, hydrated],
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
