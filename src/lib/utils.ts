import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatINR(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Indian-notation short formatter for headline stats.
 *   9_30_000 -> "9.3L"
 *   2_50_00_000 -> "2.5Cr"
 *   8_500 -> "8.5K"
 *   400 -> "400"
 */
export function formatINRShort(amount: number): string {
  if (!Number.isFinite(amount)) return '0';
  const abs = Math.abs(amount);
  if (abs >= 1_00_00_000) return `${(amount / 1_00_00_000).toFixed(1).replace(/\.0$/, '')}Cr`;
  if (abs >= 1_00_000)    return `${(amount / 1_00_000).toFixed(1).replace(/\.0$/, '')}L`;
  if (abs >= 1_000)       return `${(amount / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
  return String(Math.round(amount));
}

export function formatDate(input: string | Date, opts?: Intl.DateTimeFormatOptions) {
  const d = typeof input === 'string' ? new Date(input) : input;
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    ...opts,
  }).format(d);
}

const IST = 'Asia/Kolkata';
const IST_DATE: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short', year: 'numeric', timeZone: IST };
const IST_TIME: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: IST };

/**
 * Human "when" for an activity — a start date+time, optionally through an end.
 * When the end falls on the same day only its time is shown. Falls back to the
 * legacy date-only column when no start timestamp was recorded.
 *   "18 Jul 2026, 2:30 pm – 4:00 pm"
 *   "18 Jul 2026, 2:30 pm – 19 Jul 2026, 11:00 am"
 */
export function formatActivityWhen(
  startAt: string | null | undefined,
  endAt: string | null | undefined,
  fallbackDate?: string | null,
): string {
  if (!startAt) {
    return fallbackDate ? new Intl.DateTimeFormat('en-IN', IST_DATE).format(new Date(fallbackDate)) : '—';
  }
  const start = new Date(startAt);
  const startStr = `${new Intl.DateTimeFormat('en-IN', IST_DATE).format(start)}, ${new Intl.DateTimeFormat('en-IN', IST_TIME).format(start)}`;
  if (!endAt) return startStr;
  const end = new Date(endAt);
  const sameDay =
    new Intl.DateTimeFormat('en-IN', IST_DATE).format(start) ===
    new Intl.DateTimeFormat('en-IN', IST_DATE).format(end);
  const endStr = sameDay
    ? new Intl.DateTimeFormat('en-IN', IST_TIME).format(end)
    : `${new Intl.DateTimeFormat('en-IN', IST_DATE).format(end)}, ${new Intl.DateTimeFormat('en-IN', IST_TIME).format(end)}`;
  return `${startStr} – ${endStr}`;
}

/** Compact time-only range for list chips — "" when no start timestamp. */
export function formatActivityTimeRange(
  startAt: string | null | undefined,
  endAt: string | null | undefined,
): string {
  if (!startAt) return '';
  const startStr = new Intl.DateTimeFormat('en-IN', IST_TIME).format(new Date(startAt));
  return endAt ? `${startStr} – ${new Intl.DateTimeFormat('en-IN', IST_TIME).format(new Date(endAt))}` : startStr;
}

export function buildReceiptNo(prefix: 'DON' | 'DUE' | 'EVT', sequence?: number) {
  const ts = new Date();
  const yy = String(ts.getFullYear()).slice(-2);
  const mm = String(ts.getMonth() + 1).padStart(2, '0');
  const seq = sequence ?? Math.floor(Math.random() * 90000) + 10000;
  return `${prefix}-${yy}${mm}-${seq}`;
}
