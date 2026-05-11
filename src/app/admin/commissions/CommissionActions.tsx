'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function CommissionActions({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function markPaid() {
    const utr = window.prompt('Payout UTR (optional)?') ?? '';
    if (!window.confirm('Mark this commission as paid?')) return;
    setBusy(true);
    try {
      await fetch(`/api/commissions/${id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status: 'paid', paid_utr: utr.trim() || null }),
      });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function cancel() {
    if (!window.confirm('Cancel this commission?')) return;
    setBusy(true);
    try {
      await fetch(`/api/commissions/${id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status: 'cancelled' }),
      });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="flex items-center gap-3 text-xs">
      <button onClick={markPaid} disabled={busy} className="text-green-700 hover:underline disabled:opacity-50">Mark paid</button>
      <button onClick={cancel} disabled={busy} className="text-red-700 hover:underline disabled:opacity-50">Cancel</button>
    </span>
  );
}
