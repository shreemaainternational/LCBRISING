'use client';
import { useState, useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  X, ChevronLeft, ChevronRight, Pencil, Save, Loader2, Camera, Film,
} from 'lucide-react';

interface Props {
  activityId: string;
  photos: string[];
  before: string[];
  after: string[];
  videos: string[];
  initialCaptions: Record<string, string>;
}

type Tab = 'all' | 'photos' | 'before' | 'after' | 'videos';

export function ActivityGallery({
  activityId, photos, before, after, videos, initialCaptions,
}: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('all');
  const [lightbox, setLightbox] = useState<number | null>(null);
  const [captions, setCaptions] = useState<Record<string, string>>(initialCaptions);
  const [editing, setEditing] = useState(false);
  const [pending, start] = useTransition();
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const items = (() => {
    if (tab === 'before') return before.map((url) => ({ url, kind: 'before' as const }));
    if (tab === 'after')  return after.map((url) => ({ url, kind: 'after' as const }));
    if (tab === 'videos') return videos.map((url) => ({ url, kind: 'video' as const }));
    if (tab === 'photos') return photos.map((url) => ({ url, kind: 'photo' as const }));
    return [
      ...photos.map((url) => ({ url, kind: 'photo' as const })),
      ...before.map((url) => ({ url, kind: 'before' as const })),
      ...after.map((url) => ({ url, kind: 'after' as const })),
      ...videos.map((url) => ({ url, kind: 'video' as const })),
    ];
  })();

  // Keyboard navigation in lightbox
  useEffect(() => {
    if (lightbox == null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightbox(null);
      if (e.key === 'ArrowLeft')  setLightbox((i) => i == null ? null : (i - 1 + items.length) % items.length);
      if (e.key === 'ArrowRight') setLightbox((i) => i == null ? null : (i + 1) % items.length);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightbox, items.length]);

  // Auto-clear the "captions saved" toast after 4 seconds
  useEffect(() => {
    if (savedAt == null) return;
    const id = setTimeout(() => setSavedAt(null), 4000);
    return () => clearTimeout(id);
  }, [savedAt]);

  function saveCaptions() {
    start(async () => {
      const res = await fetch(`/api/activities/${activityId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photo_captions: captions }),
      });
      if (res.ok) {
        setEditing(false);
        setSavedAt(Date.now());
        router.refresh();
      }
    });
  }

  const tabs: { key: Tab; label: string; count: number; icon?: React.ReactNode }[] = ([
    { key: 'all',     label: 'All',     count: photos.length + before.length + after.length + videos.length, icon: undefined },
    { key: 'photos',  label: 'Photos',  count: photos.length, icon: <Camera size={12} /> },
    { key: 'before',  label: 'Before',  count: before.length, icon: undefined },
    { key: 'after',   label: 'After',   count: after.length, icon: undefined },
    { key: 'videos',  label: 'Videos',  count: videos.length, icon: <Film size={12} /> },
  ] as const).filter((t) => t.count > 0) as { key: Tab; label: string; count: number; icon?: React.ReactNode }[];

  return (
    <div className="space-y-3">
      {/* Tab bar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex flex-wrap gap-1.5">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                tab === t.key
                  ? 'bg-navy-900 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {t.icon}
              {t.label}
              <span className={`inline-block px-1.5 rounded-full text-[10px] ${tab === t.key ? 'bg-white/20' : 'bg-white text-gray-600'}`}>
                {t.count}
              </span>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {savedAt != null && (
            <span className="text-xs text-green-700">Captions saved ✓</span>
          )}
          {editing ? (
            <>
              <button
                type="button"
                onClick={saveCaptions}
                disabled={pending}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-amber-500 text-white text-xs font-semibold disabled:opacity-60"
              >
                {pending ? <Loader2 className="animate-spin" size={12} /> : <Save size={12} />}
                Save captions
              </button>
              <button
                type="button"
                onClick={() => { setCaptions(initialCaptions); setEditing(false); }}
                disabled={pending}
                className="px-3 py-1.5 rounded-md border text-xs text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border text-xs text-gray-700 hover:bg-gray-50"
            >
              <Pencil size={12} /> Edit captions
            </button>
          )}
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {items.map((it, idx) => {
          const cap = captions[it.url] ?? '';
          return (
            <figure
              key={`${it.url}-${idx}`}
              className="group relative rounded-lg overflow-hidden border bg-gray-50"
            >
              <button
                type="button"
                onClick={() => setLightbox(idx)}
                className="block w-full aspect-square cursor-zoom-in"
              >
                {it.kind === 'video' ? (
                  <video src={it.url} className="w-full h-full object-cover" muted />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={it.url} alt={cap} className="w-full h-full object-cover" />
                )}
              </button>

              {/* badge for kind */}
              {it.kind !== 'photo' && (
                <span className={`absolute top-1 left-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                  it.kind === 'before' ? 'bg-amber-500 text-white' :
                  it.kind === 'after'  ? 'bg-emerald-500 text-white' :
                  'bg-purple-500 text-white'
                }`}>
                  {it.kind}
                </span>
              )}

              <figcaption className="p-2">
                {editing ? (
                  <input
                    type="text"
                    value={cap}
                    onChange={(e) => setCaptions((c) => ({ ...c, [it.url]: e.target.value }))}
                    placeholder="Add caption…"
                    className="w-full text-xs px-2 py-1 border rounded"
                  />
                ) : (
                  <p className="text-xs text-gray-700 leading-snug min-h-[1.25rem]">
                    {cap || <span className="text-gray-400 italic">No caption</span>}
                  </p>
                )}
              </figcaption>
            </figure>
          );
        })}
      </div>

      {/* Lightbox */}
      {lightbox != null && items[lightbox] && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setLightbox(null); }}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 text-white hover:bg-white/20 flex items-center justify-center"
          >
            <X size={18} />
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setLightbox((i) => i == null ? null : (i - 1 + items.length) % items.length); }}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 text-white hover:bg-white/20 flex items-center justify-center"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setLightbox((i) => i == null ? null : (i + 1) % items.length); }}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 text-white hover:bg-white/20 flex items-center justify-center"
          >
            <ChevronRight size={20} />
          </button>

          <div className="max-w-5xl max-h-[85vh] flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
            {items[lightbox].kind === 'video' ? (
              <video src={items[lightbox].url} controls autoPlay className="max-w-full max-h-[80vh]" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={items[lightbox].url}
                alt={captions[items[lightbox].url] ?? ''}
                className="max-w-full max-h-[80vh] object-contain"
              />
            )}
            <div className="mt-3 text-center text-white text-sm max-w-2xl">
              <span className="text-white/60 text-xs">{lightbox + 1} / {items.length}</span>
              {captions[items[lightbox].url] && (
                <p className="mt-1">{captions[items[lightbox].url]}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
