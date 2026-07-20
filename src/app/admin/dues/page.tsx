import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { createAdminClient } from '@/lib/supabase/server';
import { formatINR, formatINRShort, formatDate } from '@/lib/utils';
import { getDuesKpis, getClubCompliance, getDuesAgeing } from '@/lib/dues/compliance';
import {
  Banknote, AlertTriangle, ShieldCheck, TrendingUp, Building2, Globe2, Wallet,
} from 'lucide-react';
import { DuesTabs } from './DuesTabs';
import { BillCyclePanel } from './BillCyclePanel';
import { ExportCsvButton } from '@/components/admin/ExportCsvButton';

export const dynamic = 'force-dynamic';

interface Props { searchParams: Promise<{ tier?: string }>; }

const TIER_META = {
  club:          { label: 'Club Dues',          icon: Wallet,   color: 'bg-amber-100 text-amber-700' },
  district:      { label: 'District Dues',      icon: ShieldCheck, color: 'bg-blue-100 text-blue-700' },
  international: { label: 'International Dues', icon: Globe2,   color: 'bg-emerald-100 text-emerald-700' },
} as const;

type Tier = keyof typeof TIER_META;

export default async function DuesPage({ searchParams }: Props) {
  const sp = await searchParams;
  const tier = (sp.tier as Tier) ?? 'club';

  const db = createAdminClient();
  const [
    duesAgg,
    compliance,
    ageing,
    { data: invoices },
    { data: legacy },
    { data: rateCards },
  ] = await Promise.all([
    getDuesKpis(),
    getClubCompliance(),
    getDuesAgeing(),
    db.from('dues_invoices')
      .select('id, tier, invoice_no, period_label, amount, amount_paid, amount_outstanding, currency, status, due_date, member_id, club_id, members(name,email), clubs(name)')
      .eq('tier', tier)
      .order('due_date', { ascending: false })
      .limit(100),
    // Legacy single-tier dues (pre-three-tier rollout) — keep visible
    // under the matching tier tab.
    db.from('dues').select('*, members(name, email)').order('due_date', { ascending: false }).limit(50),
    db.from('dues_rate_cards').select('*').eq('tier', tier).eq('is_active', true).order('code'),
  ]);

  const { overall: kpis, byTier } = duesAgg;
  const meta = TIER_META[tier];
  const tierBreakdown = byTier.find((t) => t.tier === tier);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-navy-800 mb-1 flex items-center gap-2">
            <Banknote className="text-amber-500" /> Dues Management
          </h1>
          <p className="text-gray-600">
            Three-tier dues across Club, District and International. Bill in bulk, monitor
            collection, score every club&apos;s compliance, and export audit-ready reports.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {!!invoices?.length && (
            <ExportCsvButton
              rows={invoices}
              filename={`dues-${tier}`}
              label="Dues CSV"
              columns={[
                { key: 'invoice_no', label: 'Invoice No' },
                { key: 'tier', label: 'Tier' },
                { key: 'period_label', label: 'Period' },
                { key: 'member', label: 'Member', get: (r) => (r.members as { name?: string } | null)?.name ?? '' },
                { key: 'club', label: 'Club', get: (r) => (r.clubs as { name?: string } | null)?.name ?? '' },
                { key: 'amount', label: 'Amount' },
                { key: 'amount_paid', label: 'Paid' },
                { key: 'amount_outstanding', label: 'Outstanding' },
                { key: 'currency', label: 'Currency' },
                { key: 'status', label: 'Status' },
                { key: 'due_date', label: 'Due Date' },
              ]}
            />
          )}
          <Link href={`/api/reports/generate`}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-amber-500 text-white text-sm font-semibold pointer-events-none opacity-50">
            Generate report ↗
          </Link>
        </div>
      </div>

      {/* Overall KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi label="Collected"      value={`₹${formatINRShort(kpis.collectedInr)}`}  icon={TrendingUp}    color="emerald" />
        <Kpi label="Outstanding"    value={`₹${formatINRShort(kpis.outstandingInr)}`} icon={Wallet}        color="amber" />
        <Kpi label="Overdue"        value={`₹${formatINRShort(kpis.overdueInr)}`}    icon={AlertTriangle} color={kpis.overdueInr > 0 ? 'rose' : 'emerald'} />
        <Kpi label="Collection %"   value={`${kpis.collectionPct}%`}                  icon={ShieldCheck}   color={kpis.collectionPct >= 80 ? 'emerald' : kpis.collectionPct >= 50 ? 'amber' : 'rose'} />
      </div>

      {/* Per-tier breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {byTier.map((t) => {
          const m = TIER_META[t.tier];
          const Icon = m.icon;
          return (
            <Link key={t.tier} href={`/admin/dues?tier=${t.tier}`}
              className={`bg-white border rounded-xl p-4 hover:shadow transition-shadow ${tier === t.tier ? 'ring-2 ring-amber-400' : ''}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-navy-800">
                  <Icon size={14} /> {m.label}
                </span>
                <span className="text-[11px] text-gray-500">{t.invoiceCount} invoices</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div><div className="text-gray-500">Collected</div><div className="font-bold text-emerald-700">{formatINR(t.collectedInr)}</div></div>
                <div><div className="text-gray-500">Outstanding</div><div className="font-bold text-amber-700">{formatINR(t.outstandingInr)}</div></div>
                <div><div className="text-gray-500">Overdue</div><div className={`font-bold ${t.overdueInr ? 'text-rose-700' : 'text-gray-500'}`}>{formatINR(t.overdueInr)}</div></div>
              </div>
            </Link>
          );
        })}
      </div>

      <DuesTabs current={tier} />

      <BillCyclePanel
        tier={tier}
        rateCards={(rateCards ?? []).map((r) => ({ id: r.id, code: r.code, name: r.name, cadence: r.cadence, amount: Number(r.amount), currency: r.currency }))}
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 text-sm font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${meta.color}`}>
              {meta.label}
            </span>
            <span className="text-sm text-gray-500 font-normal">
              {invoices?.length ?? 0} invoices · {tierBreakdown ? formatINR(tierBreakdown.outstandingInr) : '—'} outstanding
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-3">Invoice #</th>
                <th className="text-left p-3">Debtor</th>
                <th className="text-left p-3">Period</th>
                <th className="text-right p-3">Amount</th>
                <th className="text-right p-3">Outstanding</th>
                <th className="text-left p-3">Due</th>
                <th className="text-left p-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {!invoices?.length ? (
                <tr><td colSpan={7} className="p-6 text-center text-gray-500">
                  No invoices yet for this tier. Use the bill-cycle panel above to generate the first batch.
                </td></tr>
              ) : invoices.map((inv) => {
                const debtor = (inv.members as { name?: string; email?: string } | null)?.name
                  ?? (inv.clubs as { name?: string } | null)?.name ?? '—';
                const debtorSub = (inv.members as { email?: string } | null)?.email ?? '';
                return (
                  <tr key={inv.id} className="border-t hover:bg-gray-50">
                    <td className="p-3 font-mono text-xs">{inv.invoice_no ?? inv.id.slice(0, 8)}</td>
                    <td className="p-3">
                      <div className="font-medium">{debtor}</div>
                      {debtorSub && <div className="text-xs text-gray-500">{debtorSub}</div>}
                    </td>
                    <td className="p-3 text-gray-600">{inv.period_label ?? '—'}</td>
                    <td className="p-3 text-right tabular-nums">{inv.currency} {Number(inv.amount).toLocaleString('en-IN')}</td>
                    <td className="p-3 text-right tabular-nums font-bold">{inv.currency} {Number(inv.amount_outstanding ?? 0).toLocaleString('en-IN')}</td>
                    <td className="p-3 text-xs text-gray-600">{formatDate(inv.due_date)}</td>
                    <td className="p-3">
                      <Badge variant={
                        inv.status === 'paid'     ? 'success' :
                        inv.status === 'overdue'  ? 'danger' :
                        inv.status === 'partial'  ? 'warning' :
                        inv.status === 'waived'   ? 'secondary' :
                        'secondary'
                      }>
                        {inv.status}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Legacy single-tier dues fallback */}
      {!!legacy?.length && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-gray-700">
              Legacy single-tier dues records ({legacy.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-3">Member</th>
                  <th className="text-left p-3">Period</th>
                  <th className="text-right p-3">Amount</th>
                  <th className="text-left p-3">Due</th>
                  <th className="text-left p-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {legacy.map((d) => {
                  const m = (d.members as { name?: string; email?: string } | null);
                  return (
                    <tr key={d.id} className="border-t">
                      <td className="p-3">{m?.name ?? '—'}<div className="text-xs text-gray-500">{m?.email}</div></td>
                      <td className="p-3 text-gray-600">{d.period_label ?? '—'}</td>
                      <td className="p-3 text-right">{formatINR(Number(d.amount))}</td>
                      <td className="p-3 text-xs text-gray-600">{formatDate(d.due_date)}</td>
                      <td className="p-3"><Badge variant={d.status === 'paid' ? 'success' : d.status === 'overdue' ? 'danger' : 'warning'}>{d.status}</Badge></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="inline-flex items-center gap-2"><Building2 size={14} className="text-amber-500" /> Club Compliance Scoreboard</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left p-3">Club</th>
                    <th className="text-right p-3">Billed</th>
                    <th className="text-right p-3">Outstanding</th>
                    <th className="text-right p-3">Collection</th>
                    <th className="text-right p-3">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {!compliance.length ? (
                    <tr><td colSpan={5} className="p-6 text-center text-gray-500">No clubs yet</td></tr>
                  ) : compliance.map((r) => (
                    <tr key={r.clubId} className="border-t">
                      <td className="p-3">
                        <div className="font-medium">{r.clubName}</div>
                        <div className="text-xs text-gray-500">{r.members} members · {r.overdueInvoices} overdue</div>
                      </td>
                      <td className="p-3 text-right tabular-nums">{formatINR(r.totalBilledInr)}</td>
                      <td className="p-3 text-right tabular-nums">{formatINR(r.outstandingInr)}</td>
                      <td className="p-3 text-right tabular-nums">{r.collectionPct}%</td>
                      <td className={`p-3 text-right font-bold ${r.status === 'compliant' ? 'text-emerald-600' : r.status === 'warn' ? 'text-amber-600' : 'text-rose-600'}`}>
                        {r.complianceScore}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="inline-flex items-center gap-2"><AlertTriangle size={14} className="text-rose-500" /> Outstanding-dues Ageing</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {ageing.map((b) => (
                <li key={b.label} className="flex items-center justify-between text-sm">
                  <span className="text-gray-700">{b.label}</span>
                  <span className="text-right">
                    <span className="font-bold">{formatINR(b.amountInr)}</span>
                    <span className="text-xs text-gray-500 ml-2">· {b.count} inv</span>
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Kpi({ label, value, icon: Icon, color }: {
  label: string; value: string;
  icon: React.ComponentType<{ size?: number }>;
  color: 'emerald' | 'amber' | 'rose';
}) {
  const palette = {
    emerald: { bg: 'bg-emerald-100', fg: 'text-emerald-700' },
    amber:   { bg: 'bg-amber-100',   fg: 'text-amber-700' },
    rose:    { bg: 'bg-rose-100',    fg: 'text-rose-700' },
  }[color];
  return (
    <div className="bg-white rounded-xl border p-4 flex items-center justify-between">
      <div>
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{label}</div>
        <div className="text-2xl font-extrabold text-navy-900 mt-1">{value}</div>
      </div>
      <div className={`w-10 h-10 rounded-full ${palette.bg} ${palette.fg} flex items-center justify-center`}>
        <Icon size={18} />
      </div>
    </div>
  );
}
