'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

/**
 * Small per-row soft-delete action. DELETEs `endpoint`, confirms first, and
 * refreshes the list. Reused across the District hierarchy lists.
 */
export function RowDeleteButton({
  endpoint, label = 'item', confirmText,
}: { endpoint: string; label?: string; confirmText?: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onClick() {
    if (!window.confirm(confirmText ?? `Remove this ${label}? This can be restored by an admin.`)) return;
    setError(null);
    start(async () => {
      const headers: Record<string, string> = {};
      try {
        const { data: { session } } = await createClient().auth.getSession();
        if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;
      } catch { /* fall back to cookie auth */ }
      const res = await fetch(endpoint, { method: 'DELETE', headers });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(typeof j.error === 'string' ? j.error : `Delete failed (${res.status})`);
        return;
      }
      router.refresh();
    });
  }

  return (
    <span className="inline-flex flex-col items-end gap-0.5">
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-red-200 text-red-700 text-xs hover:bg-red-50 disabled:opacity-60"
        title={`Remove ${label}`}
      >
        {pending ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
        Delete
      </button>
      {error && <span className="text-[11px] text-red-700 max-w-[16rem] text-right">{error}</span>}
    </span>
  );
}
