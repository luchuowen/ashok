import Link from "next/link";
import { Section } from "@/components/ui/Section";
import { TitleBand } from "@/components/ui/TitleBand";
import { Photo } from "@/components/ui/Photo";
import { Tag } from "@/components/ui/Tag";
import { fabrics } from "@/lib/fixtures/fabrics";

const filterTags = [
  { label: "All", variant: "stage" as const },
  { label: "Suiting", variant: "default" as const },
  { label: "Shirting", variant: "default" as const },
  { label: "Occasionwear", variant: "default" as const },
  { label: "Italian Mills", variant: "default" as const },
  { label: "Local Cotton", variant: "default" as const },
];

export default function FabricLibraryPage() {
  return (
    <main>
      <Section border={false} className="bg-white">
        <TitleBand
          eyebrow="Sourcing"
          title="Every bolt, where it comes from and what it's for."
          intro="Italian and English wool mills for suiting, East African cottons for shirting — browsable by weight, colour and use, not just a swatch wall."
        />
      </Section>

      <Section>
        <div className="flex flex-wrap justify-center gap-2 sm:justify-start">
          {filterTags.map((tag) => (
            <Tag key={tag.label} variant={tag.variant}>
              {tag.label}
            </Tag>
          ))}
        </div>

        <div className="mt-8 grid grid-cols-1 gap-px border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
          {fabrics.map((fabric) => (
            <div key={fabric.id} className="bg-paper p-4 text-center sm:text-left">
              <Photo src={fabric.image} label={fabric.imageLabel} aspectRatio="1 / 1" />
              <p className="mt-3 text-sm">{fabric.name}</p>
              <p className="text-xs text-muted">
                {fabric.origin} · {fabric.weight}
              </p>
              <Link href={`/custom-suits/design?fabric=${fabric.id}`} className="mt-2 inline-block text-[11px] uppercase tracking-wide text-ink underline underline-offset-2 hover:text-oxblood">
                Design a suit in this cloth
              </Link>
            </div>
          ))}
        </div>
      </Section>

      <Section className="bg-paper text-center sm:text-left">
        <h2 className="text-3xl">Choose Your Fabric</h2>
        <p className="mt-4 max-w-2xl text-base text-muted">
          Explore our fabric collection and select your preferred option before your consultation.
          We’ll have it ready for you to review when you arrive.
        </p>
        <p className="mt-6">
          <Link href="/custom-suits/design" className="cta">
            Or design your suit online
          </Link>
        </p>
      </Section>
    </main>
  );
}
