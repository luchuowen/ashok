"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/Button";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center px-6 py-20 text-center">
      <p className="text-xs uppercase tracking-[0.2em] text-oxblood">Something went wrong</p>
      <h1 className="mt-3 text-4xl italic md:text-5xl">A loose thread on our side</h1>
      <p className="mt-4 text-muted">Please try again. If it keeps happening, call or WhatsApp us and we&rsquo;ll sort it out.</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button onClick={reset}>Try again</Button>
        <Button href="/" variant="ghost">Back to home</Button>
      </div>
    </main>
  );
}
