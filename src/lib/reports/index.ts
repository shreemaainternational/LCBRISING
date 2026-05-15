import type {
  ReportDoc, ReportFilters, ReportFormat, ReportPeriod,
  ReportRequest, ReportType, RenderedReport,
} from './types';
import { buildPeriodReport } from './builders/period-reports';
import { buildAnnualReport } from './builders/annual-report';
import {
  buildFinancialReport, buildDonorReport, buildCSRReport,
} from './builders/finance-reports';
import {
  buildActivityReport, buildEventPerformanceReport,
  buildServiceCategoryReport, buildMedicalCampReport,
} from './builders/activity-reports';
import {
  buildBeneficiaryReport, buildVolunteerReport,
  buildMembershipReport, buildAwardReport, buildClubGrowthReport,
} from './builders/people-reports';
import {
  buildDistrictReport, buildMultiDistrictReport,
  buildLionsInternationalReport, buildSDGImpactReport,
} from './builders/org-reports';
import { renderPdf } from './render-pdf';
import { renderPptx } from './render-pptx';
import { monthPeriod, quarterPeriod, halfYearlyPeriod, lionsYearPeriod } from './period';
import { generateNarrative, type NarrativeLanguage, type NarrativeTone, gujaratiHeading } from '@/lib/ai/narrative';

export interface ReportCatalogEntry {
  type: ReportType;
  title: string;
  description: string;
  group: 'Period' | 'Activity' | 'People' | 'Finance' | 'Org' | 'Impact';
  defaultFormats: ReportFormat[];
}

export const REPORT_CATALOG: ReportCatalogEntry[] = [
  { type: 'monthly',             title: 'Monthly Report',                   description: 'Total activities, members, beneficiaries, finance, top projects for a calendar month.',  group: 'Period',  defaultFormats: ['pdf','pptx'] },
  { type: 'quarterly',           title: 'Quarterly Report',                 description: 'Three-month roll-up with comparative growth, CSR & zone performance.',                  group: 'Period',  defaultFormats: ['pdf','pptx'] },
  { type: 'half_yearly',         title: 'Half-Yearly Report',               description: '6-month dashboard: progress vs goals, mega projects, financial health.',                group: 'Period',  defaultFormats: ['pdf','pptx'] },
  { type: 'yearly',              title: 'Annual Report',                    description: 'Full Lions-year impact report with messages, finance, awards, gallery.',                 group: 'Period',  defaultFormats: ['pdf','pptx'] },
  { type: 'activity',            title: 'Activity Report',                  description: 'Detailed per-project performance with photos and category mix.',                        group: 'Activity', defaultFormats: ['pdf','pptx'] },
  { type: 'event_performance',   title: 'Event Performance Report',         description: 'RSVPs, attendance, confirmation rates per event.',                                     group: 'Activity', defaultFormats: ['pdf','pptx'] },
  { type: 'service_category',    title: 'Service Category Report',          description: 'Distribution across Lions service categories.',                                        group: 'Activity', defaultFormats: ['pdf','pptx'] },
  { type: 'medical_camp',        title: 'Medical Camp Report',              description: 'Screenings, surgeries, spectacles, blood units, doctor details.',                      group: 'Activity', defaultFormats: ['pdf','pptx'] },
  { type: 'beneficiary',         title: 'Beneficiary Analytics Report',     description: 'Demographics, geography, repeat reach, value delivered.',                              group: 'People',  defaultFormats: ['pdf','pptx'] },
  { type: 'volunteer',           title: 'Volunteer & Lion Hours Report',    description: 'Hours leaderboard, participation, monthly trend.',                                     group: 'People',  defaultFormats: ['pdf','pptx'] },
  { type: 'membership',          title: 'Membership Report',                description: 'Status, tenure, new joins.',                                                           group: 'People',  defaultFormats: ['pdf','pptx'] },
  { type: 'award_qualification', title: 'Award Qualification Report',       description: 'MJF / PMJF tracking, club excellence, presidential awards.',                          group: 'People',  defaultFormats: ['pdf','pptx'] },
  { type: 'club_growth',         title: 'Club Growth Report',               description: 'Net membership growth, role distribution, retention.',                                group: 'People',  defaultFormats: ['pdf','pptx'] },
  { type: 'financial',           title: 'Financial Report',                 description: 'Inflows, expenses, budget vs actuals, monthly cash flow.',                            group: 'Finance', defaultFormats: ['pdf','pptx'] },
  { type: 'donor',               title: 'Donor Report',                     description: 'Ledger, top donors, average gift, repeat retention.',                                 group: 'Finance', defaultFormats: ['pdf','pptx'] },
  { type: 'csr',                 title: 'CSR Partnership Report',           description: 'CSR partner-wise contribution, projects funded, beneficiaries.',                      group: 'Finance', defaultFormats: ['pdf','pptx'] },
  { type: 'district',            title: 'District Report',                  description: 'Club-by-club performance matrix within the district.',                                group: 'Org',     defaultFormats: ['pdf','pptx'] },
  { type: 'multi_district',      title: 'Multiple District Report',         description: 'Federation roll-up across districts.',                                                group: 'Org',     defaultFormats: ['pdf','pptx'] },
  { type: 'lions_international', title: 'Lions International Reporting',    description: 'MyLCI / MyLion-compatible Global Causes service report.',                            group: 'Org',     defaultFormats: ['pdf','pptx'] },
  { type: 'sdg_impact',          title: 'SDG Impact Report',                description: 'Alignment with the 17 UN Sustainable Development Goals.',                             group: 'Impact',  defaultFormats: ['pdf','pptx'] },
];

