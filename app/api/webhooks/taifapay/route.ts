import { createHmac, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { bookingNotifyAddress, sendEmail } from "@/lib/resend";
import { getOrderByTransactionId, updateOrderByTransactionId, updatePaymentByTransactionId } from "@/lib/db";

/**
 * TaifaPay server-to-server webhook (docs: /docs/guides/webhooks).
 *
 * Register this route's full URL (https://ashok.navac.co.ke/api/webhooks/taifapay)
 * and a secret in TaifaPay's merchant dashboard; put that same secret in
 * TAIFAPAY_WEBHOOK_SECRET (Firebase App Hosting secret). Every delivery is
 * signed: X-Webhook-Signature: sha512=<hex HMAC-SHA512 of the *raw* body,
 * keyed with the secret>. We verify against the raw text, not a re-parsed
 * object, per their docs — re-serializing first would change the bytes and
 * break the signature.
 *
 * Two things happen on a confirmed delivery: the persisted order/payment
 * records created in app/api/checkout/create-invoice/route.ts are updated
 * (so the customer's portal and /admin both reflect the real payment
 * state), and the business gets an immediate email — instead of relying
 * solely on the customer's browser staying open for the /checkout/complete
 * poll to finish.
 */

interface TaifaPayWebhookEvent {
  id: string;
  eventType: string;
  timestamp: string;
  data: {
    transactionId: string;
    status: string;
    amount: number;
    accountReference?: string;
    externalReference?: string;
  };
  metadata?: Record<string, unknown>;
}

function verifySignature(rawBody: string, header: string | null, secret: string): boolean {
  if (!header) return false;
  const received = header.replace(/^sha512=/, "");
  const expected = createHmac("sha512", secret).update(rawBody, "utf8").digest("hex");
  const receivedBuf = Buffer.from(received, "hex");
  const expectedBuf = Buffer.from(expected, "hex");
  return receivedBuf.length === expectedBuf.length && timingSafeEqual(expectedBuf, receivedBuf);
}

export async function POST(request: NextRequest) {
  const secret = process.env.TAIFAPAY_WEBHOOK_SECRET;
  if (!secret) {
    // Fail loudly server-side but don't leak config state to the caller.
    console.error("[taifapay-webhook] TAIFAPAY_WEBHOOK_SECRET is not configured.");
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  const rawBody = await request.text();
  const signature = request.headers.get("x-webhook-signature");

  if (!verifySignature(rawBody, signature, secret)) {
    console.error("[taifapay-webhook] signature verification failed — rejecting delivery.");
    return NextResponse.json({ ok: false, error: "invalid signature" }, { status: 401 });
  }

  let event: TaifaPayWebhookEvent;
  try {
    event = JSON.parse(rawBody) as TaifaPayWebhookEvent;
  } catch {
    console.error("[taifapay-webhook] verified delivery had a non-JSON body — dropping.");
    return NextResponse.json({ ok: false, error: "invalid body" }, { status: 400 });
  }

  console.log(
    `[taifapay-webhook] ${event.eventType} — transaction=${event.data?.transactionId} ` +
      `status=${event.data?.status} amount=${event.data?.amount} ref=${event.data?.accountReference}`,
  );

  // Awaited (not fire-and-forget): a Cloud Run instance isn't guaranteed to
  // keep running JS after the response is sent, so a detached promise here
  // could get cut off before the email actually goes out. notifyBusiness
  // swallows its own errors, so this never turns an email failure into a
  // failed webhook ack — we're comfortably inside TaifaPay's 30s timeout.
  const transactionId = event.data?.transactionId;
  if (transactionId) {
    try {
      const isCompleted = event.eventType === "transaction.completed" || event.data?.status === "complete";
      const isFailed = /fail|cancel|expire/i.test(event.data?.status ?? "");
      if (isCompleted) {
        await updatePaymentByTransactionId(transactionId, { status: "Paid" });
        await updateOrderByTransactionId(transactionId, {
          stage: "Paid",
          statusNote: "Payment received — preparing for collection",
          balanceDue: 0,
        });
      } else if (isFailed) {
        await updatePaymentByTransactionId(transactionId, { status: "Failed" });
        // Only auto-cancel an order still sitting in its initial
        // "awaiting first payment" state (every shop checkout starts
        // there — see app/api/checkout/create-invoice/route.ts). A
        // bespoke order can reach "Payment Pending" again later for a
        // balance/deposit link generated well after work has already
        // started (app/api/admin/orders/[id]/invoice/route.ts) — a
        // customer's expired or declined M-Pesa prompt on THAT link
        // must never silently cancel a tailoring order that's already
        // mid-production; staff just generates another payment link.
        const order = await getOrderByTransactionId(transactionId);
        if (order && order.stage === "Payment Pending") {
          await updateOrderByTransactionId(transactionId, {
            stage: "Cancelled",
            statusNote: "Payment did not go through — order cancelled",
          });
        }
      }
    } catch (dbError) {
      console.error(
        "[taifapay-webhook] Firestore update failed:",
        dbError instanceof Error ? dbError.message : dbError,
      );
    }
  }

  if (event.eventType === "transaction.completed" || event.data?.status === "complete") {
    await notifyBusiness(event, "Payment received");
  } else if (event.eventType?.startsWith("transaction.") && event.data?.status) {
    await notifyBusiness(event, `Payment update: ${event.data.status}`);
  }

  return NextResponse.json({ ok: true });
}

async function notifyBusiness(event: TaifaPayWebhookEvent, subjectPrefix: string): Promise<void> {
  const { transactionId, status, amount, accountReference } = event.data ?? {};
  try {
    await sendEmail({
      to: bookingNotifyAddress(),
      subject: `${subjectPrefix} — ${accountReference ?? transactionId ?? "unknown order"}`,
      html: `<div style="font-family:sans-serif;font-size:14px;color:#222;">
        <p>TaifaPay webhook: <strong>${event.eventType}</strong></p>
        <table style="font-size:14px;">
          <tr><td style="padding:4px 12px 4px 0;color:#6b6b6b;">Order reference</td><td>${accountReference ?? "—"}</td></tr>
          <tr><td style="padding:4px 12px 4px 0;color:#6b6b6b;">Status</td><td>${status ?? "—"}</td></tr>
          <tr><td style="padding:4px 12px 4px 0;color:#6b6b6b;">Amount</td><td>KES ${amount ?? "—"}</td></tr>
          <tr><td style="padding:4px 12px 4px 0;color:#6b6b6b;">TaifaPay transaction ID</td><td>${transactionId ?? "—"}</td></tr>
        </table>
      </div>`,
    });
  } catch (error) {
    // Never let a notification failure affect the webhook ack above — this
    // call already happened after we returned 200 to TaifaPay.
    console.error(
      "[taifapay-webhook] notification email failed:",
      error instanceof Error ? `${error.name}: ${error.message}` : error,
    );
  }
}
