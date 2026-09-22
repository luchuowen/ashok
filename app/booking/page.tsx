"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAuthSession } from "@/app/auth-context";
import { Section } from "@/components/ui/Section";
import { TitleBand } from "@/components/ui/TitleBand";
import { FormGrid } from "@/components/ui/FormGrid";
import { FormField } from "@/components/ui/FormField";
import { Tag } from "@/components/ui/Tag";
import { Button } from "@/components/ui/Button";
import { WaCTA } from "@/components/ui/WaCTA";
import { groupSlotsByDay, type BookingSlot } from "@/lib/booking-slots";

const VISIT_TYPES = ["Bespoke", "Made-to-Measure", "Alterations", "Wedding Party"];

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
  const { phone: sessionPhone } = useAuthSession();
  const [selectedType, setSelectedType] = useState<string | null>(preselectedType(typeParam));
  const [selectedSlot, setSelectedSlot] = useState<BookingSlot | null>(null);
  const [slots, setSlots] = useState<BookingSlot[] | null>(null);
  const [slotsError, setSlotsError] = useState<string | null>(null);
  const [phone, setPhone] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Signed-in customers shouldn't have to retype the number their account
  // is keyed by — prefill it, same pattern as /checkout. A guest booking
  // still works; only the number they type links the record.
  useEffect(() => {
    if (sessionPhone) setPhone((prev) => prev || sessionPhone);
  }, [sessionPhone]);

  // Real dated slots in Nairobi time, minus hours already booked — see
  // lib/booking-slots.ts and app/api/booking/slots. Re-run after a 409 so
  // a slot taken a moment ago disappears from the grid.
  async function loadSlots() {
    setSlotsError(null);
    try {
      const res = await fetch("/api/booking/slots", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error();
      setSlots(data.slots as BookingSlot[]);
    } catch {
      setSlots([]);
      setSlotsError("Couldn't load available times. Refresh, or book via WhatsApp below.");
    }
  }
  useEffect(() => {
    loadSlots();
  }, []);

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
          date: selectedSlot.date,
          time: selectedSlot.time,
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
        if (res.status === 409) {
          setSelectedSlot(null);
          loadSlots();
        }
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
      <Section border={false} className="bg-white">
        <TitleBand
          eyebrow="Book"
          title="Book a Consultation"
          intro="Visit us at Ridgeways for a 30–45 minute consultation. Choose your service, select a convenient time, and receive confirmation by SMS."
        />
      </Section>

      <Section>
        {confirmed ? (
          <div className="max-w-xl border border-line p-6">
            <p className="text-base">
              Booking confirmed{selectedSlot ? ` for ${selectedSlot.label} (EAT)` : ""} at Ridgeways,
              Nairobi. We&rsquo;ve sent an SMS confirmation to your phone.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
            <form onSubmit={handleSubmit}>
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
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
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
            </form>

            <div className="border border-line p-6">
              <p className="text-center text-xs uppercase tracking-wide text-muted">
                Available times · Nairobi (EAT)
              </p>
              {slots === null ? (
                <p className="mt-4 text-center text-sm text-muted">Loading times…</p>
              ) : slotsError ? (
                <p className="mt-4 text-center text-sm text-oxblood">{slotsError}</p>
              ) : slots.length === 0 ? (
                <p className="mt-4 text-center text-sm text-muted">
                  No open times in the next few days — book via WhatsApp below.
                </p>
              ) : (
                <div className="mt-4 flex max-h-96 flex-col gap-4 overflow-y-auto pr-1">
                  {groupSlotsByDay(slots).map((day) => (
                    <div key={day.date}>
                      <p className="text-xs uppercase tracking-wide text-muted">{day.dayLabel}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {day.slots.map((slot) => {
                          const active =
                            selectedSlot?.date === slot.date && selectedSlot?.time === slot.time;
                          return (
                            <button key={`${slot.date}-${slot.time}`} type="button" onClick={() => setSelectedSlot(slot)}>
                              <Tag variant={active ? "stage" : "default"}>{slot.time}</Tag>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {selectedSlot ? (
                <p className="mt-4 text-center text-sm">Selected: {selectedSlot.label} (EAT)</p>
              ) : null}
              <p className="mt-6 text-center text-sm text-muted">
                Ridgeways, Nairobi. You&rsquo;ll get an SMS confirmation straight away, and we
                follow up on WhatsApp if anything needs adjusting.
              </p>
              <p className="mt-6 text-center text-xs uppercase tracking-wide text-muted">
                Prefer not to use the form?
              </p>
              <div className="mt-2 flex justify-center">
                <WaCTA
                  label="Book via WhatsApp Instead"
                  message={`Hi, I'd like to book a ${selectedType ?? "consultation"} for ${selectedSlot ? `${selectedSlot.label} (EAT)` : "a time this week"} at Ridgeways.`}
                />
              </div>
            </div>
          </div>
        )}
      </Section>
    </main>
  );
}
