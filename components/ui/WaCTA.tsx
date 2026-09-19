import { WhatsAppConnect } from "@/components/ui/WhatsAppConnect";

/** Thin wrapper kept so call sites don't change — renders the on-site
 *  message form (see WhatsAppConnect) as a bordered CTA link rather than
 *  an icon button. */
export function WaCTA({
  message,
  label = "Message the House",
}: {
  message?: string;
  label?: string;
}) {
  return <WhatsAppConnect variant="cta" label={label} defaultMessage={message ?? ""} />;
}
