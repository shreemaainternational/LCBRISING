'use client';

import { useState } from 'react';

type Props = {
  invoiceId: string;
  hasPhone: boolean;
  hasEmail: boolean;
};

export function SendInvoiceButton({ invoiceId, hasPhone, hasEmail }: Props) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  if (!hasPhone && !hasEmail) return null;

  async function send(channels: ('whatsapp' | 'email')[]) {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/invoices/${invoiceId}/send`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ channels }),
      });
      const json = (await res.json()) as { ok?: boolean; results?: Record<string, { ok: boolean; error?: string }>; error?: string };
      if (!res.ok || !json.ok) {
        setMsg(json.error ?? 'send failed');
      } else {
        const summary = Object.entries(json.results ?? {})
          .map(([k, v]) => `${k}: ${v.ok ? '✓' : v.error ?? 'failed'}`)
          .join(' · ');
        setMsg(summary || 'sent');
      }
    } catch {
      setMsg('network error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="inline-flex items-center gap-2">
      {hasPhone && (
        <button
          type="button"
          onClick={() => send(['whatsapp'])}
          disabled={busy}
          className="text-green-700 hover:underline disabled:opacity-50"
        >
          WhatsApp
        </button>
      )}
      {hasEmail && (
        <button
          type="button"
          onClick={() => send(['email'])}
          disabled={busy}
          className="text-blue-700 hover:underline disabled:opacity-50"
        >
          Email
        </button>
      )}
      {msg && <span className="text-gray-500">· {msg}</span>}
    </span>
  );
}
