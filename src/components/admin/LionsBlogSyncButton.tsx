'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { DownloadCloud, Loader2, Send } from 'lucide-react';

type SyncResult = {
  discovered: number;
  discoveredVia: string;
  inserted: number;
  updated: number;
  skipped: number;
  failed: number;
};

/**
 * Admin trigger for the Lions newsroom crawl. Fires a synchronous import
 * (POST /api/admin/blog/sync) and reports the run summary inline. The
 * crawl is idempotent, so re-running is always safe.
 */
export function LionsBlogSyncButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [publishOnImport, setPublishOnImport] = useState(false);

  async function run() {
    if (busy) return;
    setBusy(true);
    setError(null);
    setMsg('Crawling lionsclubs.org/en/blog… this can take a minute.');
    try {
      const res = await fetch('/api/admin/blog/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ autoPublish: publishOnImport }),
      });
      const data = (await res.json()) as SyncResult & { error?: string };
      if (!res.ok) throw new Error(data.error || `Sync failed (${res.status})`);
      setMsg(
        `Imported from Lions newsroom — ${data.inserted} new, ${data.updated} updated, ` +
          `${data.skipped} unchanged` +
          (data.failed ? `, ${data.failed} failed` : '') +
          ` (found ${data.discovered} via ${data.discoveredVia}).`,
      );
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sync failed');
      setMsg(null);
    } finally {
      setBusy(false);
    }
  }

  // Imports land as drafts by default, so /blog keeps showing only the
  // placeholder cards until someone publishes them. One click fixes that.
  async function publishDrafts() {
    if (busy) return;
    setBusy(true);
    setError(null);
    setMsg('Publishing imported drafts…');
    try {
      const res = await fetch('/api/admin/blog/sync', { method: 'PATCH' });
      const data = (await res.json()) as { published?: number; error?: string };
      if (!res.ok) throw new Error(data.error || `Publish failed (${res.status})`);
      setMsg(`Published ${data.published ?? 0} imported Lions post(s) to /blog.`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Publish failed');
      setMsg(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={run}
        disabled={busy}
        className="inline-flex h-11 px-4 rounded-md items-center gap-2 border border-gray-200 bg-white text-sm font-medium text-navy-800 hover:bg-gray-50 disabled:opacity-60"
        title="Fetch every article from lionsclubs.org/en/blog into your newsroom"
      >
        {busy ? <Loader2 size={16} className="animate-spin" aria-hidden /> : <DownloadCloud size={16} aria-hidden />}
        {busy ? 'Working…' : 'Sync Lions blog'}
      </button>
      <label className="inline-flex items-center gap-1.5 text-xs text-gray-600">
        <input
          type="checkbox"
          checked={publishOnImport}
          onChange={(e) => setPublishOnImport(e.target.checked)}
          className="h-3.5 w-3.5"
        />
        Publish new imports immediately
      </label>
      <button
        type="button"
        onClick={publishDrafts}
        disabled={busy}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-navy-700 hover:text-brand-600 disabled:opacity-60"
      >
        <Send size={12} aria-hidden /> Publish all imported drafts
      </button>
      {msg && <p className="text-xs text-gray-500 max-w-xs text-right">{msg}</p>}
      {error && <p className="text-xs text-red-600 max-w-xs text-right">{error}</p>}
    </div>
  );
}
