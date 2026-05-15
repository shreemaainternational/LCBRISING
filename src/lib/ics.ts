/**
 * Minimal RFC 5545 iCalendar serialiser.
 * No external deps — handles the fields we actually use.
 */

export interface IcsEvent {
  uid: string;
  start: Date | string;
  end?: Date | string;
  allDay?: boolean;
  summary: string;
  description?: string;
  location?: string;
  url?: string;
  categories?: string[];
  organizer?: { name?: string; email?: string };
  status?: 'CONFIRMED' | 'TENTATIVE' | 'CANCELLED';
}

export interface IcsCalendar {
  name: string;
  description?: string;
  prodId?: string;
  events: IcsEvent[];
  /** Apple Calendar / Outlook colour hint. */
  color?: string;
}

function escapeText(s: string): string {
  return String(s)
    .replace(/\\/g, '\\\\')
    .replace(/\r?\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
}

function fmtUtc(d: Date | string): string {
  const dt = typeof d === 'string' ? new Date(d) : d;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${dt.getUTCFullYear()}${pad(dt.getUTCMonth() + 1)}${pad(dt.getUTCDate())}T${pad(dt.getUTCHours())}${pad(dt.getUTCMinutes())}${pad(dt.getUTCSeconds())}Z`;
}

function fmtDate(d: Date | string): string {
  const dt = typeof d === 'string' ? new Date(d) : d;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${dt.getUTCFullYear()}${pad(dt.getUTCMonth() + 1)}${pad(dt.getUTCDate())}`;
}

/**
 * Fold long lines at 75 octets per RFC 5545 §3.1.
 */
function fold(line: string): string {
  if (line.length <= 75) return line;
  const out: string[] = [];
  let rest = line;
  out.push(rest.slice(0, 75));
  rest = rest.slice(75);
  while (rest.length) {
    out.push(' ' + rest.slice(0, 74));
    rest = rest.slice(74);
  }
  return out.join('\r\n');
}

export function buildIcs(cal: IcsCalendar): string {
  const lines: string[] = [];
  lines.push('BEGIN:VCALENDAR');
  lines.push('VERSION:2.0');
  lines.push(`PRODID:-//${cal.prodId ?? 'Lions Club of Baroda Rising Star'}//Zone Control//EN`);
  lines.push('CALSCALE:GREGORIAN');
  lines.push('METHOD:PUBLISH');
  lines.push(`X-WR-CALNAME:${escapeText(cal.name)}`);
  if (cal.description) lines.push(`X-WR-CALDESC:${escapeText(cal.description)}`);
  if (cal.color) lines.push(`X-APPLE-CALENDAR-COLOR:${cal.color}`);
  lines.push('X-PUBLISHED-TTL:PT1H');

  const dtstamp = fmtUtc(new Date());
  for (const ev of cal.events) {
    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${ev.uid}`);
    lines.push(`DTSTAMP:${dtstamp}`);

    if (ev.allDay) {
      lines.push(`DTSTART;VALUE=DATE:${fmtDate(ev.start)}`);
      if (ev.end) lines.push(`DTEND;VALUE=DATE:${fmtDate(ev.end)}`);
    } else {
      lines.push(`DTSTART:${fmtUtc(ev.start)}`);
      if (ev.end) lines.push(`DTEND:${fmtUtc(ev.end)}`);
    }

    lines.push(`SUMMARY:${escapeText(ev.summary)}`);
    if (ev.description) lines.push(`DESCRIPTION:${escapeText(ev.description)}`);
    if (ev.location)    lines.push(`LOCATION:${escapeText(ev.location)}`);
    if (ev.url)         lines.push(`URL:${ev.url}`);
    if (ev.categories?.length) lines.push(`CATEGORIES:${ev.categories.map(escapeText).join(',')}`);
    if (ev.organizer?.email) {
      lines.push(`ORGANIZER;CN=${escapeText(ev.organizer.name ?? ev.organizer.email)}:mailto:${ev.organizer.email}`);
    }
    lines.push(`STATUS:${ev.status ?? 'CONFIRMED'}`);
    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');
  return lines.map(fold).join('\r\n') + '\r\n';
}
