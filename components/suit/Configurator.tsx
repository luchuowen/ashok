"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useCart, isSuitLine, CUSTOM_SUIT_PRODUCT_ID } from "@/app/cart-context";
import { useAuthSession } from "@/app/auth-context";
import { MAX_SUITS_PER_LINE, OPTION_GROUPS, defaultConfig, getFabric, presetConfig } from "@/lib/suit/catalogue";
import { decodeDesign, encodeDesign } from "@/lib/suit/codec";
import { leadTimeDays, priceSuit, suitTitle } from "@/lib/suit/pricing";
import { isGroupApplicable, normalizeConfig, validateConfigStrict } from "@/lib/suit/rules";
import { buildSpec } from "@/lib/suit/spec";
import type { OptionSection, SuitConfig } from "@/lib/suit/types";
import { formatKes, formatMoney, KES_PER_USD } from "@/lib/currency";
import { FabricPicker } from "./FabricPicker";
import { OptionTiles } from "./OptionTiles";
import { DetailsPanel } from "./DetailsPanel";
import { SpecList } from "./SpecList";
import { Stage } from "./Stage";
import { SuitPreview, type PreviewView } from "./SuitPreview";
import { useDisplayCurrency } from "./stores";
import { CurrencyToggle } from "./CurrencyToggle";

type Step = "fabric" | "style" | "details" | "review";
const STEPS: { id: Step; label: string }[] = [
  { id: "fabric", label: "Fabric" },
  { id: "style", label: "Style" },
  { id: "details", label: "Details" },
  { id: "review", label: "Review" },
];

const DRAFT_KEY = "ashok-suit-draft";
const ADVANCED_KEY = "ashok-suit-advanced";
const LOCAL_DESIGNS_KEY = "ashok-saved-designs";

interface LocalDesign {
  id: string;
  name: string;
  config: SuitConfig;
  savedAt: string;
}

function readJson<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}
function writeJson(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage unavailable
  }
}

/** Which preview view best shows the option that was just changed. */
function viewFor(groupId: string, current: PreviewView): PreviewView {
  if (groupId.startsWith("waistcoat.")) return "waistcoat";
  if (groupId === "jacket.vents" || groupId === "trousers.backPockets" || groupId === "accents.elbowPatches") return "back";
  if (groupId.startsWith("accents.lining") || groupId === "accents.underCollar") return "lining";
  if (
    groupId.startsWith("jacket.") ||
    groupId.startsWith("trousers.") ||
    ["accents.buttons", "accents.buttonholes", "accents.pocketSquare", "accents.pickStitch", "accents.necktie", "accents.bowtie", "accents.belt", "accents.braces"].includes(groupId)
  ) {
    return current === "waistcoat" && groupId.startsWith("trousers.") ? current : "front";
  }
  return current;
}

