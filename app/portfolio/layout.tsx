import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta("Portfolio", "Suits, dinner jackets and uniforms we have cut and made in Nairobi — a look at recent commissions from the atelier.", "/portfolio");

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
