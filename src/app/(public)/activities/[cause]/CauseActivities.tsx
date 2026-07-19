'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Calendar,
  MapPin,
  Users,
  Images,
  ImageOff,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';

export type CauseActivity = {
  id: string;
  title: string;
  description: string | null;
  date: string;
  location: string | null;
  beneficiaries: number | null;
  photos: string[];
  captions: Record<string, string>;
  /** Raw activities.category — used by the programme tab filters. */
  category?: string | null;
};

type Lightbox = {
  title: string;
  photos: string[];
  captions: Record<string, string>;
  index: number;
};

export function CauseActivities({ activities }: { activities: CauseActivity[] }) {
  const [box, setBox] = useState<Lightbox | null>(null);

  const move = useCallback((dir: 1 | -1) => {
    setBox((b) =>
      b == null
        ? null
        : { ...b, index: (b.index + dir + b.photos.length) % b.photos.length },
    );
  }, []);

  // Keyboard navigation while the lightbox is open.
  useEffect(() => {
    if (!box) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setBox(null);
      if (e.key === 'ArrowLeft') move(-1);
      if (e.key === 'ArrowRight') move(1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [box, move]);

  return (
    <>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {activities.map((a) => {
          const cover = a.photos[0];
          return (
            <article
              key={a.id}
              className="group flex flex-col bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
            >
              <button
                type="button"
                onClick={() =>
                  cover &&
                  setBox({
                    title: a.title,
                    photos: a.photos,
                    captions: a.captions,
                    index: 0,
                  })
                }
                disabled={!cover}
                className="relative block aspect-[16/10] bg-gray-100 overflow-hidden disabled:cursor-default"
                aria-label={cover ? `View photos of ${a.title}` : a.title}
              >
                {cover ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={cover}
                      alt={a.captions[cover] || a.title}
                      className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
                    />
                    {a.photos.length > 1 && (
                      <span className="absolute bottom-2 right-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/60 text-white text-[11px] font-semibold">
                        <Images size={12} aria-hidden /> {a.photos.length}
                      </span>
                    )}
                  </>
                ) : (
                  <span className="absolute inset-0 flex items-center justify-center text-gray-300">
                    <ImageOff size={30} aria-hidden />
                  </span>
                )}
              </button>

              <div className="flex flex-col flex-1 p-5">
                <h3 className="font-bold text-navy-800 leading-snug line-clamp-2">
                  {a.title}
                </h3>
                {a.description && (
                  <p className="mt-2 text-sm text-gray-600 line-clamp-3">
                    {a.description}
                  </p>
                )}
                <div className="mt-4 pt-3 border-t border-gray-100 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-gray-500">
                  <span className="inline-flex items-center gap-1">
                    <Calendar size={13} aria-hidden /> {formatDate(a.date)}
                  </span>
                  {a.location && (
                    <span className="inline-flex items-center gap-1">
                      <MapPin size={13} aria-hidden /> {a.location}
                    </span>
                  )}
                  {!!a.beneficiaries && a.beneficiaries > 0 && (
                    <span className="inline-flex items-center gap-1">
                      <Users size={13} aria-hidden />{' '}
                      {a.beneficiaries.toLocaleString('en-IN')} reached
                    </span>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {/* Lightbox — photos of a single activity */}
      {box && box.photos[box.index] && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setBox(null)}
          role="dialog"
          aria-modal="true"
          aria-label={`Photos of ${box.title}`}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setBox(null);
            }}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 text-white hover:bg-white/20 flex items-center justify-center"
            aria-label="Close"
          >
            <X size={18} />
          </button>

          {box.photos.length > 1 && (
            <>
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
            </>
          )}

          <figure
            className="max-w-5xl max-h-[85vh] flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={box.photos[box.index]}
              alt={box.captions[box.photos[box.index]] || box.title}
              className="max-w-full max-h-[80vh] object-contain rounded"
            />
            <figcaption className="mt-3 text-center text-white text-sm max-w-2xl">
              <span className="text-white/60 text-xs">
                {box.title} · {box.index + 1} / {box.photos.length}
              </span>
              {box.captions[box.photos[box.index]] && (
                <p className="mt-1">{box.captions[box.photos[box.index]]}</p>
              )}
            </figcaption>
          </figure>
        </div>
      )}
    </>
  );
}
