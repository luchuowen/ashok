import { PortalHeader } from "@/components/portal/PortalHeader";
import { PortalTabs } from "@/components/portal/PortalTabs";
import { PortalDataProvider } from "@/app/portal/portal-context";
import { PortalGate } from "@/app/portal/portal-gate";

// Shared chrome for all 8 portal routes. "Your Record with the House" — never
// "Dashboard" or "Account" (Improvement 5). middleware.ts redirects a visitor
// with no session cookie away before this ever renders; PortalDataProvider +
// PortalGate below do the real, server-verified check and supply every
// portal page's data from one fetch.
export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <PortalDataProvider>
      <div className="min-h-screen bg-paper">
        <PortalHeader />
        <div className="mx-auto flex max-w-6xl flex-col md:flex-row">
          <PortalTabs />
          <div className="min-w-0 flex-1">
            <PortalGate>{children}</PortalGate>
          </div>
        </div>
      </div>
    </PortalDataProvider>
  );
}
