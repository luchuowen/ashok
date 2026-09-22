import { NextRequest, NextResponse } from "next/server";
import { getProductBySlug } from "@/lib/inventory";

export async function GET(request: NextRequest, { params }: { params: { slug: string } }) {
  try {
    const product = await getProductBySlug(params.slug);
    if (!product || !product.active) {
      return NextResponse.json({ ok: false, error: "Not found." }, { status: 404 });
    }
    return NextResponse.json({ ok: true, product });
  } catch (error) {
    console.error("[shop/products/:slug] load failed:", error instanceof Error ? error.message : error);
    return NextResponse.json({ ok: false, error: "Could not load that product just now." }, { status: 502 });
  }
}
