import { Section } from "@/components/ui/Section";
import { Button } from "@/components/ui/Button";
import { LedgerTable } from "@/components/portal/LedgerTable";
import { measurements, type ClientMeasurements } from "@/lib/fixtures/measurements";

export default function MeasurementsPage() {
  return (
    <Section>
      <h2 className="text-2xl">Measurements</h2>
      <div className="mt-8">
        <LedgerTable<ClientMeasurements>
          columns={[
            { key: "chest", header: "Chest", render: (row) => `${row.chest} cm` },
            { key: "waist", header: "Waist", render: (row) => `${row.waist} cm` },
            { key: "shoulder", header: "Shoulder", render: (row) => `${row.shoulder} cm` },
            {
              key: "sleeveLength",
              header: "Sleeve",
              render: (row) => `${row.sleeveLength} cm`,
            },
            { key: "inseam", header: "Inseam", render: (row) => `${row.inseam} cm` },
            { key: "takenAt", header: "Taken" },
          ]}
          rows={measurements}
          emptyMessage="No measurements on file yet — they're taken at your first fitting."
        />
      </div>
      <p className="mt-6 text-sm text-muted">
        Measurements are entered by staff at a fitting, never self-reported — this record is
        read-only. Book a re-measure if your fit has changed.
      </p>
      <div className="mt-4">
        <Button href="/booking" variant="ghost">
          Request a Re-Measure
        </Button>
      </div>
    </Section>
  );
}
