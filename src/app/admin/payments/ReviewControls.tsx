'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function ReviewControls({ proofId }: { proofId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function review(decision: 'verified' | 'rejected') {
    setBusy(true);
    setError(null);
    let rejection_reason: string | undefined;
    if (decision === 'rejected') {
      const reason = window.prompt('Reason for rejection (shown to customer)?');
      if (!reason) {
        setBusy(false);
        return;
      }
      rejection_reason = reason;
    }
    try {
      const res = await fetch('/api/payments/review', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ proof_id: proofId, decision, rejection_reason }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) {
        setError(json.error ?? 'failed');
      } else {
        router.refresh();
      }
    } catch {
      setError('network error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex gap-2 items-center">
      <button
        onClick={() => review('verified')}
        disabled={busy}
        className="h-9 px-4 rounded-md bg-green-600 text-white text-sm font-medium hover:bg-green-700 disabled:opacity-60"
      >
        Verify
      </button>
      <button
        onClick={() => review('rejected')}
        disabled={busy}
        className="h-9 px-4 rounded-md bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-60"
      >
        Reject
      </button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
