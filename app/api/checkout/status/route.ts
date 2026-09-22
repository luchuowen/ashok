import { NextRequest, NextResponse } from "next/server";
import { reconcileTransaction } from "@/lib/payment-reconcile";
import { getTransaction, TaifaPayError } from "@/lib/taifapay";

/**
 * Polled by /checkout/complete after TaifaPay redirects the customer back.
 * Asks TaifaPay for the transaction directly, then applies the same
 * reconciliation the webhook does (lib/payment-reconcile.ts) — so the
 * order, payment record and stock reservation are corrected even if the
 * webhook never arrives. Both paths are idempotent; whichever lands first
 * wins and the other is a no-op.
 */
export async function GET(request: NextRequest) {
  const transactionId = request.nextUrl.searchParams.get("transactionId");
  if (!transactionId) {
    return NextResponse.json(
      { ok: false, error: "Missing transactionId." },
      { status: 400 },
    );
  }

  try {
    const transaction = await getTransaction(transactionId);
    if (transaction.status !== "PENDING") {
      await reconcileTransaction(transactionId, transaction.status).catch((dbError) => {
        // The customer still gets the real TaifaPay status; the webhook (or
        // the next poll) gets another go at the Firestore side.
        console.error(
          "[checkout/status] reconcile failed:",
          dbError instanceof Error ? dbError.message : dbError,
        );
      });
    }
    return NextResponse.json({
      ok: true,
      status: transaction.status,
      amount: transaction.amount,
      currency: transaction.currency,
    });
  } catch (error) {
    const status = error instanceof TaifaPayError && error.status === 404 ? 404 : 502;
    const message =
      error instanceof TaifaPayError && error.customerSafe
        ? error.message
        : "Could not check payment status.";
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
