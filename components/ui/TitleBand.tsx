import { Eyebrow } from "./Eyebrow";

export function TitleBand({
  eyebrow,
  title,
  intro,
  priceChip,
}: {
  eyebrow: string;
  title: string;
  intro?: string;
  priceChip?: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-2xl text-center md:mx-0 md:text-left">
      <Eyebrow>{eyebrow}</Eyebrow>
      <h1 className="mt-3 text-4xl md:text-5xl">{title}</h1>
      {intro ? <p className="mt-4 text-base text-muted">{intro}</p> : null}
      {priceChip ? <div className="mt-4">{priceChip}</div> : null}
    </div>
  );
}
