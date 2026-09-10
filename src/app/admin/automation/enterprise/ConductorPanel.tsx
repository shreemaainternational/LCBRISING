'use client';
import { useState, useTransition } from 'react';
import {
  Loader2, Play, CheckCircle2, AlertCircle, AlertTriangle, Clock,
  Sparkles, Activity, MinusCircle, XCircle,
} from 'lucide-react';

type StepStatus = 'ok' | 'warn' | 'error' | 'skipped';

interface ConductorStep {
  key: string;
  label: string;
  status: StepStatus;
  detail: string;
  durationMs?: number;
}

interface ConductorState {
  last_run_at: string | null;
  last_status: string | null;
  last_trigger: string | null;
  health_score: number;
  duration_ms: number;
  steps: ConductorStep[];
  counts: Record<string, number>;
  ai_summary: string | null;
  ai_recommendation: string | null;
  ai_source: string | null;
  consecutive_failures: number;
}

const STATUS_STYLE: Record<string, { chip: string; label: string; ring: string }> = {
  healthy:  { chip: 'bg-emerald-100 text-emerald-800', label: 'Healthy',  ring: '#16A34A' },
  degraded: { chip: 'bg-amber-100 text-amber-800',     label: 'Degraded', ring: '#F59E0B' },
  critical: { chip: 'bg-rose-100 text-rose-800',       label: 'Critical', ring: '#DC2626' },
  failed:   { chip: 'bg-rose-100 text-rose-800',       label: 'Failed',   ring: '#DC2626' },
  skipped:  { chip: 'bg-gray-100 text-gray-600',       label: 'Skipped',  ring: '#94A3B8' },
};

function fmt(dt: string | null): string {
  if (!dt) return 'Never';
  return new Date(dt).toLocaleString('en-IN');
}

function scoreColor(score: number): string {
  return score >= 85 ? '#16A34A' : score >= 60 ? '#F59E0B' : '#DC2626';
}

function StepIcon({ status }: { status: StepStatus }) {
  if (status === 'ok') return <CheckCircle2 size={15} className="text-emerald-600" />;
  if (status === 'warn') return <AlertTriangle size={15} className="text-amber-500" />;
  if (status === 'error') return <XCircle size={15} className="text-rose-600" />;
  return <MinusCircle size={15} className="text-gray-400" />;
}

