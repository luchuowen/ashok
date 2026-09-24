"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Section } from "@/components/ui/Section";
import { Button } from "@/components/ui/Button";
import { SuitPreview } from "@/components/suit/SuitPreview";
import { encodeDesign } from "@/lib/suit/codec";
import { priceSuit, suitTitle } from "@/lib/suit/pricing";
import { normalizeConfig } from "@/lib/suit/rules";
import { specSummary } from "@/lib/suit/spec";
import { METHOD_LABELS } from "@/lib/suit/measurements";
import type { FitProfile, SuitConfig } from "@/lib/suit/types";
import { formatKes } from "@/lib/currency";

interface SavedDesign {
  id: string;
  name: string;
  config: SuitConfig;
  updatedAt: string;
}

/** Saved suit designs and the online fit profile on the customer's record. */
export default function PortalDesignsPage() {
  const [designs, setDesigns] = useState<SavedDesign[] | null>(null);
  const [profile, setProfile] = useState<FitProfile | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [d, f] = await Promise.all([fetch("/api/suits/designs").then((r) => r.json()), fetch("/api/suits/fit-profile").then((r) => r.json())]);
      if (!d.ok) setError(d.error || "Could not load your designs.");
      setDesigns(d.designs ?? []);
      setProfile(f.profile ?? null);
    } catch {
      setError("Could not reach the server.");
      setDesigns([]);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function remove(id: string) {
    if (!window.confirm("Delete this saved design?")) return;
    const res = await fetch(`/api/suits/designs/${id}`, { method: "DELETE" }).catch(() => null);
    if (res?.ok) setDesigns((list) => (list ?? []).filter((x) => x.id !== id));
  }

  return (
    <Section>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h2 className="text-2xl">Suit Designs</h2>
        <Button href="/custom-suits/design">Design a new suit</Button>
      </div>
      {error ? <p className="mt-4 text-sm text-oxblood">{error}</p> : null}
      {designs === null ? <p className="mt-6 text-sm text-muted">Loading…</p> : null}
      {designs && designs.length === 0 ? (
        <p className="mt-6 text-sm text-muted">No saved designs yet — use &ldquo;Save design&rdquo; on the designer&rsquo;s Review step.</p>
      ) : null}
      <ul className="mt-8 grid grid-cols-1 gap-px border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
        {(designs ?? []).map((d) => {
          const config = normalizeConfig(d.config).config;
          return (
            <li key={d.id} className="flex gap-4 bg-cream p-4">
              <div className="h-32 w-24 flex-none border border-line bg-paper">
                <SuitPreview config={config} className="h-full w-full" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-display text-lg leading-tight">{d.name}</p>
                <p className="mt-1 text-xs text-muted">{suitTitle(config)}</p>
                <p className="text-xs text-muted">{specSummary(config)}</p>
                <p className="mt-2 text-sm">{formatKes(priceSuit(config).unitTotal)}</p>
                <div className="mt-3 flex gap-4 text-[11px] uppercase tracking-wide">
                  <Link href={`/custom-suits/design?d=${encodeDesign(config)}&step=review`} className="text-ink underline hover:text-oxblood">
                    Open & order
                  </Link>
                  <button type="button" onClick={() => remove(d.id)} className="text-muted hover:text-oxblood">
                    Delete
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="mt-12 border-t border-line pt-8">
        <h3 className="text-xl">Online fit profile</h3>
        {profile ? (
          <p className="mt-2 text-sm">
            {profile.name} — <span className="text-muted">{METHOD_LABELS[profile.method]}</span> ·{" "}
            <Link href="/custom-suits/measurements?next=/portal/designs" className="underline hover:text-oxblood">
              Update
            </Link>
          </p>
        ) : (
          <p className="mt-2 text-sm text-muted">
            None saved.{" "}
            <Link href="/custom-suits/measurements?next=/portal/designs" className="underline hover:text-oxblood">
              Add your measurements
            </Link>{" "}
            for faster online orders.
          </p>
        )}
        <p className="mt-2 text-xs text-muted">The measurements our staff take at a fitting (on your Measurements page) always take precedence.</p>
      </div>
    </Section>
  );
}
