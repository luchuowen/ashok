"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";

type AuthTab = "sign-in" | "register";
type Step = "phone" | "code";

const RESEND_COOLDOWN_SECONDS = 45;

export default function AuthPage() {
  return (
    <Suspense fallback={null}>
      <AuthForm />
    </Suspense>
  );
}

function AuthForm() {
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
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resending, setResending] = useState(false);

  // Counts resendCooldown down to 0 once a code has been sent — reset to
  // RESEND_COOLDOWN_SECONDS whenever a fresh code goes out (handleSendCode,
  // handleResendCode) so the resend button stays disabled for a beat
  // instead of being spammable the instant the code step appears.
  useEffect(() => {
    if (step !== "code" || resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [step, resendCooldown]);

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
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
    } finally {
      setSending(false);
    }
  }

  async function handleResendCode() {
    if (resendCooldown > 0 || resending || !mobile) return;
    setError(null);
    setResending(true);
    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: mobile }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || "Could not resend the code. Try again.");
        return;
      }
      setToken(data.token);
      setMobile(data.mobile);
      setCode("");
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
    } finally {
      setResending(false);
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
        body: JSON.stringify({ phone: mobile, code, token, intent: tab }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        if (data.accountExists) {
          setTab("sign-in");
          setStep("phone");
          setToken(null);
          setMobile(null);
          setCode("");
          setError(data.error || "An account with this number already exists — sign in instead.");
        } else {
          setError(data.error || "Could not verify that code.");
        }
        setVerifying(false);
        return;
      }
      // Success — leave the button showing "Verifying…" instead of
      // resetting to idle here; we're about to navigate away.
      //
      // This deliberately uses a hard navigation (window.location), not
      // router.push. /portal is middleware-gated (see middleware.ts) and
      // the visitor almost always lands on this page BECAUSE that
      // middleware just redirected them from /portal to here — so
      // Next's client-side router cache already holds a cached "redirect
      // to /auth" entry for /portal from before this request's Set-Cookie
      // existed. A soft router.push("/portal") right after can silently
      // resolve out of that stale cache to the exact URL already on
      // screen (/auth?next=/portal) instead of hitting the server again
      // — no error, no navigation, this button stuck on "Verifying…"
      // forever. A full navigation always re-requests /portal from the
      // server, which re-runs middleware with the cookie this response
      // just set and can never return a stale cached redirect.
      const next = searchParams.get("next");
      window.location.href = next && next.startsWith("/") ? next : "/portal";
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
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
    setResendCooldown(0);
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

            <button
              type="button"
              onClick={handleResendCode}
              disabled={resendCooldown > 0 || resending}
              className={`border px-6 py-3 text-sm font-medium uppercase tracking-wide transition-colors ${
                resendCooldown > 0 || resending
                  ? "cursor-not-allowed border-line text-muted"
                  : "border-oxblood text-oxblood hover:bg-oxblood hover:text-cream"
              }`}
            >
              {resending
                ? "Resending…"
                : resendCooldown > 0
                  ? `Resend Code · 0:${String(resendCooldown).padStart(2, "0")}`
                  : "Resend Code"}
            </button>

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
