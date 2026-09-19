"use client";

import { Section } from "@/components/ui/Section";
import { StatCard } from "@/components/portal/StatCard";
import { usePortalData } from "@/app/portal/portal-context";

export default function PortalOverviewPage() {
  const { orders, appointments, measurements } = usePortalData();
  const order = orders[0];
  const appointment = appointments[0];
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
          Your Account — a simple place to view your orders, saved details, and account
          information.
        </p>
      </Section>
    </>
  );
}
