// TODO(phase-2): gate this route behind Firebase Auth — redirect to /auth if no session.
// Deliberately open in Phase 1 so reviewers can see it.
import { Section } from "@/components/ui/Section";
import { StatCard } from "@/components/portal/StatCard";
import { orders } from "@/lib/fixtures/orders";
import { appointments } from "@/lib/fixtures/appointments";
import { measurements } from "@/lib/fixtures/measurements";

export default function PortalOverviewPage() {
  const order = orders[0];
  const appointment = appointments[0];
  const measurement = measurements[0];

  return (
    <>
      <Section border={false}>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          <StatCard label="Active Order" value={order.item} hint={order.statusNote} />
          <StatCard
            label="Next Appointment"
            value={`${appointment.date} · ${appointment.time}`}
            hint={`${appointment.type} · ${appointment.location}`}
          />
          <StatCard
            label="Measurements"
            value="On File"
            hint={`Last updated ${measurement.takenAt}`}
          />
        </div>
      </Section>

      <Section>
        <p className="max-w-2xl text-base text-muted">
          &ldquo;Your Record&rdquo; reads like the book the house has always kept on paper —
          what you ordered, what fits, what&apos;s outstanding — not a generic account
          dashboard.
        </p>
      </Section>
    </>
  );
}
