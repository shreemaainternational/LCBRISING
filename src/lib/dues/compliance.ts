/**
 * Compliance & analytics layer for the three-tier dues module.
 * Pure read-only aggregations — no AI required.
 */
import { createAdminClient } from '@/lib/supabase/server';

export type DuesTier = 'club' | 'district' | 'international';

export interface DuesKpis {
  collectedInr: number;
  outstandingInr: number;
  overdueInr: number;
  invoiceCount: number;
  paidCount: number;
  overdueCount: number;
  collectionPct: number;
}

export interface DuesTierBreakdown {
  tier: DuesTier;
  collectedInr: number;
  outstandingInr: number;
  overdueInr: number;
  invoiceCount: number;
}

export interface ClubComplianceRow {
  clubId: string;
  clubName: string;
  clubNumber: string | null;
  members: number;
  totalBilledInr: number;
  totalPaidInr: number;
  outstandingInr: number;
  overdueInvoices: number;
  collectionPct: number;
  complianceScore: number;       // 0–100
  status: 'compliant' | 'warn' | 'breach';
}

interface InvoiceRow {
  id: string;
  tier: DuesTier;
  amount: number | string;
  amount_paid: number | string;
  amount_inr: number | string | null;
  currency: string;
  status: string;
  due_date: string;
  club_id: string | null;
  member_id: string | null;
}

function toInr(inv: InvoiceRow): number {
  // Prefer amount_inr if the back-end stored an FX-converted amount.
  if (inv.amount_inr != null) return Number(inv.amount_inr);
  if (inv.currency === 'INR') return Number(inv.amount);
  return Number(inv.amount); // best-effort: treat as already-INR
}
function toInrPaid(inv: InvoiceRow): number {
  const ratio = Number(inv.amount) ? Number(inv.amount_paid) / Number(inv.amount) : 0;
  return Math.round(toInr(inv) * ratio * 100) / 100;
}

export async function getDuesKpis(): Promise<{ overall: DuesKpis; byTier: DuesTierBreakdown[] }> {
  const db = createAdminClient();
  const { data } = await db.from('dues_invoices')
    .select('id, tier, amount, amount_paid, amount_inr, currency, status, due_date, club_id, member_id');

  const rows = (data ?? []) as InvoiceRow[];
  const today = new Date().toISOString().slice(0, 10);

  const overall: DuesKpis = {
    collectedInr: 0, outstandingInr: 0, overdueInr: 0,
    invoiceCount: rows.length, paidCount: 0, overdueCount: 0,
    collectionPct: 0,
  };
  const tiers: Record<DuesTier, DuesTierBreakdown> = {
    club:          { tier: 'club',          collectedInr: 0, outstandingInr: 0, overdueInr: 0, invoiceCount: 0 },
    district:      { tier: 'district',      collectedInr: 0, outstandingInr: 0, overdueInr: 0, invoiceCount: 0 },
    international: { tier: 'international', collectedInr: 0, outstandingInr: 0, overdueInr: 0, invoiceCount: 0 },
  };

  for (const r of rows) {
    const billed = toInr(r);
    const paid   = toInrPaid(r);
    const outs   = Math.max(0, billed - paid);
    const tier = tiers[r.tier];
    if (!tier) continue;
    tier.invoiceCount++;
    tier.collectedInr   += paid;
    tier.outstandingInr += outs;
    overall.collectedInr   += paid;
    overall.outstandingInr += outs;
    if (r.status === 'paid') overall.paidCount++;
    if (r.status === 'overdue' || (r.due_date && r.due_date < today && outs > 0)) {
      overall.overdueInr  += outs;
      tier.overdueInr     += outs;
      overall.overdueCount++;
    }
  }

  const totalBilled = overall.collectedInr + overall.outstandingInr;
  overall.collectionPct = totalBilled ? Math.round((overall.collectedInr / totalBilled) * 100) : 0;

  return { overall, byTier: Object.values(tiers) };
}

