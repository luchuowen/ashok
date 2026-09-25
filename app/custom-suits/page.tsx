import type { Metadata } from "next";
import Link from "next/link";
import { Section } from "@/components/ui/Section";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { PriceChip } from "@/components/ui/PriceChip";
import { SuitPreview } from "@/components/suit/SuitPreview";
import { DesignerShowcase } from "@/components/suit/DesignerShowcase";
import { HeroCarousel } from "@/components/suit/HeroCarousel";
import { COLLECTION_LABELS, SUIT_FABRICS, SUIT_PRESETS, presetConfig } from "@/lib/suit/catalogue";
import { priceSuit } from "@/lib/suit/pricing";
import { normalizeConfig } from "@/lib/suit/rules";
import { formatKes } from "@/lib/currency";
import { siteConfig } from "@/lib/content/site";
import type { FabricCollection } from "@/lib/suit/types";

export const metadata: Metadata = {
  title: `Design Your Custom Suit Online — ${siteConfig.fullName}`,
  description:
    "Design a made-to-measure suit online: choose from our cloths, style every detail, add your measurements and pay by M-Pesa or card. Cut and fitted at our Ridgeways atelier, Nairobi.",
  alternates: { canonical: "/custom-suits" },
};

const presets = SUIT_PRESETS.map((p) => {
  const config = normalizeConfig(presetConfig(p.id)!).config;
  return { ...p, config, price: priceSuit(config).unitTotal };
});

const minPrice = Math.min(...SUIT_FABRICS.filter((f) => f.available).map((f) => f.price));

const collections = (Object.keys(COLLECTION_LABELS) as FabricCollection[]).map((c) => {
  const cloths = SUIT_FABRICS.filter((f) => f.available && f.collection === c);
  return { id: c, label: COLLECTION_LABELS[c], count: cloths.length, from: Math.min(...cloths.map((f) => f.price)), sample: cloths.slice(0, 3) };
});

const steps = [
  { title: "Choose your cloth", body: "From easy-care house stretch to Super 150s Italian merino, linen for the coast and tweed for July." },
  { title: "Design every detail", body: "Lapels, buttons, pockets, vents, pleats, linings — kitenge prints included — and your initials, all previewed live." },
  { title: "Measure your way", body: "Follow our guide at home, use the measurements we already hold, or book a measuring appointment in Ridgeways." },
  { title: "Fitted in person", body: "We cut your pattern in our workroom and fit you at the atelier. A second fitting is on us if it's needed." },
];

const faqs = [
  {
    q: "What does a custom suit cost?",
    a: `Two-piece suits start at ${formatKes(minPrice)} and the cloth sets most of the price. Upgrades — a waistcoat, a print lining, horn buttons — are priced individually and the total updates as you design, so there are no surprises at checkout.`,
  },
  {
    q: "Can I pay in US dollars?",
    a: "You can view prices in Kenyan shillings or US dollars. Pay securely by card (Visa or Mastercard, in KES or USD), M-Pesa or bank transfer — you choose the method on our secure payment page, where the final amount is confirmed before you pay.",
  },
  {
    q: "Do I have to pay everything up front?",
    a: "No. You can pay in full or pay a 50% deposit at checkout; the balance is due at your fitting, before collection.",
  },
  {
    q: "I'm not confident measuring myself.",
    a: "Choose “Measure me at the atelier” at checkout and we'll take your measurements in person before we cut. If we already hold your measurements, you can simply use those.",
  },
  {
    q: "How long does it take?",
    a: "Around three weeks from measurements to collection with our standard make, or about twelve days with priority. If you have a wedding date, add it to your notes for the cutter.",
  },
  {
    q: "Can I change my design after ordering?",
    a: "Yes, until your cloth is cut. Message us with your order reference and we'll update it — any price difference is settled at your fitting.",
  },
];

