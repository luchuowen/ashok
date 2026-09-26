"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAuthSession } from "@/app/auth-context";
import {
  BASICS_LIMITS,
  BUILD_QUESTIONS,
  DEFAULT_BUILD,
  FIELD_BY_KEY,
  MEASURE_FIELDS,
  METHOD_LABELS,
  cmToIn,
  estimateMeasurements,
  inToCm,
  validateFitProfile,
} from "@/lib/suit/measurements";
import type { BodyBasics, FitMethod, FitProfile, MeasureKey } from "@/lib/suit/types";
import { BodyDiagram } from "./BodyDiagram";
import { useFitProfile } from "./stores";

type Stage = "method" | "basics" | "measure" | "done";

interface OnFile {
  id: string;
  takenAt: string;
  chest: number;
  waist: number;
  hips: number;
  shoulder: number;
  sleeveLength: number;
  inseam: number;
  neck: number;
}

const input = "border border-line bg-paper px-3 py-2 text-sm text-ink focus:border-oxblood focus:outline-none";

function emptyProfile(method: FitMethod): FitProfile {
  return { v: 1, name: "My profile", method, units: "cm", basics: null, body: {}, build: { ...DEFAULT_BUILD }, updatedAt: new Date().toISOString() };
}

/**
 * The fit-profile flow (Hockerty's "digital body profile", done the
 * atelier's way): pick a method, give height/weight/age and build, review
 * or enter each measurement with a guide, then save. Stored on the device
 * for checkout, and on the customer's record when signed in.
 */
