"use client";

import { useEffect, useState } from "react";
import { Section } from "@/components/ui/Section";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { FormField } from "@/components/ui/FormField";
import { FormGrid } from "@/components/ui/FormGrid";
import { Button } from "@/components/ui/Button";
import { Tag } from "@/components/ui/Tag";
import { usePortalData } from "@/app/portal/portal-context";

const inputClasses =
  "w-full border border-line bg-paper px-3 py-2 text-sm text-ink focus:border-oxblood focus:outline-none";

const FIT_OPTIONS = ["Slim", "Classic", "Relaxed"] as const;
const LAPEL_OPTIONS = ["Notch", "Peak", "Shawl"] as const;
const CHANNEL_OPTIONS = ["WhatsApp", "Email", "Phone"] as const;

export default function PreferencesPage() {
  const { preferences, refresh } = usePortalData();

  const [fit, setFit] = useState<(typeof FIT_OPTIONS)[number]>("Classic");
  const [fabricWeight, setFabricWeight] = useState("");
  const [lapel, setLapel] = useState<(typeof LAPEL_OPTIONS)[number]>("Notch");
  const [channels, setChannels] = useState<(typeof CHANNEL_OPTIONS)[number][]>(["WhatsApp"]);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!preferences) return;
    setFit(preferences.fitPreference);
    setFabricWeight(preferences.preferredFabricWeight);
    setLapel(preferences.lapelStyle);
    setChannels(preferences.communicationChannels?.length ? preferences.communicationChannels : ["WhatsApp"]);
    setNotes(preferences.notes);
  }, [preferences]);

  async function handleSave() {
    if (channels.length === 0) {
      setError("Pick at least one communication channel.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/portal/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fitPreference: fit,
          preferredFabricWeight: fabricWeight,
          lapelStyle: lapel,
          communicationChannels: channels,
          notes,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || "Could not save your preferences. Try again.");
        return;
      }
      setSaved(true);
      await refresh();
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Section>
      <Eyebrow>What the house knows about your taste</Eyebrow>
      <h1 className="mt-2 font-display text-3xl">Preferences</h1>

      <div className="mt-8 max-w-2xl">
        <FormGrid columns={2}>
          <FormField label="Fit Preference" htmlFor="fit">
            <div id="fit" className="flex flex-wrap gap-2 pt-1">
              {FIT_OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => {
                    setFit(option);
                    setSaved(false);
                  }}
                  aria-pressed={fit === option}
                >
                  <Tag variant={fit === option ? "stage" : "default"}>{option}</Tag>
                </button>
              ))}
            </div>
          </FormField>

          <FormField label="Lapel Style" htmlFor="lapel">
            <div id="lapel" className="flex flex-wrap gap-2 pt-1">
              {LAPEL_OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => {
                    setLapel(option);
                    setSaved(false);
                  }}
                  aria-pressed={lapel === option}
                >
                  <Tag variant={lapel === option ? "stage" : "default"}>{option}</Tag>
                </button>
              ))}
            </div>
          </FormField>

          <FormField label="Preferred Fabric Weight" htmlFor="fabric-weight">
            <input
              id="fabric-weight"
              value={fabricWeight}
              onChange={(e) => {
                setFabricWeight(e.target.value);
                setSaved(false);
              }}
              placeholder="e.g. 260-300g/m²"
              className={inputClasses}
            />
          </FormField>

          <FormField label="Communication Channel" htmlFor="channel">
            <div id="channel" className="flex flex-wrap gap-2 pt-1">
              {CHANNEL_OPTIONS.map((option) => {
                const active = channels.includes(option);
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => {
                      setChannels((prev) =>
                        prev.includes(option) ? prev.filter((c) => c !== option) : [...prev, option],
                      );
                      setSaved(false);
                    }}
                    aria-pressed={active}
                  >
                    <Tag variant={active ? "stage" : "default"}>{option}</Tag>
                  </button>
                );
              })}
            </div>
          </FormField>

          <div className="sm:col-span-2">
            <FormField label="Notes" htmlFor="notes">
              <textarea
                id="notes"
                rows={3}
                value={notes}
                onChange={(e) => {
                  setNotes(e.target.value);
                  setSaved(false);
                }}
                className={inputClasses}
              />
            </FormField>
          </div>
        </FormGrid>

        <div className="mt-8 flex items-center gap-4">
          <Button type="button" disabled={saving} onClick={handleSave}>
            {saving ? "Saving…" : "Save Changes"}
          </Button>
          {saved ? <p className="text-sm text-oxblood">Saved.</p> : null}
          {error ? <p className="text-sm text-oxblood">{error}</p> : null}
        </div>
      </div>
    </Section>
  );
}
