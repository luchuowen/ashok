import { NextRequest, NextResponse } from "next/server";
import { isStaffAuthed } from "@/lib/require-staff";
import { createMeasurement, getOrCreateCustomer, updateOrder, listOrdersForCustomer } from "@/lib/db";
import { normalizeKenyanMobile } from "@/lib/sms";

interface MeasurementBody {
  phone?: string;
  chest?: number;
  waist?: number;
  hips?: number;
  shoulder?: number;
  sleeveLength?: number;
  inseam?: number;
  neck?: number;
  notes?: string;
}

export async function POST(request: NextRequest) {
  if (!isStaffAuthed()) {
    return NextResponse.json({ ok: false, error: "Not signed in." }, { status: 401 });
  }
  let body: MeasurementBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }

  const phone = normalizeKenyanMobile(body.phone ?? "");
  if (!phone) {
    return NextResponse.json({ ok: false, error: "Enter a valid Kenyan phone number." }, { status: 400 });
  }

  const fields: (keyof MeasurementBody)[] = [
    "chest",
    "waist",
    "hips",
    "shoulder",
    "sleeveLength",
    "inseam",
    "neck",
  ];
  for (const field of fields) {
    const value = body[field];
    if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
      return NextResponse.json({ ok: false, error: `Enter a valid ${field} measurement.` }, { status: 400 });
    }
  }

  try {
    const customer = await getOrCreateCustomer(phone);
    const takenAt = new Date().toISOString().slice(0, 10);
    await createMeasurement({
      clientId: phone,
      clientName: customer.name || phone,
      takenAt,
      chest: body.chest!,
      waist: body.waist!,
      hips: body.hips!,
      shoulder: body.shoulder!,
      sleeveLength: body.sleeveLength!,
      inseam: body.inseam!,
      neck: body.neck!,
      notes: body.notes?.trim() ?? "",
    });

    // A fresh measurement session usually follows the consultation stage —
    // nudge any open bespoke order for this client along automatically so
    // staff don't have to separately remember to update order stage too.
    const orders = await listOrdersForCustomer(phone);
    const openOrder = orders.find(
      (order) => order.source === "bespoke" && order.stage === "Consultation",
    );
    if (openOrder) {
      await updateOrder(openOrder.id, {
        stage: "Measurements Taken",
        statusNote: "Measurements on file — moving to cutting",
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[admin/measurements] write failed:", error instanceof Error ? error.message : error);
    return NextResponse.json({ ok: false, error: "Could not save that measurement." }, { status: 502 });
  }
}
