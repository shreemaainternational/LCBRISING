/**
 * End-to-end smoke test for the reporting engine.
 * Bypasses the database by stubbing Supabase responses, then renders
 * a sample of report types in both PDF and PPTX to /tmp/.
 *
 *   npx tsx scripts/smoke-reports.ts
 */
import { writeFileSync } from 'fs';
import { renderPdf } from '../src/lib/reports/render-pdf';
import { renderPptx } from '../src/lib/reports/render-pptx';
import type { ReportDoc } from '../src/lib/reports/types';
import { PALETTE } from '../src/lib/reports/brand';

const period = {
  start: new Date('2026-04-01'),
  end: new Date('2026-04-30'),
  label: 'April 2026',
  lionsYear: '2025-26',
};

const doc: ReportDoc = {
  type: 'monthly',
  title: 'Monthly Report — April 2026',
  subtitle: 'Service · Impact · Growth',
  period,
  filters: {},
  metadata: {
    generatedAt: new Date().toISOString(),
    clubName: 'Lions Club of Baroda Rising Star',
    districtCode: '3232-F1',
  },
  kpis: [
    { label: 'Activities',          value: '24',     delta: '+12.5%', color: PALETTE[0] },
    { label: 'Beneficiaries',       value: '3,420',  delta: '+24.0%', color: PALETTE[1] },
    { label: 'Lion Members Engaged', value: '86',    color: PALETTE[2] },
    { label: 'Leo Members',         value: '42',     color: PALETTE[3] },
    { label: 'Volunteer Hours',     value: '512',    color: PALETTE[4] },
    { label: 'Funds Raised',        value: '₹4.2L',  delta: '+18.2%', color: PALETTE[5] },
    { label: 'CSR Sponsorship',     value: '₹1.8L',  color: PALETTE[6] },
    { label: 'Expenses',            value: '₹2.1L',  color: PALETTE[7] },
  ],
  charts: [
    { kind: 'line',           title: 'Activity Cadence',           labels: ['Jan','Feb','Mar','Apr'], series: [{ name: 'Activities', data: [12,18,20,24], color: PALETTE[0] }] },
    { kind: 'area',           title: 'Beneficiaries Reached',      labels: ['Jan','Feb','Mar','Apr'], series: [{ name: 'People',     data: [1800,2400,2750,3420], color: PALETTE[1] }] },
    { kind: 'bar',            title: 'Volunteer Hours',            labels: ['Jan','Feb','Mar','Apr'], series: [{ name: 'Hours',      data: [310,388,440,512], color: PALETTE[4] }] },
    { kind: 'donut',          title: 'Activities by Category',     labels: ['Vision','Hunger','Education','Healthcare','Environment'], series: [{ name: 'Count', data: [6,5,5,4,4] }] },
    { kind: 'pie',            title: 'Funding Mix',                labels: ['Donations','CSR','Dues','Project'], series: [{ name: 'INR', data: [180000,180000,40000,20000] }] },
    { kind: 'horizontal_bar', title: 'Top Projects (Beneficiaries)', labels: ['Eye Camp #4','Diabetes Drive','Food Distribution','Tree Plant.','School Kit'], series: [{ name: 'People', data: [820,640,520,400,260] }] },
    { kind: 'stacked_bar',    title: 'Budget vs Expense',          labels: ['Vision','Hunger','Education','Healthcare'], series: [
      { name: 'Budget',  color: PALETTE[0], data: [60000,40000,35000,55000] },
      { name: 'Expense', color: PALETTE[3], data: [52000,38000,30000,48000] },
    ] },
    { kind: 'bar', title: 'SDG Coverage', labels: ['SDG 1','SDG 2','SDG 3','SDG 4','SDG 13','SDG 17'], series: [{ name: 'Activities', data: [3,5,8,4,3,2], color: PALETTE[2] }] },
  ],
  tables: [
    {
      title: 'Top Service Projects',
      columns: [
        { key: 'date', label: 'Date' },
        { key: 'title', label: 'Project' },
        { key: 'category', label: 'Category' },
        { key: 'beneficiaries', label: 'Benef.', align: 'right' },
        { key: 'funds', label: 'Funds', align: 'right' },
      ],
      rows: [
        { date: '04 Apr', title: 'Mega Eye Camp', category: 'Vision', beneficiaries: '820', funds: '₹1,20,000' },
        { date: '11 Apr', title: 'Diabetes Awareness Drive', category: 'Diabetes', beneficiaries: '640', funds: '₹40,000' },
        { date: '18 Apr', title: 'Food Distribution', category: 'Hunger', beneficiaries: '520', funds: '₹65,000' },
        { date: '25 Apr', title: 'Tree Plantation', category: 'Environment', beneficiaries: '400', funds: '₹25,000' },
      ],
      totals: { date: '', title: 'TOTAL', category: '', beneficiaries: '2,380', funds: '₹2,50,000' },
    },
  ],
  narrative: [
    {
      heading: 'Executive Summary',
      body:
        'During April 2026, Lions Club of Baroda Rising Star delivered 24 service projects, directly impacting 3,420 ' +
        'beneficiaries. Members contributed 512 volunteer hours across vision, healthcare, hunger relief, education and ' +
        'environmental causes. The club mobilised ₹4.2 lakh in funds, including ₹1.8 lakh from CSR partnerships, ' +
        'demonstrating sustained engagement with the community and Lions International’s global causes.',
    },
    { heading: 'Outlook', body: 'Activity volume changed by +12.5% versus the previous month; donations changed by +18.2%.' },
  ],
  totals: { activities: 24, beneficiaries: 3420, funds: 420000 },
};

(async () => {
  const pdf = await renderPdf(doc);
  writeFileSync('/tmp/smoke-report.pdf', pdf.buffer);
  console.log(`PDF: /tmp/smoke-report.pdf  (${pdf.pageCount} pages, ${pdf.buffer.length} bytes)`);

  const pptx = await renderPptx(doc);
  writeFileSync('/tmp/smoke-report.pptx', pptx.buffer);
  console.log(`PPTX: /tmp/smoke-report.pptx (${pptx.buffer.length} bytes)`);
})();
