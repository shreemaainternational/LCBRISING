'use client';
import { useState, useTransition } from 'react';
import { Send, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

export function PushBroadcastForm({ disabled }: { disabled?: boolean }) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [url, setUrl] = useState('/m');
  const [pending, start] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; sent: number; failed: number; invalidated: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  function send() {
    setError(null); setResult(null);
    if (!title.trim()) { setError('Title is required'); return; }
    start(async () => {
      const res = await fetch('/api/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, body, url, target: { kind: 'broadcast' } }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) { setError(j.error ?? 'send_failed'); return; }
      setResult({ ok: true, ...j.result });
    });
  }

  return (
    <div className="space-y-4">
      <Field label="Title *">
        <input value={title} onChange={(e) => setTitle(e.target.value)} className={cls}
          placeholder="e.g. New Eye Camp this Saturday" maxLength={120} />
      </Field>
      <Field label="Body">
        <textarea rows={3} value={body} onChange={(e) => setBody(e.target.value)} className={cls}
          placeholder="Optional. ≤ 400 chars." maxLength={400} />
      </Field>
      <Field label="Deep-link URL">
        <input value={url} onChange={(e) => setUrl(e.target.value)} className={cls}
          placeholder="/m or https://…" />
      </Field>

      <div className="flex items-center gap-3 pt-2 border-t">
        <button type="button" onClick={send} disabled={disabled || pending}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-amber-500 hover:bg-amber-600 text-white font-medium text-sm disabled:opacity-60">
          {pending ? <Loader2 className="animate-spin" size={14} /> : <Send size={14} />}
          {pending ? 'Broadcasting…' : 'Broadcast to all devices'}
        </button>
        {result && (
          <span className="inline-flex items-center gap-1.5 text-sm text-green-700">
            <CheckCircle2 size={14} /> Sent {result.sent}, failed {result.failed}, invalidated {result.invalidated}
          </span>
        )}
        {error && (
          <span className="inline-flex items-center gap-1.5 text-sm text-red-700">
            <AlertCircle size={14} /> {error}
          </span>
        )}
      </div>
    </div>
  );
}

const cls = 'w-full px-3 py-2 border rounded-md text-sm';
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-gray-600 mb-1">{label}</span>
      {children}
    </label>
  );
}
