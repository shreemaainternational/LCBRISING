/** Activity, Event Performance, Service Category, Medical Camp. */
import type { ReportDoc, ReportFilters, ReportPeriod } from '../types';
import {
  fetchActivities, fetchEvents, fetchMedicalCamps, fetchServiceCategories, sumBy,
} from '../aggregations';
import { PALETTE } from '../brand';
import { emptyDoc, fmtINR, fmtInt, fmtShort } from './common';

export async function buildActivityReport(p: ReportPeriod, f: ReportFilters): Promise<ReportDoc> {
  const doc = emptyDoc('activity', 'Activity Performance Report', p, f);
  const acts = await fetchActivities(p, f);

  const beneficiaries = sumBy(acts, (a) => a.beneficiaries ?? 0);
  const hours = sumBy(acts, (a) => Number(a.service_hours ?? 0));
  const funds = sumBy(acts, (a) => Number(a.amount_raised ?? 0));
  const lions = sumBy(acts, (a) => a.lion_members_count ?? 0);

  doc.kpis = [
    { label: 'Activities',         value: fmtInt(acts.length),   color: PALETTE[0] },
    { label: 'Beneficiaries',      value: fmtInt(beneficiaries), color: PALETTE[1] },
    { label: 'Service Hours',      value: fmtInt(hours),         color: PALETTE[2] },
    { label: 'Funds Raised',       value: fmtShort(funds),       color: PALETTE[3] },
    { label: 'Lions Participated', value: fmtInt(lions),         color: PALETTE[4] },
    { label: 'Avg Beneficiaries',  value: fmtInt(acts.length ? beneficiaries / acts.length : 0), color: PALETTE[5] },
  ];

  const byCat = groupCount(acts.map((a) => (a.category ?? 'other') as string));
  doc.charts.push({
    kind: 'pie',
    title: 'Category Distribution',
    labels: [...byCat.keys()],
    series: [{ name: 'Activities', data: [...byCat.values()] }],
  });

  const byMonth = groupCount(acts.map((a) => new Date(a.date).toLocaleString('en-IN', { month: 'short' })));
  doc.charts.push({
    kind: 'bar',
    title: 'Activities per Month',
    labels: [...byMonth.keys()],
    series: [{ name: 'Activities', data: [...byMonth.values()], color: PALETTE[0] }],
  });

  doc.tables.push({
    title: 'All Activities',
    columns: [
      { key: 'date', label: 'Date' },
      { key: 'title', label: 'Project' },
      { key: 'category', label: 'Category' },
      { key: 'beneficiaries', label: 'Benef.', align: 'right' },
      { key: 'hours', label: 'Hrs', align: 'right' },
      { key: 'funds', label: 'Funds', align: 'right' },
    ],
    rows: acts.map((a) => ({
      date: new Date(a.date).toLocaleDateString('en-IN'),
      title: a.title,
      category: a.category ?? '—',
      beneficiaries: fmtInt(a.beneficiaries ?? 0),
      hours: fmtInt(a.service_hours ?? 0),
      funds: fmtINR(Number(a.amount_raised ?? 0)),
    })),
    totals: { date: '', title: 'TOTAL', category: '', beneficiaries: fmtInt(beneficiaries), hours: fmtInt(hours), funds: fmtINR(funds) },
  });

  doc.narrative.push({
    heading: 'Activity Overview',
    body:
      `${acts.length} service activities were executed in ${p.label}. Total reach: ${fmtInt(beneficiaries)} beneficiaries ` +
      `and ${fmtInt(hours)} service hours, raising ${fmtINR(funds)} in project funds.`,
  });
  doc.totals = { activities: acts.length, beneficiaries, hours, funds };
  return doc;
}

