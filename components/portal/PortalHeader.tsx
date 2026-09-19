import { WaCTA } from "@/components/ui/WaCTA";

export function PortalHeader() {
  return (
    <div className="flex flex-col items-center justify-between gap-4 border-b border-line px-6 py-8 text-center md:flex-row md:items-center md:px-12 md:text-left">
      <h1 className="font-display text-3xl">Your Record with the House</h1>
      <WaCTA message="Hi, I'd like an update on my order." label="Message the House" />
    </div>
  );
}
