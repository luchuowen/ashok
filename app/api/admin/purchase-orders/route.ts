import { NextRequest, NextResponse } from "next/server";
import { isStaffAuthed } from "@/lib/require-staff";
import {
  listPurchaseOrders,
  createPurchaseOrder,
  getSupplier,
  getProduct,
  type PurchaseOrderLine,
} from "@/lib/inventory";

export async function GET() {
  if (!isStaffAuthed()) {
    return NextResponse.json({ ok: false, error: "Not signed in." }, { status: 401 });
  }
  try {
    const purchaseOrders = await listPurchaseOrders();
    return NextResponse.json({ ok: true, purchaseOrders });
  } catch (error) {
    console.error("[admin/purchase-orders] list failed:", error instanceof Error ? error.message : error);
    return NextResponse.json({ ok: false, error: "Could not load purchase orders." }, { status: 502 });
  }
}

interface LineInput {
  productId?: string;
  variantId?: string;
  qtyOrdered?: number;
  unitCost?: number;
}

interface POBody {
  supplierId?: string;
  notes?: string;
  lines?: LineInput[];
}

export async function POST(request: NextRequest) {
  if (!isStaffAuthed()) {
    return NextResponse.json({ ok: false, error: "Not signed in." }, { status: 401 });
  }
  let body: POBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }
  const supplierId = body.supplierId?.trim();
  if (!supplierId) {
    return NextResponse.json({ ok: false, error: "Choose a supplier." }, { status: 400 });
  }
  const rawLines = (body.lines ?? []).filter((l) => l.productId && l.variantId && Number(l.qtyOrdered) > 0);
  if (rawLines.length === 0) {
    return NextResponse.json({ ok: false, error: "Add at least one line with a quantity." }, { status: 400 });
  }

  try {
    const supplier = await getSupplier(supplierId);
    if (!supplier) {
      return NextResponse.json({ ok: false, error: "That supplier no longer exists." }, { status: 404 });
    }

    const lines: PurchaseOrderLine[] = [];
    for (const raw of rawLines) {
      const product = await getProduct(raw.productId!);
      if (!product) {
        return NextResponse.json({ ok: false, error: "One of the products no longer exists." }, { status: 400 });
      }
      const variant = product.variants.find((v) => v.id === raw.variantId);
      if (!variant) {
        return NextResponse.json(
          { ok: false, error: `${product.name} no longer has that size/variant.` },
          { status: 400 },
        );
      }
      const qtyOrdered = Math.max(1, Math.trunc(Number(raw.qtyOrdered)));
      const unitCost = Number.isFinite(Number(raw.unitCost)) ? Math.max(0, Number(raw.unitCost)) : 0;
      lines.push({
        productId: product.id,
        productName: product.name,
        variantId: variant.id,
        variantLabel: variant.label,
        qtyOrdered,
        qtyReceived: 0,
        unitCost,
      });
    }

    const id = await createPurchaseOrder({
      supplierId: supplier.id,
      supplierName: supplier.name,
      status: "Ordered",
      lines,
      notes: body.notes?.trim() || "",
      orderedAt: new Date().toISOString(),
    });
    return NextResponse.json({ ok: true, id });
  } catch (error) {
    console.error("[admin/purchase-orders] create failed:", error instanceof Error ? error.message : error);
    return NextResponse.json({ ok: false, error: "Could not create that purchase order." }, { status: 502 });
  }
}
