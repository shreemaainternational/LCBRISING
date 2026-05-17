'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X } from 'lucide-react';

export function OperationsSearch({ initial }: { initial: string }) {
  const router = useRouter();
  const [q, setQ] = useState(initial);

  useEffect(() => {
    const handle = setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      if (q) params.set('q', q); else params.delete('q');
      router.replace(`/admin/operations${params.toString() ? '?' + params.toString() : ''}`);
    }, 200);
    return () => clearTimeout(handle);
  }, [q, router]);

  return (
    <div className="relative">
      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search every action — &quot;duplicate&quot;, &quot;export&quot;, &quot;push&quot;, &quot;circular&quot;…"
        className="w-full pl-9 pr-9 py-2.5 rounded-md border bg-white text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
      />
      {q && (
        <button type="button" onClick={() => setQ('')}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
          <X size={14} />
        </button>
      )}
    </div>
  );
}
