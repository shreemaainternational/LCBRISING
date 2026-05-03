import { createAdminClient } from '@/lib/supabase/server';

export interface ReportRange {
  from: string;          // YYYY-MM-DD
  to: string;
}

interface AccountRow {
  id: string;
  code: string;
  name: string;
  type: 'asset' | 'liability' | 'equity' | 'income' | 'expense';
  subtype: string | null;
  total_debit: number;
  total_credit: number;
  balance: number;       // signed natural balance
}

async function buildBalances(range?: ReportRange): Promise<AccountRow[]> {
  const supabase = createAdminClient();
  const { data: accounts } = await supabase.from('accounts')
    .select('id, code, name, type, subtype').eq('is_active', true).order('code');

  let lineQuery = supabase
    .from('journal_lines')
    .select('account_id, debit, credit, journal_entries!inner(status, entry_date)')
    .eq('journal_entries.status', 'posted');
  if (range) {
    lineQuery = lineQuery
      .gte('journal_entries.entry_date', range.from)
      .lte('journal_entries.entry_date', range.to);
  }
  const { data: lines } = await lineQuery;

  const totals = new Map<string, { d: number; c: number }>();
  for (const l of lines ?? []) {
    const t = totals.get(l.account_id) ?? { d: 0, c: 0 };
    t.d += Number(l.debit);
    t.c += Number(l.credit);
    totals.set(l.account_id, t);
  }

  return (accounts ?? []).map((a) => {
    const t = totals.get(a.id) ?? { d: 0, c: 0 };
    const naturalIsDebit = a.type === 'asset' || a.type === 'expense';
    const balance = naturalIsDebit ? t.d - t.c : t.c - t.d;
    return {
      ...a, total_debit: t.d, total_credit: t.c, balance: round2(balance),
    } as AccountRow;
  });
}

// ---------------------------------------------------------------------
// Profit & Loss
// ---------------------------------------------------------------------
export async function getProfitLoss(range: ReportRange) {
  const rows = (await buildBalances(range)).filter((r) =>
    r.type === 'income' || r.type === 'expense');
  const income = rows.filter((r) => r.type === 'income' && r.balance !== 0);
  const expenses = rows.filter((r) => r.type === 'expense' && r.balance !== 0);
  const totalIncome   = sum(income.map((r) => r.balance));
  const totalExpenses = sum(expenses.map((r) => r.balance));
  return {
    range,
    income, expenses,
    total_income: round2(totalIncome),
    total_expenses: round2(totalExpenses),
    net_surplus: round2(totalIncome - totalExpenses),
  };
}

// ---------------------------------------------------------------------
// Balance Sheet (point-in-time, no range)
// ---------------------------------------------------------------------
export async function getBalanceSheet(asOf: string) {
  const rows = await buildBalances({ from: '1900-01-01', to: asOf });
  const assets      = rows.filter((r) => r.type === 'asset');
  const liabilities = rows.filter((r) => r.type === 'liability');
  const equity      = rows.filter((r) => r.type === 'equity');

  // Surplus from P&L flows to equity (closing entries)
  const totalIncome   = sum(rows.filter((r) => r.type === 'income').map((r) => r.balance));
  const totalExpenses = sum(rows.filter((r) => r.type === 'expense').map((r) => r.balance));
  const periodSurplus = totalIncome - totalExpenses;

  const totalAssets      = sum(assets.map((r) => r.balance));
  const totalLiabilities = sum(liabilities.map((r) => r.balance));
  const totalEquity      = sum(equity.map((r) => r.balance)) + periodSurplus;

  return {
    as_of: asOf,
    assets, liabilities, equity,
    period_surplus: round2(periodSurplus),
    total_assets: round2(totalAssets),
    total_liabilities: round2(totalLiabilities),
    total_equity: round2(totalEquity),
    balanced: round2(totalAssets) === round2(totalLiabilities + totalEquity),
  };
}

