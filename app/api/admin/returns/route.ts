import { NextRequest, NextResponse } from "next/server";
import { isStaffAuthed } from "@/lib/require-staff";
import { getOrder } from "@/lib/db";
import { listReturns, listReturnsForOrder, createReturn, type ReturnLine } from "@/lib/inventory";

export async function GET() {
  if (!isStaffAuthed()) {
    return NextResponse.json({ ok: false, error: "Not signed in." }, { status: 401 });
  }
  try {
    const returns = await listReturns();
    return NextResponse.json({ ok: true, returns });
  } catch (error) {
    console.error("[admin/returns] list failed:", error instanceof Error ? error.message : error);
    return NextResponse.json({ ok: false, error: "Could not load returns." }, { status: 502 });
  }
}

interface ReturnLineInput {
  productId?: string;
  variantId?: string;
  qty?: number;
}

interface ReturnBody {
  orderId?: string;
  reason?: string;
  notes?: string;
  lines?: ReturnLineInput[];
}

export async function POST(request: NextRequest) {
  if (!isStaffAuthed()) {
    return NextResponse.json({ ok: false, error: "Not signed in." }, { status: 401 });
  }
  let body: ReturnBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }
  const orderId = body.orderId?.trim();
  if (!orderId) {
    return NextResponse.json({ ok: false, error: "Choose an order." }, { status: 400 });
  }
  const reason = body.reason?.trim();
  if (!reason) {
    return NextResponse.json({ ok: false, error: "Give a reason for the return." }, { status: 400 });
  }
  const rawLines = (body.lines ?? []).filter((l) => l.productId && l.variantId && Number(l.qty) > 0);
  if (rawLines.length === 0) {
    return NextResponse.json({ ok: false, error: "Select at least one item to return." }, { status: 400 });
  }

  try {
    const order = await getOrder(orderId);
    if (!order) {
      return NextResponse.json({ ok: false, error: "Order not found." }, { status: 404 });
    }
    if (order.source !== "shop" || !order.items || order.items.length === 0) {
      return NextResponse.json({ ok: false, error: "This order has no shop items to return." }, { status: 400 });
    }

    // Each requested line has to be something actually on the order, and the
    // qty can't exceed what was bought (net of any already-approved returns
    // for the same line) — otherwise a return could restock more units than
    // were ever sold.
    const priorApproved = await listReturnsForOrder(orderId);
    const alreadyReturnedQty = new Map<string, number>();
    for (const ret of priorApproved) {
      if (ret.status === "Rejected") continue;
      for (const line of ret.lines) {
        const key = `${line.productId}::${line.variantId}`;
        alreadyReturnedQty.set(key, (alreadyReturnedQty.get(key) ?? 0) + line.qty);
      }
    }

    const lines: ReturnLine[] = [];
    for (const raw of rawLines) {
      const orderItem = order.items.find((i) => i.productId === raw.productId && i.variantId === raw.variantId);
      if (!orderItem) {
        return NextResponse.json({ ok: false, error: "One of those items isn't on this order." }, { status: 400 });
      }
      const key = `${raw.productId}::${raw.variantId}`;
      const alreadyReturned = alreadyReturnedQty.get(key) ?? 0;
      const remaining = orderItem.qty - alreadyReturned;
      const qty = Math.trunc(Number(raw.qty));
      if (qty > remaining) {
        return NextResponse.json(
          { ok: false, error: `Only ${remaining} of "${orderItem.productName}" (${orderItem.variantLabel}) can still be returned.` },
          { status: 400 },
        );
      }
      lines.push({
        productId: orderItem.productId,
        productName: orderItem.productName,
        variantId: orderItem.variantId,
        variantLabel: orderItem.variantLabel,
        qty,
      });
    }

    const id = await createReturn({
      orderId: order.id,
      clientId: order.clientId,
      clientName: order.clientName,
      lines,
      reason,
      notes: body.notes?.trim() || undefined,
    });
    return NextResponse.json({ ok: true, id });
  } catch (error) {
    console.error("[admin/returns] create failed:", error instanceof Error ? error.message : error);
    return NextResponse.json({ ok: false, error: "Could not create that return." }, { status: 502 });
  }
}
