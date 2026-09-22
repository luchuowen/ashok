"use client";

import { Section } from "@/components/ui/Section";
import { useAdminSession } from "@/app/admin/admin-session-context";
import { StaffLogin } from "@/components/admin/StaffLogin";

/**
 * Blocks the whole admin shell (header, nav, and every /admin/* page)
 * until we know whether staff are signed in — mirrors
 * app/portal/portal-gate.tsx. Unlike the portal, an unauthenticated
 * visitor sees only the sign-in form: no header/nav leaks before auth.
 */
export function AdminGate({ children }: { children: React.ReactNode }) {
  const { checking, signedIn, markSignedIn } = useAdminSession();

  if (checking) {
    return (
      <Section border={false}>
        <p className="py-20 text-center text-sm text-muted">Checking staff session…</p>
      </Section>
    );
  }

  if (!signedIn) {
    return <StaffLogin onSignedIn={markSignedIn} />;
  }

  return <>{children}</>;
}
