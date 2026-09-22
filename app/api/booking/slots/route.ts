import { NextResponse } from "next/server";
import { generateSlots } from "@/lib/booking-slots";
import { listScheduledAppointmentsBetween } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Bookable consultation slots (Nairobi time) for the booking page: the
 *  generated schedule minus hours that already hold a Scheduled
 *  appointment. If Firestore is unreachable the schedule is still
 *  returned — POST /api/booking re-checks availability before saving. */
export async function GET() {
  const schedule = generateSlots();
  if (schedule.length === 0) return NextResponse.json({ ok: true, slots: [] });

  let taken = new Set<string>();
  try {
    const booked = await listScheduledAppointmentsBetween(schedule[0]!.date, schedule[schedule.length - 1]!.date);
    taken = new Set(booked.map((a) => `${a.date} ${a.time}`));
  } catch (error) {
    console.error("[booking/slots] could not read booked appointments:", error instanceof Error ? error.message : error);
  }

  return NextResponse.json({
    ok: true,
    slots: schedule.filter((s) => !taken.has(`${s.date} ${s.time}`)),
  });
}
