"use client";

import { Section } from "@/components/ui/Section";
import { LedgerTable } from "@/components/portal/LedgerTable";
import { Balance } from "@/components/portal/Balance";
import { Tag } from "@/components/ui/Tag";
import { usePortalData } from "@/app/portal/portal-context";
import type { Payment } from "@/lib/db";

export default function PaymentsPage() {
  const { orders, payments } = usePortalData();
  const outstanding = orders.find((order) => order.balanceDue > 0);

  return (
    <Section>
      <h2 className="text-2xl">Payments</h2>
      {outstanding ? (
        <div className="mt-8">
          <Balance amount={outstanding.balanceDue} />
        </div>
      ) : null}
      <div className="mt-8">
        <LedgerTable<Payment>
          columns={[
            { key: "date", header: "Date" },
            {
              key: "orderId",
              header: "For",
              render: (row) => orders.find((order) => order.id === row.orderId)?.item ?? row.orderId,
            },
            { key: "method", header: "Method", render: (row) => `${row.method}` },
            {
              key: "amount",
              header: "Amount",
              render: (row) => `${row.currency} ${row.amount.toLocaleString("en-KE")}`,
            },
            {
              key: "status",
              header: "Status",
              render: (row) => (
                <Tag variant={row.status === "Paid" ? "default" : "stage"}>{row.status}</Tag>
              ),
            },
          ]}
          rows={payments}
          emptyMessage="No payments on file yet — they'll appear here once you place an order."
        />
      </div>
    </Section>
  );
}
