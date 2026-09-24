"use client";

import { useCallback, useSyncExternalStore } from "react";
import { CURRENCY_STORAGE_KEY, type DisplayCurrency } from "@/lib/currency";
import type { FitProfile } from "@/lib/suit/types";

/**
 * Tiny localStorage-backed stores shared across the configurator, bag,
 * measurements and checkout pages without adding providers to the root
 * layout. Every read/write is try/catch'd: private windows and blocked
 * storage fall back to in-memory state for the session.
 */
function createLocalStore<T>(key: string, fallback: T, validate: (v: unknown) => T | null) {
  const listeners = new Set<() => void>();
  let memory: T = fallback;
  let cachedRaw: string | null | undefined;
  let cached: T = fallback;

  function read(): T {
    let raw: string | null = null;
    try {
      raw = window.localStorage.getItem(key);
    } catch {
      return memory;
    }
    if (raw === cachedRaw) return cached;
    cachedRaw = raw;
    if (raw === null) {
      cached = memory;
      return cached;
    }
    try {
      cached = validate(JSON.parse(raw)) ?? fallback;
    } catch {
      cached = fallback;
    }
    return cached;
  }

  function write(value: T | null) {
    memory = value ?? fallback;
    try {
      if (value === null) window.localStorage.removeItem(key);
      else window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // storage unavailable — memory copy still serves this session
    }
    cachedRaw = undefined;
    listeners.forEach((l) => l());
  }

  function subscribe(listener: () => void) {
    listeners.add(listener);
    const onStorage = (e: StorageEvent) => {
      if (e.key === key) {
        cachedRaw = undefined;
        listener();
      }
    };
    window.addEventListener("storage", onStorage);
    return () => {
      listeners.delete(listener);
      window.removeEventListener("storage", onStorage);
    };
  }

  return { read, write, subscribe, serverSnapshot: () => fallback };
}

const currencyStore = createLocalStore<DisplayCurrency>(CURRENCY_STORAGE_KEY, "KES", (v) =>
  v === "USD" || v === "KES" ? v : null,
);

export function useDisplayCurrency(): [DisplayCurrency, (c: DisplayCurrency) => void] {
  const value = useSyncExternalStore(currencyStore.subscribe, currencyStore.read, currencyStore.serverSnapshot);
  const set = useCallback((c: DisplayCurrency) => currencyStore.write(c), []);
  return [value, set];
}

export const FIT_STORAGE_KEY = "ashok-fit-profile";

const fitStore = createLocalStore<FitProfile | null>(FIT_STORAGE_KEY, null, (v) =>
  v && typeof v === "object" && (v as FitProfile).v === 1 ? (v as FitProfile) : null,
);

export function useFitProfile(): [FitProfile | null, (p: FitProfile | null) => void, boolean] {
  const value = useSyncExternalStore(fitStore.subscribe, fitStore.read, fitStore.serverSnapshot);
  const hydrated = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
  const set = useCallback((p: FitProfile | null) => fitStore.write(p), []);
  return [value, set, hydrated];
}

function noopSubscribe() {
  return () => undefined;
}

export function useHydrated(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}
