import { NextRequest, NextResponse } from "next/server";
import { getTransaction, TaifaPayError } from "@/lib/taifapay";

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
    return NextResponse.json({
      ok: true,
      status: transaction.status,
      amount: transaction.amount,
      currency: transaction.currency,
    });
  } catch (error) {
    const status = error instanceof TaifaPayError && error.status === 404 ? 404 : 502;
    const message =
      error instanceof TaifaPayError ? error.message : "Could not check payment status.";
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
