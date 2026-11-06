'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import {
  Loader2, CheckCircle2, XCircle, AlertTriangle, Sparkles, Send, ExternalLink, ShieldCheck,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';

type ChecklistItem = { key: string; label: string; ok: boolean; hint: string };
type Duplicate = { source: string; activityId: string; title: string; date: string; lionsReportId: string | null } | null;

interface LionsState {
  status: 'not_submitted' | 'validated' | 'ready' | 'submitted';
  description: string | null;
  reportId: string | null;
  submittedAt: string | null;
  validation: { items: ChecklistItem[]; allOk: boolean };
  duplicate: Duplicate;
  canSubmit: boolean;
}

const DUPLICATE_LABEL: Record<string, string> = {
  already_submitted: 'This activity is already recorded as submitted.',
  reconciled_import: 'A Lions Portal export already reconciled this activity.',
  similar_open_activity: 'A near-duplicate activity (same club, title & date) was already submitted.',
};

const STATUS_LABEL: Record<LionsState['status'], string> = {
  not_submitted: 'Not started',
  validated: 'Validated',
  ready: 'Ready for Lions Portal',
  submitted: 'Submitted',
};

export function LionsPortalPanel({
  activityId,
  activityRef,
  title,
  date,
  cause,
  beneficiaries,
  lionHours,
  portalUrl,
}: {
  activityId: string;
  activityRef: string;
  title: string;
  date: string;
  cause: string;
  beneficiaries: number;
  lionHours: number;
  portalUrl: string | null;
}) {
  const [state, setState] = useState<LionsState | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [reportIdInput, setReportIdInput] = useState('');

  const activeRef = useRef(true);
  useEffect(() => () => { activeRef.current = false; }, []);

  const applyResult = useCallback((ok: boolean, j: LionsState & { error?: string }) => {
    if (!activeRef.current) return;
    if (ok) {
      setState(j);
      setDraft((cur) => cur || j.description || '');
    } else {
      setError(j.error ?? 'Failed to load');
    }
    setLoading(false);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/activities/${activityId}/lions`);
      const j = await res.json();
      applyResult(res.ok, j);
    } catch {
      if (activeRef.current) { setError('Failed to load'); setLoading(false); }
    }
  }, [activityId, applyResult]);

  useEffect(() => {
    let active = true;
    fetch(`/api/activities/${activityId}/lions`)
      .then((r) => r.json().then((j) => ({ ok: r.ok, j })))
      .then(({ ok, j }) => { if (active) applyResult(ok, j); })
      .catch(() => { if (active) { setError('Failed to load'); setLoading(false); } });
    return () => { active = false; };
  }, [activityId, applyResult]);

  async function call(path: string, body?: Record<string, unknown>) {
    setBusy(path);
    setError(null);
    try {
      const res = await fetch(`/api/activities/${activityId}/lions${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(describeError(j));
        return false;
      }
      await load();
      return true;
    } catch {
      setError('Request failed');
      return false;
    } finally {
      setBusy(null);
    }
  }

  if (loading && !state) {
    return (
      <div className="bg-white rounded-2xl shadow-sm p-6 flex items-center gap-2 text-gray-500 text-sm">
        <Loader2 className="animate-spin" size={16} /> Loading Lions Report Validator…
      </div>
    );
  }
  if (!state) {
    return (
      <div className="bg-white rounded-2xl shadow-sm p-6 text-sm text-red-700">
        Couldn&apos;t load Lions Portal status{error ? `: ${error}` : ''}.
      </div>
    );
  }

  const { validation, duplicate, status, canSubmit } = state;

  return (
    <div className="bg-white rounded-2xl shadow-sm p-5 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider flex items-center gap-2">
          <ShieldCheck size={16} className="text-blue-600" /> Lions Report Validator
        </h2>
        <StatusBadge status={status} />
      </div>

      {/* Checklist */}
      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5">
        {validation.items.map((it) => (
          <li key={it.key} className="flex items-start gap-2 text-sm">
            {it.ok
              ? <CheckCircle2 size={15} className="text-emerald-600 mt-0.5 shrink-0" />
              : <XCircle size={15} className="text-red-500 mt-0.5 shrink-0" />}
            <span>
              <span className="font-medium text-gray-800">{it.label}</span>
              {!it.ok && <span className="block text-xs text-gray-500">{it.hint}</span>}
            </span>
          </li>
        ))}
      </ul>

      {duplicate && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <div>
            <div className="font-semibold">Possible duplicate submission</div>
            <div>{DUPLICATE_LABEL[duplicate.source] ?? 'Already appears to be reported.'}</div>
            {duplicate.lionsReportId && (
              <div className="text-xs mt-1">Lions reference: <span className="font-mono">{duplicate.lionsReportId}</span></div>
            )}
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs text-red-700">{error}</div>
      )}

      {status !== 'submitted' && (
        <>
          {/* Humanized description */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Humanized Lions Description</span>
              <button
                type="button"
                disabled={!validation.allOk || busy !== null}
                onClick={async () => { const ok = await call('/description', draft.trim() ? { text: draft.trim() } : {}); if (ok) { /* draft refreshed via load() */ } }}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 text-xs font-semibold hover:bg-blue-100 disabled:opacity-50"
              >
                {busy === '/description' ? <Loader2 className="animate-spin" size={12} /> : <Sparkles size={12} />}
                {draft.trim() ? 'Save description' : 'Generate description'}
              </button>
            </div>
            <textarea
              rows={4}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              disabled={!validation.allOk}
              placeholder={validation.allOk ? 'Click "Generate description" for an AI draft, or write one yourself.' : 'Complete the checklist above first.'}
              className="w-full px-3 py-2.5 border rounded-lg text-sm bg-white disabled:bg-gray-50 disabled:text-gray-400"
            />
          </div>

          <button
            type="button"
            disabled={!validation.allOk || !state.description || !!duplicate || busy !== null || status === 'ready'}
            onClick={() => call('/ready')}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-navy-800 text-white text-sm font-semibold disabled:opacity-50"
          >
            {busy === '/ready' ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle2 size={16} />}
            {status === 'ready' ? 'Ready for Lions Portal ✓' : 'Mark ready for Lions Portal'}
          </button>
        </>
      )}

      {(status === 'ready' || status === 'submitted') && (
        <div className="space-y-3 rounded-xl border p-4">
          <div className="text-xs font-semibold text-gray-600 uppercase tracking-wider">CRM ↔ Lion Portal field mapping</div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 uppercase tracking-wider">
                  <th className="py-1 pr-4">CRM</th>
                  <th className="py-1">Lion Portal</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                <MapRow crm="Activity ID" crmValue={activityRef} portal="Lions activity/reference" portalValue={state.reportId ?? '—'} />
                <MapRow crm="Activity name" crmValue={title} portal="Reported name" portalValue={title} />
                <MapRow crm="Date" crmValue={formatDate(date)} portal="Date" portalValue={formatDate(date)} />
                <MapRow crm="Cause" crmValue={cause} portal="Cause" portalValue={cause} />
                <MapRow crm="Beneficiaries" crmValue={String(beneficiaries)} portal="Beneficiaries" portalValue={String(beneficiaries)} />
                <MapRow crm="Lion Hours" crmValue={String(lionHours)} portal="Lion Hours" portalValue={String(lionHours)} />
                <MapRow
                  crm="Status"
                  crmValue={STATUS_LABEL[status]}
                  portal="Submitted/Not Submitted"
                  portalValue={status === 'submitted' ? 'Submitted' : 'Not Submitted'}
                />
              </tbody>
            </table>
          </div>

          {portalUrl && status !== 'submitted' && (
            <a href={portalUrl} target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 hover:underline">
              Open Lion Portal <ExternalLink size={12} />
            </a>
          )}

          {status === 'ready' && (
            canSubmit ? (
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <input
                  value={reportIdInput}
                  onChange={(e) => setReportIdInput(e.target.value)}
                  placeholder="Lions Report ID / confirmation from the portal"
                  className="flex-1 min-w-[220px] px-3 py-2 border rounded-lg text-sm"
                />
                <button
                  type="button"
                  disabled={reportIdInput.trim().length < 2 || busy !== null}
                  onClick={() => call('/submit', { lionsReportId: reportIdInput.trim() })}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-700 text-white text-sm font-semibold disabled:opacity-50"
                >
                  {busy === '/submit' ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
                  Record submission
                </button>
              </div>
            ) : (
              <div className="text-xs text-gray-500">
                Waiting on an authorized Lion (club president/secretary) to file this on the Lion Portal and record the confirmation.
              </div>
            )
          )}

          {status === 'submitted' && (
            <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700">
              <CheckCircle2 size={16} /> Submitted ✓
              {state.submittedAt && <span className="font-normal text-gray-500">on {formatDate(state.submittedAt)}</span>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: LionsState['status'] }) {
  const styles: Record<LionsState['status'], string> = {
    not_submitted: 'bg-gray-100 text-gray-600',
    validated: 'bg-blue-100 text-blue-700',
    ready: 'bg-amber-100 text-amber-800',
    submitted: 'bg-emerald-100 text-emerald-700',
  };
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${styles[status]}`}>
      {STATUS_LABEL[status]}
    </span>
  );
}

function MapRow({ crm, crmValue, portal, portalValue }: { crm: string; crmValue: string; portal: string; portalValue: string }) {
  return (
    <tr>
      <td className="py-1.5 pr-4">
        <div className="font-medium text-gray-800">{crm}</div>
        <div className="text-gray-500">{crmValue}</div>
      </td>
      <td className="py-1.5">
        <div className="font-medium text-gray-800">{portal}</div>
        <div className="text-gray-500">{portalValue}</div>
      </td>
    </tr>
  );
}

function describeError(j: { error?: string; duplicate?: Duplicate }): string {
  if (j.error === 'duplicate' && j.duplicate) return DUPLICATE_LABEL[j.duplicate.source] ?? 'Duplicate submission detected.';
  if (j.error === 'validation_failed') return 'Complete every checklist item first.';
  if (j.error === 'description_missing') return 'Generate or write a description first.';
  if (j.error === 'already_submitted') return 'This activity has already been submitted.';
  if (j.error === 'not_ready') return 'Mark the activity ready before submitting.';
  if (j.error === 'report_id_already_used') return 'That Lions Report ID is already recorded on another activity.';
  if (j.error === 'forbidden') return "You don't have permission for this step.";
  return j.error ?? 'Something went wrong.';
}