export async function getClubCompliance(): Promise<ClubComplianceRow[]> {
  const db = createAdminClient();
  const [{ data: clubs }, { data: invoices }, { data: members }] = await Promise.all([
    db.from('clubs').select('id, name, club_number').is('deleted_at', null),
    db.from('dues_invoices').select('id, tier, amount, amount_paid, amount_inr, currency, status, due_date, club_id, member_id'),
    db.from('members').select('id, club_id').is('deleted_at', null),
  ]);

  const memberByClub = new Map<string, number>();
  for (const m of members ?? []) {
    if (m.club_id) memberByClub.set(m.club_id, (memberByClub.get(m.club_id) ?? 0) + 1);
  }

  // Group invoices by their "owning" club — for member-tier invoices that
  // means the member's club.
  const memberToClub = new Map<string, string>();
  for (const m of members ?? []) if (m.club_id) memberToClub.set(m.id, m.club_id);

  const byClub = new Map<string, { billed: number; paid: number; overdue: number; overdueCount: number }>();
  const today = new Date().toISOString().slice(0, 10);

  for (const inv of (invoices ?? []) as InvoiceRow[]) {
    const clubId = inv.club_id ?? (inv.member_id ? memberToClub.get(inv.member_id) : null);
    if (!clubId) continue;
    const billed = toInr(inv); const paid = toInrPaid(inv);
    const outs = Math.max(0, billed - paid);
    const isOverdue = inv.status === 'overdue' || (inv.due_date && inv.due_date < today && outs > 0);
    const cur = byClub.get(clubId) ?? { billed: 0, paid: 0, overdue: 0, overdueCount: 0 };
    cur.billed += billed; cur.paid += paid;
    if (isOverdue) { cur.overdue += outs; cur.overdueCount++; }
    byClub.set(clubId, cur);
  }

  return (clubs ?? []).map((c) => {
    const a = byClub.get(c.id) ?? { billed: 0, paid: 0, overdue: 0, overdueCount: 0 };
    const collectionPct = a.billed ? Math.round((a.paid / a.billed) * 100) : 100;
    // Compliance score = 60% collection % + 30% (1 − overdueShare) + 10% size bonus
    const overdueShare = a.billed ? a.overdue / a.billed : 0;
    const sizeBoost = Math.min(1, (memberByClub.get(c.id) ?? 0) / 25);
    const score = Math.round(collectionPct * 0.6 + (1 - overdueShare) * 100 * 0.3 + sizeBoost * 100 * 0.1);
    const status: 'compliant' | 'warn' | 'breach' = score >= 80 ? 'compliant' : score >= 50 ? 'warn' : 'breach';
    return {
      clubId: c.id, clubName: c.name, clubNumber: c.club_number,
      members: memberByClub.get(c.id) ?? 0,
      totalBilledInr: a.billed,
      totalPaidInr: a.paid,
      outstandingInr: Math.max(0, a.billed - a.paid),
      overdueInvoices: a.overdueCount,
      collectionPct,
      complianceScore: score,
      status,
    };
  }).sort((a, b) => a.complianceScore - b.complianceScore);
}

/** Ageing buckets for the outstanding-dues report. */
export interface AgeingBucket { label: string; amountInr: number; count: number }
export async function getDuesAgeing(): Promise<AgeingBucket[]> {
  const db = createAdminClient();
  const { data } = await db.from('dues_invoices')
    .select('amount, amount_paid, amount_inr, currency, status, due_date')
    .neq('status', 'paid')
    .neq('status', 'waived')
    .neq('status', 'cancelled');
  const buckets: Record<string, AgeingBucket> = {
    'Current':       { label: 'Current (not yet due)', amountInr: 0, count: 0 },
    '1–30':          { label: '1–30 days overdue',     amountInr: 0, count: 0 },
    '31–60':         { label: '31–60 days overdue',    amountInr: 0, count: 0 },
    '61–90':         { label: '61–90 days overdue',    amountInr: 0, count: 0 },
    '90+':           { label: '90+ days overdue',      amountInr: 0, count: 0 },
  };
  const today = Date.now();
  for (const r of (data ?? []) as InvoiceRow[]) {
    const billed = toInr(r); const paid = toInrPaid(r);
    const outs = Math.max(0, billed - paid);
    if (outs <= 0) continue;
    const days = (today - new Date(r.due_date).getTime()) / 86400_000;
    let key = 'Current';
    if (days > 90)      key = '90+';
    else if (days > 60) key = '61–90';
    else if (days > 30) key = '31–60';
    else if (days > 0)  key = '1–30';
    buckets[key].amountInr += outs;
    buckets[key].count++;
  }
  return Object.values(buckets);
}
