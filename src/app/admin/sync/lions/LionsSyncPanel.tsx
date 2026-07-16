'use client';
import { useState, useTransition } from 'react';
import { Loader2, Play, CheckCircle2, AlertCircle } from 'lucide-react';

interface SyncReport {
  entity: string;
  fetched: number;
  inserted: number;
  updated: number;
  skipped: number;
  errors: string[];
  durationMs: number;
  dryRun: boolean;
}

export function LionsSyncPanel({ apiConfigured, portalConfigured = false }: { apiConfigured: boolean; portalConfigured?: boolean }) {
  const [pending, start] = useTransition();
  const [reports, setReports] = useState<SyncReport[]>([]);
  const [error, setError] = useState<string | null>(null);

  function run(entity: 'all' | 'district' | 'club' | 'member') {
    setError(null); setReports([]);
    start(async () => {
      const res = await fetch('/api/sync/lions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entity }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) { setError(j.error ?? 'Sync failed'); return; }
      setReports(j.reports ?? []);
    });
  }

  function runPortalDistricts() {
    setError(null); setReports([]);
    start(async () => {
      const res = await fetch('/api/sync/lions-portal', { method: 'POST' });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) { setError(j.error ?? 'District sync failed'); return; }
      setReports(j.reports ?? []);
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Btn onClick={() => run('all')} disabled={pending} variant="primary">
          {pending ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
          Sync All
        </Btn>
        <Btn onClick={() => run('district')} disabled={pending}>Districts only</Btn>
        <Btn onClick={() => run('club')} disabled={pending}>Clubs only</Btn>
        <Btn onClick={() => run('member')} disabled={pending}>Members only</Btn>
      </div>
      {portalConfigured && (
        <div className="flex flex-wrap gap-2 pt-1 border-t">
          <Btn onClick={runPortalDistricts} disabled={pending}>
            {pending ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
            District data (DG login)
          </Btn>
          <span className="text-xs text-gray-500 self-center">
            Pulls district data from the Lions Portal using the stored District Governor credentials.
          </span>
        </div>
      )}
      {!apiConfigured && !portalConfigured && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">
          <strong>Dry-run mode:</strong> <code>LIONS_API_BASE_URL</code> is not set, so the
          adapter returns zeroed counts. Configure the env vars to enable live sync.
        </p>
      )}
      {error && (
        <div className="inline-flex items-center gap-1.5 text-sm text-red-700">
          <AlertCircle size={14} /> {error}
        </div>
      )}

      {reports.length > 0 && (
        <div className="space-y-2">
          {reports.map((r) => (
            <div key={r.entity} className="border rounded-lg p-3 bg-white">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold capitalize flex items-center gap-2">
                  {r.errors.length === 0
                    ? <CheckCircle2 size={14} className="text-green-600" />
                    : <AlertCircle size={14} className="text-amber-600" />}
                  {r.entity}
                  {r.dryRun && <span className="text-[10px] bg-gray-100 px-1.5 py-0.5 rounded">dry-run</span>}
                </h4>
                <span className="text-xs text-gray-500">{r.durationMs}ms</span>
              </div>
              <div className="grid grid-cols-4 gap-2 text-xs">
                <Stat label="Fetched" value={r.fetched} />
                <Stat label="Inserted" value={r.inserted} color="text-green-700" />
                <Stat label="Updated" value={r.updated} color="text-blue-700" />
                <Stat label="Skipped" value={r.skipped} color={r.skipped ? 'text-amber-700' : 'text-gray-500'} />
              </div>
              {r.errors.length > 0 && (
                <details className="mt-2 text-xs">
                  <summary className="cursor-pointer text-red-700">
                    {r.errors.length} error{r.errors.length === 1 ? '' : 's'}
                  </summary>
                  <ul className="mt-1 list-disc pl-5 space-y-0.5 text-red-700">
                    {r.errors.slice(0, 8).map((e, i) => <li key={i}>{e}</li>)}
                  </ul>
                </details>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Btn({ children, onClick, disabled, variant = 'default' }: {
  children: React.ReactNode; onClick: () => void; disabled?: boolean; variant?: 'primary' | 'default';
}) {
  const cls = variant === 'primary'
    ? 'bg-amber-500 hover:bg-amber-600 text-white'
    : 'bg-white hover:bg-gray-50 text-gray-700 border';
  return (
    <button type="button" onClick={onClick} disabled={disabled}
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium disabled:opacity-60 ${cls}`}>
      {children}
    </button>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div className="bg-gray-50 rounded p-2">
      <div className="text-[10px] uppercase tracking-wider text-gray-500">{label}</div>
      <div className={`text-lg font-bold ${color ?? 'text-navy-800'}`}>{value}</div>
    </div>
  );
}
