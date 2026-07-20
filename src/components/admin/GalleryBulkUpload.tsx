'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, UploadCloud, CheckCircle2, AlertCircle } from 'lucide-react';
import { PhotoMultiUpload } from '@/components/admin/PhotoMultiUpload';

const CATEGORIES = ['gallery', 'about', 'hero', 'press', 'event'] as const;
type Category = typeof CATEGORIES[number];

type Result = { inserted: number; skipped: number; total: number } | { error: string } | null;

/**
 * Bulk gallery uploader. Drop or pick many photos at once — each uploads
 * straight to Supabase Storage (via PhotoMultiUpload), then "Save to gallery"
 * writes them all to the `photos` table in a single request. Those rows are
 * read by the public website /gallery page and the mobile app /m/gallery.
 */
export function GalleryBulkUpload() {
  const router = useRouter();
  const [urls, setUrls] = useState<string[]>([]);
  const [captions, setCaptions] = useState<Record<string, string>>({});
  const [category, setCategory] = useState<Category>('gallery');
  const [featured, setFeatured] = useState(false);
  const [result, setResult] = useState<Result>(null);
  const [pending, start] = useTransition();

  function save() {
    if (!urls.length) return;
    setResult(null);
    start(async () => {
      const res = await fetch('/api/admin/photos/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category,
          is_featured: featured,
          photos: urls.map((url) => ({ url, caption: captions[url] || undefined })),
        }),
      });
      const j = (await res.json().catch(() => ({}))) as Result;
      if (!res.ok) {
        setResult({ error: (j && 'error' in j && j.error) || `Save failed (${res.status})` });
        return;
      }
      setResult(j);
      setUrls([]);
      setCaptions({});
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-4">
        <label className="text-sm">
          <span className="block mb-1 text-gray-600">Album / category</span>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as Category)}
            className="rounded-md border border-gray-300 px-3 py-2 bg-white text-sm capitalize"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </label>
        <label className="text-sm inline-flex items-center gap-2 pb-2">
          <input type="checkbox" checked={featured} onChange={(e) => setFeatured(e.target.checked)} />
          Featured (homepage / about collage)
        </label>
      </div>

      <PhotoMultiUpload
        value={urls}
        onChange={setUrls}
        onCaptionsChange={setCaptions}
        folder="gallery"
        minRecommended={1}
        max={200}
        accept="image/*"
        label="Photos"
        hint="Drop or select many photos at once. They upload immediately; then click Save to gallery."
      />

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={pending || !urls.length}
          className="inline-flex items-center gap-2 rounded-md bg-navy-800 hover:bg-navy-900 text-white px-5 py-2.5 text-sm font-medium disabled:opacity-50"
        >
          {pending ? <Loader2 className="animate-spin" size={16} /> : <UploadCloud size={16} />}
          {pending ? 'Saving…' : `Save ${urls.length || ''} to gallery`}
        </button>

        {result && 'inserted' in result && (
          <span className="inline-flex items-center gap-1.5 text-sm text-green-700">
            <CheckCircle2 size={15} /> Added {result.inserted}
            {result.skipped ? ` · ${result.skipped} already in gallery` : ''}
          </span>
        )}
        {result && 'error' in result && (
          <span className="inline-flex items-center gap-1.5 text-sm text-red-700">
            <AlertCircle size={15} /> {result.error}
          </span>
        )}
      </div>
    </div>
  );
}
