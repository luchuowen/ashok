"use client";

import { Section } from "@/components/ui/Section";
import { LedgerTable } from "@/components/portal/LedgerTable";
import { Tag } from "@/components/ui/Tag";
import { usePortalData } from "@/app/portal/portal-context";
import type { Order } from "@/lib/db";

export default function OrdersPage() {
  const { orders } = usePortalData();

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
          emptyMessage="No orders yet — place a booking to start your first one."
        />
      </div>
    </Section>
  );
}
