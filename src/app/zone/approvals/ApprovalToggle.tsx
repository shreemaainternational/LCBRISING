'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, ToggleLeft, ToggleRight } from 'lucide-react';

interface Props { zoneId: string; initial: boolean }

export function ApprovalToggle({ zoneId, initial }: Props) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(initial);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function toggle() {
    setError(null);
    const next = !enabled;
    start(async () => {
      const res = await fetch('/api/zone/approval-settings', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ zone_id: zoneId, require_activity_approval: next }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) { setError(j.error ?? `HTTP ${res.status}`); return; }
      setEnabled(next);
      router.refresh();
    });
  }

  return (
    <div className="bg-white rounded-xl border shadow-sm px-3 py-2 flex items-center gap-3">
      <div className="text-xs text-gray-600">
        <div className="font-semibold text-navy-800">Approval gating</div>
        <div>{enabled ? 'New activities wait for review' : 'New activities auto-publish'}</div>
      </div>
      <button type="button" onClick={toggle} disabled={pending}
        className={`inline-flex items-center gap-1 px-3 py-2 rounded-md text-sm font-semibold ${
          enabled ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        }`}>
        {pending ? <Loader2 className="animate-spin" size={14} /> : enabled ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
        {enabled ? 'On' : 'Off'}
      </button>
      {error && <span className="text-xs text-rose-700">{error}</span>}
    </div>
  );
}
