'use client';
import { useState, useTransition } from 'react';
import { Loader2, Database, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react';

type ClientResult = { ok: boolean; error?: string; code?: string };
type Result = {
  ok: boolean;
  diagnosis: string | null;
  url?: string | null;
  anon: ClientResult;
  serviceRole: ClientResult | null;
  reachable?: boolean;
  consistent?: boolean;
  checkedAt?: string;
};

export function TestSupabaseConnection() {
  const [pending, start] = useTransition();
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);

  function run() {
    setError(null);
    start(async () => {
      try {
        const res = await fetch('/api/integrations/health/supabase', { method: 'POST' });
        const j = await res.json().catch(() => null);
        if (!res.ok) {
          setError(j?.error ?? `Probe failed (HTTP ${res.status})`);
          return;
        }
        setResult(j);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Network error');
      }
    });
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-50 text-cyan-700 ring-1 ring-cyan-100">
            <Database size={16} />
          </span>
          <div>
            <h3 className="text-sm font-semibold text-navy-900">Supabase connection test</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Probes the anon and service-role clients live. Use this after editing
              the env vars in your Vercel project to confirm the keys match.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={run}
          disabled={pending}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-navy-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-navy-800 disabled:opacity-60"
        >
          {pending ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
          {pending ? 'Testing…' : 'Test connection'}
        </button>
      </div>

      {error && (
        <div className="mt-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
          {error}
        </div>
      )}

      {result && (
        <div className="mt-3 space-y-2">
          <div className={`flex items-start gap-2 rounded-md px-3 py-2 text-xs ${
            result.ok
              ? 'border border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border border-rose-200 bg-rose-50 text-rose-800'
          }`}>
            {result.ok
              ? <CheckCircle2 size={14} className="shrink-0 mt-0.5" />
              : <AlertTriangle size={14} className="shrink-0 mt-0.5" />}
            <div className="flex-1">
              <div className="font-semibold">
                {result.ok ? 'All clients reachable and consistent' : result.diagnosis ?? 'Connection problem'}
              </div>
              {result.url && (
                <div className="mt-0.5 font-mono text-[10px] opacity-80 break-all">{result.url}</div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <ClientBadge label="Anon (public)" r={result.anon} />
            <ClientBadge label="Service role" r={result.serviceRole} />
          </div>

          {result.checkedAt && (
            <div className="text-right text-[10px] text-gray-400">
              Checked {new Date(result.checkedAt).toLocaleTimeString()}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ClientBadge({ label, r }: { label: string; r: ClientResult | null }) {
  if (!r) {
    return (
      <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2">
        <div className="text-[10px] uppercase tracking-wider font-bold text-amber-700">{label}</div>
        <div className="text-xs text-amber-900 mt-0.5">Not configured</div>
      </div>
    );
  }
  return (
    <div className={`rounded-md border px-3 py-2 ${
      r.ok ? 'border-emerald-200 bg-emerald-50' : 'border-rose-200 bg-rose-50'
    }`}>
      <div className={`text-[10px] uppercase tracking-wider font-bold ${
        r.ok ? 'text-emerald-700' : 'text-rose-700'
      }`}>{label}</div>
      <div className={`text-xs mt-0.5 ${r.ok ? 'text-emerald-900' : 'text-rose-900'}`}>
        {r.ok ? 'OK' : (r.code ?? 'error')}
      </div>
      {r.error && !r.ok && (
        <div className="mt-1 text-[10px] font-mono break-all text-rose-700/80">{r.error}</div>
      )}
    </div>
  );
}
