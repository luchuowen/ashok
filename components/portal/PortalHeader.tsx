import { WaCTA } from "@/components/ui/WaCTA";

export function PortalHeader() {
  return (
    <div className="flex flex-col items-start justify-between gap-4 border-b border-line px-6 py-8 md:flex-row md:items-center md:px-12">
      <h1 className="font-display text-3xl">Your Record with the House</h1>
      <WaCTA message="Hi, I'd like an update on my order." label="Message the House" />
    </div>
  );
}
