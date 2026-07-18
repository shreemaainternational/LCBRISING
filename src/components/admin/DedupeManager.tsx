'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, GitMerge, ArrowLeftRight, CheckCircle2, AlertCircle, Users, Activity, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/client';

type Side = { id: string; label: string; sub: string };
type Pair = { entity: 'member' | 'activity' | 'event'; keep: Side; drop: Side; matchers: string[]; score: number };
type ScanData = { members: Pair[]; activities: Pair[]; events: Pair[] };

async function authHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  try {
    const { data: { session } } = await createClient().auth.getSession();
    if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;
  } catch { /* cookie auth */ }
  return headers;
}

const ICON = { member: Users, activity: Activity, event: Calendar };
const TITLE = { member: 'Duplicate Members', activity: 'Duplicate Service Activities', event: 'Duplicate Events' };

export function DedupeManager({ initial }: { initial: ScanData }) {
  const router = useRouter();
  const [data, setData] = useState<ScanData>(initial);
  const [done, setDone] = useState<Record<string, 'merged' | 'error'>>({});
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [swapped, setSwapped] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const total = data.members.length + data.activities.length + data.events.length;
  const remaining = total - Object.values(done).filter((v) => v === 'merged').length;

  function keyOf(p: Pair) { return `${p.entity}:${p.keep.id}:${p.drop.id}`; }

  function merge(p: Pair) {
    const key = keyOf(p);
    const isSwapped = swapped[key];
    const keepId = isSwapped ? p.drop.id : p.keep.id;
    const dropId = isSwapped ? p.keep.id : p.drop.id;
    setError(null);
    setBusyKey(key);
    start(async () => {
      try {
        const res = await fetch('/api/crm/dedupe', {
          method: 'POST', headers: await authHeaders(),
          body: JSON.stringify({ entity: p.entity, keep_id: keepId, drop_id: dropId }),
        });
        const j = await res.json().catch(() => ({}));
        if (!res.ok) { setError(j.error ?? `Merge failed (${res.status})`); setDone((s) => ({ ...s, [key]: 'error' })); return; }
        setDone((s) => ({ ...s, [key]: 'merged' }));
        router.refresh();
      } catch {
        setError('Network error during merge.');
        setDone((s) => ({ ...s, [key]: 'error' }));
      } finally {
        setBusyKey(null);
      }
    });
  }

  function renderSection(entity: Pair['entity'], pairs: Pair[]) {
    const Icon = ICON[entity];
    return (
      <Card>
        <CardHeader><CardTitle className="inline-flex items-center gap-2"><Icon size={16} className="text-amber-500" /> {TITLE[entity]} ({pairs.length})</CardTitle></CardHeader>
        <CardContent className="p-0">
          {pairs.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-500">No duplicates detected.</div>
          ) : (
            <ul className="divide-y">
              {pairs.map((p) => {
                const key = keyOf(p);
                const state = done[key];
                const isSwapped = swapped[key];
                const keep = isSwapped ? p.drop : p.keep;
                const drop = isSwapped ? p.keep : p.drop;
                return (
                  <li key={key} className={`p-4 ${state === 'merged' ? 'bg-green-50/50' : ''}`}>
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      {p.matchers.map((m) => (
                        <span key={m} className="text-[10px] uppercase tracking-wider font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">{m}</span>
                      ))}
                      {state === 'merged' && <span className="inline-flex items-center gap-1 text-xs text-green-700"><CheckCircle2 size={13} /> merged</span>}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr_auto] items-center gap-3">
                      <div className="rounded-md border border-emerald-200 bg-emerald-50/50 p-2.5">
                        <div className="text-[10px] uppercase font-bold text-emerald-700">Keep</div>
                        <div className="text-sm font-semibold text-navy-800">{keep.label}</div>
                        <div className="text-xs text-gray-500">{keep.sub || '—'}</div>
                      </div>
                      <button type="button" onClick={() => setSwapped((s) => ({ ...s, [key]: !s[key] }))}
                        disabled={state === 'merged'} title="Swap which record is kept"
                        className="justify-self-center p-2 rounded-md border text-gray-500 hover:bg-gray-50 disabled:opacity-40">
                        <ArrowLeftRight size={14} />
                      </button>
                      <div className="rounded-md border border-red-200 bg-red-50/40 p-2.5">
                        <div className="text-[10px] uppercase font-bold text-red-700">{entity === 'member' ? 'Merge & hide' : 'Delete'}</div>
                        <div className="text-sm font-semibold text-navy-800">{drop.label}</div>
                        <div className="text-xs text-gray-500">{drop.sub || '—'}</div>
                      </div>
                      <button type="button" onClick={() => merge(p)} disabled={state === 'merged' || (pending && busyKey === key)}
                        className="justify-self-end inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-gradient-to-r from-amber-500 to-amber-600 text-white text-sm font-semibold disabled:opacity-50">
                        {pending && busyKey === key ? <Loader2 className="animate-spin" size={14} /> : <GitMerge size={14} />}
                        {state === 'merged' ? 'Done' : 'Merge'}
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    );
  }

  async function rescan() {
    setError(null);
    start(async () => {
      const res = await fetch('/api/crm/dedupe', { headers: await authHeaders() });
      if (res.ok) { setData(await res.json()); setDone({}); setSwapped({}); }
      else setError('Rescan failed.');
    });
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-sm text-gray-600">{remaining} duplicate pair{remaining === 1 ? '' : 's'} pending. Merging keeps the “Keep” record; the duplicate member is hidden (restorable), while a duplicate activity or event is deleted.</p>
        <button type="button" onClick={rescan} disabled={pending} className="px-3 py-2 rounded-md border text-sm hover:bg-gray-50 disabled:opacity-50">Re-scan</button>
      </div>
      {error && <p className="inline-flex items-center gap-1.5 text-sm text-red-700"><AlertCircle size={14} /> {error}</p>}
      {renderSection('member', data.members)}
      {renderSection('activity', data.activities)}
      {renderSection('event', data.events)}
    </div>
  );
}
