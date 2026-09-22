"use client";

import { Section } from "@/components/ui/Section";
import { StatCard } from "@/components/portal/StatCard";
import { usePortalData } from "@/app/portal/portal-context";
import { isUpcomingInNairobi } from "@/lib/dates";
import type { OrderStage } from "@/lib/db";

const CLOSED_STAGES: OrderStage[] = ["Collected", "Cancelled", "Returned", "Refunded"];

export default function PortalOverviewPage() {
  const { orders, appointments, measurements } = usePortalData();
  // orders are newest-first; skip closed ones so a collected or cancelled
  // order doesn't keep showing as "Active".
  const order = orders.find((o) => !CLOSED_STAGES.includes(o.stage));
  // Soonest still-Scheduled appointment that hasn't happened yet — same
  // rule as /portal/appointments.
  const appointment = appointments
    .filter((a) => a.status === "Scheduled" && isUpcomingInNairobi(a.date, a.time))
    .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`))[0];
  const measurement = measurements[0];

  return (
    <>
      <Section border={false}>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          <StatCard
            label="Active Order"
            value={order ? order.item : "None yet"}
            hint={order ? order.statusNote : "Book a consultation to start one."}
          />
          <StatCard
            label="Next Appointment"
            value={appointment ? `${appointment.date} · ${appointment.time}` : "None scheduled"}
            hint={appointment ? `${appointment.type} · ${appointment.location}` : undefined}
          />
          <StatCard
            label="Measurements"
            value={measurement ? "On File" : "Not on File"}
            hint={measurement ? `Last updated ${measurement.takenAt}` : "Taken at your first fitting."}
          />
        </div>
      </Section>

      <Section className="text-center sm:text-left">
        <p className="mx-auto max-w-2xl text-base text-muted sm:mx-0">
          Your Record with the House — your orders, appointments, measurements and
          preferences, kept in one place.
        </p>
      </Section>
    </>
  );
}
