'use client';
import { useState, useTransition } from 'react';
import { Loader2, Play, CheckCircle2, AlertCircle, Clock, RefreshCw } from 'lucide-react';

interface AutoSyncState {
  last_run_at: string | null;
  last_status: string | null;
  last_trigger: string | null;
  last_fetched: number;
  last_inserted: number;
  last_updated: number;
  last_skipped: number;
  last_errors: number;
  last_duplicates: number;
  last_duration_ms: number;
  last_error_message: string | null;
  consecutive_failures: number;
}

interface AutoSyncSummary {
  status: string;
  fetched: number;
  inserted: number;
  updated: number;
  skipped: number;
  errors: number;
  duplicates: number;
  errorMessages: string[];
  skippedReason?: string;
}

const STATUS_STYLE: Record<string, { chip: string; label: string }> = {
  success: { chip: 'bg-emerald-100 text-emerald-800', label: 'Success' },
  partial: { chip: 'bg-amber-100 text-amber-800', label: 'Partial' },
  failed:  { chip: 'bg-rose-100 text-rose-800', label: 'Failed' },
  skipped: { chip: 'bg-gray-100 text-gray-600', label: 'Skipped' },
};

function fmt(dt: string | null): string {
  if (!dt) return 'Never';
  return new Date(dt).toLocaleString('en-IN');
}

export function AutoSyncPanel({
  enabled,
  scheduleLabel,
  initialState,
}: {
  enabled: boolean;
  scheduleLabel: string;
  initialState: AutoSyncState | null;
}) {
  const [pending, start] = useTransition();
  const [state, setState] = useState<AutoSyncState | null>(initialState);
  const [result, setResult] = useState<AutoSyncSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  function runNow() {
    setError(null); setResult(null);
    start(async () => {
      const res = await fetch('/api/cron/lions-sync', { method: 'POST' });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) { setError(j.error ?? 'Auto-sync failed'); return; }
      setResult(j as AutoSyncSummary);
      setState((s) => ({
        last_run_at: j.ranAt ?? new Date().toISOString(),
        last_status: j.status ?? null,
        last_trigger: 'manual',
        last_fetched: j.fetched ?? 0,
        last_inserted: j.inserted ?? 0,
        last_updated: j.updated ?? 0,
        last_skipped: j.skipped ?? 0,
        last_errors: j.errors ?? 0,
        last_duplicates: j.duplicates ?? 0,
        last_duration_ms: j.durationMs ?? 0,
        last_error_message: j.errorMessages?.[0] ?? null,
        consecutive_failures: j.status === 'failed' ? (s?.consecutive_failures ?? 0) + 1 : 0,
      }));
    });
  }

  const status = state?.last_status ?? null;
  const style = status ? STATUS_STYLE[status] ?? STATUS_STYLE.skipped : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
            enabled ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'
          }`}
        >
          <RefreshCw size={12} className={enabled ? '' : 'opacity-50'} />
          {enabled ? 'Automation ON' : 'Automation OFF'}
        </span>
        <span className="inline-flex items-center gap-1.5 text-xs text-gray-600">
          <Clock size={12} /> {scheduleLabel}
        </span>
        {style && (
          <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${style.chip}`}>
            Last: {style.label}
          </span>
        )}
        <button
          type="button"
          onClick={runNow}
          disabled={pending}
          className="ml-auto inline-flex items-center gap-2 rounded-md bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600 disabled:opacity-60"
        >
          {pending ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
          Run auto-sync now
        </button>
      </div>

      {!enabled && (
        <p className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          Scheduled auto-sync is turned off. Toggle <strong>Lions Portal auto-sync</strong> on the{' '}
          <a href="/admin/automation" className="underline">Automation</a> page to resume the daily pull.
          &ldquo;Run auto-sync now&rdquo; still works and forces a one-off run.
        </p>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Last run" value={fmt(state?.last_run_at ?? null)} small />
        <Stat label="Fetched" value={String(state?.last_fetched ?? 0)} />
        <Stat label="Inserted / Updated" value={`${state?.last_inserted ?? 0} / ${state?.last_updated ?? 0}`} />
        <Stat
          label="Dup. candidates"
          value={String(state?.last_duplicates ?? 0)}
          tone={(state?.last_duplicates ?? 0) > 0 ? 'purple' : undefined}
        />
      </div>

      {(state?.consecutive_failures ?? 0) > 1 && (
        <div className="inline-flex items-center gap-1.5 text-sm text-rose-700">
          <AlertCircle size={14} /> {state?.consecutive_failures} consecutive failed runs — check credentials / endpoints.
        </div>
      )}

      {error && (
        <div className="inline-flex items-center gap-1.5 text-sm text-rose-700">
          <AlertCircle size={14} /> {error}
        </div>
      )}

      {result && (
        <div className="rounded-lg border bg-white p-3">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
            {result.status === 'failed'
              ? <AlertCircle size={14} className="text-rose-600" />
              : <CheckCircle2 size={14} className="text-emerald-600" />}
            Manual run — {STATUS_STYLE[result.status]?.label ?? result.status}
          </div>
          {result.skippedReason ? (
            <p className="text-xs text-gray-500">{result.skippedReason}</p>
          ) : (
            <div className="grid grid-cols-3 gap-2 text-xs md:grid-cols-6">
              <MiniStat label="Fetched" value={result.fetched} />
              <MiniStat label="Inserted" value={result.inserted} color="text-emerald-700" />
              <MiniStat label="Updated" value={result.updated} color="text-blue-700" />
              <MiniStat label="Skipped" value={result.skipped} color={result.skipped ? 'text-amber-700' : undefined} />
              <MiniStat label="Errors" value={result.errors} color={result.errors ? 'text-rose-700' : undefined} />
              <MiniStat label="Duplicates" value={result.duplicates} color={result.duplicates ? 'text-purple-700' : undefined} />
            </div>
          )}
          {result.errorMessages?.length > 0 && (
            <details className="mt-2 text-xs">
              <summary className="cursor-pointer text-rose-700">{result.errorMessages.length} error(s)</summary>
              <ul className="mt-1 list-disc space-y-0.5 pl-5 text-rose-700">
                {result.errorMessages.slice(0, 8).map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            </details>
          )}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, small, tone }: { label: string; value: string; small?: boolean; tone?: 'purple' }) {
  return (
    <div className="rounded-lg bg-gray-50 p-3">
      <div className="text-[10px] uppercase tracking-wider text-gray-500">{label}</div>
      <div className={`font-bold text-navy-800 ${small ? 'text-sm' : 'text-lg'} ${tone === 'purple' ? 'text-purple-700' : ''}`}>
        {value}
      </div>
    </div>
  );
}

function MiniStat({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div className="rounded bg-gray-50 p-2 text-center">
      <div className="text-[10px] uppercase tracking-wider text-gray-500">{label}</div>
      <div className={`text-base font-bold ${color ?? 'text-navy-800'}`}>{value}</div>
    </div>
  );
}
