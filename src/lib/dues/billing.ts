/**
 * Auto bill-cycle generator for the three-tier dues module.
 *
 *   • Club tier        — one invoice per active member per active club rate card
 *   • District tier    — one invoice per club, scaled by member count where the
 *                        rate card is per-capita
 *   • International   — one invoice per club, USD amounts with optional FX
 *
 * Each call is idempotent against (rate_card, debtor, period_label) — if an
 * invoice already exists for the same key we skip it.
 */
import { createAdminClient } from '@/lib/supabase/server';

export type DuesTier = 'club' | 'district' | 'international';

export interface BillCycleOptions {
  tier: DuesTier;
  /** Limit run to a specific rate-card code (e.g. CLUB_MONTHLY_DUES). */
  rateCardCode?: string;
  /** Limit run to a specific district / club / member id. */
  districtId?: string;
  clubId?: string;
  /** Override the period label / dates. Defaults to current cadence period. */
  periodLabel?: string;
  periodStart?: string;
  periodEnd?: string;
  dueDate?: string;
  /** Force-skip the idempotency check and create duplicates. */
  force?: boolean;
  /** Optional USD→INR exchange rate for the international tier. */
  fxRate?: number;
}

export interface BillCycleReport {
  tier: DuesTier;
  rateCardsRun: number;
  invoicesCreated: number;
  invoicesSkipped: number;
  errors: { rate_card: string; debtor: string; reason: string }[];
  totalAmount: number;
  totalAmountINR: number;
}

interface RateCard {
  id: string;
  tier: DuesTier;
  code: string;
  name: string;
  cadence: 'monthly' | 'quarterly' | 'half_yearly' | 'annual' | 'one_time';
  amount: number;
  currency: string;
  late_fee_pct: number | null;
  grace_days: number | null;
  applies_to_club_id: string | null;
  applies_to_district_id: string | null;
}

/** Compute period label + start/end/due based on the cadence + today. */
function computePeriod(cadence: RateCard['cadence']): { label: string; start: string; end: string; due: string } {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  let start: Date; let end: Date; let label: string;
  switch (cadence) {
    case 'monthly':
      start = new Date(y, m, 1);
      end = new Date(y, m + 1, 0);
      label = `${start.toLocaleString('en-IN', { month: 'short' })} ${y}`;
      break;
    case 'quarterly': {
      const q = Math.floor(m / 3);
      start = new Date(y, q * 3, 1);
      end = new Date(y, q * 3 + 3, 0);
      label = `Q${q + 1} ${y}`;
      break;
    }
    case 'half_yearly': {
      const h = m < 6 ? 0 : 1;
      start = new Date(y, h * 6, 1);
      end = new Date(y, h * 6 + 6, 0);
      label = `H${h + 1} ${y}`;
      break;
    }
    case 'annual':
      // Lions fiscal year Jul-Jun
      if (m >= 6) { start = new Date(y, 6, 1); end = new Date(y + 1, 5, 30); label = `LY ${y}-${String((y + 1) % 100).padStart(2, '0')}`; }
      else        { start = new Date(y - 1, 6, 1); end = new Date(y, 5, 30); label = `LY ${y - 1}-${String(y % 100).padStart(2, '0')}`; }
      break;
    default:
      start = end = now;
      label = `On ${now.toLocaleDateString('en-IN')}`;
  }
  const due = new Date(end.getTime() + 30 * 86400_000);
  return {
    label,
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
    due: due.toISOString().slice(0, 10),
  };
}

