"use client";

import { Section } from "@/components/ui/Section";
import { usePortalData } from "@/app/portal/portal-context";

/**
 * Blocks the portal's children until we know who's signed in. Keeps every
 * individual portal page simple — they call usePortalData() and can assume
 * the data is ready, instead of each re-implementing a loading/redirect
 * state.
 */
export function PortalGate({ children }: { children: React.ReactNode }) {
  const { loading, signedIn, loadError } = usePortalData();

  if (loading) {
    return (
      <Section border={false}>
        <p className="py-20 text-center text-sm text-muted">Loading your record…</p>
      </Section>
    );
  }

  if (!signedIn) {
    // The provider already triggers a redirect to /auth — this is just the
    // brief frame before that navigation completes.
    return (
      <Section border={false}>
        <p className="py-20 text-center text-sm text-muted">Redirecting to sign in…</p>
      </Section>
    );
  }

  if (loadError) {
    return (
      <Section border={false}>
        <p className="py-20 text-center text-sm text-muted">
          Could not load your record just now. Refresh to try again, or message us on WhatsApp if
          it keeps happening.
        </p>
      </Section>
    );
  }

  return <>{children}</>;
}
