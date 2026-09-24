import { NextRequest, NextResponse } from "next/server";
import { isStaffAuthed } from "@/lib/require-staff";
import { ORDER_STAGES, BESPOKE_ONLY_STAGES, claimOrderRestock, getOrder, listPaymentsForOrder, updateOrder, type Order, type OrderStage } from "@/lib/db";
import { restockForOrder } from "@/lib/inventory";

const TERMINAL_STAGES: OrderStage[] = ["Cancelled", "Returned", "Refunded"];

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  if (!isStaffAuthed()) {
    return NextResponse.json({ ok: false, error: "Not signed in." }, { status: 401 });
  }
  try {
    const order = await getOrder(params.id);
    if (!order) {
      return NextResponse.json({ ok: false, error: "Order not found." }, { status: 404 });
    }
    const payments = await listPaymentsForOrder(order.id).catch(() => []);
    return NextResponse.json({ ok: true, order, payments });
  } catch (error) {
    console.error("[admin/orders/:id] get failed:", error instanceof Error ? error.message : error);
    return NextResponse.json({ ok: false, error: "Could not load that order." }, { status: 502 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  if (!isStaffAuthed()) {
    return NextResponse.json({ ok: false, error: "Not signed in." }, { status: 401 });
  }
  let body: Partial<Order>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }
  const patch: Partial<Order> = {};
  // Fetched once here when the stage patch needs it (a bespoke-only stage,
  // below) and reused by the Cancelled-restock check further down instead
  // of fetching the order twice.
  let existingForValidation: Order | null = null;
  if (typeof body.stage === "string") {
    if (!ORDER_STAGES.includes(body.stage as Order["stage"])) {
      return NextResponse.json({ ok: false, error: "Not a valid order stage." }, { status: 400 });
    }
    if (BESPOKE_ONLY_STAGES.includes(body.stage as OrderStage)) {
      existingForValidation = await getOrder(params.id).catch(() => null);
      if (existingForValidation?.source === "shop") {
        return NextResponse.json(
          {
            ok: false,
            error: `"${body.stage}" only applies to bespoke orders — this is an off-the-shelf order.`,
          },
          { status: 400 },
        );
      }
    }
    patch.stage = body.stage;
  }
  if (typeof body.statusNote === "string") patch.statusNote = body.statusNote;
  if (typeof body.balanceDue === "number" && Number.isFinite(body.balanceDue)) {
    patch.balanceDue = body.balanceDue;
  }
  if (typeof body.estimatedCompletion === "string") patch.estimatedCompletion = body.estimatedCompletion;

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ ok: false, error: "Nothing to update." }, { status: 400 });
  }

  try {
    // Staff can move any order to Cancelled straight from this dropdown —
    // not just via a failed webhook (see app/api/webhooks/taifapay/route.ts,
    // which handles the customer-side cancellation path the same way). A
    // shop order's reserved stock has to come back exactly once, so this
    // only fires on genuine entry into Cancelled — a source==="shop" order
    // that wasn't already in a terminal stage — never on a no-op re-save or
    // a stage bounce that isn't actually a fresh cancellation.
    if (patch.stage === "Cancelled") {
      const existing = existingForValidation ?? (await getOrder(params.id));
      // Custom-suit orders can carry shop accessories too — any order with
      // stocked `items` gets them back; bespoke orders never have items.
      if (
        existing &&
        existing.source !== "bespoke" &&
        !TERMINAL_STAGES.includes(existing.stage) &&
        existing.items?.length &&
        (await claimOrderRestock(existing.id))
      ) {
        await restockForOrder(
          existing.items.map((item) => ({ productId: item.productId, variantId: item.variantId, qty: item.qty })),
          existing.id,
          "cancellation-restock",
        ).catch((restockError) => {
          console.error(
            `[admin/orders/:id] Failed to restock cancelled order ${existing.id} — manual correction needed:`,
            restockError instanceof Error ? restockError.message : restockError,
          );
        });
      }
    }

    await updateOrder(params.id, patch);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[admin/orders/:id] update failed:", error instanceof Error ? error.message : error);
    return NextResponse.json({ ok: false, error: "Could not update that order." }, { status: 502 });
  }
}
