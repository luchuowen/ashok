import { Section } from "@/components/ui/Section";
import { Button } from "@/components/ui/Button";
import { WaCTA } from "@/components/ui/WaCTA";
import { appointments } from "@/lib/fixtures/appointments";
import { buildGoogleCalendarUrl } from "@/lib/ics";

export default function AppointmentsPage() {
  const [upcoming] = appointments;

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
        <p className="text-sm text-muted">
          Past visits will appear here once you&apos;ve had your first appointment.
        </p>
      </div>
    </Section>
  );
}
