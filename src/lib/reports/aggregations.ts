import type { ReportFilters, ReportPeriod } from './types';
import { createAdminClient } from '@/lib/supabase/server';

type SB = ReturnType<typeof createAdminClient>;

export function db(): SB {
  // For reporting we always use the service-role client — it bypasses
  // RLS so the cron path and the admin route share the same data.
  return createAdminClient();
}

const isoStart = (p: ReportPeriod) => p.start.toISOString();
const isoEnd = (p: ReportPeriod) => p.end.toISOString();

/** Activities raw. */
export async function fetchActivities(p: ReportPeriod, f: ReportFilters = {}) {
  let q = db().from('activities').select('*')
    .gte('date', p.start.toISOString().slice(0, 10))
    .lte('date', p.end.toISOString().slice(0, 10));
  if (f.clubId) q = q.eq('club_id', f.clubId);
  if (f.category) q = q.eq('category', f.category);
  if (f.csrPartnerId) q = q.eq('csr_partner_id', f.csrPartnerId);
  if (f.eventId) q = q.eq('event_id', f.eventId);
  const { data } = await q.order('date', { ascending: false });
  return data ?? [];
}

/** Donations raw. */
export async function fetchDonations(p: ReportPeriod, f: ReportFilters = {}) {
  let q = db().from('donations').select('*')
    .gte('created_at', isoStart(p)).lte('created_at', isoEnd(p));
  if (f.campaign) q = q.eq('campaign', f.campaign);
  const { data } = await q.order('created_at', { ascending: false });
  return data ?? [];
}

/** Dues paid in period. */
export async function fetchDues(p: ReportPeriod) {
  const { data } = await db().from('dues').select('*')
    .gte('created_at', isoStart(p)).lte('created_at', isoEnd(p));
  return data ?? [];
}

export async function fetchPayments(p: ReportPeriod) {
  const { data } = await db().from('payments').select('*')
    .gte('created_at', isoStart(p)).lte('created_at', isoEnd(p));
  return data ?? [];
}

export async function fetchMembersSnapshot() {
  const { data } = await db().from('members').select('*').is('deleted_at', null);
  return data ?? [];
}

export async function fetchEvents(p: ReportPeriod) {
  const { data } = await db().from('events').select('*')
    .gte('date', isoStart(p)).lte('date', isoEnd(p));
  return data ?? [];
}

export async function fetchVolunteerLogs(p: ReportPeriod, f: ReportFilters = {}) {
  let q = db().from('volunteer_logs').select('*, members(name, email)')
    .gte('logged_for_date', p.start.toISOString().slice(0, 10))
    .lte('logged_for_date', p.end.toISOString().slice(0, 10));
  if (f.memberId) q = q.eq('member_id', f.memberId);
  const { data } = await q;
  return (data ?? []) as Array<{
    id: string; member_id: string; activity_id: string | null;
    hours: number; role: string | null; logged_for_date: string;
    members?: { name: string; email: string };
  }>;
}

export async function fetchBeneficiaries(p?: ReportPeriod) {
  let q = db().from('beneficiaries').select('*').is('deleted_at', null);
  if (p) q = q.gte('first_service_date', p.start.toISOString().slice(0, 10))
              .lte('first_service_date', p.end.toISOString().slice(0, 10));
  const { data } = await q;
  return data ?? [];
}

export async function fetchBeneficiaryServices(p: ReportPeriod) {
  const { data } = await db().from('beneficiary_services').select('*')
    .gte('service_date', p.start.toISOString().slice(0, 10))
    .lte('service_date', p.end.toISOString().slice(0, 10));
  return data ?? [];
}

export async function fetchCSRPartners() {
  const { data } = await db().from('csr_partners').select('*');
  return data ?? [];
}

export async function fetchServiceCategories() {
  const { data } = await db().from('service_categories').select('*').order('display_order');
  return data ?? [];
}

export async function fetchAwards(year?: string) {
  let q = db().from('award_qualifications').select('*, members(name), clubs(name)');
  if (year) q = q.eq('lions_year', year);
  const { data } = await q;
  return data ?? [];
}

export async function fetchMedicalCamps(p: ReportPeriod) {
  const { data } = await db().from('medical_camp_records')
    .select('*, activities!inner(id,title,date,location)')
    .gte('activities.date', p.start.toISOString().slice(0, 10))
    .lte('activities.date', p.end.toISOString().slice(0, 10));
  return data ?? [];
}

export async function fetchClubs() {
  const { data } = await db().from('clubs').select('*');
  return data ?? [];
}

export async function fetchDistricts() {
  const { data } = await db().from('districts').select('*');
  return data ?? [];
}

/* ------------ helpers used by report builders ------------ */

export function sumBy<T>(rows: T[], fn: (r: T) => number): number {
  return rows.reduce((a, r) => a + (Number(fn(r)) || 0), 0);
}

export function groupBy<T, K extends string | number>(rows: T[], fn: (r: T) => K): Map<K, T[]> {
  const m = new Map<K, T[]>();
  for (const r of rows) {
    const k = fn(r);
    const arr = m.get(k); if (arr) arr.push(r); else m.set(k, [r]);
  }
  return m;
}

export function topN<T>(rows: T[], n: number, score: (r: T) => number): T[] {
  return [...rows].sort((a, b) => score(b) - score(a)).slice(0, n);
}
