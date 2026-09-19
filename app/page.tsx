import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Section } from "@/components/ui/Section";
import { Photo } from "@/components/ui/Photo";
import { Quote } from "@/components/ui/Quote";
import { fabrics } from "@/lib/fixtures/fabrics";

const introColumns = [
  {
    title: "Bespoke Suits",
    body: "Cut from your own paper pattern, not adjusted from a house block. For the man who's never dressed by accident.",
    href: "/bespoke",
    linkLabel: "See Bespoke →",
  },
  {
    title: "Made-to-Measure",
    body: "For men and women — occasionwear and wardrobe pieces fitted to you, with the same attention as a full commission.",
    href: "/made-to-measure",
    linkLabel: "See Made-to-Measure →",
  },
  {
    title: "The Shop",
    body: "Shoes, cufflinks and ties, made to sit beside a finished suit — not a marketplace grid.",
    href: "/shop",
    linkLabel: "Visit the Shop →",
  },
];

const imageStrip = [
  {
    label: "IMG-02 · cutting table",
    image: "/photos/home/cutting-table.jpg" as string | undefined,
    caption: "Pattern, cut from your own measurements",
  },
  {
    label: "IMG-03 · canvas & basting",
    image: "/photos/home/canvas-basting.jpg" as string | undefined,
    caption: "Canvas and basting, first stage",
  },
  {
    label: "IMG-04 · fitting session",
    image: undefined as string | undefined, // "/photos/home/fitting-session.jpg" once generated
    caption: "The fitting that matters",
  },
];

const heroImage = undefined; // "/photos/home/hero.jpg" once generated

const processSteps = [
  {
    number: "01",
    title: "Consultation",
    body: "30–45 min. We talk about the occasion, not the sale.",
  },
  {
    number: "02",
    title: "Measurements",
    body: "A dedicated session, entered once, kept on your record.",
  },
  {
    number: "03",
    title: "Cutting",
    body: "Your own paper pattern, cut and canvassed by hand.",
  },
  {
    number: "04",
    title: "First Fitting",
    body: "Where we find out if we got it right.",
  },
  {
    number: "05",
    title: "Ready",
    body: "Final fitting, then yours to collect.",
  },
];

const homeFabrics = fabrics.slice(0, 4);

export default function Home() {
  return (
    <main>
      {/* Hero */}
      <div className="relative overflow-hidden border-b border-line">
        <Photo
          src={heroImage}
          label="IMG-01 · fitting, hands & pin"
          aspectRatio="auto"
          className="absolute inset-0 h-full w-full"
          bordered={false}
          sizes="100vw"
          priority
        />
        <div className="relative z-10 flex min-h-[480px] flex-col justify-end bg-gradient-to-t from-ink/80 via-ink/10 to-transparent p-8 md:min-h-[560px] md:p-16">
          <h1 className="mx-auto max-w-xl text-center text-4xl text-cream md:mx-0 md:text-left md:text-6xl">
            Where every stitch is a work of art.
          </h1>
          <p className="mx-auto mt-6 max-w-lg text-center text-base text-cream/90 md:mx-0 md:text-left">
            Bespoke and made-to-measure tailoring, Nairobi. Cut from your own pattern, fitted in
            person, kept on record for the next one.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4 md:justify-start">
            <Button href="/booking">Book a Fitting</Button>
            <Button href="/process" variant="ghost" className="!border-cream !text-cream">
              Read the Process
            </Button>
          </div>
        </div>
      </div>

      {/* Three-column intro */}
      <Section className="bg-paper">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-3">
          {introColumns.map((col) => (
            <div key={col.title} className="text-center sm:text-left">
              <h2 className="text-2xl">{col.title}</h2>
              <p className="mt-3 text-sm text-muted">{col.body}</p>
              <Link
                href={col.href}
                className="mt-4 inline-block text-sm text-oxblood hover:underline"
              >
                {col.linkLabel}
              </Link>
            </div>
          ))}
        </div>
      </Section>

      {/* Three-image strip */}
      <Section>
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
          {imageStrip.map((image) => (
            <div key={image.label} className="text-center sm:text-left">
              <Photo src={image.image} label={image.label} />
              <p className="mt-3 text-sm text-muted">{image.caption}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* Process — mobile gets a connected vertical timeline (Owen's chosen
          "Process A" direction); sm and up keep the original column grid
          untouched. */}
      <Section className="bg-paper">
        <h2 className="text-center text-3xl sm:text-left">The Process</h2>

        <ol className="mt-10 sm:hidden">
          {processSteps.map((step, index) => {
            const isLast = index === processSteps.length - 1;
            return (
              <li key={step.number} className={`relative pl-[52px] ${isLast ? "" : "pb-10"}`}>
                {isLast ? null : (
                  <span
                    aria-hidden="true"
                    className="absolute left-5 top-10 bottom-0 w-px bg-line"
                  />
                )}
                <span className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-full border border-oxblood bg-paper font-display text-sm text-oxblood">
                  {step.number}
                </span>
                <p className="font-display text-lg">{step.title}</p>
                <p className="mt-1 text-sm text-muted">{step.body}</p>
              </li>
            );
          })}
        </ol>

        <ol className="mt-8 hidden sm:grid sm:grid-cols-2 sm:gap-8 lg:grid-cols-5">
          {processSteps.map((step) => (
            <li key={step.number}>
              <p className="font-display text-2xl text-oxblood">{step.number}</p>
              <p className="mt-2 text-base">{step.title}</p>
              <p className="mt-2 text-sm text-muted">{step.body}</p>
            </li>
          ))}
        </ol>
      </Section>

      {/* Fabric row */}
      <div className="border-b border-line px-6 py-10 md:px-12">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 sm:grid-cols-2 md:grid-cols-4">
          {homeFabrics.map((fabric) => (
            <div key={fabric.id} className="text-center md:text-left">
              <Photo src={fabric.image} label={fabric.imageLabel} aspectRatio="1 / 1" />
              <p className="mt-3 text-sm">
                {fabric.name}
                {fabric.origin ? ` · ${fabric.origin}` : ""}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Quote */}
      <Section className="bg-paper">
        <Quote attribution="A CLIENT, WEDDING SUIT, 2026">
          &ldquo;He measured me the way he talks — slowly, and like it mattered.&rdquo;
        </Quote>
      </Section>

      {/* Shop teaser */}
      <Section>
        <div className="flex flex-col items-center gap-6 text-center sm:flex-row sm:items-center sm:justify-between sm:text-left">
          <p className="max-w-md text-base text-muted">
            The accessories line — shoes, cufflinks, ties — kept in its own corner of the house,
            priced plainly.
          </p>
          <Button href="/shop" variant="ghost">
            Shop All
          </Button>
        </div>
      </Section>
    </main>
  );
}
