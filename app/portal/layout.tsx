import { PortalHeader } from "@/components/portal/PortalHeader";
import { PortalTabs } from "@/components/portal/PortalTabs";

// Shared chrome for all 8 portal routes. "Your Record with the House" — never
// "Dashboard" or "Account" (Improvement 5). No Firebase Auth gate yet in Phase 1;
// TODO(phase-2): redirect unauthenticated visitors to /auth before rendering.
//
// White instead of the site's cream, with a vertical left nav (PortalTabs)
// on md+ — makes the portal read as its own account/ledger surface rather
// than another cream page with top tabs.
export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-paper">
      <PortalHeader />
      <div className="mx-auto flex max-w-6xl flex-col md:flex-row">
        <PortalTabs />
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