export function FitProfileBuilder() {
  const router = useRouter();
  const params = useSearchParams();
  // Same-origin paths only — never a scheme ("javascript:") or protocol-relative ("//host") URL.
  const rawNext = params.get("next") ?? "";
  const next = /^\/(?![\/\\])/.test(rawNext) ? rawNext : "/cart";
  const auth = useAuthSession();
  const [saved, setSaved, hydrated] = useFitProfile();
  const [draft, setDraft] = useState<FitProfile | null>(null);
  const [stage, setStage] = useState<Stage>("method");
  const [active, setActive] = useState<MeasureKey>("neck");
  const [onFile, setOnFile] = useState<OnFile | null>(null);
  const [serverProfile, setServerProfile] = useState<FitProfile | null>(null);
  const [loadingServer, setLoadingServer] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [showErrors, setShowErrors] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);
  const pick = (key: MeasureKey) => {
    setActive(key);
    if (window.matchMedia("(max-width: 1023px)").matches) {
      requestAnimationFrame(() => editorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
    }
  };

  useEffect(() => {
    if (!hydrated || draft) return;
    if (saved) {
      setDraft(saved);
      setStage("done");
    }
  }, [hydrated, saved, draft]);

  useEffect(() => {
    if (auth.loading || !auth.signedIn) return;
    setLoadingServer(true);
    fetch("/api/suits/fit-profile")
      .then((r) => r.json())
      .then((d) => {
        if (d.onFile) setOnFile(d.onFile as OnFile);
        if (d.profile) setServerProfile(d.profile as FitProfile);
      })
      .catch(() => undefined)
      .finally(() => setLoadingServer(false));
  }, [auth.loading, auth.signedIn]);

  const units = draft?.units ?? "cm";
  const issues = useMemo(() => validateFitProfile(draft), [draft]);
  const errors = issues.filter((i) => i.severity === "error");
  const warnings = issues.filter((i) => i.severity === "warning");

  function choose(method: FitMethod) {
    setShowErrors(false);
    if (method === "atelier") {
      const p = emptyProfile("atelier");
      p.name = "Measure at the atelier";
      setDraft(p);
      setStage("done");
      return;
    }
    if (method === "onfile" && onFile) {
      const p = emptyProfile("onfile");
      p.name = "Measurements on file";
      p.onFileId = onFile.id;
      p.onFileTakenAt = onFile.takenAt;
      setDraft(p);
      setStage("done");
      return;
    }
    const base = draft && (draft.method === "estimate" || draft.method === "self") ? { ...draft, method } : emptyProfile(method);
    setDraft(base);
    setStage("basics");
  }

  function setBasics(patch: Partial<BodyBasics>) {
    setDraft((d) => (d ? { ...d, basics: { height: 0, weight: 0, age: 0, ...(d.basics ?? {}), ...patch } } : d));
  }

  function toMeasure() {
    if (!draft) return;
    if (!draft.basics) {
      setShowErrors(true);
      return;
    }
    const b = draft.basics;
    const bad = (Object.keys(BASICS_LIMITS) as (keyof typeof BASICS_LIMITS)[]).some((k) => !(b[k] >= BASICS_LIMITS[k].min && b[k] <= BASICS_LIMITS[k].max));
    if (bad) {
      setShowErrors(true);
      return;
    }
    setShowErrors(false);
    const est = estimateMeasurements(b, draft.build);
    setDraft((d) => {
      if (!d) return d;
      // Estimate fills every field; "self" keeps what the customer already typed and leaves the rest blank for them.
      const body = d.method === "estimate" ? { ...est, ...pickTouched(d) } : { ...d.body };
      return { ...d, body };
    });
    setActive("neck");
    setStage("measure");
  }

  function setMeasure(key: MeasureKey, cm: number | undefined) {
    setDraft((d) => {
      if (!d) return d;
      const body = { ...d.body };
      if (cm === undefined || Number.isNaN(cm)) delete body[key];
      else body[key] = Math.round(cm * 2) / 2;
      return { ...d, body, touched: { ...((d as FitProfile & { touched?: Record<string, boolean> }).touched ?? {}), [key]: true } } as FitProfile;
    });
  }

  async function save() {
    if (!draft) return;
    if (errors.length) {
      setShowErrors(true);
      const first = errors.find((e) => e.key && FIELD_BY_KEY[e.key as MeasureKey]);
      if (first?.key) setActive(first.key as MeasureKey);
      return;
    }
    const clean: FitProfile = { ...draft, updatedAt: new Date().toISOString() };
    delete (clean as FitProfile & { touched?: unknown }).touched;
    setSaved(clean);
    setSaving(true);
    setSaveMsg(null);
    if (auth.signedIn) {
      try {
        const res = await fetch("/api/suits/fit-profile", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ profile: clean }),
        });
        const data = await res.json();
        setSaveMsg(res.ok && data.ok ? "Saved to your record too." : data.error || null);
      } catch {
        setSaveMsg("Saved on this device (couldn't reach your record just now).");
      }
    }
    setSaving(false);
    router.push(next);
  }

  const display = (cm?: number) => (cm === undefined ? "—" : units === "in" ? `${cmToIn(cm)}"` : `${cm} cm`);

  // ---------------------------------------------------------------- render

  if (!hydrated) return <div className="py-24 text-center text-sm text-muted">Loading…</div>;

  return (
    <div className="mx-auto max-w-6xl px-5 pb-32 pt-8 sm:px-8 lg:pb-16">
      <nav className="mb-6 flex items-center gap-2 text-[11px] uppercase tracking-[0.15em] text-muted" aria-label="Progress">
        <Link href="/cart" className="inline-flex min-h-8 items-center hover:text-ink">Bag</Link>
        <span>›</span>
        <span className="text-ink">Measurements</span>
        <span>›</span>
        <span>Checkout</span>
      </nav>

      {stage === "method" ? (
        <div>
          <h1 className="text-3xl md:text-4xl">How shall we take your measurements?</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted">
            Every suit is confirmed at your fitting in Ridgeways, so whichever you choose, we check the numbers on you before we finish it.
          </p>
          <div className="mt-8 grid gap-px border border-line bg-line sm:grid-cols-2">
            <MethodCard
              title="Estimate, then review"
              tag="About 3 minutes"
              body="Tell us your height, weight, age and build. We estimate all thirteen measurements; you adjust any you know."
              onClick={() => choose("estimate")}
            />
            <MethodCard
              title="I'll measure myself"
              tag="About 10 minutes · tape measure"
              body="Follow the guide for each measurement — ideally with someone to help. The most accurate way to order online."
              onClick={() => choose("self")}
            />
            <MethodCard
              title="Use my measurements on file"
              tag={onFile ? `Taken ${onFile.takenAt}` : auth.signedIn ? (loadingServer ? "Checking…" : "None on file yet") : "Sign in to use"}
              body="We already measured you at the atelier — use that record for this order."
              disabled={!onFile}
              footer={
                !auth.signedIn ? (
                  <Link href={`/auth?next=${encodeURIComponent(`/custom-suits/measurements?next=${next}`)}`} className="text-xs underline hover:text-oxblood">
                    Sign in
                  </Link>
                ) : null
              }
              onClick={() => choose("onfile")}
            />
            <MethodCard
              title="Measure me at the atelier"
              tag="In person · Ridgeways"
              body="Pay now and book a measuring appointment. We take your measurements in person before we cut."
              onClick={() => choose("atelier")}
            />
          </div>
          {serverProfile ? (
            <button
              type="button"
              onClick={() => {
                setDraft(serverProfile);
                setStage("done");
              }}
              className="mt-6 text-sm underline hover:text-oxblood"
            >
              Use &ldquo;{serverProfile.name}&rdquo; saved on your record ({METHOD_LABELS[serverProfile.method].toLowerCase()})
            </button>
          ) : null}
        </div>
      ) : null}

      {stage === "basics" && draft ? (
        <div className="grid gap-10 lg:grid-cols-[1fr_1.2fr]">
          <div>
            <h1 className="text-3xl md:text-4xl">First, a little about you</h1>
            <p className="mt-2 text-sm text-muted">This sets our starting pattern. Nothing here is shared.</p>
            <UnitsToggle value={units} onChange={(u) => setDraft({ ...draft, units: u })} />
            <div className="mt-6 space-y-6">
              <BasicsField
                label="Height"
                valueCm={draft.basics?.height}
                unit={units === "in" ? "in" : "cm"}
                min={BASICS_LIMITS.height.min}
                max={BASICS_LIMITS.height.max}
                convert={units === "in"}
                error={showErrors && !(draft.basics && draft.basics.height >= BASICS_LIMITS.height.min && draft.basics.height <= BASICS_LIMITS.height.max)}
                onChange={(v) => setBasics({ height: v })}
              />
              <BasicsField
                label="Weight"
                valueCm={draft.basics?.weight}
                unit={units === "in" ? "lb" : "kg"}
                min={BASICS_LIMITS.weight.min}
                max={BASICS_LIMITS.weight.max}
                weight
                convert={units === "in"}
                error={showErrors && !(draft.basics && draft.basics.weight >= BASICS_LIMITS.weight.min && draft.basics.weight <= BASICS_LIMITS.weight.max)}
                onChange={(v) => setBasics({ weight: v })}
              />
              <BasicsField
                label="Age"
                valueCm={draft.basics?.age}
                unit="years"
                min={BASICS_LIMITS.age.min}
                max={BASICS_LIMITS.age.max}
                error={showErrors && !(draft.basics && draft.basics.age >= BASICS_LIMITS.age.min && draft.basics.age <= BASICS_LIMITS.age.max)}
                onChange={(v) => setBasics({ age: Math.round(v) })}
              />
            </div>
          </div>
          <div>
            <h2 className="text-xl">Your build</h2>
            <p className="mt-1 text-sm text-muted">Our cutters adjust the pattern for these.</p>
            <div className="mt-4 space-y-5">
              {BUILD_QUESTIONS.map((q) => (
                <div key={q.key}>
                  <p className="mb-2 text-sm">{q.label}</p>
                  <div className="grid grid-cols-3 gap-2">
                    {q.options.map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setDraft({ ...draft, build: { ...draft.build, [q.key]: opt.id } })}
                        aria-pressed={draft.build[q.key] === opt.id}
                        className={`border px-3 py-2 text-xs ${draft.build[q.key] === opt.id ? "border-ink bg-ink text-cream" : "border-line bg-paper hover:border-ink/60"}`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            {showErrors ? <p className="mt-6 text-sm text-oxblood">Please enter a height, weight and age within range.</p> : null}
            <div className="mt-8 flex flex-wrap gap-3">
              <button type="button" onClick={() => setStage("method")} className="cta ghost">
                Back
              </button>
              <button type="button" onClick={toMeasure} className="cta">
                {draft.method === "estimate" ? "Estimate my measurements" : "Continue to measurements"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {stage === "measure" && draft ? (
        <div className="grid gap-8 lg:grid-cols-[260px_1fr_1fr]">
          <div className="hidden lg:block">
            <BodyDiagram zone={FIELD_BY_KEY[active].zone} className="sticky top-32 h-[70vh] w-full" />
          </div>
          <div>
            <h1 className="text-3xl">{draft.method === "estimate" ? "Your estimated measurements" : "Your measurements"}</h1>
            <p className="mt-1 text-sm text-muted">
              {draft.method === "estimate" ? "Adjust any you know. Tap one to see how it's measured." : "Tap each one for the guide and enter it."}
            </p>
            <UnitsToggle value={units} onChange={(u) => setDraft({ ...draft, units: u })} />
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {MEASURE_FIELDS.map((f) => {
                const v = draft.body[f.key];
                const err = showErrors && errors.some((e) => e.key === f.key);
                const warn = warnings.some((w) => w.key === f.key);
                return (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => pick(f.key)}
                    aria-pressed={active === f.key}
                    className={`border p-3 text-left transition-colors ${active === f.key ? "border-ink bg-paper ring-1 ring-ink" : err ? "border-oxblood bg-oxblood/5" : "border-line bg-paper hover:border-ink/50"}`}
                  >
                    <span className="block text-[11px] text-muted">
                      {f.label}
                      {warn ? <span className="ml-1 text-oxblood">•</span> : null}
                    </span>
                    <span className={`mt-1 block text-base ${v === undefined ? "text-muted" : ""}`}>{display(v)}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <div ref={editorRef} className="scroll-mt-24 lg:sticky lg:top-32 lg:self-start">
            <MeasureEditor
              fieldKey={active}
              valueCm={draft.body[active]}
              units={units}
              onChange={(cm) => setMeasure(active, cm)}
              onStep={(dir) => {
                const i = MEASURE_FIELDS.findIndex((f) => f.key === active);
                const nextField = MEASURE_FIELDS[i + dir];
                if (nextField) setActive(nextField.key);
              }}
            />
            {warnings.length ? (
              <ul className="mt-4 space-y-1 border border-line bg-paper p-3 text-xs text-ink">
                {warnings.map((w) => (
                  <li key={w.message}>
                    <span className="text-oxblood">Check:</span> {w.message}
                  </li>
                ))}
              </ul>
            ) : null}
            {showErrors && errors.length ? (
              <ul className="mt-4 space-y-1 border border-oxblood/40 bg-oxblood/5 p-3 text-xs text-oxblood" role="alert">
                {errors.slice(0, 5).map((e) => (
                  <li key={e.message}>{e.message}</li>
                ))}
              </ul>
            ) : null}
            <label className="mt-6 block">
              <span className="mb-1 block text-xs text-muted">Name this profile</span>
              <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value.slice(0, 40) })} className={`${input} w-full`} />
            </label>
            <div className="mt-6 flex flex-wrap gap-3">
              <button type="button" onClick={() => setStage("basics")} className="cta ghost">
                Change height, weight or build
              </button>
              <button type="button" onClick={save} disabled={saving} className="cta disabled:opacity-60">
                {saving ? "Saving…" : "Save measurements"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {stage === "done" && draft ? (
        <div className="grid gap-10 lg:grid-cols-[1fr_1fr]">
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-oxblood">Your fit profile</p>
            <h1 className="mt-2 text-3xl md:text-4xl">{draft.name}</h1>
            <p className="mt-2 text-sm text-muted">{METHOD_LABELS[draft.method]}</p>
            {draft.method === "atelier" ? (
              <p className="mt-6 max-w-md text-sm">
                After checkout we&rsquo;ll ask you to book a measuring appointment at our Ridgeways atelier. We don&rsquo;t cut until we&rsquo;ve measured you.
              </p>
            ) : null}
            {draft.method === "onfile" ? (
              <p className="mt-6 max-w-md text-sm">We&rsquo;ll cut from the measurements taken at the atelier on {draft.onFileTakenAt}. Tell us in your notes if anything has changed.</p>
            ) : null}
            {draft.basics && (draft.method === "estimate" || draft.method === "self") ? (
              <div className="mt-6 border border-line bg-paper p-4 text-sm">
                <p className="text-muted">
                  {units === "in" ? `${cmToIn(draft.basics.height)}"` : `${draft.basics.height} cm`} · {units === "in" ? `${Math.round(draft.basics.weight * 2.2046)} lb` : `${draft.basics.weight} kg`} · {draft.basics.age} years
                </p>
                <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1">
                  {MEASURE_FIELDS.map((f) => (
                    <div key={f.key} className="flex justify-between gap-2 border-b border-line/60 py-1">
                      <dt className="text-muted">{f.label}</dt>
                      <dd>{display(draft.body[f.key])}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ) : null}
            {saveMsg ? <p className="mt-3 text-xs text-muted">{saveMsg}</p> : null}
          </div>
          <div className="flex flex-col gap-3 lg:pt-10">
            <button
              type="button"
              onClick={async () => {
                setShowErrors(true);
                await save();
              }}
              disabled={saving}
              className="cta disabled:opacity-60"
            >
              {saving ? "Saving…" : next.startsWith("/checkout") ? "Use this profile and continue to checkout" : "Use this profile"}
            </button>
            {draft.method === "estimate" || draft.method === "self" ? (
              <button type="button" onClick={() => setStage("measure")} className="cta ghost">
                Edit measurements
              </button>
            ) : null}
            <button type="button" onClick={() => setStage("method")} className="cta ghost">
              Choose a different method
            </button>
            {showErrors && errors.length ? <p className="text-sm text-oxblood">{errors[0]!.message}</p> : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function pickTouched(d: FitProfile): Partial<Record<MeasureKey, number>> {
  const touched = (d as FitProfile & { touched?: Record<string, boolean> }).touched ?? {};
  const out: Partial<Record<MeasureKey, number>> = {};
  for (const [k, v] of Object.entries(d.body)) if (touched[k]) out[k as MeasureKey] = v;
  return out;
}

function MethodCard({
  title,
  tag,
  body,
  onClick,
  disabled,
  footer,
}: {
  title: string;
  tag: string;
  body: string;
  onClick: () => void;
  disabled?: boolean;
  footer?: React.ReactNode;
}) {
  return (
    <div className={`flex flex-col bg-cream p-6 ${disabled ? "opacity-90" : ""}`}>
      <p className="text-[11px] uppercase tracking-wide text-oxblood">{tag}</p>
      <h2 className="mt-2 text-xl">{title}</h2>
      <p className="mt-2 flex-1 text-sm text-muted">{body}</p>
      <div className="mt-5 flex items-center gap-4">
        <button type="button" onClick={onClick} disabled={disabled} className="cta !px-4 !py-2 text-xs disabled:cursor-not-allowed disabled:opacity-50">
          Choose
        </button>
        {footer}
      </div>
    </div>
  );
}

function UnitsToggle({ value, onChange }: { value: "cm" | "in"; onChange: (u: "cm" | "in") => void }) {
  return (
    <div className="mt-4 inline-flex border border-line text-xs" role="group" aria-label="Units">
      {(
        [
          ["cm", "Metric (cm, kg)"],
          ["in", "Imperial (in, lb)"],
        ] as const
      ).map(([u, l]) => (
        <button key={u} type="button" onClick={() => onChange(u)} aria-pressed={value === u} className={`px-3 py-1.5 ${value === u ? "bg-ink text-cream" : "text-muted hover:text-ink"}`}>
          {l}
        </button>
      ))}
    </div>
  );
}

function BasicsField({
  label,
  valueCm,
  unit,
  min,
  max,
  convert,
  weight,
  error,
  onChange,
}: {
  label: string;
  valueCm?: number;
  unit: string;
  min: number;
  max: number;
  convert?: boolean;
  weight?: boolean;
  error?: boolean;
  onChange: (metric: number) => void;
}) {
  const toDisplay = (v: number) => (convert ? (weight ? Math.round(v * 2.2046) : cmToIn(v)) : v);
  const fromDisplay = (v: number) => (convert ? (weight ? Math.round((v / 2.2046) * 10) / 10 : inToCm(v)) : v);
  const shown = valueCm ? toDisplay(valueCm) : "";
  const mid = Math.round((min + max) / 2);
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <label className="text-sm" htmlFor={`basic-${label}`}>
          {label}
        </label>
        <span className="flex items-center gap-2">
          <input
            id={`basic-${label}`}
            type="number"
            inputMode="decimal"
            value={shown}
            onChange={(e) => onChange(fromDisplay(Number(e.target.value)))}
            className={`${input} w-24 text-right ${error ? "!border-oxblood" : ""}`}
            aria-invalid={error}
          />
          <span className="w-10 text-xs text-muted">{unit}</span>
        </span>
      </div>
      <input
        type="range"
        min={toDisplay(min)}
        max={toDisplay(max)}
        step={convert && !weight ? 0.25 : 1}
        value={valueCm ? toDisplay(valueCm) : toDisplay(mid)}
        onChange={(e) => onChange(fromDisplay(Number(e.target.value)))}
        className="mt-2 w-full accent-[rgb(var(--oxblood))]"
        aria-label={`${label} slider`}
      />
    </div>
  );
}

function MeasureEditor({
  fieldKey,
  valueCm,
  units,
  onChange,
  onStep,
}: {
  fieldKey: MeasureKey;
  valueCm?: number;
  units: "cm" | "in";
  onChange: (cm: number | undefined) => void;
  onStep: (dir: 1 | -1) => void;
}) {
  const f = FIELD_BY_KEY[fieldKey];
  const conv = units === "in";
  const show = (cm: number) => (conv ? cmToIn(cm) : cm);
  const back = (v: number) => (conv ? inToCm(v) : v);
  const idx = MEASURE_FIELDS.findIndex((x) => x.key === fieldKey);
  const [text, setText] = useState(valueCm !== undefined ? String(show(valueCm)) : "");
  useEffect(() => {
    setText(valueCm !== undefined ? String(show(valueCm)) : "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fieldKey, units]);
  useEffect(() => {
    // Sync from outside changes (slider) — but never fight what's being typed:
    // typed values are stored rounded, so only resync when they really differ.
    if (valueCm === undefined) return;
    const typed = Number(text);
    if (text !== "" && Number.isFinite(typed) && Math.abs(back(typed) - valueCm) < 0.6) return;
    setText(String(show(valueCm)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valueCm]);

  return (
    <div className="border border-line bg-paper p-5">
      <div className="flex gap-4">
        <BodyDiagram zone={f.zone} className="h-40 w-20 flex-none lg:hidden" />
        <div>
          <p className="text-[11px] uppercase tracking-wide text-muted">
            {idx + 1} of {MEASURE_FIELDS.length}
          </p>
          <h2 className="mt-1 text-2xl">{f.label}</h2>
          <p className="mt-2 text-sm text-muted">{f.guide}</p>
        </div>
      </div>
      <div className="mt-5 flex items-center gap-3">
        <input
          type="number"
          inputMode="decimal"
          step={conv ? 0.25 : 0.5}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            const n = Number(e.target.value);
            onChange(e.target.value === "" || !Number.isFinite(n) ? undefined : back(n));
          }}
          className="w-28 border border-line bg-cream px-3 py-2 text-lg focus:border-oxblood focus:outline-none"
          aria-label={`${f.label} in ${conv ? "inches" : "centimetres"}`}
        />
        <span className="text-sm text-muted">{conv ? "in" : "cm"}</span>
        <span className="ml-auto text-[11px] text-muted">
          {show(f.min)}–{show(f.max)}
        </span>
      </div>
      <input
        type="range"
        min={show(f.min)}
        max={show(f.max)}
        step={conv ? 0.25 : 0.5}
        value={valueCm !== undefined ? show(valueCm) : show((f.min + f.max) / 2)}
        onChange={(e) => onChange(back(Number(e.target.value)))}
        className="mt-3 w-full accent-[rgb(var(--oxblood))]"
        aria-label={`${f.label} slider`}
      />
      <div className="mt-4 flex justify-between">
        <button type="button" onClick={() => onStep(-1)} disabled={idx === 0} className="text-xs uppercase tracking-wide text-muted hover:text-ink disabled:opacity-30">
          ‹ Previous
        </button>
        <button type="button" onClick={() => onStep(1)} disabled={idx === MEASURE_FIELDS.length - 1} className="text-xs uppercase tracking-wide text-ink hover:text-oxblood disabled:opacity-30">
          Next ›
        </button>
      </div>
    </div>
  );
}
