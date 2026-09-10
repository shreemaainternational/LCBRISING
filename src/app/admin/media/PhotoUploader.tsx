'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

const CATEGORIES = ['gallery', 'about', 'hero', 'press', 'event'] as const;
const MEDIA_TYPES = ['Newspaper', 'Online', 'TV'] as const;

export default function PhotoUploader() {
  const router = useRouter();
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [caption, setCaption] = useState('');
  const [category, setCategory] = useState<typeof CATEGORIES[number]>('gallery');
  const [isFeatured, setIsFeatured] = useState(false);
  const [sourceName, setSourceName] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [mediaType, setMediaType] = useState<typeof MEDIA_TYPES[number]>('Online');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const isPress = category === 'press';

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch('/api/admin/photos', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        url,
        title: title || undefined,
        caption: caption || undefined,
        alt: title || undefined,
        category,
        is_featured: isFeatured,
        ...(isPress
          ? {
              source_name: sourceName || undefined,
              source_url: sourceUrl || undefined,
              media_type: mediaType,
            }
          : {}),
      }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? `HTTP ${res.status}`);
      return;
    }
    setUrl('');
    setTitle('');
    setCaption('');
    setIsFeatured(false);
    setSourceName('');
    setSourceUrl('');
    startTransition(() => router.refresh());
  }

  return (
    <form onSubmit={submit} className="grid gap-3 md:grid-cols-2">
      <label className="text-sm md:col-span-2">
        <span className="block mb-1 text-gray-600">Image URL (Cloudinary, Supabase Storage, etc.)</span>
        <input
          required
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://res.cloudinary.com/.../upload/v1/.../image.jpg"
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
        <span className="block mt-1 text-xs text-gray-500">
          Upload to Cloudinary first (unsigned preset <code>{process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET ?? 'lcbrs_default'}</code>), then paste the secure URL here.
        </span>
      </label>
      <label className="text-sm">
        <span className="block mb-1 text-gray-600">Title</span>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Eye Camp at Pratapnagar"
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
      </label>
      <label className="text-sm">
        <span className="block mb-1 text-gray-600">Category</span>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as typeof CATEGORIES[number])}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white"
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </label>
      <label className="text-sm md:col-span-2">
        <span className="block mb-1 text-gray-600">Caption</span>
        <input
          type="text"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="Optional caption shown under the photo"
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
      </label>
      <label className="text-sm flex items-center gap-2 md:col-span-2">
        <input
          type="checkbox"
          checked={isFeatured}
          onChange={(e) => setIsFeatured(e.target.checked)}
        />
        Featured (appears in About-section collage or homepage strip)
      </label>
      {isPress && (
        <>
          <label className="text-sm">
            <span className="block mb-1 text-gray-600">Outlet name</span>
            <input
              required={isPress}
              type="text"
              value={sourceName}
              onChange={(e) => setSourceName(e.target.value)}
              placeholder="e.g. Times of India"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="text-sm">
            <span className="block mb-1 text-gray-600">Coverage type</span>
            <select
              value={mediaType}
              onChange={(e) => setMediaType(e.target.value as typeof MEDIA_TYPES[number])}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white"
            >
              {MEDIA_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </label>
          <label className="text-sm md:col-span-2">
            <span className="block mb-1 text-gray-600">Link to original coverage</span>
            <input
              required={isPress}
              type="url"
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              placeholder="https://timesofindia.indiatimes.com/..."
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
            <span className="block mt-1 text-xs text-gray-500">
              Only add real, verifiable coverage — this is shown publicly as a citation to the outlet.
            </span>
          </label>
        </>
      )}
      <div className="md:col-span-2 flex items-center gap-3">
        <button
          type="submit"
          disabled={pending || !url}
          className="rounded-md bg-navy-800 hover:bg-navy-900 text-white px-5 py-2.5 text-sm font-medium disabled:opacity-50"
        >
          {pending ? 'Saving…' : 'Add photo'}
        </button>
        {error && (
          <span className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-1.5">
            {error}
          </span>
        )}
      </div>
    </form>
  );
}
