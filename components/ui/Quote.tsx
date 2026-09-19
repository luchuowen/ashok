export function Quote({
  children,
  attribution,
}: {
  children: React.ReactNode;
  attribution: string;
}) {
  return (
    <figure className="border-l-2 border-oxblood pl-6">
      <blockquote className="font-display text-2xl italic leading-snug text-ink md:text-3xl">
        {children}
      </blockquote>
      <figcaption className="mt-4 text-xs uppercase tracking-[0.2em] text-muted">
        {attribution}
      </figcaption>
    </figure>
  );
}
