'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Play, Loader2, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';
import Link from 'next/link';

interface Props { sandbox: boolean; apiConfigured: boolean }

interface RunResult {
  status: 'success' | 'partial' | 'failed';
  durationMs: number;
  totals: { fetched: number; inserted: number; updated: number; skipped: number; errors: number };
  reports: { entity: string; fetched: number; inserted: number; updated: number; skipped: number; errors: string[] }[];
}

export function MasterSyncPanel({ sandbox, apiConfigured }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [result, setResult] = useState<RunResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  function run() {
    setResult(null); setError(null);
    start(async () => {
      const res = await fetch('/api/district/sync', { method: 'POST' });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) { setError(j.error ?? `HTTP ${res.status}`); return; }
      setResult(j.result as RunResult);
      router.refresh();
    });
  }

  return (
    <div className={`rounded-xl border-2 ${sandbox ? 'border-purple-300 bg-purple-50/30' : apiConfigured ? 'border-emerald-300 bg-emerald-50/30' : 'border-amber-300 bg-amber-50/30'} p-4`}>
      <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
        <div>
          <h3 className="inline-flex items-center gap-2 font-semibold text-navy-800">
            <Sparkles size={16} className="text-amber-500" />
            Run Master Sync
          </h3>
          <p className="text-xs text-gray-600 mt-1 max-w-xl">
            Pulls every district, club and member from Lions International in one
            sequenced operation. Idempotent — existing rows are updated, new ones
            inserted. Writes one audit row per run.
          </p>
        </div>
        <button type="button" onClick={run} disabled={pending}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-navy-900 hover:bg-navy-800 text-white text-sm font-semibold disabled:opacity-60">
          {pending ? <Loader2 className="animate-spin" size={14} /> : <Play size={14} />}
          {pending ? 'Syncing…' : 'Run Master Sync'}
        </button>
      </div>

      {!sandbox && !apiConfigured && (
        <div className="text-xs text-amber-800 bg-white rounded-md p-2 inline-flex items-start gap-1.5">
          <AlertCircle size={12} className="mt-0.5 flex-shrink-0" />
          <span>
            Lions REST API not configured — runs will return zeroed counts. Go to
            <Link href="/admin/integrations/oidc" className="underline ml-1">Integrations → OIDC</Link> to
            paste credentials, or flip on Sandbox mode for end-to-end testing.
          </span>
        </div>
      )}

      {error && (
        <p className="text-sm text-rose-700 inline-flex items-center gap-1.5 mt-2">
          <AlertCircle size={14} /> {error}
        </p>
      )}

      {result && (
        <div className="mt-3 grid grid-cols-2 md:grid-cols-5 gap-2">
          <ResultTile label="Status"   value={result.status} tone={result.status === 'success' ? 'green' : result.status === 'partial' ? 'amber' : 'rose'} />
          <ResultTile label="Fetched"  value={String(result.totals.fetched)} />
          <ResultTile label="Inserted" value={String(result.totals.inserted)} tone="green" />
          <ResultTile label="Updated"  value={String(result.totals.updated)} tone="blue" />
          <ResultTile label="Errors"   value={String(result.totals.errors)} tone={result.totals.errors ? 'rose' : undefined} />
          <div className="md:col-span-5 mt-1 grid grid-cols-1 md:grid-cols-3 gap-2">
            {result.reports.map((r) => (
              <div key={r.entity} className="rounded border bg-white p-2 text-xs">
                <div className="font-semibold capitalize">{r.entity}</div>
                <div className="text-gray-600">
                  fetched {r.fetched} · ins {r.inserted} · upd {r.updated} · skip {r.skipped}
                  {r.errors.length > 0 && <span className="text-rose-700"> · {r.errors.length} err</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {result?.status === 'success' && (
        <p className="text-sm text-emerald-700 inline-flex items-center gap-1.5 mt-3">
          <CheckCircle2 size={14} /> Sync complete — {Math.round(result.durationMs / 100) / 10}s elapsed.
        </p>
      )}
    </div>
  );
}

function ResultTile({ label, value, tone }: { label: string; value: string; tone?: 'green' | 'amber' | 'rose' | 'blue' }) {
  const color = tone === 'green' ? 'text-emerald-700' :
                tone === 'amber' ? 'text-amber-700' :
                tone === 'rose'  ? 'text-rose-700' :
                tone === 'blue'  ? 'text-blue-700' : 'text-navy-900';
  return (
    <div className="bg-white border rounded p-2">
      <div className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">{label}</div>
      <div className={`text-lg font-extrabold ${color} capitalize`}>{value}</div>
    </div>
  );
}
