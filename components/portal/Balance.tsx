import { WaCTA } from "@/components/ui/WaCTA";

export function Balance({
  amount,
  currency = "KES",
}: {
  amount: number;
  currency?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-between gap-4 border border-oxblood bg-paper p-6 text-center sm:flex-row sm:items-center sm:text-left">
      <div>
        <p className="text-xs uppercase tracking-wide text-muted">Outstanding balance</p>
        <p className="mt-1 font-display text-2xl text-oxblood">
          {currency} {amount.toLocaleString("en-KE")}
        </p>
      </div>
      {/* Balances are settled via a payment link staff generate per order —
          there's no self-serve pay flow in the portal, so "Pay Now" used to
          link back to this same page. Ask the house for the link instead. */}
      <WaCTA
        label="Request a Payment Link"
        message={`Hi, I'd like a payment link for my outstanding balance of ${currency} ${amount.toLocaleString("en-KE")}.`}
      />
    </div>
  );
}
