'use client';

import { useMemo, useState } from 'react';
import { ArrowRight, Loader2, X, AlertTriangle, CheckCircle2, AlertCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

type ClubOption = { id: string; name: string };
type Placement = {
  club_name: string; zone_name: string | null; region_name: string | null; district_code: string | null;
} | null;
type SinglePreview = {
  member: { name: string; lions_member_id: string | null };
  from: Placement; to: Placement; effective_on: string; lions_year: string;
  blockers: string[]; warnings: string[];
};
type BulkRow = { member_id: string; name: string | null; status: string; detail?: string; from?: string };
type BulkResponse = { to: string; summary: Record<string, number>; results: BulkRow[] };

async function authHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  try {
    const { data: { session } } = await createClient().auth.getSession();
    if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;
  } catch { /* cookie auth */ }
  return headers;
}

function label(p: Placement) {
  if (!p) return 'No club';
  return [p.club_name, p.zone_name, p.region_name, p.district_code && `District ${p.district_code}`].filter(Boolean).join(' · ');
}

const STATUS_STYLE: Record<string, string> = {
  ready: 'text-navy-700', transferred: 'text-emerald-700', unchanged: 'text-gray-500',
  duplicate: 'text-gray-500', skipped: 'text-amber-700', forbidden: 'text-red-700', failed: 'text-red-700',
};

/**
 * Transfer one or more members to another club: choose → preview → confirm.
 * One request/batch id per dialog, so retrying after a network error never
 * applies the same transfer twice.
 */
