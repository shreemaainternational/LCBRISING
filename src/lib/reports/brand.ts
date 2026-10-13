/** Lions-branded color tokens shared by PDF + PPTX renderers. */
export const BRAND = {
  navy: '#0B1F4D',
  navyDark: '#061539',
  blue: '#1E40AF',
  blueLight: '#3B82F6',
  gold: '#F5A623',
  goldDark: '#C7841A',
  ink: '#0F172A',
  body: '#1F2937',
  muted: '#64748B',
  paper: '#FFFFFF',
  paperAlt: '#F8FAFC',
  line: '#E5E7EB',
  success: '#16A34A',
  danger: '#DC2626',
  warning: '#EAB308',
} as const;

/** 12-color palette tuned for accessible, colorful charts. */
export const PALETTE = [
  '#1E40AF', // royal blue
  '#F5A623', // lions gold
  '#16A34A', // green
  '#DC2626', // red
  '#7C3AED', // purple
  '#0891B2', // cyan
  '#DB2777', // pink
  '#EA580C', // orange
  '#0284C7', // sky
  '#65A30D', // lime
  '#C026D3', // magenta
  '#0D9488', // teal
] as const;

/** UN SDG official-ish color set (1..17). */
export const SDG_COLORS: Record<number, string> = {
  1:'#E5243B', 2:'#DDA63A', 3:'#4C9F38', 4:'#C5192D', 5:'#FF3A21',
  6:'#26BDE2', 7:'#FCC30B', 8:'#A21942', 9:'#FD6925', 10:'#DD1367',
  11:'#FD9D24', 12:'#BF8B2E', 13:'#3F7E44', 14:'#0A97D9', 15:'#56C02B',
  16:'#00689D', 17:'#19486A',
};

export function colorAt(i: number): string {
  return PALETTE[i % PALETTE.length];
}

/** "#RRGGBB" → "RRGGBB" for pptxgenjs. */
export function hex(c: string): string {
  return c.replace('#', '').toUpperCase();
}

/**
 * This CRM runs a single club, so — same as ReportDoc.metadata.districtCode
 * ('3232 F1', hardcoded in builders/common.ts) — region/zone/charter number
 * are stable facts, not per-report data pulled from a query. Per migration
 * 0072_fix_baroda_club_number.sql, the club's real charter number is
 * 179323 (District 3232 F1, Region 6, Zone 1).
 */
export const ORG = {
  region: 'Region 6',
  zone: 'Zone 1',
  clubNumber: '179323',
} as const;
