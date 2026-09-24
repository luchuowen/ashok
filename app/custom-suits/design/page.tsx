import type { Metadata } from "next";
import { Suspense } from "react";
import { Configurator } from "@/components/suit/Configurator";
import { siteConfig } from "@/lib/content/site";

export const metadata: Metadata = {
  title: `Suit Designer — ${siteConfig.fullName}`,
  description: "Design your made-to-measure suit: cloth, lapels, buttons, pockets, lining and monogram — previewed live and priced as you go.",
  alternates: { canonical: "/custom-suits/design" },
};

export default function SuitDesignerPage() {
  return (
    <main>
      <h1 className="sr-only">Design your custom suit</h1>
      <Suspense fallback={<div className="flex h-[70vh] items-center justify-center text-sm text-muted">Opening the designer…</div>}>
        <Configurator />
      </Suspense>
    </main>
  );
}
