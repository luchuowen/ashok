import { NextRequest, NextResponse } from "next/server";
import { isStaffAuthed } from "@/lib/require-staff";
import {
  getProduct,
  updateProduct,
  getProductBySlug,
  slugify,
  buildProductVariants,
  type Product,
  type ProductVariantInput,
} from "@/lib/inventory";

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  if (!isStaffAuthed()) {
    return NextResponse.json({ ok: false, error: "Not signed in." }, { status: 401 });
  }
  try {
    const product = await getProduct(params.id);
    if (!product) {
      return NextResponse.json({ ok: false, error: "Not found." }, { status: 404 });
    }
    return NextResponse.json({ ok: true, product });
  } catch (error) {
    console.error("[admin/products/:id] get failed:", error instanceof Error ? error.message : error);
    return NextResponse.json({ ok: false, error: "Could not load that product." }, { status: 502 });
  }
}

interface ProductPatchBody {
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

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  if (!isStaffAuthed()) {
    return NextResponse.json({ ok: false, error: "Not signed in." }, { status: 401 });
  }
  const existing = await getProduct(params.id);
  if (!existing) {
    return NextResponse.json({ ok: false, error: "Not found." }, { status: 404 });
  }
  let body: ProductPatchBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }

  const patch: Partial<Product> = {};
  if (typeof body.name === "string" && body.name.trim()) patch.name = body.name.trim();
  if (typeof body.categoryId === "string" && body.categoryId.trim()) patch.categoryId = body.categoryId.trim();
  if (typeof body.description === "string") patch.description = body.description.trim();
  if (typeof body.price === "number" && Number.isFinite(body.price) && body.price > 0) patch.price = body.price;
  if (typeof body.discountPercent === "number" && Number.isFinite(body.discountPercent)) {
    if (body.discountPercent < 0 || body.discountPercent > 100) {
      return NextResponse.json({ ok: false, error: "Discount must be between 0 and 100." }, { status: 400 });
    }
    // 0 reads as "no discount" (Product.discountPercent's own contract) —
    // still a real, intentional write, e.g. to end a sale.
    patch.discountPercent = body.discountPercent;
  }
  if (Array.isArray(body.images)) {
    patch.images = body.images.filter((s) => typeof s === "string" && s.trim());
  }
  if (typeof body.imageLabel === "string" && body.imageLabel.trim()) patch.imageLabel = body.imageLabel.trim();
  if (typeof body.active === "boolean") patch.active = body.active;
  if (typeof body.slug === "string" && body.slug.trim()) {
    const slug = slugify(body.slug.trim());
    if (slug && slug !== existing.slug) {
      const clash = await getProductBySlug(slug);
      if (clash && clash.id !== existing.id) {
        return NextResponse.json({ ok: false, error: "A product with that slug already exists." }, { status: 409 });
      }
      patch.slug = slug;
    }
  }
  if (Array.isArray(body.variants)) {
    const variants = buildProductVariants(body.variants, existing.variants);
    if (variants.length === 0) {
      return NextResponse.json({ ok: false, error: "Keep at least one variant." }, { status: 400 });
    }
    // A variant already on the product is never allowed to disappear from
    // an edit, even though buildProductVariants() would happily build a
    // shorter array — dropping one here would orphan any purchase-order
    // line, stock movement, past order item, or open return that still
    // references its variantId (receivePurchaseOrder, in particular, would
    // throw trying to apply a receipt against a variant id that's no
    // longer on the product). Retiring a size is "set its stock to 0 and
    // relabel it", not delete — the same archive-don't-delete rule this
    // codebase already applies to whole products via `active`.
    const nextIds = new Set(variants.map((v) => v.id));
    const dropped = existing.variants.filter((v) => !nextIds.has(v.id));
    if (dropped.length > 0) {
      return NextResponse.json(
        {
          ok: false,
          error: `Can't remove existing size(s) (${dropped.map((v) => v.label).join(", ")}) — set stock to 0 and relabel instead.`,
        },
        { status: 400 },
      );
    }
    patch.variants = variants;
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ ok: false, error: "Nothing to update." }, { status: 400 });
  }

  try {
    await updateProduct(params.id, patch);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[admin/products/:id] update failed:", error instanceof Error ? error.message : error);
    return NextResponse.json({ ok: false, error: "Could not update that product." }, { status: 502 });
  }
}
