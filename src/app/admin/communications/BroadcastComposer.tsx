'use client';

import { useState, useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';

type TemplateOption = {
  id: string;
  label: string;
  subject: string | null;
  body: string;
};

const SEGMENTS = [
  { value: 'all_active', label: 'All active members' },
  { value: 'by_district', label: 'By district (paste district id)' },
  { value: 'by_club', label: 'By club (paste club id)' },
  { value: 'officers_only', label: 'Officers only' },
] as const;

const CHANNELS = [
  { value: 'email', label: 'Email only' },
  { value: 'whatsapp', label: 'WhatsApp only' },
  { value: 'both', label: 'Email + WhatsApp' },
] as const;

type ApiResult = {
  ok?: boolean;
  dry_run?: boolean;
  recipient_count?: number;
  sample?: { name: string; email: string }[];
  emailSent?: number;
  emailFailed?: number;
  waSent?: number;
  waFailed?: number;
  error?: string;
};

export default function BroadcastComposer() {
  const router = useRouter();
  const [segment, setSegment] = useState<typeof SEGMENTS[number]['value']>('all_active');
  const [segmentId, setSegmentId] = useState('');
  const [channel, setChannel] = useState<typeof CHANNELS[number]['value']>('email');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [result, setResult] = useState<ApiResult | null>(null);
  const [pending, startTransition] = useTransition();
  const [templates, setTemplates] = useState<TemplateOption[]>([]);

  useEffect(() => {
    fetch('/api/admin/templates')
      .then((r) => r.json())
      .then((d) => setTemplates(d.templates ?? []))
      .catch(() => setTemplates([]));
  }, []);

  function applyTemplate(id: string) {
    const t = templates.find((x) => x.id === id);
    if (!t) return;
    if (t.subject) setSubject(t.subject);
    setBody(t.body);
  }

  async function call(dry: boolean) {
    setResult(null);
    const res = await fetch('/api/admin/broadcast', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        segment,
        segment_id: segmentId || undefined,
        channel,
        subject: subject || undefined,
        body,
        dry_run: dry,
      }),
    });
    const json = (await res.json().catch(() => ({}))) as ApiResult;
    if (!res.ok) {
      setResult({ error: json.error ?? `HTTP ${res.status}` });
      return;
    }
    setResult(json);
    if (!dry) startTransition(() => router.refresh());
  }

  return (
    <div className="grid gap-4">
      {templates.length > 0 && (
        <label className="text-sm">
          <span className="block mb-1 text-gray-600">Load a saved template</span>
          <select
            defaultValue=""
            onChange={(e) => { applyTemplate(e.target.value); e.currentTarget.value = ''; }}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white"
          >
            <option value="" disabled>Choose a template…</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>{t.label}</option>
            ))}
          </select>
        </label>
      )}

      <div className="grid sm:grid-cols-2 gap-3">
        <label className="text-sm">
          <span className="block mb-1 text-gray-600">Recipient segment</span>
          <select
            value={segment}
            onChange={(e) => setSegment(e.target.value as typeof segment)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white"
          >
            {SEGMENTS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="block mb-1 text-gray-600">Channel</span>
          <select
            value={channel}
            onChange={(e) => setChannel(e.target.value as typeof channel)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white"
          >
            {CHANNELS.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </label>
      </div>

      {(segment === 'by_district' || segment === 'by_club') && (
        <label className="text-sm">
          <span className="block mb-1 text-gray-600">Segment id (UUID)</span>
          <input
            type="text"
            value={segmentId}
            onChange={(e) => setSegmentId(e.target.value)}
            placeholder="00000000-0000-0000-0000-000000000000"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-mono"
          />
        </label>
      )}

      {(channel === 'email' || channel === 'both') && (
        <label className="text-sm">
          <span className="block mb-1 text-gray-600">Email subject</span>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Lions Club update — Monthly newsletter"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </label>
      )}

      <label className="text-sm">
        <span className="block mb-1 text-gray-600">Message body</span>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={8}
          placeholder="Hi team, our next service project is on…"
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-mono"
        />
        <span className="block text-xs text-gray-500 mt-1">
          Email accepts HTML. WhatsApp converts HTML tags to plain text.
        </span>
      </label>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => call(true)}
          disabled={pending || !body}
          className="rounded-md border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50 disabled:opacity-50"
        >
          Preview recipients
        </button>
        <button
          type="button"
          onClick={() => {
            if (confirm(`Send to all ${segment.replace(/_/g, ' ')} members via ${channel}?`)) {
              call(false);
            }
          }}
          disabled={pending || !body || (channel !== 'whatsapp' && !subject)}
          className="rounded-md bg-navy-800 hover:bg-navy-900 text-white px-5 py-2 text-sm font-medium disabled:opacity-50"
        >
          {pending ? 'Sending…' : 'Send broadcast'}
        </button>
      </div>

      {result && (
        <div
          className={`rounded-md border p-3 text-sm ${
            result.error
              ? 'border-red-300 bg-red-50 text-red-800'
              : 'border-emerald-300 bg-emerald-50 text-emerald-800'
          }`}
        >
          {result.error ? (
            <strong>Error: {result.error}</strong>
          ) : result.dry_run ? (
            <>
              <strong>{result.recipient_count}</strong> recipients would receive this.
              {result.sample && result.sample.length > 0 && (
                <ul className="mt-2 text-xs list-disc list-inside">
                  {result.sample.map((s, i) => (
                    <li key={i}>{s.name} — {s.email}</li>
                  ))}
                  {(result.recipient_count ?? 0) > result.sample.length && (
                    <li>… and {(result.recipient_count ?? 0) - result.sample.length} more</li>
                  )}
                </ul>
              )}
            </>
          ) : (
            <>
              Sent. <strong>{result.recipient_count}</strong> recipients.
              {typeof result.emailSent === 'number' && (
                <> Email: {result.emailSent} sent, {result.emailFailed} failed.</>
              )}
              {typeof result.waSent === 'number' && (
                <> WhatsApp: {result.waSent} sent, {result.waFailed} failed.</>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
