"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Section } from "@/components/ui/Section";
import { Button } from "@/components/ui/Button";

const PENDING_ORDER_KEY = "ashok-pending-order";
const POLL_INTERVAL_MS = 3000;
const MAX_POLLS = 40; // ~2 minutes

interface PendingOrder {
  transactionId: string;
  amount: number;
  currency: string;
  description: string;
  createdAt: number;
}

type Outcome = "checking" | "completed" | "failed" | "timeout" | "unknown";

export default function CheckoutCompletePage() {
  const [order, setOrder] = useState<PendingOrder | null>(null);
  const [outcome, setOutcome] = useState<Outcome>("checking");
  const pollCount = useRef(0);

  useEffect(() => {
    let stored: PendingOrder | null = null;
    try {
      const raw = sessionStorage.getItem(PENDING_ORDER_KEY);
      if (raw) stored = JSON.parse(raw) as PendingOrder;
    } catch {
      stored = null;
    }

    if (!stored) {
      setOutcome("unknown");
      return;
    }
    setOrder(stored);

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    async function poll() {
      if (cancelled || !stored) return;
      pollCount.current += 1;

      try {
        const res = await fetch(
          `/api/checkout/status?transactionId=${encodeURIComponent(stored.transactionId)}`,
        );
        const data = await res.json();

        if (res.ok && data.ok) {
          if (data.status === "COMPLETED") {
            setOutcome("completed");
            try {
              sessionStorage.removeItem(PENDING_ORDER_KEY);
            } catch {
              // ignore
            }
            return;
          }
          if (data.status === "FAILED") {
            setOutcome("failed");
            return;
          }
        }
      } catch {
        // network hiccup — keep polling until MAX_POLLS
      }

      if (pollCount.current >= MAX_POLLS) {
        setOutcome("timeout");
        return;
      }
      if (!cancelled) {
        timer = setTimeout(poll, POLL_INTERVAL_MS);
      }
    }

    poll();

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);

  return (
    <main>
      <Section border={false}>
        <div className="mx-auto max-w-md text-center">
          {outcome === "checking" ? (
            <>
              <h1 className="text-3xl italic">Confirming your payment…</h1>
              <p className="mt-4 text-sm text-muted">
                This usually takes a few seconds. Don&rsquo;t close this page.
              </p>
              {order ? (
                <p className="mt-6 text-sm text-muted">
                  {order.description} — {order.currency}{" "}
                  {order.amount.toLocaleString("en-KE")}
                </p>
              ) : null}
            </>
          ) : null}

          {outcome === "completed" ? (
            <>
              <h1 className="text-3xl italic">Payment received</h1>
              <p className="mt-4 text-sm text-muted">
                Thank you — your order is confirmed. You&rsquo;ll get an SMS or M-Pesa receipt
                for your records.
              </p>
              {order ? (
                <p className="mt-6 border border-line p-4 text-sm">
                  {order.description}
                  <br />
                  {order.currency} {order.amount.toLocaleString("en-KE")}
                </p>
              ) : null}
              <div className="mt-8">
                <Button href="/shop">Continue Shopping</Button>
              </div>
            </>
          ) : null}

          {outcome === "failed" ? (
            <>
              <h1 className="text-3xl italic">Payment didn&rsquo;t go through</h1>
              <p className="mt-4 text-sm text-muted">
                Nothing was charged. You can try again from your cart.
              </p>
              <div className="mt-8">
                <Button href="/cart">Back to Cart</Button>
              </div>
            </>
          ) : null}

          {outcome === "timeout" ? (
            <>
              <h1 className="text-3xl italic">Still waiting on confirmation</h1>
              <p className="mt-4 text-sm text-muted">
                Your payment may still be processing. If money left your account, it will be
                confirmed shortly — otherwise your cart is still available to try again.
              </p>
              <div className="mt-8">
                <Button href="/cart">Back to Cart</Button>
              </div>
            </>
          ) : null}

          {outcome === "unknown" ? (
            <>
              <h1 className="text-3xl italic">We couldn&rsquo;t find that order</h1>
              <p className="mt-4 text-sm text-muted">
                If you just completed a payment, check your M-Pesa messages or email for
                confirmation. Otherwise your cart is still available.
              </p>
              <div className="mt-8">
                <Button href="/cart">Back to Cart</Button>
              </div>
            </>
          ) : null}

          <p className="mt-6 text-sm">
            <Link href="/contact" className="underline">
              Something not right? Contact us
            </Link>
          </p>
        </div>
      </Section>
    </main>
  );
}
