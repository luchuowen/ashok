import Link from "next/link";
import { Photo } from "@/components/ui/Photo";
import { effectivePrice } from "@/lib/pricing";
import type { Product } from "@/lib/inventory";

export function ProductCard({ product, priority = false }: { product: Product; priority?: boolean }) {
  const totalStock = product.variants.reduce((sum, v) => sum + v.stockQty, 0);
  const outOfStock = totalStock <= 0;
  const price = effectivePrice(product);
  const onSale = price !== product.price;

  return (
    <Link href={`/shop/${product.slug}`} className="group block bg-paper p-6">
      <div className="relative">
        <Photo src={product.images[0]} label={product.imageLabel} priority={priority} sizes="(min-width: 1024px) 30vw, (min-width: 640px) 50vw, 100vw" />
        {outOfStock ? (
          <span className="absolute left-2 top-2 bg-ink px-2 py-0.5 text-[11px] uppercase tracking-wide text-cream">
            Out of Stock
          </span>
        ) : null}
      </div>
      <p className="mt-4 text-base group-hover:text-oxblood">{product.name}</p>
      <p className="mt-1 text-sm text-muted">
        {onSale ? (
          <>
            <span className="mr-2 text-oxblood">
              {product.currency} {price.toLocaleString("en-KE")}
            </span>
            <span className="line-through">
              {product.currency} {product.price.toLocaleString("en-KE")}
            </span>
          </>
        ) : (
          <>
            {product.currency} {price.toLocaleString("en-KE")}
          </>
        )}
      </p>
    </Link>
  );
}
