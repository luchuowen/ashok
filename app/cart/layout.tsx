import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta("Your Bag", "Your bag at Ashok Sunny Tailored.", "/cart", { noindex: true });

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
