"use client";

import { useState } from "react";
import { Section } from "@/components/ui/Section";
import { Button } from "@/components/ui/Button";
import { Tag } from "@/components/ui/Tag";
import { quotes } from "@/lib/fixtures/quotes";

type QuoteDecision = "accepted" | "declined" | null;

export default function QuotesPage() {
  const [decisions, setDecisions] = useState<Record<string, QuoteDecision>>({});

  return (
    <Section className="text-center sm:text-left">
      <h2 className="text-2xl">Quotes</h2>
      <div className="mt-8 space-y-6">
        {quotes.map((quote) => {
          const decision = decisions[quote.id] ?? null;
          return (
            <div key={quote.id} className="border border-oxblood p-6">
              <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
                <h3 className="font-display text-xl">{quote.item}</h3>
                <Tag>Expires {quote.expiresAt}</Tag>
              </div>
              <p className="mt-2 font-display text-2xl text-oxblood">
                {quote.currency} {quote.amount.toLocaleString("en-KE")}
              </p>
              <div className="mt-4">
                {decision ? (
                  <p className="text-sm text-muted">
                    {decision === "accepted" ? "Accepted" : "Declined"}
                  </p>
                ) : (
                  <div className="flex justify-center gap-3 sm:justify-start">
                    <Button
                      variant="ghost"
                      onClick={() =>
                        setDecisions((prev) => ({ ...prev, [quote.id]: "declined" }))
                      }
                    >
                      Decline
                    </Button>
                    <Button
                      onClick={() =>
                        setDecisions((prev) => ({ ...prev, [quote.id]: "accepted" }))
                      }
                    >
                      Accept Quote
                    </Button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-6 text-sm text-muted">
        No pending quotes otherwise. New quotes from a consultation or group enquiry appear
        here.
      </p>
    </Section>
  );
}
