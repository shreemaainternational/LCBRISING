'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Send, Loader2, AlertCircle, CheckCircle2, Megaphone, Pin } from 'lucide-react';

interface Props {
  zones: { id: string; code: string; name: string }[];
  clubs: { id: string; name: string }[];
}

type Channel = 'portal' | 'email' | 'whatsapp' | 'push' | 'sms';
const CHANNELS: { key: Channel; label: string }[] = [
  { key: 'portal', label: 'Portal' },
  { key: 'email', label: 'Email' },
  { key: 'push', label: 'Push' },
  { key: 'whatsapp', label: 'WhatsApp' },
  { key: 'sms', label: 'SMS' },
];

export function CircularComposer({ zones, clubs }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [priority, setPriority] = useState<'info' | 'important' | 'urgent'>('info');
  const [category, setCategory] = useState('');
  const [channels, setChannels] = useState<Channel[]>(['portal', 'email']);
  const [targetZones, setTargetZones] = useState<string[]>([]);
  const [targetClubs, setTargetClubs] = useState<string[]>([]);
  const [pinned, setPinned] = useState(false);

  function toggleChannel(c: Channel) {
    setChannels((s) => s.includes(c) ? s.filter((x) => x !== c) : [...s, c]);
  }
  function toggleZone(id: string) {
    setTargetZones((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id]);
  }

  function submit() {
    setResult(null);
    if (!subject.trim() || !body.trim()) {
      setResult({ ok: false, msg: 'Subject and body are required.' });
      return;
    }
    if (channels.length === 0) {
      setResult({ ok: false, msg: 'Pick at least one channel.' });
      return;
    }
    start(async () => {
      const res = await fetch('/api/district/circulars', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject, body, priority,
          category: category || undefined,
          channels,
          target_zone_ids: targetZones.length ? targetZones : undefined,
          target_club_ids: targetClubs.length ? targetClubs : undefined,
          pinned,
          send_now: true,
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) { setResult({ ok: false, msg: j.error ?? `HTTP ${res.status}` }); return; }
      setResult({ ok: true, msg: `Sent · ${j.circular?.reference_no ?? 'queued'}` });
      setSubject(''); setBody(''); setCategory(''); setPinned(false);
      router.refresh();
    });
  }

  return (
    <div className="bg-white rounded-xl border shadow-sm p-4 sticky top-4">
      <h3 className="font-semibold text-navy-800 inline-flex items-center gap-2 mb-3">
        <Megaphone size={14} className="text-amber-500" /> Compose circular
      </h3>

      <div className="space-y-3">
        <label className="block">
          <span className="block text-xs font-semibold text-gray-700 mb-1">Subject *</span>
          <input value={subject} onChange={(e) => setSubject(e.target.value)}
            className={cls} placeholder="DG advisory — Q3 service projects" />
        </label>

        <div className="grid grid-cols-2 gap-2">
          <label className="block">
            <span className="block text-xs font-semibold text-gray-700 mb-1">Priority</span>
            <select value={priority} onChange={(e) => setPriority(e.target.value as typeof priority)} className={cls}>
              <option value="info">Info</option>
              <option value="important">Important</option>
              <option value="urgent">Urgent</option>
            </select>
          </label>
          <label className="block">
            <span className="block text-xs font-semibold text-gray-700 mb-1">Category</span>
            <input value={category} onChange={(e) => setCategory(e.target.value)}
              className={cls} placeholder="service week / policy" />
          </label>
        </div>

        <label className="block">
          <span className="block text-xs font-semibold text-gray-700 mb-1">Message *</span>
          <textarea rows={6} value={body} onChange={(e) => setBody(e.target.value)}
            className={cls} placeholder="Dear Club Presidents,&#10;…" />
        </label>

        <div>
          <div className="text-xs font-semibold text-gray-700 mb-1">Channels</div>
          <div className="flex flex-wrap gap-1.5">
            {CHANNELS.map((c) => {
              const active = channels.includes(c.key);
              return (
                <button key={c.key} type="button" onClick={() => toggleChannel(c.key)}
                  className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${
                    active ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-amber-100'
                  }`}>
                  {c.label}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <div className="text-xs font-semibold text-gray-700 mb-1">
            Target zones (leave blank for the whole district)
          </div>
          <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
            {zones.length === 0 && <span className="text-xs text-gray-500 italic">No zones in this district yet.</span>}
            {zones.map((z) => {
              const active = targetZones.includes(z.id);
              return (
                <button key={z.id} type="button" onClick={() => toggleZone(z.id)}
                  className={`px-2 py-0.5 rounded text-[11px] ${active ? 'bg-blue-100 text-blue-700 border border-blue-400' : 'bg-gray-100 text-gray-600 border border-transparent'}`}>
                  {z.code}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <div className="text-xs font-semibold text-gray-700 mb-1">
            Specific clubs ({targetClubs.length} selected)
          </div>
          <select multiple size={Math.min(4, Math.max(2, clubs.length))}
            value={targetClubs}
            onChange={(e) => setTargetClubs(Array.from(e.target.selectedOptions, (o) => o.value))}
            className={`${cls} h-auto`}>
            {clubs.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        <label className="inline-flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} />
          <Pin size={12} /> Pin to top of the feed
        </label>

        <div className="flex items-center gap-2 pt-2 border-t">
          <button type="button" onClick={submit} disabled={pending}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold disabled:opacity-60">
            {pending ? <Loader2 className="animate-spin" size={14} /> : <Send size={14} />}
            {pending ? 'Sending…' : 'Send circular'}
          </button>
        </div>

        {result?.ok && (
          <p className="text-xs text-emerald-700 inline-flex items-center gap-1.5">
            <CheckCircle2 size={12} /> {result.msg}
          </p>
        )}
        {result && !result.ok && (
          <p className="text-xs text-rose-700 inline-flex items-center gap-1.5">
            <AlertCircle size={12} /> {result.msg}
          </p>
        )}
      </div>
    </div>
  );
}

const cls = 'w-full px-3 py-2 border rounded-md text-sm';
