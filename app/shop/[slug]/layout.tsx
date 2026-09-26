import type { Metadata } from "next";
import { getProductBySlug } from "@/lib/inventory";
import { pageMeta } from "@/lib/seo";

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  try {
    const p = await getProductBySlug(params.slug);
    if (p && p.active) {
      const desc = (p.description || `${p.name} from Ashok Sunny Tailored, Nairobi.`).slice(0, 160);
      return pageMeta(p.name, desc, `/shop/${params.slug}`);
    }
  } catch {
    /* fall through to a generic title */
  }
  return pageMeta("Shop", "Accessories to finish a tailored suit, from Ashok Sunny Tailored in Nairobi.", `/shop/${params.slug}`);
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
