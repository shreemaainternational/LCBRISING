'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Play, RotateCw, Loader2 } from 'lucide-react';

export function QueueActions() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  function run(action: 'drain' | 'revive-all') {
    setMsg(null);
    start(async () => {
      const res = await fetch(`/api/sync/queue/${action}`, { method: 'POST' });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) { setMsg(j.error ?? `HTTP ${res.status}`); return; }
      const summary = action === 'drain'
        ? `Drained — done ${j.done ?? 0} · failed ${j.failed ?? 0} · dead ${j.dead ?? 0}`
        : `Revived ${j.revived ?? 0} job${(j.revived ?? 0) === 1 ? '' : 's'}`;
      setMsg(summary);
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-2">
      {msg && <span className="text-xs text-gray-600">{msg}</span>}
      <button type="button" onClick={() => run('revive-all')} disabled={pending}
        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-amber-200 text-amber-700 text-xs font-semibold hover:bg-amber-50 disabled:opacity-60">
        {pending ? <Loader2 className="animate-spin" size={12} /> : <RotateCw size={12} />}
        Revive failed
      </button>
      <button type="button" onClick={() => run('drain')} disabled={pending}
        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold disabled:opacity-60">
        {pending ? <Loader2 className="animate-spin" size={12} /> : <Play size={12} />}
        Drain now
      </button>
    </div>
  );
}
