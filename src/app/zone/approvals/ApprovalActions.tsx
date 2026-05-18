'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Check, X, MessageSquare, Loader2 } from 'lucide-react';

export function ApprovalActions({ activityId }: { activityId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<null | 'reject' | 'changes'>(null);

  function decide(action: 'approve' | 'reject' | 'request_changes') {
    if (action !== 'approve' && expanded == null) {
      setExpanded(action === 'reject' ? 'reject' : 'changes');
      return;
    }
    if (action !== 'approve' && !notes.trim()) {
      setError('Notes are required when rejecting or asking for changes.');
      return;
    }
    setError(null);
    start(async () => {
      const res = await fetch(`/api/zone/activities/${activityId}/approval`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, notes: notes.trim() || undefined }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) { setError(j.error ?? `HTTP ${res.status}`); return; }
      setNotes(''); setExpanded(null);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-end gap-2 shrink-0">
      <div className="flex gap-1.5">
        <button type="button" onClick={() => decide('approve')} disabled={pending}
          className="inline-flex items-center gap-1 px-3 py-2 rounded-md bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold disabled:opacity-60">
          {pending ? <Loader2 className="animate-spin" size={12} /> : <Check size={12} />} Approve
        </button>
        <button type="button" onClick={() => decide('request_changes')} disabled={pending}
          className="inline-flex items-center gap-1 px-3 py-2 rounded-md bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold">
          <MessageSquare size={12} /> Changes
        </button>
        <button type="button" onClick={() => decide('reject')} disabled={pending}
          className="inline-flex items-center gap-1 px-3 py-2 rounded-md border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-semibold">
          <X size={12} /> Reject
        </button>
      </div>
      {expanded && (
        <div className="w-full md:w-72">
          <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)}
            placeholder={expanded === 'reject' ? 'Reason for rejection…' : 'What needs to change?'}
            className="w-full px-2 py-1.5 border rounded text-xs" />
          <div className="flex justify-end gap-1.5 mt-1">
            <button type="button" onClick={() => { setExpanded(null); setNotes(''); setError(null); }}
              className="px-2 py-1 rounded text-xs text-gray-600">Cancel</button>
            <button type="button" onClick={() => decide(expanded === 'reject' ? 'reject' : 'request_changes')} disabled={pending}
              className="px-2 py-1 rounded bg-navy-900 text-white text-xs font-semibold disabled:opacity-60">
              Submit
            </button>
          </div>
        </div>
      )}
      {error && <p className="text-[11px] text-rose-700">{error}</p>}
    </div>
  );
}
