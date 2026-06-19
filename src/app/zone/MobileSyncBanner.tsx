'use client';
import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Smartphone, Cloud, RefreshCw, CheckCircle2 } from 'lucide-react';

export function MobileSyncBanner() {
  const router = useRouter();
  const [now, setNow] = useState<Date | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    // Render the live clock only after mount to avoid a hydration mismatch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  function syncNow() {
    start(async () => {
      try { await fetch('/api/zone/sync', { method: 'POST' }); } catch { /* ignore */ }
      setNow(new Date());
      router.refresh();
    });
  }

  const time = now ? now.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true }) : '—';

  return (
    <div className="bg-emerald-600 text-white">
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-md bg-white/20 flex items-center justify-center">
            <Smartphone size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm">Mobile App Sync Active</span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/20 text-[10px] font-semibold uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" />
                Live
              </span>
            </div>
            <div className="text-xs text-emerald-50/90">
              Last synced: {time} · Members, Events, Activities, Reports, Attendance, Donations
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="inline-flex items-center gap-1.5"><Cloud size={13} /> Cloud</span>
          <span className="inline-flex items-center gap-1.5"><CheckCircle2 size={13} /> CRM</span>
          <span className="inline-flex items-center gap-1.5"><Smartphone size={13} /> App</span>
          <button
            type="button"
            onClick={syncNow}
            disabled={pending}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white/15 hover:bg-white/25 text-white text-xs font-semibold disabled:opacity-60"
          >
            <RefreshCw size={13} className={pending ? 'animate-spin' : ''} />
            {pending ? 'Syncing…' : 'Sync Now'}
          </button>
        </div>
      </div>
    </div>
  );
}
