import { Section } from "@/components/ui/Section";
import { TitleBand } from "@/components/ui/TitleBand";
import { ImagePlaceholder } from "@/components/ui/ImagePlaceholder";
import { WaCTA } from "@/components/ui/WaCTA";
import { siteConfig } from "@/lib/content/site";

const details = [
  { label: "Address", value: siteConfig.address },
  { label: "Hours", value: "Mon–Sat, 9:00–18:00" },
  { label: "Phone", value: siteConfig.phone },
  { label: "Email", value: siteConfig.email },
];

export default function ContactPage() {
  return (
    <main>
      <Section border={false}>
        <TitleBand
          eyebrow="Contact"
          title="Find the house."
          intro="Now at Ridgeways, Nairobi — if you knew us at our old location, this is the new address."
        />
      </Section>

      <Section>
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2">
          <ImagePlaceholder label="IMG-50 · map / storefront, Ridgeways" aspectRatio="4 / 3" />
          <div>
            <div className="flex flex-col gap-6">
              {details.map((detail) => (
                <div key={detail.label}>
                  <p className="text-xs uppercase tracking-wide text-muted">{detail.label}</p>
                  <p className="mt-1 text-sm">{detail.value}</p>
                </div>
              ))}
            </div>
            <div className="mt-8">
              <WaCTA message="Hi, I'd like to ask about..." label="Message on WhatsApp" />
            </div>
          </div>
        </div>
      </Section>
    </main>
  );
}
