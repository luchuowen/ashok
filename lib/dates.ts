/**
 * Nairobi (EAT, UTC+3, no DST) calendar helpers. The server runs in UTC and
 * the browser may be anywhere, so "today" and "has this slot passed" are
 * always worked out against Nairobi wall-clock time — the only clock the
 * atelier's appointments are booked in.
 */

const NAIROBI_OFFSET_MINUTES = 3 * 60;

/** Current Nairobi wall-clock time, as a Date whose UTC fields read as Nairobi local. */
function nairobiWallClock(now: Date = new Date()): Date {
  return new Date(now.getTime() + NAIROBI_OFFSET_MINUTES * 60_000);
}

/** Today's date in Nairobi, ISO "YYYY-MM-DD". */
export function nairobiToday(now: Date = new Date()): string {
  return nairobiWallClock(now).toISOString().slice(0, 10);
}

/** Current Nairobi time, 24h "HH:MM". */
export function nairobiTimeNow(now: Date = new Date()): string {
  return nairobiWallClock(now).toISOString().slice(11, 16);
}

/**
 * Next occurrence of a weekday (0 = Sun … 6 = Sat) at a 24h "HH:MM" time,
 * in Nairobi. If that weekday is today but the time has already passed, it
 * rolls to the same weekday next week rather than booking into the past.
 */
export function nextNairobiOccurrence(targetDow: number, time: string, now: Date = new Date()): string {
  const wall = nairobiWallClock(now);
  let diff = targetDow - wall.getUTCDay();
  if (diff < 0) diff += 7;
  if (diff === 0 && time <= nairobiTimeNow(now)) diff = 7;
  wall.setUTCDate(wall.getUTCDate() + diff);
  return wall.toISOString().slice(0, 10);
}

/** True if an appointment on `date` at `time` (Nairobi) hasn't started yet. */
export function isUpcomingInNairobi(date: string, time: string, now: Date = new Date()): boolean {
  const today = nairobiToday(now);
  if (date !== today) return date > today;
  return time > nairobiTimeNow(now);
}
