'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

export type GalleryPhoto = {
  url: string;
  caption: string;
  activity: string;
};

export function GalleryGrid({ photos }: { photos: GalleryPhoto[] }) {
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
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [index, move]);

  const active = index == null ? null : photos[index];

  return (
    <>
      <div className="columns-2 sm:columns-3 lg:columns-4 gap-4 [column-fill:_balance]">
        {photos.map((p, i) => (
          <button
            key={`${p.url}-${i}`}
            type="button"
            onClick={() => setIndex(i)}
            className="group mb-4 block w-full break-inside-avoid overflow-hidden rounded-xl border border-gray-200 bg-gray-100 cursor-zoom-in"
            aria-label={p.caption || p.activity}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={p.url}
              alt={p.caption || p.activity}
              loading="lazy"
              className="w-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
            />
          </button>
        ))}
      </div>

      {active && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setIndex(null)}
          role="dialog"
          aria-modal="true"
          aria-label={active.caption || active.activity}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIndex(null);
            }}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 text-white hover:bg-white/20 flex items-center justify-center"
            aria-label="Close"
          >
            <X size={18} />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              move(-1);
            }}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 text-white hover:bg-white/20 flex items-center justify-center"
            aria-label="Previous photo"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              move(1);
            }}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 text-white hover:bg-white/20 flex items-center justify-center"
            aria-label="Next photo"
          >
            <ChevronRight size={20} />
          </button>

          <figure
            className="max-w-5xl max-h-[85vh] flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={active.url}
              alt={active.caption || active.activity}
              className="max-w-full max-h-[80vh] object-contain rounded"
            />
            <figcaption className="mt-3 text-center text-white text-sm max-w-2xl">
              <span className="text-white/60 text-xs">
                {active.activity} · {index! + 1} / {photos.length}
              </span>
              {active.caption && <p className="mt-1">{active.caption}</p>}
            </figcaption>
          </figure>
        </div>
      )}
    </>
  );
}
