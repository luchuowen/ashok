"use client";

import { useState } from "react";
import { Section } from "@/components/ui/Section";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { FormField } from "@/components/ui/FormField";
import { FormGrid } from "@/components/ui/FormGrid";
import { Button } from "@/components/ui/Button";
import { Tag } from "@/components/ui/Tag";
import { preferences } from "@/lib/fixtures/preferences";

const inputClasses =
  "w-full border border-line bg-paper px-3 py-2 text-sm text-ink focus:border-oxblood focus:outline-none";

const FIT_OPTIONS = ["Slim", "Classic", "Relaxed"] as const;
const LAPEL_OPTIONS = ["Notch", "Peak", "Shawl"] as const;
const CHANNEL_OPTIONS = ["WhatsApp", "Email", "Phone"] as const;

export default function PreferencesPage() {
  const [profile] = preferences;

  // Phase 1 mock — no backend yet, same pattern as /portal/settings: local
  // state only, "Save Changes" just confirms. See lib/firebase.ts for the
  // eventual write.
  const [fit, setFit] = useState(profile?.fitPreference ?? "Classic");
  const [fabricWeight, setFabricWeight] = useState(profile?.preferredFabricWeight ?? "");
  const [lapel, setLapel] = useState(profile?.lapelStyle ?? "Notch");
  const [channel, setChannel] = useState(profile?.communicationChannel ?? "WhatsApp");
  const [notes, setNotes] = useState(profile?.notes ?? "");
  const [saved, setSaved] = useState(false);

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
              {CHANNEL_OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => {
                    setChannel(option);
                    setSaved(false);
                  }}
                  aria-pressed={channel === option}
                >
                  <Tag variant={channel === option ? "stage" : "default"}>{option}</Tag>
                </button>
              ))}
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
          <Button type="button" onClick={() => setSaved(true)}>
            Save Changes
          </Button>
          {saved ? <p className="text-sm text-oxblood">Saved.</p> : null}
        </div>
      </div>
    </Section>
  );
}
