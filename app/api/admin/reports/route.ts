import { NextResponse } from "next/server";
import { isStaffAuthed } from "@/lib/require-staff";
import { listRecentOrders, listRecentPayments, type Order, type OrderStage } from "@/lib/db";
import {
  listProducts,
  listStockMovements,
  listPurchaseOrders,
  listReturns,
  effectivePrice,
  type StockMovementType,
} from "@/lib/inventory";

// Bounded windows, not a full table scan — same tradeoff the rest of this
// codebase makes at this business's scale (see lib/db.ts's
// searchCustomersByName and lib/inventory.ts's listStockMovements).
const ORDER_WINDOW = 500;
const PAYMENT_WINDOW = 500;
const MOVEMENT_WINDOW = 1000;

const PAID_OR_LATER_STAGES: OrderStage[] = ["Paid", "Ready for Collection", "Collected", "Returned", "Refunded"];

export async function GET() {
  if (!isStaffAuthed()) {
    return NextResponse.json({ ok: false, error: "Not signed in." }, { status: 401 });
  }

  try {
    const [orders, payments, products, movements, purchaseOrders, returns] = await Promise.all([
      listRecentOrders(ORDER_WINDOW),
      listRecentPayments(PAYMENT_WINDOW),
      listProducts({ includeInactive: true }),
      listStockMovements({ limit: MOVEMENT_WINDOW }),
      listPurchaseOrders(),
      listReturns(),
    ]);

    // ---- Sales -----------------------------------------------------------
    const shopOrders = orders.filter((o) => o.source === "shop");
    const paidShopOrders = shopOrders.filter((o) => PAID_OR_LATER_STAGES.includes(o.stage));
    const shopRevenue = paidShopOrders.reduce((sum, o) => sum + o.price, 0);
    const ordersByStage: Record<string, number> = {};
    for (const o of orders) {
      ordersByStage[o.stage] = (ordersByStage[o.stage] ?? 0) + 1;
    }

    // ---- Payment reconciliation -------------------------------------------
    // A paid-or-later shop order should have at least one "Paid" payment
    // record against its real order id (see app/api/checkout/create-invoice
    // and app/api/admin/orders/[id]/invoice — both write Payment.orderId as
    // the real Firestore order id). A gap here means money that moved
    // without a matching ledger row, or vice versa — worth a human look,
    // not something to silently paper over.
    const paidOrderIds = new Set(payments.filter((p) => p.status === "Paid").map((p) => p.orderId));
    const orderIds = new Set(orders.map((o) => o.id));
    const unreconciledOrders: Order[] = paidShopOrders.filter((o) => !paidOrderIds.has(o.id));
    const orphanedPayments = payments.filter((p) => p.status === "Paid" && p.orderId && !orderIds.has(p.orderId));

    // ---- Inventory valuation -----------------------------------------------
    let stockUnits = 0;
    let stockRetailValue = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;
    for (const product of products) {
      for (const variant of product.variants) {
        stockUnits += variant.stockQty;
        stockRetailValue += variant.stockQty * effectivePrice(product, variant);
        if (variant.stockQty <= 0) outOfStockCount += 1;
        else if (variant.stockQty <= variant.lowStockThreshold) lowStockCount += 1;
      }
    }

    // ---- Stock movement totals (within the fetched window) ----------------
    const movementTotals: Record<string, { count: number; netQty: number }> = {};
    for (const m of movements) {
      const key = m.type as StockMovementType;
      if (!movementTotals[key]) movementTotals[key] = { count: 0, netQty: 0 };
      movementTotals[key].count += 1;
      movementTotals[key].netQty += m.qtyChange;
    }

    // ---- Purchasing ---------------------------------------------------------
    const activePOs = purchaseOrders.filter((po) => po.status !== "Cancelled");
    const poCommittedCost = activePOs.reduce(
      (sum, po) => sum + po.lines.reduce((s, l) => s + l.qtyOrdered * l.unitCost, 0),
      0,
    );
    const poReceivedCost = activePOs.reduce(
      (sum, po) => sum + po.lines.reduce((s, l) => s + l.qtyReceived * l.unitCost, 0),
      0,
    );

    // ---- Returns / refunds ---------------------------------------------------
    const returnsByStatus: Record<string, number> = {};
    let totalRefunded = 0;
    for (const r of returns) {
      returnsByStatus[r.status] = (returnsByStatus[r.status] ?? 0) + 1;
      if (r.status === "Refunded") totalRefunded += r.refundAmount ?? 0;
    }

    return NextResponse.json({
      ok: true,
      windowNote: `Orders/payments over the ${ORDER_WINDOW} most recent of each; stock movements over the ${MOVEMENT_WINDOW} most recent.`,
      sales: {
        shopOrderCount: shopOrders.length,
        paidShopOrderCount: paidShopOrders.length,
        shopRevenue,
        ordersByStage,
      },
      reconciliation: {
        unreconciledOrders: unreconciledOrders.map((o) => ({
          id: o.id,
          clientName: o.clientName,
          item: o.item,
          price: o.price,
          stage: o.stage,
        })),
        orphanedPayments: orphanedPayments.map((p) => ({
          id: p.id,
          orderId: p.orderId,
          clientName: p.clientName,
          amount: p.amount,
          date: p.date,
        })),
      },
      inventory: {
        stockUnits,
        stockRetailValue,
        lowStockCount,
        outOfStockCount,
      },
      stockMovements: movementTotals,
      purchasing: {
        openPurchaseOrders: activePOs.filter((po) => po.status !== "Received").length,
        poCommittedCost,
        poReceivedCost,
      },
      returns: {
        returnsByStatus,
        totalRefunded,
      },
    });
  } catch (error) {
    console.error("[admin/reports] failed:", error instanceof Error ? error.message : error);
    return NextResponse.json({ ok: false, error: "Could not build the report." }, { status: 502 });
  }
}