export async function buildEventPerformanceReport(p: ReportPeriod, f: ReportFilters): Promise<ReportDoc> {
  const doc = emptyDoc('event_performance', 'Event Performance Report', p, f);
  const events = await fetchEvents(p);

  // RSVP counts per event
  const ids = events.map((e) => e.id);
  const rsvpMap = new Map<string, { yes: number; no: number; maybe: number; total: number }>();
  if (ids.length) {
    const { data } = await (await import('../aggregations')).db()
      .from('event_rsvps').select('event_id,status').in('event_id', ids);
    for (const r of data ?? []) {
      const m = rsvpMap.get(r.event_id) ?? { yes: 0, no: 0, maybe: 0, total: 0 };
      m.total++;
      if (r.status === 'yes') m.yes++;
      else if (r.status === 'no') m.no++;
      else m.maybe++;
      rsvpMap.set(r.event_id, m);
    }
  }

  const totalRsvps = [...rsvpMap.values()].reduce((a, b) => a + b.total, 0);
  const totalYes = [...rsvpMap.values()].reduce((a, b) => a + b.yes, 0);

  doc.kpis = [
    { label: 'Events Held',       value: fmtInt(events.length), color: PALETTE[0] },
    { label: 'Public Events',     value: fmtInt(events.filter((e) => e.is_public).length), color: PALETTE[1] },
    { label: 'Total RSVPs',       value: fmtInt(totalRsvps),    color: PALETTE[2] },
    { label: 'Confirmed (Yes)',   value: fmtInt(totalYes),      color: PALETTE[3] },
    { label: 'Avg RSVPs/Event',   value: fmtInt(events.length ? totalRsvps / events.length : 0), color: PALETTE[4] },
    { label: 'Confirmation Rate', value: totalRsvps ? `${Math.round((totalYes / totalRsvps) * 100)}%` : '—', color: PALETTE[5] },
  ];

  doc.charts.push({
    kind: 'horizontal_bar',
    title: 'RSVPs by Event',
    labels: events.slice(0, 10).map((e) => e.title),
    series: [{ name: 'RSVPs', data: events.slice(0, 10).map((e) => rsvpMap.get(e.id)?.total ?? 0) }],
  });
  doc.charts.push({
    kind: 'stacked_bar',
    title: 'RSVP Status Breakdown',
    labels: events.slice(0, 8).map((e) => e.title.slice(0, 20)),
    series: [
      { name: 'Yes',   color: PALETTE[2], data: events.slice(0, 8).map((e) => rsvpMap.get(e.id)?.yes ?? 0) },
      { name: 'Maybe', color: PALETTE[6], data: events.slice(0, 8).map((e) => rsvpMap.get(e.id)?.maybe ?? 0) },
      { name: 'No',    color: PALETTE[3], data: events.slice(0, 8).map((e) => rsvpMap.get(e.id)?.no ?? 0) },
    ],
  });

  doc.tables.push({
    title: 'Events Schedule',
    columns: [
      { key: 'date', label: 'Date' },
      { key: 'title', label: 'Event' },
      { key: 'location', label: 'Location' },
      { key: 'capacity', label: 'Capacity', align: 'right' },
      { key: 'rsvps', label: 'RSVPs', align: 'right' },
      { key: 'yes', label: 'Confirmed', align: 'right' },
    ],
    rows: events.map((e) => ({
      date: new Date(e.date).toLocaleDateString('en-IN'),
      title: e.title,
      location: e.location ?? '—',
      capacity: e.capacity ?? '—',
      rsvps: rsvpMap.get(e.id)?.total ?? 0,
      yes: rsvpMap.get(e.id)?.yes ?? 0,
    })),
  });

  doc.narrative.push({
    heading: 'Event Performance',
    body:
      `${events.length} events were hosted in ${p.label}, generating ${fmtInt(totalRsvps)} RSVPs and ${fmtInt(totalYes)} ` +
      `confirmed participations. Confirmation rate: ${totalRsvps ? Math.round((totalYes / totalRsvps) * 100) : 0}%.`,
  });
  return doc;
}

