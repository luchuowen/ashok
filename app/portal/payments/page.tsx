import { Section } from "@/components/ui/Section";
import { LedgerTable } from "@/components/portal/LedgerTable";
import { Balance } from "@/components/portal/Balance";
import { Tag } from "@/components/ui/Tag";
import { orders } from "@/lib/fixtures/orders";
import { payments, type Payment } from "@/lib/fixtures/payments";

export default function PaymentsPage() {
  return (
    <Section>
      <h2 className="text-2xl">Payments</h2>
      <div className="mt-8">
        <Balance amount={orders[0].balanceDue} />
      </div>
      <div className="mt-8">
        <LedgerTable<Payment>
          columns={[
            { key: "date", header: "Date" },
            {
              key: "orderId",
              header: "For",
              render: (row) =>
                orders.find((order) => order.id === row.orderId)?.item ?? row.orderId,
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
                <Tag variant={row.status === "Outstanding" ? "stage" : "default"}>
                  {row.status}
                </Tag>
              ),
            },
          ]}
          rows={payments}
        />
      </div>
    </Section>
  );
}
