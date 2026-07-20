'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

export type GalleryPhoto = {
  id: string;
  url: string;
  title: string | null;
  caption: string | null;
};

/**
 * Responsive photo grid with a keyboard-navigable lightbox. Shared by the
 * public website (/gallery) and the mobile app (/m/gallery) so both render
 * the club's gallery identically.
 */
export function GalleryGrid({ photos, compact = false }: { photos: GalleryPhoto[]; compact?: boolean }) {
  const [index, setIndex] = useState<number | null>(null);

  const move = useCallback(
    (dir: 1 | -1) => {
      setIndex((i) => (i == null ? null : (i + dir + photos.length) % photos.length));
    },
    [photos.length],
  );

  useEffect(() => {
    if (index == null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIndex(null);
      if (e.key === 'ArrowLeft') move(-1);
      if (e.key === 'ArrowRight') move(1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [index, move]);

  const open = index != null ? photos[index] : null;

  return (
    <>
      <div
        className={`grid gap-2.5 ${
          compact
            ? 'grid-cols-3'
            : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4'
        }`}
      >
        {photos.map((p, i) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setIndex(i)}
            className="group relative block aspect-square overflow-hidden rounded-lg bg-gray-100"
            aria-label={p.title ?? p.caption ?? 'View photo'}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={p.url}
              alt={p.title ?? p.caption ?? ''}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
            />
            {(p.title || p.caption) && !compact && (
              <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/70 to-transparent px-2 py-1.5 text-left text-[11px] text-white opacity-0 transition-opacity group-hover:opacity-100">
                {p.title ?? p.caption}
              </span>
            )}
          </button>
        ))}
      </div>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setIndex(null)}
        >
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setIndex(null); }}
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
            aria-label="Close"
          >
            <X size={18} />
          </button>

          {photos.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); move(-1); }}
                className="absolute left-4 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
                aria-label="Previous"
              >
                <ChevronLeft size={20} />
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); move(1); }}
                className="absolute right-4 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
                aria-label="Next"
              >
                <ChevronRight size={20} />
              </button>
            </>
          )}

          <figure className="flex max-h-[85vh] max-w-5xl flex-col items-center" onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={open.url}
              alt={open.title ?? open.caption ?? ''}
              className="max-h-[80vh] max-w-full rounded object-contain"
            />
            <figcaption className="mt-3 max-w-2xl text-center text-sm text-white">
              <span className="text-xs text-white/60">
                {index! + 1} / {photos.length}
              </span>
              {(open.title || open.caption) && (
                <p className="mt-1">{open.title ?? open.caption}</p>
              )}
            </figcaption>
          </figure>
        </div>
      )}
    </>
  );
}
