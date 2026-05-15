import type { ReportPeriod } from './types';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

/** Lions fiscal year runs Jul 1 → Jun 30. */
export function lionsYearForDate(d: Date): string {
  const m = d.getMonth();
  const y = d.getFullYear();
  const start = m >= 6 ? y : y - 1;
  return `${start}-${String((start + 1) % 100).padStart(2, '0')}`;
}

export function monthPeriod(year: number, month0: number): ReportPeriod {
  const start = new Date(year, month0, 1);
  const end = new Date(year, month0 + 1, 0, 23, 59, 59, 999);
  return {
    start, end,
    label: `${MONTHS[month0]} ${year}`,
    lionsYear: lionsYearForDate(start),
  };
}

export function quarterPeriod(year: number, quarter: 1|2|3|4): ReportPeriod {
  const m0 = (quarter - 1) * 3;
  const start = new Date(year, m0, 1);
  const end = new Date(year, m0 + 3, 0, 23, 59, 59, 999);
  return { start, end, label: `Q${quarter} ${year}`, lionsYear: lionsYearForDate(start) };
}

export function halfYearlyPeriod(year: number, half: 1|2): ReportPeriod {
  const m0 = half === 1 ? 0 : 6;
  const start = new Date(year, m0, 1);
  const end = new Date(year, m0 + 6, 0, 23, 59, 59, 999);
  return { start, end, label: `H${half} ${year}`, lionsYear: lionsYearForDate(start) };
}

/** Lions year: Jul Y → Jun Y+1. Pass the start year. */
export function lionsYearPeriod(startYear: number): ReportPeriod {
  const start = new Date(startYear, 6, 1);
  const end = new Date(startYear + 1, 5, 30, 23, 59, 59, 999);
  return {
    start, end,
    label: `Lions Year ${startYear}-${String((startYear + 1) % 100).padStart(2, '0')}`,
    lionsYear: `${startYear}-${String((startYear + 1) % 100).padStart(2, '0')}`,
  };
}

export function customPeriod(start: Date, end: Date, label?: string): ReportPeriod {
  return {
    start, end,
    label: label ?? `${start.toISOString().slice(0,10)} → ${end.toISOString().slice(0,10)}`,
    lionsYear: lionsYearForDate(start),
  };
}

/** Same-length period immediately preceding `p`. */
export function previousPeriod(p: ReportPeriod): ReportPeriod {
  const ms = p.end.getTime() - p.start.getTime();
  const end = new Date(p.start.getTime() - 1);
  const start = new Date(end.getTime() - ms);
  return customPeriod(start, end, `Prev: ${p.label}`);
}

export function monthBucketsBetween(start: Date, end: Date): { key: string; date: Date }[] {
  const out: { key: string; date: Date }[] = [];
  const cur = new Date(start.getFullYear(), start.getMonth(), 1);
  while (cur <= end) {
    out.push({
      key: `${MONTHS[cur.getMonth()]} ${String(cur.getFullYear()).slice(2)}`,
      date: new Date(cur),
    });
    cur.setMonth(cur.getMonth() + 1);
  }
  return out;
}

export function pctDelta(curr: number, prev: number): string {
  if (!prev) return curr ? '+∞%' : '0%';
  const d = ((curr - prev) / prev) * 100;
  return `${d >= 0 ? '+' : ''}${d.toFixed(1)}%`;
}
