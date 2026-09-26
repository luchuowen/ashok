import type { Metadata } from "next";
import { AdminSessionProvider } from "@/app/admin/admin-session-context";
import { AdminGate } from "@/app/admin/admin-gate";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { AdminNav } from "@/components/admin/AdminNav";

export const metadata: Metadata = { title: "Staff — Ashok Sunny Tailored", robots: { index: false, follow: false } };

// Shared chrome for all /admin/* routes. AdminSessionProvider + AdminGate do
// the real, server-verified staff-session check (GET /api/admin/me) and
// gate the whole shell, so each new admin section (Products, Stock,
// Suppliers, ...) just adds a route here instead of re-implementing auth.
// Mirrors app/portal/layout.tsx's pattern.
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminSessionProvider>
      <AdminGate>
        <div className="min-h-screen bg-paper">
          <AdminHeader />
          <AdminNav />
          <main>{children}</main>
        </div>
      </AdminGate>
    </AdminSessionProvider>
  );
}
