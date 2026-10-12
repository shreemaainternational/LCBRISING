'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { DownloadCloud, Loader2 } from 'lucide-react';

type SyncResult = {
  discovered: number;
  discoveredVia: string;
  articlePathPrefix: string;
  inserted: number;
  updated: number;
  skipped: number;
  failed: number;
  error?: string;
};

/**
 * Admin trigger for the Lion Stories import
 * (POST /api/admin/stories/sync). Idempotent — safe to re-run. Imported
 * stories appear on /stories under "From Lions around the world" and link
 * out to lionsclubs.org.
 */
export function LionsStoriesSyncButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [publish, setPublish] = useState(true);

  async function run() {
    if (busy) return;
    setBusy(true);
    setError(null);
    setMsg('Importing Lion Stories from lionsclubs.org… this can take a minute.');
    try {
      const res = await fetch('/api/admin/stories/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ autoPublish: publish }),
      });
      const data = (await res.json()) as SyncResult;
      if (!res.ok) throw new Error(data.error || `Sync failed (${res.status})`);
      if (data.discovered === 0) {
        throw new Error(
          'No stories found on lionsclubs.org. The site layout may have changed — set LIONS_STORIES_ARTICLE_PREFIX to the stories URL path.',
        );
      }
      setMsg(
        `Lion Stories — ${data.inserted} new, ${data.updated} updated, ${data.skipped} unchanged` +
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

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={run}
        disabled={busy}
        className="inline-flex h-11 px-4 rounded-md items-center gap-2 border border-gray-200 bg-white text-sm font-medium text-navy-800 hover:bg-gray-50 disabled:opacity-60"
        title="Import stories from lionsclubs.org/en/our-impact/our-stories/lion-stories"
      >
        {busy ? <Loader2 size={16} className="animate-spin" aria-hidden /> : <DownloadCloud size={16} aria-hidden />}
        {busy ? 'Syncing…' : 'Sync Lion Stories'}
      </button>
      <label className="inline-flex items-center gap-1.5 text-xs text-gray-600">
        <input
          type="checkbox"
          checked={publish}
          onChange={(e) => setPublish(e.target.checked)}
          className="h-3.5 w-3.5"
        />
        Publish new imports immediately
      </label>
      {msg && <p className="text-xs text-gray-500 max-w-xs text-right">{msg}</p>}
      {error && <p className="text-xs text-red-600 max-w-xs text-right">{error}</p>}
    </div>
  );
}
