'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, AlertTriangle, CheckCircle2, Loader2, RefreshCw, Wand2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

type Option = { id: string; name: string };
type DriftRow = { entity: string; entity_id: string; entity_name: string; field: string; fixable: boolean };

async function authHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  try {
    const { data: { session } } = await createClient().auth.getSession();
    if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;
  } catch { /* cookie auth */ }
  return headers;
}

const FIELD_LABEL: Record<string, string> = {
  district_id: 'District differs from its parent',
  region_id: 'Region differs from its zone',
  assignment_history: 'No current assignment record',
  assignment_club: 'Assignment record names a different club',
  missing_region: 'Zone is not linked to a region',
  missing_zone: 'Club is not assigned to a zone',
  missing_club: 'Member has no club',
};

async function post(body: unknown) {
  const res = await fetch('/api/admin/hierarchy/sync', { method: 'POST', headers: await authHeaders(), body: JSON.stringify(body) });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(typeof j.error === 'string' ? j.error : `Request failed (${res.status})`);
  return j;
}

export function HierarchySyncConsole({ zones, regions, districts }: { zones: Option[]; regions: Option[]; districts: Option[] }) {
  return (
    <div className="space-y-8">
      <AutomaticPanel />
      <div className="grid lg:grid-cols-2 gap-6">
        <MovePanel
          title="Move a zone to another region"
          subjectLabel="Zone" subjects={zones}
          targetLabel="Region" targets={[{ id: '', name: 'No region' }, ...regions]}
          build={(subject, target, reason, preview) => ({ action: 'move_zone', zone_id: subject, to_region_id: target || null, reason, preview })}
        />
        <MovePanel
          title="Move a region to another district"
          subjectLabel="Region" subjects={regions}
          targetLabel="District" targets={districts}
          build={(subject, target, reason, preview) => ({ action: 'move_region', region_id: subject, to_district_id: target, reason, preview })}
        />
      </div>
    </div>
  );
}

function AutomaticPanel() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [drift, setDrift] = useState<{ fixable: DriftRow[]; needs_attention: DriftRow[] } | null>(null);
  const [reason, setReason] = useState('Sync stored hierarchy with the approved structure');
  const [result, setResult] = useState<Record<string, number> | null>(null);

  async function check() {
    setBusy(true); setError(null); setResult(null);
    try {
      const res = await fetch('/api/admin/hierarchy/sync', { headers: await authHeaders() });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof j.error === 'string' ? j.error : `Request failed (${res.status})`);
      setDrift(j);
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }

  async function apply() {
    setBusy(true); setError(null);
    try {
      const j = await post({ action: 'repair', reason });
      setResult(j.result);
      router.refresh();
      const res = await fetch('/api/admin/hierarchy/sync', { headers: await authHeaders() });
      if (res.ok) setDrift(await res.json());
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
        <div>
          <h2 className="text-lg font-bold text-navy-800">Automatic mode</h2>
          <p className="text-sm text-gray-600 max-w-2xl">
            Finds every club and member whose stored zone, region or district no longer matches the approved
            structure, and members without an assignment record. Nothing changes until you apply.
          </p>
        </div>
        <button type="button" onClick={check} disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 px-3 py-2 text-sm font-semibold text-navy-800 disabled:opacity-50">
          {busy ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} Check now
        </button>
      </div>

      {drift && (
        <div className="space-y-4">
          <DriftList title={`${drift.fixable.length} automatic fix${drift.fixable.length === 1 ? '' : 'es'}`} rows={drift.fixable} tone="fix" />
          <DriftList title={`${drift.needs_attention.length} need a person to resolve`} rows={drift.needs_attention} tone="attention" />
          {drift.fixable.length > 0 && (
            <div className="flex flex-col sm:flex-row gap-2">
              <input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={400}
                className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm" aria-label="Reason" />
              <button type="button" onClick={apply} disabled={busy || reason.trim().length < 3}
                className="btn-navy inline-flex items-center gap-1.5 rounded-md px-4 py-2 text-sm disabled:opacity-50">
                <Wand2 size={14} /> Apply {drift.fixable.length} fix{drift.fixable.length === 1 ? '' : 'es'}
              </button>
            </div>
          )}
        </div>
      )}
      {result && (
        <p className="mt-3 flex gap-1.5 text-sm text-emerald-700">
          <CheckCircle2 size={16} className="mt-0.5" />
          Updated {result.zones_updated} zones, {result.clubs_updated} clubs, {result.members_updated} members; recorded {result.assignments_backfilled} assignments.
        </p>
      )}
      {error && <p className="mt-3 flex gap-1.5 text-sm text-red-700"><AlertCircle size={14} className="mt-0.5" />{error}</p>}
    </section>
  );
}

