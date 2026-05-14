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

export function buildReceiptNo(prefix: 'DON' | 'DUE' | 'EVT', sequence?: number) {
  const ts = new Date();
  const yy = String(ts.getFullYear()).slice(-2);
  const mm = String(ts.getMonth() + 1).padStart(2, '0');
  const seq = sequence ?? Math.floor(Math.random() * 90000) + 10000;
  return `${prefix}-${yy}${mm}-${seq}`;
}
