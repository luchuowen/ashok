"use client";

import { useState } from "react";
import { Section } from "@/components/ui/Section";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";

const inputClasses =
  "border border-line bg-paper px-3 py-2 text-sm text-ink focus:border-oxblood focus:outline-none";

export function StaffLogin({ onSignedIn }: { onSignedIn: () => void }) {
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || "Could not sign in.");
        return;
      }
      onSignedIn();
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Section border={false}>
      <div className="mx-auto max-w-sm py-20">
        <h1 className="font-display text-2xl">Staff Sign In</h1>
        <p className="mt-2 text-sm text-muted">Ashok Sunny Tailored — internal use only.</p>
        <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-6">
          <FormField label="Staff Password" htmlFor="password">
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClasses}
            />
          </FormField>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Signing in…" : "Sign In"}
          </Button>
          {error ? <p className="text-sm text-oxblood">{error}</p> : null}
        </form>
      </div>
    </Section>
  );
}
