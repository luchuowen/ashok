"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";

type AuthTab = "sign-in" | "register";

export default function AuthPage() {
  const [tab, setTab] = useState<AuthTab>("sign-in");
  const [phone, setPhone] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [phoneError, setPhoneError] = useState(false);

  function handleSendCode(e: React.FormEvent) {
    e.preventDefault();
    if (!phone.trim()) {
      setPhoneError(true);
      setCodeSent(false);
      return;
    }
    setPhoneError(false);
    // Phase 1 mock: no real Firebase Auth call yet. This just flips local state
    // to show the "code sent" confirmation. Phase 2 wires this to Firebase Phone Auth.
    setCodeSent(true);
  }

  function switchTab(next: AuthTab) {
    setTab(next);
    setCodeSent(false);
  }

  return (
    <main>
      <div className="mx-auto max-w-md px-6 py-20">
        <div className="flex gap-8 border-b border-line">
          <button
            type="button"
            onClick={() => switchTab("sign-in")}
            className={`-mb-px border-b-2 pb-3 text-sm uppercase tracking-wide ${
              tab === "sign-in" ? "border-oxblood text-oxblood" : "border-transparent text-muted"
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => switchTab("register")}
            className={`-mb-px border-b-2 pb-3 text-sm uppercase tracking-wide ${
              tab === "register" ? "border-oxblood text-oxblood" : "border-transparent text-muted"
            }`}
          >
            Register
          </button>
        </div>

        <form onSubmit={handleSendCode} className="mt-8 flex flex-col gap-6">
          <FormField label="Phone Number" htmlFor="phone">
            <input
              id="phone"
              type="tel"
              required
              value={phone}
              onChange={(event) => {
                setPhone(event.target.value);
                setPhoneError(false);
              }}
              placeholder="+254 7XX XXX XXX"
              className="border border-line bg-paper px-4 py-3 text-sm text-ink outline-none focus:border-oxblood"
            />
          </FormField>
          <p className="text-xs text-muted">
            We&apos;ll text a one-time code — no password to remember.
          </p>

          <Button type="submit">Send Code</Button>

          {phoneError ? (
            <p className="text-sm text-oxblood">Enter a phone number first.</p>
          ) : null}
          {codeSent ? (
            <p className="text-sm text-oxblood">Code sent — check your phone.</p>
          ) : null}
        </form>

        <p className="mt-12 text-center text-xs text-muted">
          One page for sign in, registration and password recovery — merged from three separate
          screens in the original sitemap.
        </p>
      </div>
    </main>
  );
}
