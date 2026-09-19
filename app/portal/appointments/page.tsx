"use client";

import { Section } from "@/components/ui/Section";
import { Button } from "@/components/ui/Button";
import { WaCTA } from "@/components/ui/WaCTA";
import { usePortalData } from "@/app/portal/portal-context";
import { buildGoogleCalendarUrl } from "@/lib/ics";

export default function AppointmentsPage() {
  const { appointments } = usePortalData();

  // The portal used to just take appointments[0] — the most recently
  // *dated* row — and show it as "upcoming" with Reschedule/Add to
  // Calendar actions, regardless of its status. Once staff marked a
  // consultation Completed (or Cancelled) in /admin, that same appointment
  // kept showing here as if it still needed to happen, and there was no
  // way to ever see past visits (the section below was static copy that
  // never rendered anything). Split on status instead: only a Scheduled
  // appointment is "upcoming"; everything else is history.
  const scheduled = appointments.filter((a) => a.status === "Scheduled");
  const upcoming = scheduled.reduce<typeof scheduled[number] | undefined>(
    (soonest, a) => (!soonest || a.date < soonest.date ? a : soonest),
    undefined,
  );
  const past = appointments
    .filter((a) => a.status !== "Scheduled")
    .sort((a, b) => b.date.localeCompare(a.date));

  const calendarHref = upcoming
    ? buildGoogleCalendarUrl({
        title: `${upcoming.type} — Ashok Sunny Tailored`,
        location: upcoming.location,
        date: upcoming.date,
        time: upcoming.time,
        description: `${upcoming.type} appointment with Ashok Sunny Tailored.`,
      })
    : undefined;

  return (
    <Section className="text-center sm:text-left">
      <h1 className="font-display text-3xl">Appointments</h1>

      {upcoming ? (
        <div className="mt-8 flex flex-col items-center gap-6 border border-oxblood p-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="font-display text-xl">{upcoming.type}</p>
            <p className="mt-1 text-sm text-muted">
              {upcoming.date} · {upcoming.time} · {upcoming.location}
            </p>
          </div>
          <div className="flex flex-shrink-0 justify-center gap-3">
            <Button href="/booking" variant="ghost">
              Reschedule
            </Button>
            {calendarHref ? (
              <Button href={calendarHref} target="_blank" rel="noopener noreferrer">
                Add to Calendar
              </Button>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="mt-8 border border-line p-6 text-center">
          <p className="text-sm text-muted">No appointments scheduled yet.</p>
          <div className="mt-4">
            <Button href="/booking">Book a Consultation</Button>
          </div>
        </div>
      )}

      <p className="mt-6 text-sm text-muted">
        You&apos;ll get a reminder the day before each visit.
      </p>

      <div className="mt-4">
        <WaCTA
          message="Hi, I'd like to ask about my appointment."
          label="Message About Appointments"
        />
      </div>

      <div className="mt-12 border-t border-line pt-6">
        {past.length > 0 ? (
          <>
            <p className="text-xs uppercase tracking-wide text-muted">Past Visits</p>
            <div className="mt-4 space-y-3">
              {past.map((visit) => (
                <div
                  key={visit.id}
                  className="flex flex-col gap-1 border border-line p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-display text-lg">{visit.type}</p>
                    <p className="text-sm text-muted">
                      {visit.date} · {visit.time} · {visit.location}
                    </p>
                  </div>
                  <span className="text-xs uppercase tracking-wide text-muted">{visit.status}</span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="text-sm text-muted">
            Past visits will appear here once you&apos;ve had your first appointment.
          </p>
        )}
      </div>
    </Section>
  );
}
