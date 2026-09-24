import { NextRequest, NextResponse } from "next/server";
import { isMockGateway, mockGetTx, mockSetStatus } from "@/lib/taifapay";

/** Development-only companion to the mock TaifaPay gateway (see lib/taifapay.ts). */
export async function GET(request: NextRequest) {
  if (!isMockGateway()) return NextResponse.json({ ok: false }, { status: 404 });
  const tx = mockGetTx(request.nextUrl.searchParams.get("tx") ?? "");
  if (!tx) return NextResponse.json({ ok: false, error: "Unknown transaction." }, { status: 404 });
  return NextResponse.json({ ok: true, tx });
}

export async function POST(request: NextRequest) {
  if (!isMockGateway()) return NextResponse.json({ ok: false }, { status: 404 });
  const body = (await request.json().catch(() => ({}))) as { tx?: string; outcome?: string };
  const tx = mockSetStatus(String(body.tx ?? ""), body.outcome === "fail" ? "FAILED" : "COMPLETED");
  if (!tx) return NextResponse.json({ ok: false, error: "Unknown transaction." }, { status: 404 });
  return NextResponse.json({ ok: true, returnUrl: `${tx.returnUrl ?? "/checkout/complete"}?transactionId=${encodeURIComponent(tx.transactionId)}` });
}
