import { Section } from "@/components/ui/Section";
import { Button } from "@/components/ui/Button";
import { WaCTA } from "@/components/ui/WaCTA";
import { appointments } from "@/lib/fixtures/appointments";

export default function AppointmentsPage() {
  const [upcoming] = appointments;

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
            {/* Phase 1 mock — no real calendar integration yet, this is a no-op link. */}
            <Button href="#">Add to Calendar</Button>
          </div>
        </div>
      ) : null}

      <p className="mt-6 text-sm text-muted">
        You&apos;ll get a WhatsApp reminder the day before each visit.
      </p>

      <div className="mt-4">
        <WaCTA
          message="Hi, I'd like to reschedule my appointment."
          label="Message About This Appointment"
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