export function Configurator() {
  const router = useRouter();
  const params = useSearchParams();
  const cart = useCart();
  const auth = useAuthSession();
  const [currency, setCurrency] = useDisplayCurrency();

  const [config, setConfig] = useState<SuitConfig>(() => defaultConfig());
  const [ready, setReady] = useState(false);
  const [step, setStep] = useState<Step>("fabric");
  const [fabricTarget, setFabricTarget] = useState<"jacket" | "trousers" | "waistcoat">("jacket");
  const [view, setView] = useState<PreviewView>("front");
  const [advanced, setAdvanced] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [editLineId, setEditLineId] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const [designsOpen, setDesignsOpen] = useState(false);
  const [saveState, setSaveState] = useState<{ status: "idle" | "saving" | "saved" | "error"; message?: string }>({ status: "idle" });
  const [adding, setAdding] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const [fillHeight, setFillHeight] = useState<string | undefined>(undefined);

  // Fill exactly the viewport below the site header (and above the mobile
  // action bar) — the header's height differs by breakpoint, so measure it.
  useEffect(() => {
    const header = document.querySelector("header");
    const measure = () => {
      const h = header?.getBoundingClientRect().height ?? 0;
      const bar = window.matchMedia("(min-width: 1024px)").matches ? 0 : 68;
      setFillHeight(`calc(100dvh - ${Math.round(h)}px - ${bar}px)`);
    };
    measure();
    const ro = header ? new ResizeObserver(measure) : null;
    if (header && ro) ro.observe(header);
    window.addEventListener("resize", measure);
    return () => {
      ro?.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);
  const noticeTimer = useRef<ReturnType<typeof setTimeout>>();

  // ---- Initialise once: edit line > share code > preset > fabric > draft > default.
  useEffect(() => {
    if (ready || !cart.hydrated) return;
    let initial: SuitConfig | null = null;
    const edit = params.get("edit");
    if (edit) {
      const line = cart.items.find((i) => i.productId === CUSTOM_SUIT_PRODUCT_ID && i.variantId === edit);
      if (line && isSuitLine(line)) {
        initial = line.suit.config;
        if (line.suit.issue) {
          const { adjustments } = normalizeConfig(line.suit.config);
          setNotice(adjustments.map((a) => a.message).join(" ") || `${line.suit.issue} We've selected the closest available option — please review.`);
        }
        setEditLineId(edit);
        setQty(line.qty);
      }
    }
    const code = params.get("d");
    if (!initial && code) initial = decodeDesign(code);
    const preset = params.get("preset");
    if (!initial && preset) initial = presetConfig(preset);
    if (!initial) {
      const draft = readJson<SuitConfig>(DRAFT_KEY);
      if (draft && draft.v === 1) initial = draft;
    }
    const fabric = params.get("fabric");
    if (fabric && getFabric(fabric)?.available) initial = { ...(initial ?? defaultConfig()), fabric };
    if (initial) setConfig(normalizeConfig(initial).config);
    const s = params.get("step") as Step | null;
    if (s && STEPS.some((x) => x.id === s)) setStep(s);
    setAdvanced(readJson<boolean>(ADVANCED_KEY) ?? false);
    setReady(true);
  }, [ready, cart.hydrated, cart.items, params]);

  // ---- Persist the working draft (not while editing a bag line).
  useEffect(() => {
    if (!ready || editLineId) return;
    const t = setTimeout(() => writeJson(DRAFT_KEY, config), 250);
    return () => clearTimeout(t);
  }, [config, ready, editLineId]);

  // ---- Keep ?step= in the URL so refresh/back lands on the same step.
  useEffect(() => {
    if (!ready) return;
    const url = new URL(window.location.href);
    url.searchParams.set("step", step);
    url.searchParams.delete("d");
    url.searchParams.delete("preset");
    url.searchParams.delete("fabric");
    window.history.replaceState(null, "", url.toString());
  }, [step, ready]);

  const flash = useCallback((msg: string) => {
    setNotice(msg);
    clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(null), 6500);
  }, []);

  const onOption = useCallback(
    (groupId: string, valueId: string) => {
      setConfig((prev) => {
        const next = { ...prev, options: { ...prev.options, [groupId]: valueId } };
        if (groupId === "accents.monogram" && valueId === "yes" && !next.monogram) {
          next.monogram = { text: "", font: "script", thread: "cream", placement: "lining" };
        }
        const { config: normalized, adjustments } = normalizeConfig(next, groupId);
        if (adjustments.length) flash(adjustments.map((a) => a.message).join(" "));
        return normalized;
      });
      setView((v) => viewFor(groupId, v));
      if ((groupId === "suit.fabricMode" && valueId === "same") || (groupId === "suit.pieces" && valueId === "two")) {
        setFabricTarget((t) => (groupId === "suit.pieces" && t !== "waistcoat" ? t : "jacket"));
      }
      if (groupId === "accents.monogram" && valueId === "yes") setView("lining");
    },
    [flash],
  );

  const onPatch = useCallback((patch: Partial<SuitConfig>) => {
    setConfig((prev) => {
      const next = { ...prev, ...patch };
      // Keep monogram text as typed (normalizeConfig would blank-sanitize an in-progress empty string the same way).
      return normalizeConfig(next).config;
    });
    if ("lining" in patch) setView("lining");
    if (patch.monogram) setView(patch.monogram.placement === "cuff" ? "front" : "lining");
  }, []);

  const onFabric = useCallback(
    (id: string) => {
      setConfig((prev) => {
        if (prev.options["suit.fabricMode"] !== "mixed" || fabricTarget === "jacket") {
          return normalizeConfig({ ...prev, fabric: id }).config;
        }
        if (fabricTarget === "trousers") return normalizeConfig({ ...prev, trouserFabric: id }).config;
        return normalizeConfig({ ...prev, waistcoatFabric: id }).config;
      });
      if (fabricTarget === "waistcoat") setView("waistcoat");
      else if (view === "waistcoat") setView("front");
    },
    [fabricTarget, view],
  );

  const price = useMemo(() => priceSuit(config), [config]);
  const spec = useMemo(() => buildSpec(config), [config]);
  const title = suitTitle(config);
  const jacketFabric = getFabric(config.fabric);
  const mixed = config.options["suit.fabricMode"] === "mixed";
  const three = config.options["suit.pieces"] === "three";
  const monogramInvalid = config.options["accents.monogram"] === "yes" && !config.monogram?.text;
  const stepIndex = STEPS.findIndex((s) => s.id === step);
  const readyDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + leadTimeDays(config));
    return d.toLocaleDateString("en-KE", { day: "numeric", month: "long" });
  }, [config]);

  const goStep = (s: Step) => {
    if (s === "review" && monogramInvalid) {
      setStep("details");
      flash("Add your monogram initials, or switch the monogram off, before reviewing.");
      return;
    }
    setNotice(null);
    setStep(s);
    panelRef.current?.scrollTo({ top: 0 });
  };

  async function addToBag() {
    const checked = validateConfigStrict(config);
    if ("error" in checked) {
      flash(checked.error);
      if (monogramInvalid) setStep("details");
      return;
    }
    setAdding(true);
    if (editLineId) {
      cart.updateSuit(editLineId, checked.config);
      if (qty !== cart.items.find((i) => i.variantId === editLineId)?.qty) cart.setQty(CUSTOM_SUIT_PRODUCT_ID, editLineId, qty);
      router.push(`/cart?updated=${encodeURIComponent(editLineId)}`);
    } else {
      const lineId = cart.addSuit(checked.config, qty);
      router.push(`/cart?added=${encodeURIComponent(lineId)}`);
    }
  }

  async function saveDesign() {
    const checked = validateConfigStrict(config);
    if ("error" in checked) {
      flash(checked.error);
      return;
    }
    const name = `${jacketFabric?.name ?? "Custom"} ${three ? "three-piece" : "two-piece"}`;
    setSaveState({ status: "saving" });
    if (auth.signedIn) {
      try {
        const res = await fetch("/api/suits/designs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, config: checked.config }),
        });
        const data = await res.json();
        if (!res.ok || !data.ok) throw new Error(data.error || "Could not save.");
        setSaveState({ status: "saved", message: "Saved to your record." });
        return;
      } catch (e) {
        setSaveState({ status: "error", message: e instanceof Error ? e.message : "Could not save." });
        return;
      }
    }
    const list = readJson<LocalDesign[]>(LOCAL_DESIGNS_KEY) ?? [];
    const entry: LocalDesign = { id: `local-${Date.now().toString(36)}`, name, config: checked.config, savedAt: new Date().toISOString() };
    writeJson(LOCAL_DESIGNS_KEY, [entry, ...list].slice(0, 12));
    setSaveState({ status: "saved", message: "Saved on this device. Sign in to keep designs on your record." });
  }

  async function share() {
    const url = `${window.location.origin}/custom-suits/design?d=${encodeDesign(config)}`;
    try {
      if (navigator.share && window.matchMedia("(max-width: 900px)").matches) {
        await navigator.share({ title: `My ${title} — Ashok Sunny Tailored`, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      flash("Link copied — anyone with it can open this exact design.");
    } catch {
      window.prompt("Copy this link to share your design:", url);
    }
  }

  function startOver() {
    if (!window.confirm("Start a new design? Your current choices will be cleared.")) return;
    setConfig(defaultConfig());
    setEditLineId(null);
    const url = new URL(window.location.href);
    url.searchParams.delete("edit");
    window.history.replaceState(null, "", url.toString());
    setQty(1);
    setStep("fabric");
    setView("front");
  }

  const sections: { id: OptionSection; title: string }[] = [
    { id: "suit", title: "The suit" },
    { id: "jacket", title: "Jacket" },
    { id: "trousers", title: "Trousers" },
    ...(three ? [{ id: "waistcoat" as OptionSection, title: "Waistcoat" }] : []),
  ];

  const primaryLabel =
    step === "review" ? (editLineId ? "Update bag" : "Add to bag") : `Next: ${STEPS[stepIndex + 1]?.label}`;
  const onPrimary = () => (step === "review" ? addToBag() : goStep(STEPS[stepIndex + 1]!.id));

  if (!ready) {
    return (
      <div className="flex h-[70vh] items-center justify-center text-sm text-muted" aria-busy="true">
        Opening the designer…
      </div>
    );
  }

  return (
    <div
      className="relative flex h-[calc(100dvh-65px-68px)] flex-col md:h-[calc(100dvh-105px-68px)] lg:h-[calc(100dvh-105px)] lg:flex-row-reverse"
      style={fillHeight ? { height: fillHeight } : undefined}
    >
      {/* ---------------- Stage ---------------- */}
      <section className="relative flex h-[40%] flex-none flex-col border-b border-line bg-[radial-gradient(ellipse_at_50%_35%,rgb(var(--paper))_0%,rgb(var(--cream))_70%)] lg:h-full lg:flex-1 lg:border-b-0 lg:border-l" aria-label="Suit preview">
        <div className="min-h-0 flex-1">
          <Stage config={config} view={view} onViewChange={setView} />
        </div>
        <div className="absolute left-3 top-3 flex flex-col items-start gap-1.5 lg:left-6 lg:top-6">
          <CurrencyToggle value={currency} onChange={setCurrency} />
          <p className="hidden max-w-[40vw] truncate text-[10px] uppercase tracking-wide text-muted sm:block lg:text-[11px]">{jacketFabric?.name}</p>
        </div>

        {/* Desktop price card */}
        <div className="pointer-events-none absolute right-6 top-6 hidden w-64 text-right lg:block">
          <p className={`font-display leading-tight ${title.length > 24 ? "text-2xl" : "text-3xl"}`}>{title.replace("Custom ", "Your ")}</p>
          <p className="mt-3 font-display text-3xl" aria-live="polite">
            {formatMoney(price.unitTotal * qty, currency)}
          </p>
          {currency === "USD" ? <p className="text-[11px] text-muted">Approx. at KES {KES_PER_USD}/USD · charged as {formatKes(price.unitTotal * qty)}</p> : <p className="text-[11px] text-muted">{qty > 1 ? `${qty} suits · ` : ""}Made in Nairobi</p>}
          <button type="button" onClick={onPrimary} disabled={adding} className="cta pointer-events-auto mt-5 w-full disabled:opacity-60">
            {adding ? "Adding…" : primaryLabel}
          </button>
          <p className="mt-4 text-xs text-ink">Ready around {readyDate}</p>
          <p className="text-xs text-muted">Fitting at our Ridgeways atelier included</p>
        </div>
      </section>

      {/* ---------------- Panel ---------------- */}
      <section className="flex min-h-0 flex-1 flex-col lg:w-[440px] lg:flex-none xl:w-[480px]" aria-label="Design options">
        <nav className="flex flex-none border-b border-line bg-cream" aria-label="Design steps">
          {STEPS.map((s, i) => (
            <button
              key={s.id}
              type="button"
              onClick={() => goStep(s.id)}
              aria-current={s.id === step ? "step" : undefined}
              className={`relative flex-1 px-1 py-3 text-[11px] uppercase tracking-[0.15em] transition-colors ${s.id === step ? "text-ink" : i < stepIndex ? "text-ink/70 hover:text-ink" : "text-muted hover:text-ink"}`}
            >
              <span className="mr-1 text-muted">{i + 1}</span>
              {s.label}
              {s.id === step ? <span className="absolute inset-x-3 bottom-0 h-0.5 bg-oxblood" /> : null}
            </button>
          ))}
        </nav>

        {notice ? (
          <div role="status" className="flex flex-none items-start gap-3 border-b border-oxblood/30 bg-oxblood/5 px-5 py-3 text-xs text-ink">
            <span className="mt-0.5 h-1.5 w-1.5 flex-none rounded-full bg-oxblood" />
            <span className="flex-1">{notice}</span>
            <button type="button" onClick={() => setNotice(null)} className="text-muted hover:text-ink" aria-label="Dismiss">
              ×
            </button>
          </div>
        ) : null}

        <div ref={panelRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-10 pt-5 sm:px-6">
          {editLineId ? (
            <p className="mb-4 border border-line bg-paper px-3 py-2 text-xs text-muted">
              Editing a suit in your bag. <Link href="/cart" className="underline hover:text-oxblood">Back to bag</Link>
            </p>
          ) : null}

          {step === "fabric" ? (
            <div>
              <header className="mb-4">
                <h2 className="text-2xl">Choose your cloth</h2>
                <p className="mt-1 text-sm text-muted">Every suit is cut for you in our Ridgeways workroom. The price shown is the two-piece price in that cloth.</p>
              </header>
              {mixed ? (
                <div className="mb-4 flex border border-line" role="tablist" aria-label="Which piece you're choosing fabric for">
                  {(["jacket", "trousers", ...(three ? ["waistcoat"] : [])] as const).map((t) => {
                    const id = t === "jacket" ? config.fabric : t === "trousers" ? config.trouserFabric : config.waistcoatFabric;
                    return (
                      <button
                        key={t}
                        type="button"
                        role="tab"
                        aria-selected={fabricTarget === t}
                        onClick={() => {
                          setFabricTarget(t as typeof fabricTarget);
                          if (t === "waistcoat") setView("waistcoat");
                        }}
                        className={`flex-1 px-2 py-2 text-left text-xs ${fabricTarget === t ? "bg-ink text-cream" : "hover:bg-paper"}`}
                      >
                        <span className="block uppercase tracking-wide">{t}</span>
                        <span className={`block truncate text-[11px] ${fabricTarget === t ? "text-cream/70" : "text-muted"}`}>{getFabric(id)?.name}</span>
                      </button>
                    );
                  })}
                </div>
              ) : null}
              <FabricPicker
                selectedId={(fabricTarget === "trousers" ? config.trouserFabric : fabricTarget === "waistcoat" ? config.waistcoatFabric : config.fabric) ?? config.fabric}
                onSelect={onFabric}
                currency={currency}
                target={mixed ? fabricTarget : undefined}
              />
            </div>
          ) : null}

          {step === "style" ? (
            <div>
              <header className="mb-2 flex items-end justify-between gap-4">
                <div>
                  <h2 className="text-2xl">Style it</h2>
                  <p className="mt-1 text-sm text-muted">The preview updates as you choose.</p>
                </div>
                <AdvancedToggle
                  value={advanced}
                  onChange={(v) => {
                    setAdvanced(v);
                    writeJson(ADVANCED_KEY, v);
                  }}
                />
              </header>
              {sections.map((sec) => {
                const groups = OPTION_GROUPS.filter((g) => g.section === sec.id && (advanced || !g.advanced) && isGroupApplicable(g.id, config));
                if (!groups.length) return null;
                return (
                  <div key={sec.id} className="mt-4">
                    <h3 className="border-b border-ink pb-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-oxblood">{sec.title}</h3>
                    {groups.map((g) => (
                      <OptionTiles key={g.id} group={g} config={config} onChange={onOption} currency={currency} />
                    ))}
                  </div>
                );
              })}
              {mixed ? (
                <p className="mt-2 border border-line bg-paper px-3 py-2 text-xs text-muted">
                  Different fabrics selected — choose each piece&rsquo;s cloth on the{" "}
                  <button type="button" className="underline hover:text-oxblood" onClick={() => goStep("fabric")}>
                    Fabric
                  </button>{" "}
                  step.
                </p>
              ) : null}
              {!advanced ? (
                <button type="button" onClick={() => { setAdvanced(true); writeJson(ADVANCED_KEY, true); }} className="mt-4 w-full border border-dashed border-line py-3 text-xs uppercase tracking-wide text-muted hover:border-ink hover:text-ink">
                  Show every option — shoulder, cuffs, fastening, pockets & more
                </button>
              ) : null}
            </div>
          ) : null}

          {step === "details" ? (
            <div>
              <header className="mb-1 flex items-end justify-between gap-4">
                <div>
                  <h2 className="text-2xl">The details</h2>
                  <p className="mt-1 text-sm text-muted">Linings, buttons, threads and the things only you will know are there.</p>
                </div>
                <AdvancedToggle
                  value={advanced}
                  onChange={(v) => {
                    setAdvanced(v);
                    writeJson(ADVANCED_KEY, v);
                  }}
                />
              </header>
              <DetailsPanel config={config} onOption={onOption} onPatch={onPatch} currency={currency} advanced={advanced} />
            </div>
          ) : null}

          {step === "review" ? (
            <div>
              <header className="mb-5">
                <h2 className="text-2xl">Review your suit</h2>
                <p className="mt-1 text-sm text-muted">Check every detail. You&rsquo;ll add your measurements — or book a fitting — from your bag.</p>
              </header>
              <SpecList
                groups={spec}
                onEdit={(t) => goStep(t === "Fabric" ? "fabric" : t === "Finishing" || t === "Tailoring notes" ? "details" : "style")}
              />

              <div className="mt-8 border border-line bg-paper">
                <p className="border-b border-line px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.15em] text-muted">Price</p>
                <ul className="divide-y divide-line text-sm">
                  {price.lines.map((l, i) => (
                    <li key={i} className="flex justify-between gap-4 px-4 py-2">
                      <span className="text-muted">{l.label}</span>
                      <span className="whitespace-nowrap">{formatMoney(l.amount, currency)}</span>
                    </li>
                  ))}
                  <li className="flex items-center justify-between gap-4 px-4 py-2">
                    <span className="text-muted">Quantity</span>
                    <span className="flex items-center gap-2">
                      <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} disabled={qty <= 1} className="h-7 w-7 border border-line disabled:opacity-40" aria-label="Fewer suits">
                        −
                      </button>
                      <span className="w-5 text-center" aria-live="polite">{qty}</span>
                      <button type="button" onClick={() => setQty((q) => Math.min(MAX_SUITS_PER_LINE, q + 1))} disabled={qty >= MAX_SUITS_PER_LINE} className="h-7 w-7 border border-line disabled:opacity-40" aria-label="More suits">
                        +
                      </button>
                    </span>
                  </li>
                  <li className="flex justify-between gap-4 bg-cream px-4 py-3 font-medium">
                    <span>Total</span>
                    <span>{formatMoney(price.unitTotal * qty, currency)}</span>
                  </li>
                </ul>
              </div>
              {currency === "USD" ? <p className="mt-2 text-[11px] text-muted">USD prices are approximate (KES {KES_PER_USD} = $1). You&rsquo;ll be charged {formatKes(price.unitTotal * qty)}.</p> : null}

              <ol className="mt-8 space-y-3 text-sm">
                {[
                  ["Measurements", "From your bag: enter your measurements with our guide, use the ones we hold on file, or book a measuring appointment at the atelier."],
                  ["Pay in full or a 50% deposit", "M-Pesa, card or bank via our secure payment page."],
                  ["Cut & fitting", `We cut your pattern and call you in for a fitting. Ready around ${readyDate}.`],
                ].map(([h, b], i) => (
                  <li key={h} className="flex gap-3">
                    <span className="flex h-6 w-6 flex-none items-center justify-center border border-ink text-[11px]">{i + 1}</span>
                    <span>
                      <span className="font-medium">{h}.</span> <span className="text-muted">{b}</span>
                    </span>
                  </li>
                ))}
              </ol>

              <div className="mt-8 grid grid-cols-2 gap-2">
                <button type="button" onClick={saveDesign} disabled={saveState.status === "saving"} className="cta ghost !px-3 text-xs">
                  {saveState.status === "saving" ? "Saving…" : "Save design"}
                </button>
                <button type="button" onClick={share} className="cta ghost !px-3 text-xs">
                  Share link
                </button>
              </div>
              <EmailDesign code={encodeDesign(config)} />
              {saveState.message ? (
                <p className={`mt-2 text-xs ${saveState.status === "error" ? "text-oxblood" : "text-muted"}`} role="status">
                  {saveState.message}{" "}
                  {saveState.status === "saved" && !auth.signedIn ? (
                    <Link href="/auth?next=/custom-suits/design" className="underline hover:text-oxblood">
                      Sign in
                    </Link>
                  ) : null}
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4 text-xs text-muted">
            <button type="button" onClick={() => setDesignsOpen(true)} className="uppercase tracking-wide hover:text-oxblood">
              My saved designs
            </button>
            <button type="button" onClick={startOver} className="uppercase tracking-wide hover:text-oxblood">
              Start over
            </button>
          </div>
        </div>
      </section>

      {/* ---------------- Mobile / tablet action bar ---------------- */}
      <div className="fixed inset-x-0 bottom-0 z-40 flex h-[68px] items-center gap-3 border-t border-line bg-cream px-4 lg:hidden">
        {stepIndex > 0 ? (
          <button type="button" onClick={() => goStep(STEPS[stepIndex - 1]!.id)} className="flex h-11 w-11 flex-none items-center justify-center border border-line text-lg" aria-label="Previous step">
            ‹
          </button>
        ) : null}
        <div className="min-w-0 flex-1">
          <p className="truncate text-[11px] uppercase tracking-wide text-muted">{title.replace("Custom ", "")}</p>
          <p className="font-display text-xl leading-tight" aria-live="polite">
            {formatMoney(price.unitTotal * qty, currency)}
          </p>
        </div>
        <button type="button" onClick={onPrimary} disabled={adding} className="cta !px-4 !py-3 text-xs disabled:opacity-60">
          {adding ? "Adding…" : primaryLabel}
        </button>
      </div>

      {designsOpen ? (
        <DesignsDrawer
          signedIn={auth.signedIn}
          onClose={() => setDesignsOpen(false)}
          onOpen={(c) => {
            setConfig(normalizeConfig(c).config);
            setEditLineId(null);
            setDesignsOpen(false);
            setStep("review");
            flash("Design loaded.");
          }}
        />
      ) : null}
    </div>
  );
}



function AdvancedToggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex flex-none cursor-pointer items-center gap-2 text-[11px] uppercase tracking-wide text-muted">
      <span>{value ? "All options" : "Essentials"}</span>
      <button
        type="button"
        role="switch"
        aria-checked={value}
        onClick={() => onChange(!value)}
        className={`relative h-5 w-9 rounded-full border transition-colors ${value ? "border-ink bg-ink" : "border-line bg-paper"}`}
      >
        <span className={`absolute top-0.5 h-3.5 w-3.5 rounded-full transition-all ${value ? "left-[18px] bg-cream" : "left-0.5 bg-muted"}`} />
      </button>
    </label>
  );
}

interface ServerDesign {
  id: string;
  name: string;
  config: SuitConfig;
  unitPrice: number;
  updatedAt: string;
}

function DesignsDrawer({ signedIn, onClose, onOpen }: { signedIn: boolean; onClose: () => void; onOpen: (c: SuitConfig) => void }) {
  const [server, setServer] = useState<ServerDesign[] | null>(null);
  const [local, setLocal] = useState<LocalDesign[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLocal(readJson<LocalDesign[]>(LOCAL_DESIGNS_KEY) ?? []);
    if (!signedIn) {
      setServer([]);
      return;
    }
    fetch("/api/suits/designs")
      .then((r) => r.json())
      .then((d) => (d.ok ? setServer(d.designs) : (setServer([]), setError(d.error || null))))
      .catch(() => {
        setServer([]);
        setError("Could not load designs saved to your record.");
      });
  }, [signedIn]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function removeServer(id: string) {
    const res = await fetch(`/api/suits/designs/${id}`, { method: "DELETE" }).catch(() => null);
    if (res?.ok) setServer((s) => (s ?? []).filter((d) => d.id !== id));
  }
  function removeLocal(id: string) {
    const next = local.filter((d) => d.id !== id);
    setLocal(next);
    writeJson(LOCAL_DESIGNS_KEY, next);
  }

  const rows = [
    ...(server ?? []).map((d) => ({ key: d.id, name: d.name, config: d.config, meta: "On your record", remove: () => removeServer(d.id) })),
    ...local.map((d) => ({ key: d.id, name: d.name, config: d.config, meta: "On this device", remove: () => removeLocal(d.id) })),
  ];

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-ink/40" role="dialog" aria-modal="true" aria-label="Saved designs" onClick={onClose}>
      <div className="flex h-full w-full max-w-md flex-col bg-cream" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="text-xl">Saved designs</h2>
          <button type="button" onClick={onClose} className="flex h-9 w-9 items-center justify-center border border-line text-lg hover:border-ink" aria-label="Close">
            ×
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          {server === null ? <p className="text-sm text-muted">Loading…</p> : null}
          {error ? <p className="mb-3 text-xs text-oxblood">{error}</p> : null}
          {server !== null && rows.length === 0 ? (
            <p className="text-sm text-muted">
              Nothing saved yet. Use &ldquo;Save design&rdquo; on the Review step.
              {!signedIn ? (
                <>
                  {" "}
                  <Link href="/auth?next=/custom-suits/design" className="underline hover:text-oxblood">
                    Sign in
                  </Link>{" "}
                  to keep designs across devices.
                </>
              ) : null}
            </p>
          ) : null}
          <ul className="space-y-3">
            {rows.map((r) => (
              <li key={r.key} className="flex gap-3 border border-line bg-paper p-3">
                <div className="h-24 w-16 flex-none bg-cream">
                  <SuitPreview config={r.config} className="h-full w-full" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{r.name}</p>
                  <p className="text-[11px] text-muted">{r.meta}</p>
                  <p className="mt-1 text-xs">{formatKes(priceSuit(normalizeConfig(r.config).config).unitTotal)}</p>
                  <div className="mt-2 flex gap-3 text-[11px] uppercase tracking-wide">
                    <button type="button" onClick={() => onOpen(r.config)} className="text-ink hover:text-oxblood">
                      Open
                    </button>
                    <button type="button" onClick={r.remove} className="text-muted hover:text-oxblood">
                      Delete
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

/** Guest "save for later": email the design link (Hockerty's save-by-email). */
function EmailDesign({ code }: { code: string }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [state, setState] = useState<{ status: "idle" | "sending" | "sent" | "error"; message?: string }>({ status: "idle" });
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="mt-3 text-xs text-muted underline underline-offset-2 hover:text-oxblood">
        Email me this design
      </button>
    );
  }
  if (state.status === "sent") return <p className="mt-3 text-xs text-muted" role="status">Sent — check your inbox for a link back to this design.</p>;
  return (
    <form
      className="mt-3 space-y-2 border border-line bg-paper p-3"
      onSubmit={async (e) => {
        e.preventDefault();
        setState({ status: "sending" });
        try {
          const res = await fetch("/api/suits/email-design", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, code, consent }),
          });
          const data = await res.json();
          setState(res.ok && data.ok ? { status: "sent" } : { status: "error", message: data.error || "Couldn't send." });
        } catch {
          setState({ status: "error", message: "Couldn't reach the server." });
        }
      }}
    >
      <label className="block text-xs text-muted" htmlFor="design-email">
        Your email
      </label>
      <div className="flex gap-2">
        <input
          id="design-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="min-w-0 flex-1 border border-line bg-cream px-3 py-2 text-sm focus:border-oxblood focus:outline-none"
        />
        <button type="submit" disabled={state.status === "sending" || !consent} className="cta !px-3 !py-2 text-xs disabled:opacity-50">
          {state.status === "sending" ? "Sending…" : "Send"}
        </button>
      </div>
      <label className="flex items-start gap-2 text-[11px] text-muted">
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 accent-[rgb(var(--oxblood))]" />
        <span>Email me this design. We use your address only for this message.</span>
      </label>
      {state.status === "error" ? <p className="text-xs text-oxblood">{state.message}</p> : null}
    </form>
  );
}
