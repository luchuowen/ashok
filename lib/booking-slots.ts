/**
 * Consultation slot generation — pure and client-safe (no Firestore).
 *
 * All times are Nairobi (EAT, UTC+3, no DST). The server runs in UTC on
 * App Hosting and customers' browsers can be anywhere, so nothing here
 * ever calls the local-time Date getters: "now" is shifted to Nairobi
 * explicitly and every slot is a (date, time) pair in that zone — the same
 * shape lib/db.ts Appointment already stores and lib/ics.ts already
 * interprets as +03:00.
 *
 * The booking page used to show six fixed weekday labels ("Tue 10:00")
 * with no date, so at 20:50 on a Tuesday it still offered "Tue 10:00" —
 * and the server then resolved that to *today*, in the past.
 */

export const NAIROBI_OFFSET_MINUTES = 3 * 60;
/** Minimum notice before a slot can be booked (hours, Nairobi time). */
export const LEAD_TIME_HOURS = 2;
/** How far ahead the booking page offers slots. */
export const BOOKING_WINDOW_DAYS = 10;

/** Opening hours by weekday (0 = Sunday). Slots start on the hour; the
 *  last start is `lastStart`. Consultations run 30–45 min so an hourly
 *  grid leaves room between visits. */
const HOURS: Record<number, { firstStart: number; lastStart: number } | null> = {
  0: null, // Sunday closed
  1: { firstStart: 9, lastStart: 17 },
  2: { firstStart: 9, lastStart: 17 },
  3: { firstStart: 9, lastStart: 17 },
  4: { firstStart: 9, lastStart: 17 },
  5: { firstStart: 9, lastStart: 17 },
  6: { firstStart: 9, lastStart: 14 }, // Saturday, shorter day
};

export interface BookingSlot {
  /** ISO date in Nairobi, e.g. "2026-09-23". */
  date: string;
  /** 24h "HH:MM" in Nairobi. */
  time: string;
  /** Human label, e.g. "Wed 23 Sep, 10:00". */
  label: string;
  /** Day heading, e.g. "Wed 23 Sep". */
  dayLabel: string;
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** A Date whose *UTC* fields read as Nairobi wall-clock time. */
function toNairobi(instant: Date): Date {
  return new Date(instant.getTime() + NAIROBI_OFFSET_MINUTES * 60_000);
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function isoDate(nairobi: Date): string {
  return `${nairobi.getUTCFullYear()}-${pad(nairobi.getUTCMonth() + 1)}-${pad(nairobi.getUTCDate())}`;
}

export function formatDay(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  return `${DAY_NAMES[d.getUTCDay()]} ${d.getUTCDate()} ${MONTH_NAMES[d.getUTCMonth()]}`;
}

export function formatSlot(date: string, time: string): string {
  return `${formatDay(date)}, ${time}`;
}

/** Every bookable slot from `now` forward, in order, honouring opening
 *  hours, the lead time and the booking window. Booked slots are removed
 *  by the caller (app/api/booking/slots) — this is the pure schedule. */
export function generateSlots(now: Date = new Date(), windowDays = BOOKING_WINDOW_DAYS): BookingSlot[] {
  const earliest = toNairobi(new Date(now.getTime() + LEAD_TIME_HOURS * 3_600_000));
  const startDay = toNairobi(now);
  const slots: BookingSlot[] = [];

  for (let offset = 0; offset <= windowDays; offset++) {
    const day = new Date(Date.UTC(startDay.getUTCFullYear(), startDay.getUTCMonth(), startDay.getUTCDate() + offset));
    const hours = HOURS[day.getUTCDay()];
    if (!hours) continue;
    const date = isoDate(day);
    for (let h = hours.firstStart; h <= hours.lastStart; h++) {
      const slotInstant = new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), h));
      if (slotInstant.getTime() < earliest.getTime()) continue;
      const time = `${pad(h)}:00`;
      slots.push({ date, time, label: formatSlot(date, time), dayLabel: formatDay(date) });
    }
  }
  return slots;
}

/** Server-side check that a submitted (date, time) is one the schedule
 *  would offer right now — rejects past times, closed days, off-grid
 *  times and anything beyond the window, regardless of what the client sent. */
export function isOfferedSlot(date: string, time: string, now: Date = new Date()): boolean {
  return generateSlots(now).some((s) => s.date === date && s.time === time);
}

/** Group for rendering: [{ date, dayLabel, slots }] in date order. */
export function groupSlotsByDay(slots: BookingSlot[]): { date: string; dayLabel: string; slots: BookingSlot[] }[] {
  const groups: { date: string; dayLabel: string; slots: BookingSlot[] }[] = [];
  for (const slot of slots) {
    const last = groups[groups.length - 1];
    if (last && last.date === slot.date) last.slots.push(slot);
    else groups.push({ date: slot.date, dayLabel: slot.dayLabel, slots: [slot] });
  }
  return groups;
}
