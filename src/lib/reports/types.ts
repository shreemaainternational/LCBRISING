export type ReportType =
  | 'integrated'
  | 'monthly' | 'quarterly' | 'half_yearly' | 'yearly'
  | 'activity' | 'csr' | 'donor' | 'district' | 'multi_district'
  | 'lions_international' | 'beneficiary' | 'financial'
  | 'volunteer' | 'sdg_impact' | 'event_performance'
  | 'medical_camp' | 'service_category' | 'award_qualification'
  | 'club_growth' | 'membership';

export type ReportFormat = 'pdf' | 'pptx';

export interface ReportPeriod {
  start: Date;
  end: Date;
  label: string;
  lionsYear: string;
}

export interface ReportFilters {
  clubId?: string;
  districtId?: string;
  multipleDistrictId?: string;
  category?: string;
  campaign?: string;
  csrPartnerId?: string;
  donorId?: string;
  eventId?: string;
  memberId?: string;
  activityId?: string;
}

export interface ReportRequest {
  type: ReportType;
  format: ReportFormat;
  period?: ReportPeriod;
  filters?: ReportFilters;
  includeAINarrative?: boolean;
  language?: 'en' | 'gu' | 'bilingual';
}

export interface KPI {
  label: string;
  value: string | number;
  delta?: string;
  hint?: string;
  color?: string;
}

export interface ChartSeries {
  name: string;
  data: number[];
  color?: string;
}

export interface ChartSpec {
  kind: 'bar' | 'horizontal_bar' | 'pie' | 'donut' | 'line' | 'area' | 'stacked_bar';
  title: string;
  labels: string[];
  series: ChartSeries[];
  yAxisLabel?: string;
}

export interface TableSpec {
  title: string;
  columns: { key: string; label: string; align?: 'left' | 'right' | 'center' }[];
  rows: Record<string, string | number>[];
  totals?: Record<string, string | number>;
}

export interface NarrativeSection {
  heading: string;
  body: string;
}

export interface ReportDoc {
  type: ReportType;
  title: string;
  subtitle?: string;
  period: ReportPeriod;
  filters: ReportFilters;
  kpis: KPI[];
  charts: ChartSpec[];
  tables: TableSpec[];
  narrative: NarrativeSection[];
  appendix?: NarrativeSection[];
  totals: Record<string, number | string>;
  metadata: {
    generatedAt: string;
    generatedBy?: string;
    clubName: string;
    districtCode: string;
  };
}

export interface RenderedReport {
  format: ReportFormat;
  buffer: Buffer;
  mime: string;
  filename: string;
  pageCount?: number;
}
