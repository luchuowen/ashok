"use client";

import { createContext, useContext, useMemo, useState } from "react";

/**
 * Phase 1 cart state: plain in-memory React state via useState, no
 * localStorage, no Firestore. It resets on every page refresh — that's
 * expected for Phase 1. Swapping in a persisted (Firestore-backed) cart
 * later should only mean rewriting the body of this provider.
 */

export interface CartItem {
  productId: string;
  slug: string;
  name: string;
  price: number;
  currency: string;
  qty: number;
}

interface CartContextValue {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "qty">, qty?: number) => void;
  removeItem: (productId: string) => void;
  clear: () => void;
  subtotal: number;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  const addItem = (item: Omit<CartItem, "qty">, qty = 1) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.productId === item.productId);
      if (existing) {
        return prev.map((i) =>
          i.productId === item.productId ? { ...i, qty: i.qty + qty } : i,
        );
      }
      return [...prev, { ...item, qty }];
    });
  };

  const removeItem = (productId: string) => {
    setItems((prev) => prev.filter((i) => i.productId !== productId));
  };

  const clear = () => setItems([]);

  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + item.price * item.qty, 0),
    [items],
  );

  const value = useMemo<CartContextValue>(
    () => ({ items, addItem, removeItem, clear, subtotal }),
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