export function ConductorPanel({
  enabled,
  scheduleLabel,
  initialState,
}: {
  enabled: boolean;
  scheduleLabel: string;
  initialState: ConductorState | null;
}) {
  const [pending, start] = useTransition();
  const [state, setState] = useState<ConductorState | null>(initialState);
  const [error, setError] = useState<string | null>(null);

  function runNow() {
    setError(null);
    start(async () => {
      const res = await fetch('/api/cron/enterprise', { method: 'POST' });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) { setError(j.error ?? 'Conductor run failed'); return; }
      setState({
        last_run_at: j.ranAt ?? new Date().toISOString(),
        last_status: j.status ?? null,
        last_trigger: 'manual',
        health_score: j.healthScore ?? 0,
        duration_ms: j.durationMs ?? 0,
        steps: j.steps ?? [],
        counts: j.counts ?? {},
        ai_summary: j.aiSummary ?? null,
        ai_recommendation: j.aiRecommendation ?? null,
        ai_source: j.aiSource ?? null,
        consecutive_failures: j.consecutiveFailures ?? 0,
      });
    });
  }

  const status = state?.last_status ?? null;
  const style = status ? STATUS_STYLE[status] ?? STATUS_STYLE.skipped : null;
  const score = state?.health_score ?? 0;
  const counts = state?.counts ?? {};

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
          enabled ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'
        }`}>
          <Activity size={12} className={enabled ? '' : 'opacity-50'} />
          {enabled ? 'Conductor ON' : 'Conductor OFF'}
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
          className="ml-auto inline-flex items-center gap-2 rounded-md bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-60"
        >
          {pending ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
          Run conductor now
        </button>
      </div>

      {!enabled && (
        <p className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          The scheduled conductor is turned off. Toggle <strong>Enterprise AI conductor</strong> on the{' '}
          <a href="/admin/automation" className="underline">Automation</a> page to resume the daily orchestrated run.
          &ldquo;Run conductor now&rdquo; still works and forces a one-off deep run.
        </p>
      )}

      {error && (
        <div className="inline-flex items-center gap-1.5 text-sm text-rose-700">
          <AlertCircle size={14} /> {error}
        </div>
      )}

      {/* Health score + headline metrics */}
      <div className="grid gap-4 md:grid-cols-[auto_1fr]">
        <div className="flex items-center gap-4 rounded-xl border bg-white p-5">
          <div
            className="relative flex h-24 w-24 items-center justify-center rounded-full"
            style={{ background: `conic-gradient(${scoreColor(score)} ${score * 3.6}deg, #E5E7EB 0deg)` }}
          >
            <div className="flex h-[76px] w-[76px] flex-col items-center justify-center rounded-full bg-white">
              <span className="text-2xl font-bold text-navy-800">{score}</span>
              <span className="text-[10px] uppercase tracking-wider text-gray-500">Health</span>
            </div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider text-gray-500">Platform health</div>
            <div className="text-lg font-bold" style={{ color: scoreColor(score) }}>
              {style?.label ?? '—'}
            </div>
            <div className="mt-1 text-xs text-gray-500">Last run {fmt(state?.last_run_at ?? null)}</div>
            {(state?.consecutive_failures ?? 0) > 1 && (
              <div className="mt-1 inline-flex items-center gap-1 text-xs text-rose-700">
                <AlertCircle size={12} /> {state?.consecutive_failures} consecutive regressions
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Stat label="Fetched" value={counts.fetched ?? 0} />
          <Stat label="New / Updated" value={`${counts.inserted ?? 0} / ${counts.updated ?? 0}`} />
          <Stat label="Dup. candidates" value={counts.duplicates ?? 0} tone={(counts.duplicates ?? 0) > 0 ? 'purple' : undefined} />
          <Stat label="Self-healed" value={counts.healed ?? 0} tone={(counts.healed ?? 0) > 0 ? 'emerald' : undefined} />
          <Stat label="Jobs processed" value={`${counts.jobsProcessed ?? 0}${counts.jobsFailed ? ` · ${counts.jobsFailed} failed` : ''}`} tone={(counts.jobsFailed ?? 0) > 0 ? 'rose' : undefined} />
          <Stat label="Integrations live" value={`${counts.integrationsLive ?? 0} · ${counts.integrationsOff ?? 0} off`} />
        </div>
      </div>

      {/* AI digest */}
      {(state?.ai_summary || state?.ai_recommendation) && (
        <div className="rounded-xl border border-purple-200 bg-gradient-to-br from-purple-50 to-white p-4">
          <div className="mb-1.5 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-purple-700">
            <Sparkles size={13} /> AI health digest
            <span className="rounded bg-purple-100 px-1.5 py-0.5 text-[10px] font-semibold normal-case tracking-normal text-purple-700">
              {state?.ai_source === 'ai' ? 'AI-written' : 'template'}
            </span>
          </div>
          {state?.ai_summary && <p className="text-sm text-gray-800">{state.ai_summary}</p>}
          {state?.ai_recommendation && (
            <p className="mt-2 inline-flex items-start gap-1.5 rounded-md bg-white/70 px-2 py-1.5 text-sm text-purple-900">
              <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
              <span><strong>Recommended:</strong> {state.ai_recommendation}</span>
            </p>
          )}
        </div>
      )}

      {/* Pipeline steps */}
      {state?.steps && state.steps.length > 0 && (
        <div className="rounded-xl border bg-white">
          <div className="border-b px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-gray-500">
            Pipeline — last run
          </div>
          <ol className="divide-y">
            {state.steps.map((s, i) => (
              <li key={s.key} className="flex items-start gap-3 px-4 py-3">
                <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-gray-100 text-[11px] font-semibold text-gray-500">
                  {i + 1}
                </span>
                <StepIcon status={s.status} />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-navy-800">{s.label}</div>
                  <div className="text-xs text-gray-600">{s.detail}</div>
                </div>
                {typeof s.durationMs === 'number' && s.durationMs > 0 && (
                  <span className="text-[11px] text-gray-400">{(s.durationMs / 1000).toFixed(1)}s</span>
                )}
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string | number; tone?: 'purple' | 'emerald' | 'rose' }) {
  const toneCls = tone === 'purple' ? 'text-purple-700' : tone === 'emerald' ? 'text-emerald-700' : tone === 'rose' ? 'text-rose-700' : 'text-navy-800';
  return (
    <div className="rounded-lg border bg-white p-3">
      <div className="text-[10px] uppercase tracking-wider text-gray-500">{label}</div>
      <div className={`text-base font-bold ${toneCls}`}>{value}</div>
    </div>
  );
}
