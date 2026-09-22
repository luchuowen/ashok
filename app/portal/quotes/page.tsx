"use client";

import { useState } from "react";
import { Section } from "@/components/ui/Section";
import { Button } from "@/components/ui/Button";
import { Tag } from "@/components/ui/Tag";
import { usePortalData } from "@/app/portal/portal-context";
import { nairobiToday } from "@/lib/dates";

export default function QuotesPage() {
  const { quotes, refresh } = usePortalData();
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function decide(quoteId: string, status: "Approved" | "Declined") {
    setPending(quoteId);
    setError(null);
    try {
      const res = await fetch(`/api/portal/quotes/${quoteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || "Could not save your decision. Try again.");
        return;
      }
      await refresh();
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
    } finally {
      setPending(null);
    }
  }

  // A Pending quote past its expiry date can no longer be accepted (the
  // API rejects it too) — show it with the decided ones, marked Expired.
  const today = nairobiToday();
  const isOpen = (q: (typeof quotes)[number]) =>
    q.status === "Pending" && (!q.expiresAt || q.expiresAt >= today);
  const openQuotes = quotes.filter(isOpen);
  const decidedQuotes = quotes
    .filter((q) => !isOpen(q))
    .map((q) => (q.status === "Pending" ? { ...q, status: "Expired" as const } : q));

  return (
    <Section className="text-center sm:text-left">
      <h2 className="text-2xl">Quotes</h2>
      {quotes.length === 0 ? (
        <p className="mt-8 text-sm text-muted">
          No pending quotes. New quotes from a consultation or group enquiry appear here.
        </p>
      ) : (
        <div className="mt-8 space-y-6">
          {openQuotes.map((quote) => (
            <div key={quote.id} className="border border-oxblood p-6">
              <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
                <h3 className="font-display text-xl">{quote.item}</h3>
                <Tag>Expires {quote.expiresAt}</Tag>
              </div>
              <p className="mt-2 font-display text-2xl text-oxblood">
                {quote.currency} {quote.amount.toLocaleString("en-KE")}
              </p>
              <div className="mt-4 flex justify-center gap-3 sm:justify-start">
                <Button
                  variant="ghost"
                  disabled={pending === quote.id}
                  onClick={() => decide(quote.id, "Declined")}
                >
                  Decline
                </Button>
                <Button disabled={pending === quote.id} onClick={() => decide(quote.id, "Approved")}>
                  {pending === quote.id ? "Saving…" : "Accept Quote"}
                </Button>
              </div>
            </div>
          ))}
          {decidedQuotes.map((quote) => (
            <div key={quote.id} className="border border-line p-6">
              <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
                <h3 className="font-display text-xl">{quote.item}</h3>
                <Tag variant={quote.status === "Approved" ? "stage" : "default"}>{quote.status}</Tag>
              </div>
              <p className="mt-2 font-display text-2xl text-oxblood">
                {quote.currency} {quote.amount.toLocaleString("en-KE")}
              </p>
            </div>
          ))}
        </div>
      )}
      {error ? <p className="mt-4 text-sm text-oxblood">{error}</p> : null}
    </Section>
  );
}