export async function runBillCycle(opts: BillCycleOptions): Promise<BillCycleReport> {
  const db = createAdminClient();
  const report: BillCycleReport = {
    tier: opts.tier,
    rateCardsRun: 0, invoicesCreated: 0, invoicesSkipped: 0,
    errors: [], totalAmount: 0, totalAmountINR: 0,
  };

  // Load matching rate cards.
  let rcQuery = db.from('dues_rate_cards').select('*').eq('tier', opts.tier).eq('is_active', true);
  if (opts.rateCardCode) rcQuery = rcQuery.eq('code', opts.rateCardCode);
  const { data: rateCards } = await rcQuery;
  if (!rateCards?.length) return report;
  report.rateCardsRun = rateCards.length;

  for (const rc of rateCards as RateCard[]) {
    const period = (opts.periodLabel && opts.periodStart && opts.periodEnd && opts.dueDate)
      ? { label: opts.periodLabel, start: opts.periodStart, end: opts.periodEnd, due: opts.dueDate }
      : computePeriod(rc.cadence);

    if (opts.tier === 'club') {
      await runClubTier(db, rc, period, opts, report);
    } else {
      await runClubLevelTier(db, rc, period, opts, report);
    }
  }
  return report;
}

async function runClubTier(
  db: ReturnType<typeof createAdminClient>,
  rc: RateCard,
  period: { label: string; start: string; end: string; due: string },
  opts: BillCycleOptions,
  report: BillCycleReport,
) {
  // Bill every active member of every active club (or the requested scope).
  let memberQ = db.from('members')
    .select('id, name, email, club_id, status, clubs:club_id(id, district_id, zone_id, region_id)')
    .eq('status', 'active')
    .is('deleted_at', null);
  if (opts.clubId) memberQ = memberQ.eq('club_id', opts.clubId);
  if (rc.applies_to_club_id) memberQ = memberQ.eq('club_id', rc.applies_to_club_id);
  const { data: members } = await memberQ;
  if (!members?.length) return;

  for (const m of members) {
    if (opts.districtId && (m.clubs as { district_id?: string } | null)?.district_id !== opts.districtId) continue;
    await insertInvoiceIfMissing(db, {
      tier: 'club',
      rate_card_id: rc.id,
      debtor_kind: 'member',
      member_id: m.id,
      club_id: m.club_id,
      district_id: (m.clubs as { district_id?: string } | null)?.district_id ?? null,
      zone_id: (m.clubs as { zone_id?: string } | null)?.zone_id ?? null,
      region_id: (m.clubs as { region_id?: string } | null)?.region_id ?? null,
      period_label: period.label,
      period_start: period.start,
      period_end: period.end,
      due_date: period.due,
      amount: rc.amount,
      currency: rc.currency,
    }, opts, report, `${m.name} (${m.email})`);
  }
}

async function runClubLevelTier(
  db: ReturnType<typeof createAdminClient>,
  rc: RateCard,
  period: { label: string; start: string; end: string; due: string },
  opts: BillCycleOptions,
  report: BillCycleReport,
) {
  // District + International tiers bill the club. Per-capita rate cards
  // (recognised by name containing "per capita") scale by member count.
  let clubQ = db.from('clubs').select('id, name, district_id, zone_id, region_id').is('deleted_at', null);
  if (opts.clubId) clubQ = clubQ.eq('id', opts.clubId);
  if (rc.applies_to_club_id) clubQ = clubQ.eq('id', rc.applies_to_club_id);
  if (opts.districtId) clubQ = clubQ.eq('district_id', opts.districtId);
  if (rc.applies_to_district_id) clubQ = clubQ.eq('district_id', rc.applies_to_district_id);
  const { data: clubs } = await clubQ;
  if (!clubs?.length) return;

  const perCapita = /per.capita/i.test(rc.name) || /per_capita/i.test(rc.code);

  for (const c of clubs) {
    let amount = rc.amount;
    if (perCapita) {
      const { count } = await db.from('members').select('*', { count: 'exact', head: true })
        .eq('club_id', c.id).eq('status', 'active').is('deleted_at', null);
      amount = rc.amount * (count ?? 0);
    }
    const amountInr = rc.currency === 'USD' && opts.fxRate ? Math.round(amount * opts.fxRate * 100) / 100 : null;

    await insertInvoiceIfMissing(db, {
      tier: rc.tier,
      rate_card_id: rc.id,
      debtor_kind: 'club',
      member_id: null,
      club_id: c.id,
      district_id: c.district_id,
      zone_id: c.zone_id,
      region_id: c.region_id,
      period_label: period.label,
      period_start: period.start,
      period_end: period.end,
      due_date: period.due,
      amount,
      currency: rc.currency,
      fx_rate: opts.fxRate ?? null,
      amount_inr: amountInr,
    }, opts, report, c.name);
  }
}

