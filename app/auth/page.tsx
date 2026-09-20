"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";

type AuthTab = "sign-in" | "register";
type Step = "phone" | "code";

export default function AuthPage() {
  return (
    <Suspense fallback={null}>
      <AuthForm />
    </Suspense>
  );
}

function AuthForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<AuthTab>("sign-in");
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [mobile, setMobile] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault();
    if (!phone.trim()) {
      setError("Enter a phone number first.");
      return;
    }
    setError(null);
    setSending(true);
    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || "Could not send the code. Try again.");
        return;
      }
      setToken(data.token);
      setMobile(data.mobile);
      setCode("");
      setStep("code");
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
    } finally {
      setSending(false);
    }
  }

  async function handleVerifyCode(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim() || !token || !mobile) {
      setError("Enter the code we texted you.");
      return;
    }
    setError(null);
    setVerifying(true);
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: mobile, code, token }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || "Could not verify that code.");
        return;
      }
      const next = searchParams.get("next");
      router.push(next && next.startsWith("/") ? next : "/portal");
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
    } finally {
      setVerifying(false);
    }
  }

  function switchTab(next: AuthTab) {
    setTab(next);
    setStep("phone");
    setCode("");
    setToken(null);
    setMobile(null);
    setError(null);
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

        {step === "phone" ? (
          <form onSubmit={handleSendCode} className="mt-8 flex flex-col gap-6">
            <FormField label="Phone Number" htmlFor="phone">
              <input
                id="phone"
                type="tel"
                required
                value={phone}
                onChange={(event) => {
                  setPhone(event.target.value);
                  setError(null);
                }}
                placeholder="+254 7XX XXX XXX"
                className="border border-line bg-paper px-4 py-3 text-sm text-ink outline-none focus:border-oxblood"
              />
            </FormField>
            <p className="text-xs text-muted">
              We&apos;ll text a one-time code — no password to remember.
            </p>

            <Button type="submit">{sending ? "Sending…" : "Send Code"}</Button>

            {error ? <p className="text-sm text-oxblood">{error}</p> : null}
          </form>
        ) : (
          <form onSubmit={handleVerifyCode} className="mt-8 flex flex-col gap-6">
            <p className="text-sm text-muted">
              Code sent to {mobile} — check your phone.
            </p>
            <FormField label="Verification Code" htmlFor="code">
              <input
                id="code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                required
                value={code}
                onChange={(event) => {
                  setCode(event.target.value);
                  setError(null);
                }}
                placeholder="6-digit code"
                className="border border-line bg-paper px-4 py-3 text-sm tracking-[0.3em] text-ink outline-none focus:border-oxblood"
              />
            </FormField>

            <Button type="submit">{verifying ? "Verifying…" : "Verify Code"}</Button>

            {error ? <p className="text-sm text-oxblood">{error}</p> : null}

            <button
              type="button"
              onClick={() => setStep("phone")}
              className="text-left text-xs uppercase tracking-wide text-muted hover:text-oxblood"
            >
              &larr; Use a different number
            </button>
          </form>
        )}

        <p className="mt-12 text-center text-xs text-muted">
          One simple page for signing in and creating or accessing your account.
        </p>
      </div>
    </main>
  );
}
