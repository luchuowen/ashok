import { notFound } from "next/navigation";
import { isMockGateway } from "@/lib/taifapay";
import { MockPayClient } from "./MockPayClient";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };

/** Stand-in for TaifaPay's hosted checkout page — development builds only. */
export default function MockPayPage({ searchParams }: { searchParams: { tx?: string } }) {
  if (!isMockGateway()) notFound();
  return <MockPayClient tx={searchParams.tx ?? ""} />;
}
