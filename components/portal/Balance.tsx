import { Button } from "@/components/ui/Button";

export function Balance({
  amount,
  currency = "KES",
}: {
  amount: number;
  currency?: string;
}) {
  return (
    <div className="flex flex-col items-start justify-between gap-4 border border-oxblood p-6 sm:flex-row sm:items-center">
      <div>
        <p className="text-xs uppercase tracking-wide text-muted">Outstanding balance</p>
        <p className="mt-1 font-display text-2xl text-oxblood">
          {currency} {amount.toLocaleString("en-KE")}
        </p>
      </div>
      <Button href="/portal/payments">Pay Now</Button>
    </div>
  );
}
