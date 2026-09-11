'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Pencil, Trash2, Loader2 } from 'lucide-react';

export function BlogRowActions({ id, title }: { id: string; title: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    if (!window.confirm(`Remove "${title}"? This can't be undone from the CRM.`)) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/blog?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? 'Delete failed');
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed');
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center justify-end gap-1.5">
      {error && <span className="text-xs text-red-600 mr-1">{error}</span>}
      <Link
        href={`/admin/blog/${id}`}
        aria-label={`Edit ${title}`}
        className="h-8 w-8 inline-flex items-center justify-center rounded-md border border-gray-200 text-gray-600 hover:text-navy-800 hover:border-navy-800 transition"
      >
        <Pencil size={14} aria-hidden />
      </Link>
      <button
        type="button"
        onClick={remove}
        disabled={busy}
        aria-label={`Remove ${title}`}
        className="h-8 w-8 inline-flex items-center justify-center rounded-md border border-gray-200 text-gray-600 hover:text-red-700 hover:border-red-300 transition disabled:opacity-50"
      >
        {busy ? <Loader2 size={14} className="animate-spin" aria-hidden /> : <Trash2 size={14} aria-hidden />}
      </button>
    </div>
  );
}
