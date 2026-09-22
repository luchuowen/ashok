import { NextRequest, NextResponse } from "next/server";
import { isStaffAuthed } from "@/lib/require-staff";
import {
  listProducts,
  createProduct,
  getProductBySlug,
  slugify,
  buildProductVariants,
  type ProductVariantInput,
} from "@/lib/inventory";

export async function GET() {
  if (!isStaffAuthed()) {
    return NextResponse.json({ ok: false, error: "Not signed in." }, { status: 401 });
  }
  try {
    const products = await listProducts({ includeInactive: true });
    return NextResponse.json({ ok: true, products });
  } catch (error) {
    console.error("[admin/products] list failed:", error instanceof Error ? error.message : error);
    return NextResponse.json({ ok: false, error: "Could not load products." }, { status: 502 });
  }
}

interface ProductBody {
  name?: string;
  slug?: string;
  categoryId?: string;
  description?: string;
  price?: number;
  discountPercent?: number;
  images?: string[];
  imageLabel?: string;
  active?: boolean;
  variants?: ProductVariantInput[];
}

export async function POST(request: NextRequest) {
  if (!isStaffAuthed()) {
    return NextResponse.json({ ok: false, error: "Not signed in." }, { status: 401 });
  }
  let body: ProductBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }

  const name = body.name?.trim();
  if (!name) {
    return NextResponse.json({ ok: false, error: "Enter a product name." }, { status: 400 });
  }
  const categoryId = body.categoryId?.trim();
  if (!categoryId) {
    return NextResponse.json({ ok: false, error: "Choose a category." }, { status: 400 });
  }
  const price = Number(body.price);
  if (!Number.isFinite(price) || price <= 0) {
    return NextResponse.json({ ok: false, error: "Enter a valid price." }, { status: 400 });
  }
  let discountPercent: number | undefined;
  if (body.discountPercent !== undefined) {
    const pct = Number(body.discountPercent);
    if (!Number.isFinite(pct) || pct < 0 || pct > 100) {
      return NextResponse.json({ ok: false, error: "Discount must be between 0 and 100." }, { status: 400 });
    }
    if (pct > 0) discountPercent = pct;
  }
  const variants = buildProductVariants(body.variants ?? []);
  if (variants.length === 0) {
    return NextResponse.json({ ok: false, error: "Add at least one variant (e.g. a size)." }, { status: 400 });
  }
  const slug = slugify(body.slug?.trim() || name);
  if (!slug) {
    return NextResponse.json({ ok: false, error: "Could not derive a slug from that name." }, { status: 400 });
  }

  try {
    const clash = await getProductBySlug(slug);
    if (clash) {
      return NextResponse.json({ ok: false, error: "A product with that slug already exists." }, { status: 409 });
    }
    const id = await createProduct({
      slug,
      name,
      categoryId,
      description: body.description?.trim() || "",
      price,
      currency: "KES",
      ...(discountPercent ? { discountPercent } : {}),
      images: Array.isArray(body.images) ? body.images.filter((s) => typeof s === "string" && s.trim()) : [],
      imageLabel: body.imageLabel?.trim() || name,
      active: body.active !== false,
      variants,
    });
    return NextResponse.json({ ok: true, id });
  } catch (error) {
    console.error("[admin/products] create failed:", error instanceof Error ? error.message : error);
    return NextResponse.json({ ok: false, error: "Could not create that product." }, { status: 502 });
  }
}
