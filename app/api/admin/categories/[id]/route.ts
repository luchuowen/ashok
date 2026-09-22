import { NextRequest, NextResponse } from "next/server";
import { isStaffAuthed } from "@/lib/require-staff";
import { updateCategory, deleteCategory, listProducts, slugify } from "@/lib/inventory";

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  if (!isStaffAuthed()) {
    return NextResponse.json({ ok: false, error: "Not signed in." }, { status: 401 });
  }
  let body: { name?: string; slug?: string; sortOrder?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }
  const patch: { name?: string; slug?: string; sortOrder?: number } = {};
  if (typeof body.name === "string" && body.name.trim()) patch.name = body.name.trim();
  if (typeof body.slug === "string" && body.slug.trim()) patch.slug = slugify(body.slug.trim());
  if (typeof body.sortOrder === "number" && Number.isFinite(body.sortOrder)) patch.sortOrder = body.sortOrder;
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ ok: false, error: "Nothing to update." }, { status: 400 });
  }
  try {
    await updateCategory(params.id, patch);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[admin/categories/:id] update failed:", error instanceof Error ? error.message : error);
    return NextResponse.json({ ok: false, error: "Could not update that category." }, { status: 502 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  if (!isStaffAuthed()) {
    return NextResponse.json({ ok: false, error: "Not signed in." }, { status: 401 });
  }
  try {
    // Deleting a category out from under its products would leave them with
    // a dangling categoryId — the Shop's category filter would just silently
    // never match them again. Block the delete instead of orphaning products.
    const products = await listProducts({ includeInactive: true });
    if (products.some((p) => p.categoryId === params.id)) {
      return NextResponse.json(
        { ok: false, error: "Move or reassign this category's products before deleting it." },
        { status: 409 },
      );
    }
    await deleteCategory(params.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[admin/categories/:id] delete failed:", error instanceof Error ? error.message : error);
    return NextResponse.json({ ok: false, error: "Could not delete that category." }, { status: 502 });
  }
}