function DriftList({ title, rows, tone }: { title: string; rows: DriftRow[]; tone: 'fix' | 'attention' }) {
  if (!rows.length) return <p className="text-sm text-gray-500">{title}.</p>;
  return (
    <details className="rounded-lg border border-gray-200" open={rows.length <= 10}>
      <summary className={`cursor-pointer px-3 py-2 text-sm font-semibold ${tone === 'fix' ? 'text-navy-800' : 'text-amber-800'}`}>{title}</summary>
      <ul className="divide-y divide-gray-100 max-h-72 overflow-y-auto">
        {rows.map((r) => (
          <li key={`${r.entity}-${r.entity_id}-${r.field}`} className="px-3 py-2 text-sm flex justify-between gap-3">
            <span><span className="text-xs uppercase tracking-wider text-gray-500 mr-2">{r.entity}</span>{r.entity_name}</span>
            <span className="text-gray-600 text-right">{FIELD_LABEL[r.field] ?? r.field}</span>
          </li>
        ))}
      </ul>
    </details>
  );
}

type MovePreview = {
  unchanged: boolean; members: number; warnings: string[];
  clubs: { name: string; members: number; from_region?: string | null; from_district?: string | null }[];
  zones?: string[];
};

function MovePanel({ title, subjectLabel, subjects, targetLabel, targets, build }: {
  title: string; subjectLabel: string; subjects: Option[]; targetLabel: string; targets: Option[];
  build: (subject: string, target: string, reason: string, preview: boolean) => unknown;
}) {
  const router = useRouter();
  const [subject, setSubject] = useState('');
  const [target, setTarget] = useState('');
  const [reason, setReason] = useState('');
  const [preview, setPreview] = useState<MovePreview | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reset = () => { setPreview(null); setDone(null); setError(null); };
  const input = 'w-full rounded-md border border-gray-300 px-3 py-2 text-sm';

  async function run(apply: boolean) {
    setBusy(true); setError(null);
    try {
      const j = await post(build(subject, target, reason, !apply));
      setPreview(j.preview);
      if (apply) { setDone(j.result?.status === 'unchanged' ? 'No change was needed.' : 'Moved. Clubs and members below it were updated.'); router.refresh(); }
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5">
      <h2 className="text-lg font-bold text-navy-800 mb-1">{title}</h2>
      <p className="text-xs text-gray-500 mb-4">Manual mode — clubs keep their members; their region and district follow automatically.</p>
      <div className="space-y-3">
        <label className="block"><span className="text-xs font-semibold uppercase tracking-wider text-gray-500">{subjectLabel}</span>
          <select className={input} value={subject} onChange={(e) => { setSubject(e.target.value); reset(); }}>
            <option value="">Select…</option>{subjects.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
        </label>
        <label className="block"><span className="text-xs font-semibold uppercase tracking-wider text-gray-500">New {targetLabel.toLowerCase()}</span>
          <select className={input} value={target} onChange={(e) => { setTarget(e.target.value); reset(); }}>
            {targetLabel === 'District' && <option value="">Select…</option>}
            {targets.map((o) => <option key={o.id || 'none'} value={o.id}>{o.name}</option>)}
          </select>
        </label>
        <label className="block"><span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Reason (required to apply)</span>
          <input className={input} value={reason} maxLength={400} onChange={(e) => setReason(e.target.value)} />
        </label>
      </div>

      {preview && (
        <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm">
          {preview.unchanged ? <p className="text-gray-600">Already in place — nothing would change.</p> : (
            <>
              <p className="font-semibold text-navy-800 mb-1">{preview.clubs.length} club{preview.clubs.length === 1 ? '' : 's'}, {preview.members} member{preview.members === 1 ? '' : 's'} affected</p>
              {preview.zones && <p className="text-xs text-gray-600 mb-1">Zones: {preview.zones.join(', ') || 'none'}</p>}
              <ul className="text-xs text-gray-600 space-y-0.5">
                {preview.clubs.map((c) => <li key={c.name}>{c.name} · {c.members} members</li>)}
              </ul>
            </>
          )}
          {preview.warnings.map((w) => <p key={w} className="mt-1 flex gap-1.5 text-amber-700"><AlertTriangle size={14} className="mt-0.5" />{w}</p>)}
        </div>
      )}
      {done && <p className="mt-3 flex gap-1.5 text-sm text-emerald-700"><CheckCircle2 size={16} className="mt-0.5" />{done}</p>}
      {error && <p className="mt-3 flex gap-1.5 text-sm text-red-700"><AlertCircle size={14} className="mt-0.5" />{error}</p>}

      <div className="mt-4 flex justify-end gap-2">
        <button type="button" onClick={() => run(false)} disabled={busy || !subject || (targetLabel === 'District' && !target)}
          className="rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold text-navy-800 disabled:opacity-50">Preview</button>
        <button type="button" onClick={() => run(true)} disabled={busy || !preview || preview.unchanged || !!done || reason.trim().length < 3}
          className="btn-navy rounded-md px-4 py-2 text-sm disabled:opacity-50">
          {busy ? <Loader2 size={14} className="inline animate-spin" /> : 'Apply move'}
        </button>
      </div>
    </section>
  );
}
