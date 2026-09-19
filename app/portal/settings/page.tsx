"use client";

import { useEffect, useState } from "react";
import { Section } from "@/components/ui/Section";
import { FormField } from "@/components/ui/FormField";
import { FormGrid } from "@/components/ui/FormGrid";
import { Button } from "@/components/ui/Button";
import { Tag } from "@/components/ui/Tag";
import { useAuthSession } from "@/app/auth-context";

const inputClasses =
  "border border-line bg-paper px-3 py-2 text-sm text-ink focus:border-oxblood focus:outline-none";

export default function SettingsPage() {
  // Phase 1 mock — no backend yet, so "Save Changes" just flips local state to
  // show a confirmation message. See lib/firebase.ts for the eventual write.
  const { phone } = useAuthSession();
  const [saved, setSaved] = useState(false);
  const [phoneValue, setPhoneValue] = useState("");

  useEffect(() => {
    if (phone) setPhoneValue(phone);
  }, [phone]);
  const [channels, setChannels] = useState<Record<string, boolean>>({
    WhatsApp: true,
    SMS: false,
    Email: false,
  });

  const toggleChannel = (channel: string) => {
    setChannels((prev) => ({ ...prev, [channel]: !prev[channel] }));
    setSaved(false);
  };

  return (
    <Section>
      <h1 className="font-display text-3xl">Settings</h1>

      <div className="mt-8">
        <FormGrid columns={2}>
          <FormField label="Name" htmlFor="name">
            <input
              id="name"
              name="name"
              type="text"
              placeholder="Enter Your Name"
              className={inputClasses}
              onChange={() => setSaved(false)}
            />
          </FormField>
          <FormField label="Phone" htmlFor="phone">
            <input
              id="phone"
              name="phone"
              type="tel"
              value={phoneValue}
              placeholder="+254 7xx xxx xxx"
              className={inputClasses}
              onChange={(e) => {
                setPhoneValue(e.target.value);
                setSaved(false);
              }}
            />
          </FormField>
          <FormField label="Email" htmlFor="email">
            <input
              id="email"
              name="email"
              type="email"
              placeholder="Enter Your Email"
              className={inputClasses}
              onChange={() => setSaved(false)}
            />
          </FormField>
          <FormField label="Notify me by" htmlFor="notify">
            <div id="notify" className="flex flex-wrap gap-2 pt-1">
              {Object.keys(channels).map((channel) => (
                <button
                  key={channel}
                  type="button"
                  onClick={() => toggleChannel(channel)}
                  aria-pressed={channels[channel]}
                >
                  <Tag variant={channels[channel] ? "stage" : "default"}>{channel}</Tag>
                </button>
              ))}
            </div>
          </FormField>
        </FormGrid>

        <div className="mt-8 flex items-center gap-4">
          <Button type="button" onClick={() => setSaved(true)}>
            Save Changes
          </Button>
          {saved ? <p className="text-sm text-oxblood">Saved.</p> : null}
        </div>
      </div>

      <p className="mt-12 text-xs text-muted">
        Sign-in is phone + one-time code — no password to reset here.
      </p>
    </Section>
  );
}
