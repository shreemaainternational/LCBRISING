import type { ReportDoc, ReportFilters, ReportPeriod } from '../types';
import { formatINR, formatINRShort } from '@/lib/utils';
import { env } from '@/lib/env';

export function emptyDoc(
  type: ReportDoc['type'],
  title: string,
  period: ReportPeriod,
  filters: ReportFilters,
): ReportDoc {
  return {
    type,
    title,
    period,
    filters,
    kpis: [],
    charts: [],
    tables: [],
    narrative: [],
    totals: {},
    metadata: {
      generatedAt: new Date().toISOString(),
      clubName: env.NEXT_PUBLIC_SITE_NAME,
      districtCode: '3232 F1',
    },
  };
}

export const fmtINR = (n: number) => formatINR(Math.round(n));
export const fmtShort = (n: number) => formatINRShort(Math.round(n));
export const fmtInt = (n: number) => Math.round(n).toLocaleString('en-IN');