export async function buildServiceCategoryReport(p: ReportPeriod, f: ReportFilters): Promise<ReportDoc> {
  const doc = emptyDoc('service_category', 'Service Category Report', p, f);
  const [acts, cats] = await Promise.all([fetchActivities(p, f), fetchServiceCategories()]);

  type Row = { code: string; name: string; color: string; count: number; beneficiaries: number; hours: number; funds: number };
  const rowsMap = new Map<string, Row>();
  for (const c of cats) rowsMap.set(c.code, { code: c.code, name: c.name, color: c.color ?? '#64748B', count: 0, beneficiaries: 0, hours: 0, funds: 0 });
  for (const a of acts) {
    const key = (a.category ?? 'other').toString();
    const row = rowsMap.get(key) ?? { code: key, name: key, color: '#64748B', count: 0, beneficiaries: 0, hours: 0, funds: 0 };
    row.count++;
    row.beneficiaries += a.beneficiaries ?? 0;
    row.hours += Number(a.service_hours ?? 0);
    row.funds += Number(a.amount_raised ?? 0);
    rowsMap.set(key, row);
  }
  const rows = [...rowsMap.values()].sort((a, b) => b.count - a.count);
  const totBenef = rows.reduce((a, b) => a + b.beneficiaries, 0);

  doc.kpis = [
    { label: 'Categories Active', value: fmtInt(rows.filter((r) => r.count > 0).length), color: PALETTE[0] },
    { label: 'Activities',        value: fmtInt(acts.length),                            color: PALETTE[1] },
    { label: 'Beneficiaries',     value: fmtInt(totBenef),                               color: PALETTE[2] },
    { label: 'Service Hours',     value: fmtInt(rows.reduce((a, b) => a + b.hours, 0)),  color: PALETTE[3] },
    { label: 'Funds',             value: fmtShort(rows.reduce((a, b) => a + b.funds, 0)), color: PALETTE[4] },
    { label: 'Top Category',      value: rows[0]?.name ?? '—',                           color: PALETTE[5] },
  ];

  doc.charts.push({
    kind: 'donut',
    title: 'Activity Mix',
    labels: rows.filter((r) => r.count > 0).map((r) => r.name),
    series: [{ name: 'Activities', data: rows.filter((r) => r.count > 0).map((r) => r.count) }],
  });
  doc.charts.push({
    kind: 'horizontal_bar',
    title: 'Beneficiaries by Category',
    labels: rows.filter((r) => r.beneficiaries > 0).map((r) => r.name),
    series: [{ name: 'Beneficiaries', data: rows.filter((r) => r.beneficiaries > 0).map((r) => r.beneficiaries) }],
  });

  doc.tables.push({
    title: 'Category Performance',
    columns: [
      { key: 'name', label: 'Category' },
      { key: 'count', label: 'Activities', align: 'right' },
      { key: 'beneficiaries', label: 'Beneficiaries', align: 'right' },
      { key: 'hours', label: 'Hours', align: 'right' },
      { key: 'funds', label: 'Funds', align: 'right' },
    ],
    rows: rows.filter((r) => r.count > 0).map((r) => ({
      name: r.name, count: r.count,
      beneficiaries: fmtInt(r.beneficiaries),
      hours: fmtInt(r.hours), funds: fmtINR(r.funds),
    })),
  });

  doc.narrative.push({
    heading: 'Lions Service Framework',
    body:
      `Services were delivered across ${rows.filter((r) => r.count > 0).length} Lions International service categories. ` +
      `${rows[0]?.name ?? '—'} was the highest-volume category. The portfolio aligns with the Global Causes — Vision, ` +
      `Hunger, Environment, Diabetes, Childhood Cancer and Humanitarian.`,
  });
  return doc;
}

