import Link from "next/link";
import type { Metadata } from "next";
import { Button } from "@/components/ui/Button";
import { siteConfig } from "@/lib/content/site";

export const metadata: Metadata = {
  title: `Page not found — ${siteConfig.fullName}`,
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center px-6 py-20 text-center">
      <p className="text-xs uppercase tracking-[0.2em] text-oxblood">404</p>
      <h1 className="mt-3 text-4xl italic md:text-5xl">This page isn&rsquo;t on the rail</h1>
      <p className="mt-4 text-muted">The link may be old or mistyped. Everything else is where you left it.</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button href="/">Back to home</Button>
        <Button href="/custom-suits/design" variant="ghost">Design your suit</Button>
      </div>
      <p className="mt-8 text-sm">
        Looking for something specific? <Link href="/contact" className="text-oxblood underline underline-offset-4">Contact us</Link>.
      </p>
    </main>
  );
}