export async function buildReportDoc(req: ReportRequest): Promise<ReportDoc> {
  if (!req.period) throw new Error('period is required');
  const f: ReportFilters = req.filters ?? {};
  switch (req.type) {
    case 'monthly':
      return buildPeriodReport({ type: 'monthly',     title: `Monthly Report — ${req.period.label}` },     req.period, f);
    case 'quarterly':
      return buildPeriodReport({ type: 'quarterly',   title: `Quarterly Report — ${req.period.label}` },   req.period, f);
    case 'half_yearly':
      return buildPeriodReport({ type: 'half_yearly', title: `Half-Yearly Report — ${req.period.label}` }, req.period, f);
    case 'yearly':
      return buildAnnualReport(req.period, f);
    case 'activity':            return buildActivityReport(req.period, f);
    case 'event_performance':   return buildEventPerformanceReport(req.period, f);
    case 'service_category':    return buildServiceCategoryReport(req.period, f);
    case 'medical_camp':        return buildMedicalCampReport(req.period, f);
    case 'beneficiary':         return buildBeneficiaryReport(req.period, f);
    case 'volunteer':           return buildVolunteerReport(req.period, f);
    case 'membership':          return buildMembershipReport(req.period, f);
    case 'award_qualification': return buildAwardReport(req.period, f);
    case 'club_growth':         return buildClubGrowthReport(req.period, f);
    case 'financial':           return buildFinancialReport(req.period, f);
    case 'donor':               return buildDonorReport(req.period, f);
    case 'csr':                 return buildCSRReport(req.period, f);
    case 'district':            return buildDistrictReport(req.period, f);
    case 'multi_district':      return buildMultiDistrictReport(req.period, f);
    case 'lions_international': return buildLionsInternationalReport(req.period, f);
    case 'sdg_impact':          return buildSDGImpactReport(req.period, f);
  }
}

export async function renderReport(doc: ReportDoc, format: ReportFormat): Promise<RenderedReport> {
  if (format === 'pdf') return renderPdf(doc);
  return renderPptx(doc);
}

/**
 * Enrich a ReportDoc with AI-generated narrative sections (English /
 * Gujarati / bilingual). The original deterministic narrative is
 * preserved in `appendix` so reviewers can compare versions.
 */
export async function enrichWithAINarrative(
  doc: ReportDoc,
  language: NarrativeLanguage,
  tone?: NarrativeTone,
): Promise<ReportDoc> {
  const totals: Record<string, number | string> = {
    activities: doc.kpis.find((k) => /activit/i.test(k.label))?.value ?? '',
    beneficiaries: doc.kpis.find((k) => /beneficiar/i.test(k.label))?.value ?? '',
    hours: doc.kpis.find((k) => /hour/i.test(k.label))?.value ?? '',
    funds: doc.kpis.find((k) => /fund|donation|csr/i.test(k.label))?.value ?? '',
    ...doc.totals,
  };
  const highlights = (doc.tables.find((t) => /top.*project|flagship/i.test(t.title))?.rows ?? [])
    .slice(0, 3)
    .map((r) => ({
      title: String(r.title ?? r.project ?? ''),
      date: r.date as string | undefined,
      beneficiaries: Number(String(r.beneficiaries ?? '0').replace(/[^\d]/g, '')) || undefined,
    }));

  const ai = await generateNarrative({
    title: doc.title,
    periodLabel: doc.period.label,
    lionsYear: doc.period.lionsYear,
    totals,
    highlights,
    language,
    tone,
  });
  if (!ai) return doc;

  return {
    ...doc,
    narrative: ai.sections.map((s) => ({
      heading: language === 'en' ? s.heading : `${s.heading} · ${gujaratiHeading(s.heading)}`,
      body: s.body,
    })),
    appendix: [
      ...(doc.appendix ?? []),
      ...doc.narrative.map((s) => ({ heading: `${s.heading} (auto-draft)`, body: s.body })),
      ...(ai.executive_one_liner ? [{ heading: 'Executive One-Liner', body: ai.executive_one_liner }] : []),
      ...(ai.social_caption ? [{ heading: 'Social Caption', body: ai.social_caption }] : []),
    ],
  };
}

/** Convenience period parser used by API/UI. */
export function parsePeriod(
  scope: 'month' | 'quarter' | 'half' | 'year',
  year: number,
  index: number,
): ReportPeriod {
  if (scope === 'month')   return monthPeriod(year, Math.max(0, Math.min(11, index)));
  if (scope === 'quarter') return quarterPeriod(year, Math.max(1, Math.min(4, index)) as 1|2|3|4);
  if (scope === 'half')    return halfYearlyPeriod(year, (index === 2 ? 2 : 1) as 1|2);
  return lionsYearPeriod(year);
}

export type { ReportRequest, ReportDoc, RenderedReport, ReportFormat, ReportType } from './types';
