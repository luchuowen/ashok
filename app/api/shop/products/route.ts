import { NextResponse } from "next/server";
import { ensureShopSeeded, listCategories, listProducts } from "@/lib/inventory";

// No request input is read here, so Next 14 would otherwise prerender this
// route at build time and serve that snapshot forever — admin price/stock
// edits never showed on /shop until the next deploy.
export const dynamic = "force-dynamic";

/** Public catalogue read — the Shop listing/filter page's data source.
 *  Only ever returns active (published) products; an archived product
 *  stays reachable by its old order history but drops out of here. */
export async function GET() {
  try {
    await ensureShopSeeded();
    const [products, categories] = await Promise.all([listProducts(), listCategories()]);
    return NextResponse.json({ ok: true, products, categories });
  } catch (error) {
    console.error("[shop/products] load failed:", error instanceof Error ? error.message : error);
    return NextResponse.json({ ok: false, error: "Could not load the shop just now." }, { status: 502 });
  }
}
