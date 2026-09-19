import { Section } from "@/components/ui/Section";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { preferences } from "@/lib/fixtures/preferences";

export default function PreferencesPage() {
  const [profile] = preferences;

  const rows = profile
    ? [
        { label: "Fit Preference", value: profile.fitPreference },
        { label: "Preferred Fabric Weight", value: profile.preferredFabricWeight },
        { label: "Lapel Style", value: profile.lapelStyle },
        { label: "Communication Channel", value: profile.communicationChannel },
        { label: "Notes", value: profile.notes },
      ]
    : [];

  return (
    <Section>
      <Eyebrow>What the house knows about your taste</Eyebrow>
      <h1 className="mt-2 font-display text-3xl">Preferences</h1>

      <div className="mt-8 border border-line text-sm">
        {rows.map((row) => (
          <div
            key={row.label}
            className="grid grid-cols-1 border-b border-line last:border-b-0 sm:grid-cols-[240px_1fr]"
          >
            <div className="px-4 py-3 text-xs uppercase tracking-wide text-muted sm:border-r sm:border-line">
              {row.label}
            </div>
            <div className="px-4 py-3">{row.value}</div>
          </div>
        ))}
      </div>
    </Section>
  );
}
