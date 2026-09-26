import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta("Order Status", "Your order status.", "/checkout/complete", { noindex: true });

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
