'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Search, Loader2 } from 'lucide-react';

type Result = { type: string; label: string; sub: string; href: string };

const TYPE_COLORS: Record<string, string> = {
  Member: 'bg-blue-100 text-blue-700',
  Donation: 'bg-amber-100 text-amber-700',
  Activity: 'bg-emerald-100 text-emerald-700',
  Event: 'bg-purple-100 text-purple-700',
  Beneficiary: 'bg-rose-100 text-rose-700',
};

/** Global admin search — debounced, cross-entity, keyboard-dismissable. */
export function AdminSearch() {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const term = q.trim();
    const ctrl = new AbortController();
    // All state updates happen inside the debounced callback (never
    // synchronously in the effect body) to avoid cascading renders.
    const t = setTimeout(async () => {
      if (term.length < 2) {
        setResults([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const res = await fetch(`/api/admin/search?q=${encodeURIComponent(term)}`, {
          signal: ctrl.signal,
        });
        const data = await res.json();
        setResults(data.results ?? []);
        setOpen(true);
      } catch {
        /* aborted or failed */
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q]);

  // Close on outside click / Escape.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('mousedown', onClick);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onClick);
      window.removeEventListener('keydown', onKey);
    };
  }, []);

  return (
    <div ref={boxRef} className="relative w-full max-w-xl">
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => results.length && setOpen(true)}
          placeholder="Search members, donations, activities, events…"
          className="w-full h-10 pl-9 pr-9 rounded-lg border border-gray-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
          aria-label="Global admin search"
        />
        {loading && (
          <Loader2 size={15} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-gray-400" />
        )}
      </div>

      {open && q.trim().length >= 2 && (
        <div className="absolute z-30 mt-2 w-full rounded-lg border border-gray-200 bg-white shadow-xl overflow-hidden">
          {results.length === 0 ? (
            <p className="px-4 py-3 text-sm text-gray-500">
              {loading ? 'Searching…' : 'No matches.'}
            </p>
          ) : (
            <ul className="max-h-96 overflow-y-auto py-1">
              {results.map((r, i) => (
                <li key={`${r.type}-${i}`}>
                  <Link
                    href={r.href}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50"
                  >
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${TYPE_COLORS[r.type] ?? 'bg-gray-100 text-gray-600'}`}>
                      {r.type}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-navy-800">{r.label}</span>
                      {r.sub && <span className="block truncate text-xs text-gray-500">{r.sub}</span>}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
