'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  Play, Loader2, CheckCircle2, AlertCircle, Sparkles, Receipt, Clock,
} from 'lucide-react';

interface RateCard {
  id: string; code: string; name: string;
  cadence: string; amount: number; currency: string;
}

interface Props {
  tier: 'club' | 'district' | 'international';
  rateCards: RateCard[];
}

interface BillReport {
  rateCardsRun: number; invoicesCreated: number; invoicesSkipped: number;
  errors: { rate_card: string; debtor: string; reason: string }[];
  totalAmount: number; totalAmountINR: number;
}

export function BillCyclePanel({ tier, rateCards }: Props) {
  const router = useRouter();
  const [code, setCode] = useState<string>('');
  const [fxRate, setFxRate] = useState<string>(tier === 'international' ? '83.5' : '');
  const [force, setForce] = useState(false);
  const [applyLateFees, setApplyLateFees] = useState(true);
  const [pending, start] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; msg: string; report?: BillReport; lateFees?: { marked: number; penalised: number } } | null>(null);

  function run() {
    setResult(null);
    start(async () => {
      const res = await fetch('/api/dues/bill-cycle', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tier,
          rate_card_code: code || undefined,
          fx_rate: fxRate ? Number(fxRate) : undefined,
          force,
          apply_late_fees: applyLateFees,
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) { setResult({ ok: false, msg: j.error ?? `HTTP ${res.status}` }); return; }
      const r = j.report as BillReport;
      setResult({
        ok: true,
        msg: `${r.invoicesCreated} created · ${r.invoicesSkipped} skipped (already billed) across ${r.rateCardsRun} rate cards.`,
        report: r,
        lateFees: j.lateFees,
      });
      router.refresh();
    });
  }

  return (
    <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50/40 p-4">
      <div className="flex items-start justify-between mb-3 gap-3 flex-wrap">
        <div>
          <h3 className="inline-flex items-center gap-2 font-semibold text-navy-800">
            <Receipt size={16} className="text-amber-500" />
            Run bill cycle — {tier} tier
          </h3>
          <p className="text-xs text-gray-600 mt-1 max-w-xl">
            Generates one invoice per debtor per active rate card for the current period.
            Idempotent — invoices already issued for the same period are skipped.
          </p>
        </div>
        <span className="text-[10px] uppercase tracking-wider font-bold bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full">
          {rateCards.length} active rate cards
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <label className="block">
          <span className="block text-xs font-semibold text-gray-700 mb-1">Rate card (optional)</span>
          <select value={code} onChange={(e) => setCode(e.target.value)}
            className="w-full px-3 py-2 border rounded-md text-sm bg-white">
            <option value="">All active rate cards</option>
            {rateCards.map((r) => (
              <option key={r.id} value={r.code}>
                {r.name} — {r.currency} {r.amount} · {r.cadence}
              </option>
            ))}
          </select>
        </label>
        {tier === 'international' && (
          <label className="block">
            <span className="block text-xs font-semibold text-gray-700 mb-1">USD → INR rate</span>
            <input type="number" step="0.01" value={fxRate} onChange={(e) => setFxRate(e.target.value)}
              className="w-full px-3 py-2 border rounded-md text-sm bg-white" placeholder="e.g. 83.50" />
          </label>
        )}
        <div className="flex flex-col gap-2 pt-1">
          <label className="inline-flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={applyLateFees} onChange={(e) => setApplyLateFees(e.target.checked)} />
            Apply late fees to overdue invoices
          </label>
          <label className="inline-flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={force} onChange={(e) => setForce(e.target.checked)} />
            Force re-bill (allow duplicates)
          </label>
        </div>
      </div>

      <div className="flex items-center gap-3 mt-3 pt-3 border-t border-amber-200">
        <button type="button" onClick={run} disabled={pending}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold disabled:opacity-60">
          {pending ? <Loader2 className="animate-spin" size={14} /> : <Play size={14} />}
          {pending ? 'Running…' : 'Run bill cycle'}
        </button>
        {result?.ok && (
          <span className="inline-flex items-center gap-1.5 text-sm text-emerald-700">
            <CheckCircle2 size={14} /> {result.msg}
            {result.lateFees && (
              <span className="ml-2 text-xs text-amber-700 inline-flex items-center gap-1">
                <Clock size={11} /> +{result.lateFees.penalised} late fees applied
              </span>
            )}
          </span>
        )}
        {result && !result.ok && (
          <span className="inline-flex items-center gap-1.5 text-sm text-rose-700">
            <AlertCircle size={14} /> {result.msg}
          </span>
        )}
      </div>

      {result?.report?.errors && result.report.errors.length > 0 && (
        <details className="mt-3 text-xs">
          <summary className="cursor-pointer text-rose-700 inline-flex items-center gap-1">
            <Sparkles size={11} /> {result.report.errors.length} errors
          </summary>
          <ul className="mt-1 pl-5 list-disc text-rose-700 space-y-0.5">
            {result.report.errors.slice(0, 8).map((e, i) => (
              <li key={i}><strong>{e.debtor}:</strong> {e.reason}</li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
