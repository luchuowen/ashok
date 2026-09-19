import { Section } from "@/components/ui/Section";
import { TitleBand } from "@/components/ui/TitleBand";
import { ImagePlaceholder } from "@/components/ui/ImagePlaceholder";
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
      <Section border={false}>
        <TitleBand
          eyebrow="Sourcing"
          title="Every bolt, where it comes from and what it's for."
          intro="Italian and English wool mills for suiting, East African cottons for shirting — browsable by weight, colour and use, not just a swatch wall."
        />
      </Section>

      <Section>
        <div className="flex flex-wrap gap-2">
          {filterTags.map((tag) => (
            <Tag key={tag.label} variant={tag.variant}>
              {tag.label}
            </Tag>
          ))}
        </div>

        <div className="mt-8 grid grid-cols-2 gap-px border border-line bg-line sm:grid-cols-4">
          {fabrics.map((fabric) => (
            <div key={fabric.id} className="bg-cream p-4">
              <ImagePlaceholder label={fabric.imageLabel} aspectRatio="1 / 1" />
              <p className="mt-3 text-sm">{fabric.name}</p>
              <p className="text-xs text-muted">
                {fabric.origin} · {fabric.weight}
              </p>
            </div>
          ))}
        </div>
      </Section>

      <Section>
        <h2 className="text-3xl">Reserve a swatch</h2>
        <p className="mt-4 max-w-2xl text-base text-muted">
          Tap any bolt to hold it against your consultation booking — no separate account needed,
          it attaches to your slot automatically.
        </p>
      </Section>
    </main>
  );
}