export async function buildMedicalCampReport(p: ReportPeriod, f: ReportFilters): Promise<ReportDoc> {
  const doc = emptyDoc('medical_camp', 'Medical Camp Report', p, f);
  const camps = await fetchMedicalCamps(p);

  const total = (k: string) => sumBy(camps, (c: Record<string, unknown>) => Number(c[k] ?? 0));
  const screened = total('patients_screened');
  const consult = total('consultations');
  const surg = total('surgeries');
  const spectacles = total('spectacles_distributed');
  const blood = total('blood_units_collected');
  const medsVal = total('medicines_distributed_value');
  const referrals = total('referrals');

  doc.kpis = [
    { label: 'Camps',                 value: fmtInt(camps.length), color: PALETTE[0] },
    { label: 'Patients Screened',     value: fmtInt(screened),     color: PALETTE[1] },
    { label: 'Consultations',         value: fmtInt(consult),      color: PALETTE[2] },
    { label: 'Surgeries Sponsored',   value: fmtInt(surg),         color: PALETTE[3] },
    { label: 'Spectacles Distributed',value: fmtInt(spectacles),   color: PALETTE[4] },
    { label: 'Blood Units',           value: fmtInt(blood),        color: PALETTE[5] },
    { label: 'Medicines Value',       value: fmtShort(medsVal),    color: PALETTE[6] },
    { label: 'Referrals',             value: fmtInt(referrals),    color: PALETTE[7] },
  ];

  doc.charts.push({
    kind: 'bar',
    title: 'Outputs by Camp',
    labels: camps.slice(0, 10).map((c) => (c.activities as { title?: string })?.title ?? 'Camp'),
    series: [
      { name: 'Screened',     color: PALETTE[1], data: camps.slice(0, 10).map((c) => Number(c.patients_screened ?? 0)) },
      { name: 'Consultations',color: PALETTE[2], data: camps.slice(0, 10).map((c) => Number(c.consultations ?? 0)) },
      { name: 'Surgeries',    color: PALETTE[3], data: camps.slice(0, 10).map((c) => Number(c.surgeries ?? 0)) },
    ],
  });
  doc.charts.push({
    kind: 'donut',
    title: 'Service Output Mix',
    labels: ['Screened', 'Consultations', 'Surgeries', 'Spectacles', 'Blood Units', 'Referrals'],
    series: [{ name: 'Units', data: [screened, consult, surg, spectacles, blood, referrals] }],
  });

  doc.tables.push({
    title: 'Camp Ledger',
    columns: [
      { key: 'date', label: 'Date' },
      { key: 'title', label: 'Camp' },
      { key: 'location', label: 'Location' },
      { key: 'screened', label: 'Screened', align: 'right' },
      { key: 'surgeries', label: 'Surgeries', align: 'right' },
      { key: 'spectacles', label: 'Spectacles', align: 'right' },
      { key: 'blood', label: 'Blood Units', align: 'right' },
    ],
    rows: camps.map((c) => {
      const a = (c.activities as { title?: string; date?: string; location?: string }) ?? {};
      return {
        date: a.date ? new Date(a.date).toLocaleDateString('en-IN') : '—',
        title: a.title ?? '—',
        location: a.location ?? '—',
        screened: c.patients_screened ?? 0,
        surgeries: c.surgeries ?? 0,
        spectacles: c.spectacles_distributed ?? 0,
        blood: c.blood_units_collected ?? 0,
      };
    }),
    totals: { date: '', title: 'TOTAL', location: '', screened: fmtInt(screened), surgeries: fmtInt(surg), spectacles: fmtInt(spectacles), blood: fmtInt(blood) },
  });

  doc.narrative.push({
    heading: 'Health Impact',
    body:
      `${camps.length} medical / blood camps were conducted in ${p.label}. ${fmtInt(screened)} patients were screened, ` +
      `${fmtInt(consult)} consultations completed, ${fmtInt(surg)} surgeries sponsored, ${fmtInt(spectacles)} spectacles ` +
      `distributed and ${fmtInt(blood)} units of blood collected. Medicines worth ${fmtINR(medsVal)} reached the community.`,
  });
  return doc;
}

function groupCount<K extends string>(keys: K[]): Map<K, number> {
  const m = new Map<K, number>();
  for (const k of keys) m.set(k, (m.get(k) ?? 0) + 1);
  return m;
}
