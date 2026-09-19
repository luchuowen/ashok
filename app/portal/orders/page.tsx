import { Section } from "@/components/ui/Section";
import { LedgerTable } from "@/components/portal/LedgerTable";
import { Tag } from "@/components/ui/Tag";
import { orders, type Order } from "@/lib/fixtures/orders";

export default function OrdersPage() {
  return (
    <Section>
      <h2 className="text-2xl">Orders</h2>
      <div className="mt-8">
        <LedgerTable<Order>
          columns={[
            { key: "item", header: "Order" },
            {
              key: "stage",
              header: "Stage",
              render: (row) => <Tag variant="stage">{row.statusNote}</Tag>,
            },
            { key: "startedAt", header: "Placed" },
            {
              key: "price",
              header: "Total",
              render: (row) => `${row.currency} ${row.price.toLocaleString("en-KE")}`,
            },
          ]}
          rows={orders}
        />
      </div>
    </Section>
  );
}
