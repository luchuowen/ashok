"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

/**
 * Client-side mirror of the httpOnly ashok_session cookie. The cookie itself
 * is never readable from JS (by design — see lib/otp.ts), so this provider
 * asks the server once on mount via GET /api/auth/session and keeps the
 * result in memory, the same plain-useState pattern as CartProvider.
 */

interface AuthContextValue {
  loading: boolean;
  signedIn: boolean;
  phone: string | null;
  name: string | null;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [signedIn, setSignedIn] = useState(false);
  const [phone, setPhone] = useState<string | null>(null);
  const [name, setName] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/session")
      .then((res) => res.json())
      .then((data: { signedIn: boolean; phone?: string; name?: string | null }) => {
        if (cancelled) return;
        setSignedIn(Boolean(data.signedIn));
        setPhone(data.phone ?? null);
        setName(data.name ?? null);
      })
      .catch(() => {
        if (!cancelled) {
          setSignedIn(false);
          setPhone(null);
          setName(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const signOut = async () => {
    await fetch("/api/auth/sign-out", { method: "POST" }).catch(() => {});
    setSignedIn(false);
    setPhone(null);
    setName(null);
    window.location.href = "/";
  };

  const value = useMemo<AuthContextValue>(
    () => ({ loading, signedIn, phone, name, signOut }),
    [loading, signedIn, phone, name],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthSession(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuthSession must be used within an AuthProvider");
  }
  return ctx;
}
