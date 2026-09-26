import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta("Shop", "Shoes, ties, cufflinks and accessories chosen to finish a tailored suit, from Ashok Sunny Tailored in Nairobi.", "/shop");

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
