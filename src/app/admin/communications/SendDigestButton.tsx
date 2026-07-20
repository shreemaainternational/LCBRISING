'use client';

import { useState, useTransition } from 'react';
import { Send, Loader2, Check, AlertTriangle } from 'lucide-react';

/**
 * Fires the weekly officer digest on demand. Confirms first because it
 * sends real email + WhatsApp to every officer-level member.
 */
export function SendDigestButton() {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  function send() {
    if (!window.confirm('Send the weekly digest to all officers now? This delivers real email and WhatsApp messages.')) {
      return;
    }
    setMsg(null);
    start(async () => {
      try {
        const res = await fetch('/api/admin/comms/digest', { method: 'POST' });
        const data = await res.json();
        setMsg(
          res.ok && data.ok
            ? { ok: true, text: 'Digest sent to officers.' }
            : { ok: false, text: data.error || `Completed with ${data.failed ?? '?'} failure(s).` },
        );
      } catch {
        setMsg({ ok: false, text: 'Request failed.' });
      }
    });
  }

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={send}
        disabled={pending}
        className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-semibold text-navy-800 hover:bg-gray-50 disabled:opacity-60"
      >
        {pending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
        Send weekly digest now
      </button>
      {msg && (
        <span
          className={`inline-flex items-center gap-1 text-xs ${
            msg.ok ? 'text-green-700' : 'text-red-700'
          }`}
        >
          {msg.ok ? <Check size={13} /> : <AlertTriangle size={13} />}
          {msg.text}
        </span>
      )}
    </div>
  );
}
