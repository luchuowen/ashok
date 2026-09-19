"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Section } from "@/components/ui/Section";
import { TitleBand } from "@/components/ui/TitleBand";
import { FormGrid } from "@/components/ui/FormGrid";
import { FormField } from "@/components/ui/FormField";
import { Tag } from "@/components/ui/Tag";
import { Button } from "@/components/ui/Button";

const VISIT_TYPES = ["Bespoke", "Made-to-Measure", "Alterations", "Wedding Party"];

const SLOTS = ["Tue 10:00", "Tue 14:30", "Wed 11:00", "Thu 09:30", "Fri 15:00", "Sat 10:00"];

// Maps an incoming ?type= query param to a visit-type Tag to preselect.
// "wedding" and "corporate" both point at the Wedding Party consultation
// track — kept simple rather than adding more visit types for this alone.
function preselectedType(param: string | null): string | null {
  if (param === "wedding" || param === "corporate") return "Wedding Party";
  return null;
}

export default function BookingPage() {
  return (
    <Suspense fallback={null}>
      <BookingForm />
    </Suspense>
  );
}

function BookingForm() {
  const searchParams = useSearchParams();
  const typeParam = searchParams.get("type");
  const [selectedType, setSelectedType] = useState<string | null>(preselectedType(typeParam));
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedType || !selectedSlot) {
      setFormError("Pick a visit type and a time slot to continue.");
      return;
    }
    const form = e.currentTarget;
    const data = new FormData(form);
    setFormError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          visitType: selectedType,
          slot: selectedSlot,
          name: data.get("name"),
          phone: data.get("phone"),
          email: data.get("email"),
          note: data.get("note"),
        }),
      });
      const result = await res.json();
      if (!res.ok || !result.ok) {
        setFormError(result.error || "Could not submit your booking. Try again.");
        setSubmitting(false);
        return;
      }
      setConfirmed(true);
    } catch {
      setFormError("Could not reach the server. Check your connection and try again.");
      setSubmitting(false);
    }
  }

  return (
    <main>
      <Section border={false}>
        <TitleBand
          eyebrow="Book"
          title="Book a consultation at Ridgeways."
          intro="30–45 minutes, in person. Pick a type, then a time — confirmation comes by WhatsApp."
        />
      </Section>

      <Section>
        {confirmed ? (
          <div className="max-w-xl border border-line p-6">
            <p className="text-base">
              Booking confirmed — we&rsquo;ll follow up on WhatsApp to lock in the details.
            </p>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="grid grid-cols-1 gap-10 lg:grid-cols-2"
          >
            <FormGrid columns={2}>
              <div className="sm:col-span-2">
                <p className="text-xs uppercase tracking-wide text-muted">Visit Type</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {VISIT_TYPES.map((type) => (
                    <button key={type} type="button" onClick={() => setSelectedType(type)}>
                      <Tag variant={selectedType === type ? "stage" : "default"}>{type}</Tag>
                    </button>
                  ))}
                </div>
              </div>

              <FormField label="Name" htmlFor="name">
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  className="border border-line bg-paper px-3 py-2 text-sm focus:border-ink focus:outline-none"
                />
              </FormField>

              <FormField label="Phone" htmlFor="phone">
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  required
                  className="border border-line bg-paper px-3 py-2 text-sm focus:border-ink focus:outline-none"
                />
              </FormField>

              <div className="sm:col-span-2">
                <FormField label="Email" htmlFor="email">
                  <input
                    id="email"
                    name="email"
                    type="email"
                    className="border border-line bg-paper px-3 py-2 text-sm focus:border-ink focus:outline-none"
                  />
                </FormField>
              </div>

              <div className="sm:col-span-2">
                <FormField label="Note (optional)" htmlFor="note">
                  <textarea
                    id="note"
                    name="note"
                    rows={4}
                    className="border border-line bg-paper px-3 py-2 text-sm focus:border-ink focus:outline-none"
                  />
                </FormField>
              </div>

              <div className="sm:col-span-2">
                <Button type="submit" disabled={submitting}>
                  {submitting ? "Sending…" : "Confirm Booking"}
                </Button>
                {formError ? <p className="mt-3 text-sm text-oxblood">{formError}</p> : null}
              </div>
            </FormGrid>

            <div className="border border-line p-6">
              <p className="text-center text-xs uppercase tracking-wide text-muted">
                Available slots this week
              </p>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {SLOTS.map((slot) => (
                  <button key={slot} type="button" onClick={() => setSelectedSlot(slot)}>
                    <Tag variant={selectedSlot === slot ? "stage" : "default"}>{slot}</Tag>
                  </button>
                ))}
              </div>
              <p className="mt-6 text-center text-sm text-muted">
                Ridgeways, Nairobi. You&rsquo;ll get a WhatsApp confirmation with a map link and
                reminder the day before.
              </p>
              <div className="mt-6 flex justify-center">
                <Button type="submit" variant="ghost" disabled={submitting}>
                  Confirm via WhatsApp
                </Button>
              </div>
            </div>
          </form>
        )}
      </Section>
    </main>
  );
}