interface InvoiceInsert {
  tier: DuesTier;
  rate_card_id: string;
  debtor_kind: 'member' | 'club';
  member_id: string | null;
  club_id: string | null;
  district_id: string | null;
  zone_id: string | null;
  region_id: string | null;
  period_label: string;
  period_start: string;
  period_end: string;
  due_date: string;
  amount: number;
  currency: string;
  fx_rate?: number | null;
  amount_inr?: number | null;
}

async function insertInvoiceIfMissing(
  db: ReturnType<typeof createAdminClient>,
  row: InvoiceInsert,
  opts: BillCycleOptions,
  report: BillCycleReport,
  debtorLabel: string,
) {
  if (!opts.force) {
    let existsQ = db.from('dues_invoices').select('id')
      .eq('rate_card_id', row.rate_card_id)
      .eq('period_label', row.period_label);
    existsQ = row.debtor_kind === 'member'
      ? existsQ.eq('member_id', row.member_id!)
      : existsQ.eq('club_id', row.club_id!);
    const { data: existing } = await existsQ.maybeSingle();
    if (existing) { report.invoicesSkipped++; return; }
  }

  const { error } = await db.from('dues_invoices').insert(row);
  if (error) {
    report.errors.push({
      rate_card: row.rate_card_id,
      debtor: debtorLabel,
      reason: error.message,
    });
    return;
  }
  report.invoicesCreated++;
  report.totalAmount += row.amount;
  if (row.currency === 'INR') report.totalAmountINR += row.amount;
  else if (row.amount_inr) report.totalAmountINR += row.amount_inr;
}

/**
 * Late-fee sweep — mark issued invoices past due as `overdue` and
 * append a penalty row when the rate card has late_fee_pct > 0.
 */
export async function applyLateFees(): Promise<{ marked: number; penalised: number }> {
  const db = createAdminClient();
  const today = new Date().toISOString().slice(0, 10);

  const { data: overdue } = await db.from('dues_invoices')
    .select('id, rate_card_id, amount, status, due_date, dues_rate_cards(late_fee_pct, grace_days)')
    .lte('due_date', today)
    .in('status', ['issued', 'partial']);

  let marked = 0, penalised = 0;
  for (const inv of overdue ?? []) {
    const rc = inv.dues_rate_cards as { late_fee_pct?: number; grace_days?: number } | null;
    const graceDays = rc?.grace_days ?? 0;
    const dueT = new Date(inv.due_date as string).getTime();
    const past = (Date.now() - dueT) / 86400_000;
    if (past < graceDays) continue;

    if (inv.status !== 'overdue') {
      await db.from('dues_invoices').update({ status: 'overdue' }).eq('id', inv.id);
      marked++;
    }

    const lateFeePct = Number(rc?.late_fee_pct ?? 0);
    if (lateFeePct > 0) {
      const { data: already } = await db.from('dues_penalties').select('id')
        .eq('invoice_id', inv.id).eq('reason', 'late_fee').maybeSingle();
      if (!already) {
        const penalty = Math.round(Number(inv.amount) * lateFeePct) / 100;
        await db.from('dues_penalties').insert({
          invoice_id: inv.id, amount: penalty, reason: 'late_fee',
        });
        penalised++;
      }
    }
  }
  return { marked, penalised };
}