// ---------------------------------------------------------------------
// Trial Balance
// ---------------------------------------------------------------------
export async function getTrialBalance(asOf: string) {
  const rows = await buildBalances({ from: '1900-01-01', to: asOf });
  const items = rows.map((r) => {
    const naturalIsDebit = r.type === 'asset' || r.type === 'expense';
    return {
      code: r.code, name: r.name, type: r.type,
      debit: naturalIsDebit ? Math.max(r.balance, 0) : Math.max(-r.balance, 0),
      credit: naturalIsDebit ? Math.max(-r.balance, 0) : Math.max(r.balance, 0),
    };
  }).filter((i) => i.debit > 0 || i.credit > 0);

  const totalDebit  = round2(sum(items.map((i) => i.debit)));
  const totalCredit = round2(sum(items.map((i) => i.credit)));

  return {
    as_of: asOf,
    items,
    total_debit: totalDebit,
    total_credit: totalCredit,
    balanced: totalDebit === totalCredit,
  };
}

// ---------------------------------------------------------------------
// Cash Flow (simplified — operating only, indirect method approx)
// ---------------------------------------------------------------------
export async function getCashFlow(range: ReportRange) {
  const supabase = createAdminClient();
  const { data: cashAccounts } = await supabase
    .from('accounts').select('id, code, name')
    .in('subtype', ['cash', 'bank']);

  const cashIds = (cashAccounts ?? []).map((a) => a.id);
  if (!cashIds.length) {
    return { range, opening_cash: 0, closing_cash: 0, operating_inflows: [], operating_outflows: [], net_change: 0 };
  }

  const { data: lines } = await supabase
    .from('journal_lines')
    .select('account_id, debit, credit, memo, journal_entries!inner(status, entry_date, description, reference_type)')
    .eq('journal_entries.status', 'posted')
    .in('account_id', cashIds)
    .gte('journal_entries.entry_date', range.from)
    .lte('journal_entries.entry_date', range.to);

  type Line = { account_id: string; debit: number; credit: number; memo: string | null;
    journal_entries: { status: string; entry_date: string; description: string; reference_type: string | null } };
  const ls = (lines ?? []) as unknown as Line[];

  const inflows: { description: string; amount: number; date: string }[] = [];
  const outflows: { description: string; amount: number; date: string }[] = [];
  let net = 0;
  for (const l of ls) {
    const amt = Number(l.debit) - Number(l.credit); // +ve means cash in
    net += amt;
    const item = {
      description: l.memo || l.journal_entries.description,
      amount: round2(Math.abs(amt)),
      date: l.journal_entries.entry_date,
    };
    if (amt > 0) inflows.push(item); else if (amt < 0) outflows.push(item);
  }

  return {
    range,
    operating_inflows: inflows,
    operating_outflows: outflows,
    net_change: round2(net),
  };
}

// ---------------------------------------------------------------------
// Account ledger (drill-down)
// ---------------------------------------------------------------------
export async function getAccountLedger(accountId: string, range: ReportRange) {
  const supabase = createAdminClient();
  const { data: lines } = await supabase
    .from('journal_lines')
    .select('debit, credit, memo, journal_entries!inner(entry_no, entry_date, description, status)')
    .eq('account_id', accountId)
    .eq('journal_entries.status', 'posted')
    .gte('journal_entries.entry_date', range.from)
    .lte('journal_entries.entry_date', range.to)
    .order('journal_entries(entry_date)');

  type Row = { debit: number; credit: number; memo: string | null;
    journal_entries: { entry_no: number; entry_date: string; description: string; status: string } };
  const rows = (lines ?? []) as unknown as Row[];

  let running = 0;
  return rows.map((r) => {
    running += Number(r.debit) - Number(r.credit);
    return {
      entry_no: r.journal_entries.entry_no,
      date: r.journal_entries.entry_date,
      description: r.memo || r.journal_entries.description,
      debit: Number(r.debit),
      credit: Number(r.credit),
      running_balance: round2(running),
    };
  });
}

// ---- helpers ----
function sum(xs: number[]) { return xs.reduce((s, x) => s + x, 0); }
function round2(n: number) { return Math.round(n * 100) / 100; }
