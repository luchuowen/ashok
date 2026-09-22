"use client";

import { useEffect, useState } from "react";
import { Section } from "@/components/ui/Section";
import { FormField } from "@/components/ui/FormField";
import { FormGrid } from "@/components/ui/FormGrid";
import { Button } from "@/components/ui/Button";
import { Tag } from "@/components/ui/Tag";
import { useAuthSession } from "@/app/auth-context";
import { usePortalData } from "@/app/portal/portal-context";

const inputClasses =
  "border border-line bg-paper px-3 py-2 text-sm text-ink focus:border-oxblood focus:outline-none";

export default function SettingsPage() {
  const { phone } = useAuthSession();
  const { customer, refresh } = usePortalData();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneValue, setPhoneValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [channels, setChannels] = useState<Record<string, boolean>>({
    WhatsApp: true,
    SMS: false,
    Email: false,
  });

  useEffect(() => {
    if (phone) setPhoneValue(phone);
  }, [phone]);

  useEffect(() => {
    if (customer) {
      setName(customer.name ?? "");
      setEmail(customer.email ?? "");
    }
  }, [customer]);

  const toggleChannel = (channel: string) => {
    setChannels((prev) => ({ ...prev, [channel]: !prev[channel] }));
    setSaved(false);
  };

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/portal/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || "Could not save your details. Try again.");
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
      <h1 className="font-display text-3xl">Settings</h1>

      <div className="mt-8">
        <FormGrid columns={2}>
          <FormField label="Name" htmlFor="name">
            <input
              id="name"
              name="name"
              type="text"
              value={name}
              placeholder="Enter Your Name"
              className={inputClasses}
              onChange={(e) => {
                setName(e.target.value);
                setSaved(false);
              }}
            />
          </FormField>
          <FormField label="Phone" htmlFor="phone">
            <input
              id="phone"
              name="phone"
              type="tel"
              value={phoneValue}
              disabled
              placeholder="+254 7xx xxx xxx"
              className={`${inputClasses} cursor-not-allowed opacity-70`}
            />
          </FormField>
          <FormField label="Email" htmlFor="email">
            <input
              id="email"
              name="email"
              type="email"
              value={email}
              placeholder="Enter Your Email"
              className={inputClasses}
              onChange={(e) => {
                setEmail(e.target.value);
                setSaved(false);
              }}
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
          <Button type="button" disabled={saving} onClick={handleSave}>
            {saving ? "Saving…" : "Save Changes"}
          </Button>
          {saved ? <p className="text-sm text-oxblood">Saved.</p> : null}
          {error ? <p className="text-sm text-oxblood">{error}</p> : null}
        </div>
      </div>

      <p className="mt-12 text-xs text-muted">
        Sign-in is phone + one-time code — no password to reset here. Your phone number identifies
        your record and can&apos;t be changed here — message us on WhatsApp if it changed.
      </p>
    </Section>
  );
}