export default function CustomSuitsPage() {
  return (
    <main>
      <Section border={false} className="!pb-10">
        <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_1fr]">
          <div className="text-center lg:text-left">
            <Eyebrow>Custom suits · made for you</Eyebrow>
            <h1 className="mt-3 text-4xl md:text-6xl">Design your suit. Tailored to your measurements.</h1>
            <p className="mx-auto mt-5 max-w-xl text-base text-muted lg:mx-0">
              Choose your fabric, define every detail and create a suit that is uniquely yours. We cut and tailor it to your measurements,
              then refine the fit with you in person at our Ridgeways workroom.
            </p>
            <div className="mt-5">
              <PriceChip price={minPrice} />
            </div>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center lg:justify-start">
              <Link href="/custom-suits/design" className="cta">
                Design your suit
              </Link>
              <Link href="/booking?type=made-to-measure&ref=custom-suits" className="cta ghost">
                Book a fitting
              </Link>
            </div>
          </div>
          <div className="mx-auto w-full max-w-[520px] lg:max-w-none">
            <HeroCarousel
              slides={[
                { src: "/photos/custom-suits/hero-1-navy-three-piece.jpg", alt: "A client in a midnight navy three-piece suit with a burgundy tie", caption: "Midnight navy three-piece · Super 120s wool", focus: "50% 25%" },
                { src: "/photos/custom-suits/hero-2-charcoal-double-breasted.jpg", alt: "A client in a charcoal double-breasted suit with peak lapels", caption: "Charcoal double-breasted · worsted wool", focus: "50% 25%" },
                { src: "/photos/custom-suits/hero-3-sand-linen.jpg", alt: "A client in a sand wool-and-linen suit worn with an open-collar shirt", caption: "Sand wool & linen · half-lined, patch pockets", focus: "50% 25%" },
              ]}
            />
          </div>
        </div>
      </Section>

      <Section>
        <DesignerShowcase />
      </Section>

      <Section>
        <div className="flex flex-col items-center justify-between gap-4 text-center sm:flex-row sm:text-left">
          <div>
            <Eyebrow>Start with a base style</Eyebrow>
            <h2 className="mt-2 text-3xl">Pick a starting point, then make it yours</h2>
          </div>
          <Link href="/custom-suits/design?preset=two-piece" className="text-sm underline underline-offset-4 hover:text-oxblood">
            Or start from scratch →
          </Link>
        </div>
        <ul className="mt-8 grid grid-cols-2 gap-px border border-line bg-line md:grid-cols-4">
          {presets.map((p) => (
            <li key={p.id} className="bg-paper">
              <Link href={`/custom-suits/design?preset=${p.id}`} className="group flex h-full flex-col p-4 transition-colors hover:bg-cream/60">
                <div className="aspect-[4/5] overflow-hidden">
                  <SuitPreview config={p.config} className="h-full w-full transition-transform duration-500 group-hover:scale-[1.04]" title={p.name} />
                </div>
                <h3 className="mt-3 text-lg">{p.name}</h3>
                <p className="mt-1 flex-1 text-xs text-muted">{p.blurb}</p>
                <p className="mt-3 text-xs uppercase tracking-wide">
                  From <span className="font-semibold">{formatKes(p.price)}</span>
                </p>
              </Link>
            </li>
          ))}
          <li className="flex flex-col justify-center bg-ink p-6 text-cream">
            <p className="font-display text-2xl">Something else in mind?</p>
            <p className="mt-2 text-sm text-cream/70">Start blank and build it option by option — or bring a picture to the atelier.</p>
            <Link href="/custom-suits/design" className="mt-5 text-xs uppercase tracking-wide underline underline-offset-4">
              Open the designer →
            </Link>
          </li>
        </ul>
      </Section>

      <Section>
        <Eyebrow>How it works</Eyebrow>
        <h2 className="mt-2 text-3xl">Four steps, one fitting</h2>
        <ol className="mt-8 grid gap-px border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s, i) => (
            <li key={s.title} className="bg-cream p-6">
              <span className="font-display text-4xl text-oxblood">{String(i + 1).padStart(2, "0")}</span>
              <h3 className="mt-3 text-xl">{s.title}</h3>
              <p className="mt-2 text-sm text-muted">{s.body}</p>
            </li>
          ))}
        </ol>
      </Section>

      <Section>
        <Eyebrow>The cloths</Eyebrow>
        <h2 className="mt-2 text-3xl">{SUIT_FABRICS.filter((f) => f.available).length} cloths across five collections</h2>
        <ul className="mt-8 grid gap-px border border-line bg-line sm:grid-cols-2 lg:grid-cols-5">
          {collections.map((c) => (
            <li key={c.id} className="bg-cream p-5">
              <div className="flex gap-1">
                {c.sample.map((f) => (
                  <span key={f.id} className="h-8 flex-1 border border-line" style={{ background: f.hex }} title={f.name} />
                ))}
              </div>
              <h3 className="mt-4 text-lg">{c.label}</h3>
              <p className="text-xs text-muted">
                {c.count} cloths · two-piece from {formatKes(c.from)}
              </p>
            </li>
          ))}
        </ul>
        <p className="mt-6 text-sm">
          <Link href="/fabric-library" className="underline underline-offset-4 hover:text-oxblood">
            Visit the fabric library
          </Link>{" "}
          <span className="text-muted">— or come in and handle the cloth yourself.</span>
        </p>
      </Section>

      <Section>
        <div className="grid gap-10 lg:grid-cols-[1fr_1.4fr]">
          <div>
            <Eyebrow>Questions</Eyebrow>
            <h2 className="mt-2 text-3xl">Before you start</h2>
            <p className="mt-3 text-sm text-muted">
              Anything else — call {siteConfig.phone} or visit us in {siteConfig.address}.
            </p>
          </div>
          <div className="divide-y divide-line border-y border-line">
            {faqs.map((f) => (
              <details key={f.q} className="group py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-base">
                  {f.q}
                  <span className="text-xl text-muted transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 text-sm text-muted">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </Section>

    </main>
  );
}
