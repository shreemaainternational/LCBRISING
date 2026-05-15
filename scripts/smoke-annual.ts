/**
 * Smoke test for the Annual Report builder.
 * Bypasses Supabase by stubbing the aggregations module, then renders
 * a sample annual report to /tmp/ in both PDF and PPTX.
 *
 *   npx tsx scripts/smoke-annual.ts
 */
import { writeFileSync } from 'fs';
import { renderPdf } from '../src/lib/reports/render-pdf';
import { renderPptx } from '../src/lib/reports/render-pptx';
import type { ReportDoc } from '../src/lib/reports/types';
import { PALETTE } from '../src/lib/reports/brand';

const period = {
  start: new Date('2025-07-01'),
  end: new Date('2026-06-30'),
  label: 'Lions Year 2025-26',
  lionsYear: '2025-26',
};

const doc: ReportDoc = {
  type: 'yearly',
  title: 'Annual Report — Lions Year 2025-26',
  subtitle: 'A year of service. A year of impact.',
  period,
  filters: {},
  metadata: {
    generatedAt: new Date().toISOString(),
    clubName: 'Lions Club of Baroda Rising Star',
    districtCode: '3232-F1',
  },
  kpis: [
    { label: 'Activities',          value: '187',     delta: '+22%', color: PALETTE[0] },
    { label: 'Beneficiaries',       value: '42,800',  delta: '+31%', color: PALETTE[1] },
    { label: 'Volunteer Hours',     value: '8,640',   color: PALETTE[4] },
    { label: 'Funds Raised',        value: '₹52L',    delta: '+18%', color: PALETTE[5] },
    { label: 'CSR Sponsorship',     value: '₹18L',    color: PALETTE[6] },
    { label: 'Active Members',      value: '124',     color: PALETTE[2] },
    { label: 'Mega Projects',       value: '12',      color: PALETTE[3] },
    { label: 'Awards Earned',       value: '8',       color: PALETTE[7] },
  ],
  charts: [
    { kind: 'area', title: 'Monthly Beneficiaries',
      labels: ['Jul','Aug','Sep','Oct','Nov','Dec','Jan','Feb','Mar','Apr','May','Jun'],
      series: [{ name: 'People', data: [2800,3400,3100,3800,4200,3000,3600,3900,4400,4100,3800,3700], color: PALETTE[1] }] },
    { kind: 'bar', title: 'Activities by Quarter',
      labels: ['Q1','Q2','Q3','Q4'],
      series: [{ name: 'Activities', data: [42,48,52,45], color: PALETTE[0] }] },
    { kind: 'donut', title: 'Service Portfolio',
      labels: ['Vision','Hunger','Education','Healthcare','Environment','Other'],
      series: [{ name: 'Activities', data: [42,28,32,38,24,23] }] },
    { kind: 'pie', title: 'Funding Sources',
      labels: ['Donations','CSR','Dues','Direct'],
      series: [{ name: 'INR', data: [2000000, 1800000, 600000, 800000] }] },
  ],
  tables: [
    {
      title: 'Mega Projects of the Year',
      columns: [
        { key: 'title', label: 'Project' },
        { key: 'category', label: 'Category' },
        { key: 'benef', label: 'People', align: 'right' },
        { key: 'funds', label: 'Funds', align: 'right' },
      ],
      rows: [
        { title: 'Mega Eye Camp at SSG Hospital', category: 'Vision', benef: '4,200', funds: '₹6,80,000' },
        { title: 'Mid-day Meal — 50 Schools', category: 'Hunger', benef: '12,000', funds: '₹4,50,000' },
        { title: 'Cataract Sponsorship Drive', category: 'Vision', benef: '320', funds: '₹3,20,000' },
        { title: 'Tree Plantation 10,000 Saplings', category: 'Environment', benef: '8,500', funds: '₹2,10,000' },
      ],
      totals: { title: 'TOTAL', category: '', benef: '25,020', funds: '₹16,60,000' },
    },
    {
      title: 'Top Donors — Roll of Honour',
      columns: [
        { key: 'rank', label: '#', align: 'right' },
        { key: 'name', label: 'Donor' },
        { key: 'amount', label: 'Total', align: 'right' },
      ],
      rows: [
        { rank: 1, name: 'Ratnam Industries Pvt Ltd', amount: '₹3,00,000' },
        { rank: 2, name: 'Bharat Energy Foundation', amount: '₹2,50,000' },
        { rank: 3, name: 'Lions of Baroda Alumni Trust', amount: '₹1,80,000' },
        { rank: 4, name: 'Anonymous Donor', amount: '₹1,00,000' },
      ],
    },
  ],
  narrative: [
    {
      heading: "President's Message",
      body:
        'Dear fellow Lions, Leos and friends of the Club,\n\nLions Year 2025-26 has been a remarkable chapter ' +
        'in the story of Lions Club of Baroda Rising Star. Together we delivered 187 service projects, ' +
        'touched 42,800 lives and contributed 8,640 hours of voluntary service to our community...\n\n' +
        'With warm regards,\nLion President\nPresident, Lions Club of Baroda Rising Star',
    },
    {
      heading: "Secretary's Report",
      body:
        "It gives me great satisfaction to present the Secretary's annual report for Lions Year 2025-26. " +
        'Over the year, the Club organized 187 service activities and 24 formal events...\n\n' +
        'Respectfully submitted,\nLion Secretary',
    },
    {
      heading: "Treasurer's Report",
      body:
        'For Lions Year 2025-26, the Club mobilised a total of ₹52,00,000 across all sources: ₹20,00,000 ' +
        'in donations from 86 contributors, ₹18,00,000 from CSR partnerships, and ₹14,00,000 from direct project receipts...\n\n' +
        'Respectfully,\nLion Treasurer',
    },
    {
      heading: 'Executive Summary',
      body:
        'During Lions Year 2025-26, Lions Club of Baroda Rising Star delivered 187 service projects, ' +
        'directly impacting 42,800 beneficiaries.',
    },
  ],
  appendix: [
    {
      heading: 'Future Roadmap',
      body: 'Building on the achievements of 2025-26, the roadmap for next year centers on five priorities...',
    },
    {
      heading: 'Acknowledgements',
      body: 'The Club gratefully acknowledges the support of Lions International, District 3232-F1...',
    },
  ],
  totals: {
    activities: 187, beneficiaries: 42800, hours: 8640,
    funds_raised: 5200000, donations: 2000000, csr: 1800000,
  },
};

(async () => {
  const pdf = await renderPdf(doc);
  writeFileSync('/tmp/smoke-annual.pdf', pdf.buffer);
  console.log(`PDF: /tmp/smoke-annual.pdf  (${pdf.pageCount} pages, ${pdf.buffer.length} bytes)`);

  const pptx = await renderPptx(doc);
  writeFileSync('/tmp/smoke-annual.pptx', pptx.buffer);
  console.log(`PPTX: /tmp/smoke-annual.pptx (${pptx.buffer.length} bytes)`);
})();
