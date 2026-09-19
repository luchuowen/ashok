/**
 * Minimal .ics (iCalendar) builder for a single VEVENT — used by the
 * portal's "Add to Calendar" button. No external deps; Apple/Google/Outlook
 * all accept a bare VCALENDAR/VEVENT pair downloaded as a .ics file, so a
 * hand-rolled string is enough here — no need to pull in a calendar library
 * for one event.
 */

interface IcsEventInput {
  title: string;
  description?: string;
  location: string;
  /** ISO date, e.g. "2026-09-25" */
  date: string;
  /** 24h time, e.g. "15:00" */
  time: string;
  /** Minutes; defaults to 60. */
  durationMinutes?: number;
}

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

function toIcsDate(date: string, time: string, offsetMinutes = 0): string {
  const [y, m, d] = date.split("-").map(Number);
  const [h, min] = time.split(":").map(Number);
  const dt = new Date(y, (m ?? 1) - 1, d, h, min);
  dt.setMinutes(dt.getMinutes() + offsetMinutes);
  return `${dt.getFullYear()}${pad(dt.getMonth() + 1)}${pad(dt.getDate())}T${pad(dt.getHours())}${pad(dt.getMinutes())}00`;
}

function escapeIcsText(input: string): string {
  return input.replace(/([,;])/g, "\\$1").replace(/\n/g, "\\n");
}

export function buildIcsFile(event: IcsEventInput): string {
  const start = toIcsDate(event.date, event.time);
  const end = toIcsDate(event.date, event.time, event.durationMinutes ?? 60);

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Ashok Sunny Tailored//Appointments//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${start}-${Math.round(Math.random() * 1e6)}@ashok.navac.co.ke`,
    `DTSTAMP:${start}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${escapeIcsText(event.title)}`,
    `LOCATION:${escapeIcsText(event.location)}`,
    event.description ? `DESCRIPTION:${escapeIcsText(event.description)}` : "",
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean);

  return lines.join("\r\n");
}

/** Data URL so the "Add to Calendar" button can be a plain download link. */
export function buildIcsDataUrl(event: IcsEventInput): string {
  return `data:text/calendar;charset=utf-8,${encodeURIComponent(buildIcsFile(event))}`;
}
