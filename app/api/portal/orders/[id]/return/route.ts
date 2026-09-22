import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySessionToken } from "@/lib/otp";
import { getOrder, type OrderStage } from "@/lib/db";
import { listReturnsForOrder, createReturn, type ReturnLine } from "@/lib/inventory";

// A return only makes sense once the order was actually paid for and
// handed over — nothing to return from an order still awaiting payment,
// and Cancelled/Returned/Refunded are already-closed states.
const RETURNABLE_STAGES: OrderStage[] = ["Paid", "Ready for Collection", "Collected"];

interface ReturnLineInput {
  productId?: string;
  variantId?: string;
  qty?: number;
}

interface ReturnBody {
  reason?: string;
  lines?: ReturnLineInput[];
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const token = cookies().get("ashok_session")?.value;
  const session = token ? verifySessionToken(token) : null;
  if (!session) {
    return NextResponse.json({ ok: false, error: "Sign in to request a return." }, { status: 401 });
  }

  let body: ReturnBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }
  const reason = body.reason?.trim();
  if (!reason) {
    return NextResponse.json({ ok: false, error: "Tell us why you're returning this." }, { status: 400 });
  }
  const rawLines = (Array.isArray(body.lines) ? body.lines : []).filter(
    (l) => l.productId && l.variantId && Math.trunc(Number(l.qty)) >= 1,
  );
  if (rawLines.length === 0) {
    return NextResponse.json({ ok: false, error: "Select at least one item to return." }, { status: 400 });
  }

  try {
    const order = await getOrder(params.id);
    if (!order || order.clientId !== session.phone) {
      return NextResponse.json({ ok: false, error: "Order not found." }, { status: 404 });
    }
    if (order.source !== "shop" || !order.items || order.items.length === 0) {
      return NextResponse.json({ ok: false, error: "This order has nothing eligible for return." }, { status: 400 });
    }
    if (!RETURNABLE_STAGES.includes(order.stage)) {
      return NextResponse.json(
        { ok: false, error: "This order isn't in a state that can be returned. Message us on WhatsApp instead." },
        { status: 400 },
      );
    }

    const priorReturns = await listReturnsForOrder(order.id);
    const alreadyReturnedQty = new Map<string, number>();
    for (const ret of priorReturns) {
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
      const remaining = orderItem.qty - (alreadyReturnedQty.get(key) ?? 0);
      const qty = Math.trunc(Number(raw.qty));
      if (qty > remaining) {
        return NextResponse.json(
          { ok: false, error: `Only ${remaining} of "${orderItem.productName}" can still be returned.` },
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
    });
    return NextResponse.json({ ok: true, id });
  } catch (error) {
    console.error("[portal/orders/:id/return] failed:", error instanceof Error ? error.message : error);
    return NextResponse.json({ ok: false, error: "Could not submit that return request." }, { status: 502 });
  }
}
