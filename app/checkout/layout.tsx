import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta("Checkout", "Secure checkout by card, M-Pesa or bank transfer.", "/checkout", { noindex: true });

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
