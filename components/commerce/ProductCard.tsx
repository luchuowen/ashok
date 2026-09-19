import Link from "next/link";
import { Photo } from "@/components/ui/Photo";
import type { Product } from "@/lib/fixtures/products";

export function ProductCard({ product }: { product: Product }) {
  return (
    <Link href={`/shop/${product.slug}`} className="group block bg-paper p-6">
      <Photo src={product.image} label={product.imageLabel} />
      <p className="mt-4 text-base group-hover:text-oxblood">{product.name}</p>
      <p className="mt-1 text-sm text-muted">
        {product.currency} {product.price.toLocaleString("en-KE")}
      </p>
    </Link>
  );
}
