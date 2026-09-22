"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

/**
 * Staff auth gate for /admin/*, mirroring app/portal/portal-context.tsx's
 * shape. One GET /api/admin/me check shared by the layout and every admin
 * page via useAdminSession() — pages don't each re-implement the check.
 */
interface AdminSessionValue {
  checking: boolean;
  signedIn: boolean;
  markSignedIn: () => void;
  signOut: () => Promise<void>;
}

const AdminSessionContext = createContext<AdminSessionValue | undefined>(undefined);

export function AdminSessionProvider({ children }: { children: React.ReactNode }) {
  const [checking, setChecking] = useState(true);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    fetch("/api/admin/me")
      .then((res) => res.json())
      .then((data) => setSignedIn(Boolean(data.signedIn)))
      .catch(() => setSignedIn(false))
      .finally(() => setChecking(false));
  }, []);

  const markSignedIn = useCallback(() => setSignedIn(true), []);

  const signOut = useCallback(async () => {
    await fetch("/api/admin/logout", { method: "POST" }).catch(() => undefined);
    setSignedIn(false);
  }, []);

  const value = useMemo<AdminSessionValue>(
    () => ({ checking, signedIn, markSignedIn, signOut }),
    [checking, signedIn, markSignedIn, signOut],
  );

  return <AdminSessionContext.Provider value={value}>{children}</AdminSessionContext.Provider>;
}

export function useAdminSession(): AdminSessionValue {
  const ctx = useContext(AdminSessionContext);
  if (!ctx) {
    throw new Error("useAdminSession must be used within an AdminSessionProvider");
  }
  return ctx;
}
