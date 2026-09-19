import { waLink } from "@/lib/content/site";

export function WaCTA({
  message,
  label = "Message us on WhatsApp",
}: {
  message?: string;
  label?: string;
}) {
  return (
    <a
      href={waLink(message)}
      target="_blank"
      rel="noopener noreferrer"
      className="cta ghost"
    >
      {label}
    </a>
  );
}
