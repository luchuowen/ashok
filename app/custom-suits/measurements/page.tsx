import type { Metadata } from "next";
import { Suspense } from "react";
import { FitProfileBuilder } from "@/components/suit/FitProfileBuilder";
import { siteConfig } from "@/lib/content/site";

export const metadata: Metadata = {
  title: `Your Measurements — ${siteConfig.fullName}`,
  description: "Add your measurements for a made-to-measure suit — estimate and review, measure at home with our guide, use your record, or be measured at the atelier.",
  robots: { index: false },
};

export default function MeasurementsPage() {
  return (
    <main>
      <Suspense fallback={<div className="py-24 text-center text-sm text-muted">Loading…</div>}>
        <FitProfileBuilder />
      </Suspense>
    </main>
  );
}
