import { NextRequest, NextResponse } from "next/server";
import { isStaffAuthed } from "@/lib/require-staff";
import { getOrder, updateOrder, type OrderStage } from "@/lib/db";
import { getReturn, updateReturn, restockForOrder, type ReturnStatus } from "@/lib/inventory";

const TERMINAL_STAGES: OrderStage[] = ["Cancelled", "Returned", "Refunded"];

type Action = "approve" | "reject" | "refund";

interface ActionBody {
  action?: Action;
  refundAmount?: number;
  refundMethod?: "M-Pesa" | "Card" | "Bank Transfer" | "Cash" | "Store Credit";
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  if (!isStaffAuthed()) {
    return NextResponse.json({ ok: false, error: "Not signed in." }, { status: 401 });
  }
  const existing = await getReturn(params.id);
  if (!existing) {
    return NextResponse.json({ ok: false, error: "Return not found." }, { status: 404 });
  }
  let body: ActionBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }

  try {
    if (body.action === "approve") {
      if (existing.status !== "Requested") {
        return NextResponse.json({ ok: false, error: "This return was already decided." }, { status: 409 });
      }
      await restockForOrder(
        existing.lines.map((l) => ({ productId: l.productId, variantId: l.variantId, qty: l.qty })),
        existing.orderId,
        "return-restock",
        existing.id,
      );
      const patch: { status: ReturnStatus; restocked: boolean; resolvedAt: string } = {
        status: "Approved",
        restocked: true,
        resolvedAt: new Date().toISOString(),
      };
      await updateReturn(params.id, patch);

      // Coarse, order-level status — this codebase's Order only tracks one
      // stage at a time (see TERMINAL_STAGES elsewhere), so a return on any
      // part of the order marks the whole order Returned, same simplification
      // "Cancelled" already makes. Skip it if the order is already in some
      // other terminal state (e.g. it was separately cancelled).
      const order = await getOrder(existing.orderId);
      if (order && !TERMINAL_STAGES.includes(order.stage)) {
        await updateOrder(existing.orderId, { stage: "Returned", statusNote: "Item(s) returned" });
      }
      return NextResponse.json({ ok: true });
    }

    if (body.action === "reject") {
      if (existing.status !== "Requested") {
        return NextResponse.json({ ok: false, error: "This return was already decided." }, { status: 409 });
      }
      await updateReturn(params.id, { status: "Rejected", resolvedAt: new Date().toISOString() });
      return NextResponse.json({ ok: true });
    }

    if (body.action === "refund") {
      if (existing.status !== "Approved") {
        return NextResponse.json(
          { ok: false, error: "Approve and restock the return before refunding it." },
          { status: 409 },
        );
      }
      const refundAmount = Number(body.refundAmount);
      if (!Number.isFinite(refundAmount) || refundAmount <= 0) {
        return NextResponse.json({ ok: false, error: "Enter a valid refund amount." }, { status: 400 });
      }
      if (!body.refundMethod) {
        return NextResponse.json({ ok: false, error: "Choose a refund method." }, { status: 400 });
      }
      await updateReturn(params.id, {
        status: "Refunded",
        refundAmount,
        refundMethod: body.refundMethod,
        resolvedAt: new Date().toISOString(),
      });
      // Refunding is expected to follow approval, which already moved the
      // order to "Returned" (a terminal stage) — so the generic
      // TERMINAL_STAGES guard used above would always block this update.
      // Only a separately-cancelled order should keep its stage here.
      const order = await getOrder(existing.orderId);
      if (order && order.stage !== "Cancelled" && order.stage !== "Refunded") {
        await updateOrder(existing.orderId, { stage: "Refunded", statusNote: "Refunded" });
      }
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: false, error: "Unknown action." }, { status: 400 });
  } catch (error) {
    console.error("[admin/returns/:id] action failed:", error instanceof Error ? error.message : error);
    return NextResponse.json({ ok: false, error: "Could not update that return." }, { status: 502 });
  }
}
