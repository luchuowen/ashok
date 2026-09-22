import { NextRequest, NextResponse } from "next/server";
import { isStaffAuthed } from "@/lib/require-staff";
import { listCategories, createCategory, slugify } from "@/lib/inventory";

export async function GET() {
  if (!isStaffAuthed()) {
    return NextResponse.json({ ok: false, error: "Not signed in." }, { status: 401 });
  }
  try {
    const categories = await listCategories();
    return NextResponse.json({ ok: true, categories });
  } catch (error) {
    console.error("[admin/categories] list failed:", error instanceof Error ? error.message : error);
    return NextResponse.json({ ok: false, error: "Could not load categories." }, { status: 502 });
  }
}

interface CategoryBody {
  name?: string;
  slug?: string;
  sortOrder?: number;
}

export async function POST(request: NextRequest) {
  if (!isStaffAuthed()) {
    return NextResponse.json({ ok: false, error: "Not signed in." }, { status: 401 });
  }
  let body: CategoryBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }
  const name = body.name?.trim();
  if (!name) {
    return NextResponse.json({ ok: false, error: "Enter a category name." }, { status: 400 });
  }
  const slug = slugify(body.slug?.trim() || name);
  if (!slug) {
    return NextResponse.json({ ok: false, error: "Could not derive a slug from that name." }, { status: 400 });
  }
  const sortOrder = Number.isFinite(Number(body.sortOrder)) ? Number(body.sortOrder) : 0;

  try {
    const existing = await listCategories();
    if (existing.some((c) => c.slug === slug)) {
      return NextResponse.json({ ok: false, error: "A category with that slug already exists." }, { status: 409 });
    }
    const id = await createCategory({ name, slug, sortOrder });
    return NextResponse.json({ ok: true, id });
  } catch (error) {
    console.error("[admin/categories] create failed:", error instanceof Error ? error.message : error);
    return NextResponse.json({ ok: false, error: "Could not create that category." }, { status: 502 });
  }
}
