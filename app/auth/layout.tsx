import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta("Sign In", "Sign in to your record with the house — appointments, orders, measurements and payments.", "/auth", { noindex: true });

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
