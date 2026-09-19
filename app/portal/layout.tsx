import { PortalHeader } from "@/components/portal/PortalHeader";
import { PortalTabs } from "@/components/portal/PortalTabs";

// Shared chrome for all 8 portal routes. "Your Record with the House" — never
// "Dashboard" or "Account" (Improvement 5). No Firebase Auth gate yet in Phase 1;
// TODO(phase-2): redirect unauthenticated visitors to /auth before rendering.
export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <PortalHeader />
      <PortalTabs />
      {children}
    </div>
  );
}