export function TransferDialog({
  members, clubs, initialClubId, onClose, onDone,
}: {
  members: { id: string; name: string | null }[];
  clubs: ClubOption[];
  initialClubId?: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const bulk = members.length > 1;
  const requestId = useMemo(() => crypto.randomUUID(), []);
  const [toClub, setToClub] = useState(initialClubId ?? '');
  const [effectiveOn, setEffectiveOn] = useState(() => new Date().toISOString().slice(0, 10));
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<SinglePreview | null>(null);
  const [bulkPreview, setBulkPreview] = useState<BulkResponse | null>(null);
  const [result, setResult] = useState<BulkResponse | { status: string; history_recorded: boolean } | null>(null);

  const invalidate = () => { setPreview(null); setBulkPreview(null); setResult(null); setError(null); };

  async function call(apply: boolean) {
    setBusy(true); setError(null);
    try {
      const body = bulk
        ? { member_ids: members.map((m) => m.id), to_club_id: toClub, effective_on: effectiveOn, reason, preview: !apply, batch_id: requestId }
        : { to_club_id: toClub, effective_on: effectiveOn, reason, preview: !apply, request_id: requestId };
      const url = bulk ? '/api/crm/members/transfer' : `/api/crm/members/${members[0].id}/transfer`;
      const res = await fetch(url, { method: 'POST', headers: await authHeaders(), body: JSON.stringify(body) });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof j.error === 'string' ? j.error : `Request failed (${res.status})`);
        if (j.preview) setPreview(j.preview);
        return;
      }
      if (!apply) { if (bulk) setBulkPreview(j); else setPreview(j.preview); return; }
      setResult(bulk ? j : { status: j.status, history_recorded: j.history_recorded });
      onDone();
    } catch {
      setError('Network error — nothing was changed. You can safely try again.');
    } finally {
      setBusy(false);
    }
  }

  const canPreview = !!toClub && /^\d{4}-\d{2}-\d{2}$/.test(effectiveOn);
  const blocked = !!preview?.blockers.length;
  const readyCount = bulkPreview?.summary.ready ?? 0;
  const canApply = !result && reason.trim().length >= 3 && (bulk ? readyCount > 0 : !!preview && !blocked);
  const input = 'w-full px-3 py-2 rounded-md border border-gray-300 text-sm';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-labelledby="transfer-title">
      <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h2 id="transfer-title" className="text-lg font-bold text-navy-800">
            Transfer {bulk ? `${members.length} members` : members[0].name ?? 'member'}
          </h2>
          <button type="button" onClick={onClose} aria-label="Close" className="text-gray-400 hover:text-gray-700"><X size={18} /></button>
        </div>

        <div className="space-y-4 px-5 py-4">
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Target club</span>
            <select className={input} value={toClub} onChange={(e) => { setToClub(e.target.value); invalidate(); }} disabled={!!result}>
              <option value="">Select a club…</option>
              {clubs.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Effective date</span>
              <input type="date" className={input} value={effectiveOn} onChange={(e) => { setEffectiveOn(e.target.value); invalidate(); }} disabled={!!result} />
            </label>
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Reason (required)</span>
              <input className={input} value={reason} maxLength={500} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Relocated to Halol" disabled={!!result} />
            </label>
          </div>

          {preview && (
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm space-y-2">
              <div className="font-semibold text-navy-800">
                {preview.member.name}{preview.member.lions_member_id && <span className="font-normal text-gray-500"> · #{preview.member.lions_member_id}</span>}
              </div>
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                <div><div className="text-xs text-gray-500">From</div>{label(preview.from)}</div>
                <ArrowRight size={16} className="text-gray-400" aria-hidden />
                <div><div className="text-xs text-gray-500">To</div>{label(preview.to)}</div>
              </div>
              <div className="text-xs text-gray-600">Effective {preview.effective_on} · Lionistic Year {preview.lions_year}</div>
              {preview.blockers.map((b) => <p key={b} className="flex gap-1.5 text-red-700"><AlertCircle size={14} className="mt-0.5 flex-shrink-0" />{b}</p>)}
              {preview.warnings.map((w) => <p key={w} className="flex gap-1.5 text-amber-700"><AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />{w}</p>)}
            </div>
          )}

          {(bulkPreview || (result && 'results' in result)) && (() => {
            const data = (result && 'results' in result ? result : bulkPreview)!;
            return (
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm">
                <div className="mb-2 text-xs text-gray-600">To {data.to} · {Object.entries(data.summary).map(([k, v]) => `${v} ${k}`).join(', ')}</div>
                <ul className="max-h-56 overflow-y-auto divide-y divide-gray-200">
                  {data.results.map((r) => (
                    <li key={r.member_id} className="py-1.5 flex justify-between gap-3">
                      <span className="text-navy-800">{r.name ?? r.member_id}<span className="block text-xs text-gray-500">{r.from}</span></span>
                      <span className={`text-xs font-semibold text-right ${STATUS_STYLE[r.status] ?? ''}`}>{r.status}{r.detail && <span className="block font-normal">{r.detail}</span>}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })()}

          {result && !('results' in result) && (
            <p className="flex gap-1.5 text-sm text-emerald-700">
              <CheckCircle2 size={16} className="mt-0.5" />
              {result.status === 'transferred' ? 'Transfer completed.' : `No change (${result.status}).`}
              {!result.history_recorded && ' Recorded in the audit log only — assignment history is not enabled yet.'}
            </p>
          )}
          {error && <p className="flex gap-1.5 text-sm text-red-700"><AlertCircle size={14} className="mt-0.5" />{error}</p>}
        </div>

        <div className="flex justify-end gap-2 border-t px-5 py-4">
          {result ? (
            <button type="button" onClick={onClose} className="btn-navy rounded-md px-4 py-2 text-sm">Close</button>
          ) : (
            <>
              <button type="button" onClick={() => call(false)} disabled={!canPreview || busy}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold text-navy-800 disabled:opacity-50">
                {busy && !canApply ? <Loader2 size={14} className="inline animate-spin" /> : 'Preview'}
              </button>
              <button type="button" onClick={() => call(true)} disabled={!canApply || busy}
                className="btn-navy rounded-md px-4 py-2 text-sm disabled:opacity-50" title={reason.trim().length < 3 ? 'Enter a reason first' : undefined}>
                {busy && canApply ? <Loader2 size={14} className="inline animate-spin" /> : bulk ? `Transfer ${readyCount}` : 'Confirm transfer'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
