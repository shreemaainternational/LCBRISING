'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function RefundButton({
  paymentId,
  amount,
}: {
  paymentId: string;
  amount: number;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refund() {
    const reason = window.prompt('Reason for refund?');
    if (!reason) return;
    const utr = window.prompt('Refund UTR (if already paid back; leave blank to record as requested)?') ?? '';
    const status = utr.trim() ? 'processed' : 'requested';

    if (!window.confirm(`Refund ₹${amount.toLocaleString('en-IN')} as ${status}?`)) return;

    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/payments/${paymentId}/refund`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          reason,
          utr: utr.trim() || undefined,
          status,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setError(json.error ?? 'failed');
        return;
      }
      router.refresh();
    } catch {
      setError('network error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={refund}
        disabled={busy}
        className="text-red-700 hover:underline disabled:opacity-50 text-xs"
      >
        {busy ? '…' : 'Refund'}
      </button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </span>
  );
}
