"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type {
  Order,
  Payment,
  Appointment,
  ClientMeasurements,
  Quote,
  ClientPreferences,
  Customer,
} from "@/lib/db";

/**
 * Single fetch of everything the client portal needs (Overview, Orders,
 * Payments, Measurements, Quotes, Preferences, Settings all read from
 * here), backed by GET /api/portal/me. Also doubles as the portal's auth
 * gate: an unsigned-in visitor gets redirected to /auth from here, since
 * middleware.ts only does a soft cookie-presence check and the real
 * verification happens server-side in the API route.
 */
interface PortalState {
  loading: boolean;
  signedIn: boolean;
  phone: string | null;
  customer: Customer | null;
  orders: Order[];
  payments: Payment[];
  appointments: Appointment[];
  measurements: ClientMeasurements[];
  quotes: Quote[];
  preferences: ClientPreferences | null;
  loadError: boolean;
}

interface PortalContextValue extends PortalState {
  refresh: () => Promise<void>;
}

const EMPTY_STATE: PortalState = {
  loading: true,
  signedIn: false,
  phone: null,
  customer: null,
  orders: [],
  payments: [],
  appointments: [],
  measurements: [],
  quotes: [],
  preferences: null,
  loadError: false,
};

const PortalContext = createContext<PortalContextValue | undefined>(undefined);

export function PortalDataProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [state, setState] = useState<PortalState>(EMPTY_STATE);

  const load = useCallback(async () => {
    // Only the first load blanks the portal. A refresh() after a save used
    // to flip `loading` back on, which made PortalGate unmount the current
    // page — wiping its local state, so "Saved." / "Return requested"
    // confirmations vanished the instant they appeared.
    setState((prev) => ({ ...prev, loading: !prev.signedIn }));
    try {
      const res = await fetch("/api/portal/me");
      const data = await res.json();
      if (!data.signedIn) {
        setState({ ...EMPTY_STATE, loading: false });
        router.replace("/auth?next=/portal");
        return;
      }
      setState({
        loading: false,
        signedIn: true,
        phone: data.phone ?? null,
        customer: data.customer ?? null,
        orders: data.orders ?? [],
        payments: data.payments ?? [],
        appointments: data.appointments ?? [],
        measurements: data.measurements ?? [],
        quotes: data.quotes ?? [],
        preferences: data.preferences ?? null,
        loadError: Boolean(data.error),
      });
    } catch {
      setState((prev) => ({ ...prev, loading: false, loadError: true }));
    }
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  const value = useMemo<PortalContextValue>(() => ({ ...state, refresh: load }), [state, load]);

  return <PortalContext.Provider value={value}>{children}</PortalContext.Provider>;
}

export function usePortalData(): PortalContextValue {
  const ctx = useContext(PortalContext);
  if (!ctx) {
    throw new Error("usePortalData must be used within a PortalDataProvider");
  }
  return ctx;
}
