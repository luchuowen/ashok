import { NextRequest, NextResponse } from "next/server";
import { isStaffAuthed } from "@/lib/require-staff";
import { updateAppointment, type AppointmentStatus } from "@/lib/db";

const VALID_STATUSES: AppointmentStatus[] = ["Scheduled", "Completed", "Cancelled"];

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  if (!isStaffAuthed()) {
    return NextResponse.json({ ok: false, error: "Not signed in." }, { status: 401 });
  }
  let body: { status?: AppointmentStatus };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }
  if (!body.status || !VALID_STATUSES.includes(body.status)) {
    return NextResponse.json({ ok: false, error: "Invalid status." }, { status: 400 });
  }
  try {
    await updateAppointment(params.id, { status: body.status });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[admin/appointments/:id] update failed:", error instanceof Error ? error.message : error);
    return NextResponse.json({ ok: false, error: "Could not update that appointment." }, { status: 502 });
  }
}
