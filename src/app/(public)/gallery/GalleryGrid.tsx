'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, LayoutGrid, CalendarDays } from 'lucide-react';

export type GalleryPhoto = {
  url: string;
  caption: string;
  activity: string;
  date: string;
};

type View = 'grid' | 'collage';

type Indexed = GalleryPhoto & { i: number };

function yearOf(iso: string): string {
  const y = new Date(iso).getFullYear();
  return Number.isFinite(y) ? String(y) : 'Undated';
}

function dateLabel(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function GalleryGrid({ photos }: { photos: GalleryPhoto[] }) {
  const [view, setView] = useState<View>('grid');
  const [index, setIndex] = useState<number | null>(null);

  // Group photos by year (newest first), preserving each photo's global index
  // so the lightbox can navigate the full set from any view.
  const groups = useMemo(() => {
    const map = new Map<string, Indexed[]>();
    photos.forEach((p, i) => {
      const key = yearOf(p.date);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push({ ...p, i });
    });
    return Array.from(map.entries()).sort((a, b) => {
      if (a[0] === 'Undated') return 1;
      if (b[0] === 'Undated') return -1;
      return Number(b[0]) - Number(a[0]);
    });
  }, [photos]);

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
      {/* View switcher */}
      <div className="flex items-center justify-between gap-3 mb-8 flex-wrap">
        <p className="text-sm text-gray-500">
          <strong className="text-navy-800">{photos.length}</strong>{' '}
          {photos.length === 1 ? 'photo' : 'photos'}
        </p>
        <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1">
          <ViewButton active={view === 'grid'} onClick={() => setView('grid')} icon={LayoutGrid}>
            Full grid
          </ViewButton>
          <ViewButton
            active={view === 'collage'}
            onClick={() => setView('collage')}
            icon={CalendarDays}
          >
            By date &amp; year
          </ViewButton>
        </div>
      </div>

      {view === 'grid' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {photos.map((p, i) => (
            <Tile key={`${p.url}-${i}`} photo={p} square onClick={() => setIndex(i)} />
          ))}
        </div>
      ) : (
        <div className="space-y-12">
          {groups.map(([year, items]) => (
            <section key={year}>
              <div className="flex items-center gap-3 mb-5">
                <CalendarDays size={18} className="text-brand-500" aria-hidden />
                <h2 className="text-2xl font-bold text-navy-800">{year}</h2>
                <span className="text-sm text-gray-500">
                  {items.length} {items.length === 1 ? 'photo' : 'photos'}
                </span>
                <span className="h-px flex-1 bg-gray-200" />
              </div>
              {/* Masonry collage for the year */}
              <div className="columns-2 sm:columns-3 lg:columns-4 gap-3 [column-fill:_balance]">
                {items.map((p) => (
                  <Tile
                    key={`${p.url}-${p.i}`}
                    photo={p}
                    showDate
                    onClick={() => setIndex(p.i)}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

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
                {active.activity}
                {dateLabel(active.date) ? ` · ${dateLabel(active.date)}` : ''} · {index! + 1} /{' '}
                {photos.length}
              </span>
              {active.caption && <p className="mt-1">{active.caption}</p>}
            </figcaption>
          </figure>
        </div>
      )}
    </>
  );
}

function ViewButton({
  active,
  onClick,
  icon: Icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof LayoutGrid;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-semibold transition-colors ${
        active ? 'bg-navy-900 text-white' : 'text-gray-600 hover:bg-gray-100'
      }`}
    >
      <Icon size={15} aria-hidden />
      {children}
    </button>
  );
}

function Tile({
  photo,
  square,
  showDate,
  onClick,
}: {
  photo: GalleryPhoto;
  square?: boolean;
  showDate?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative block w-full overflow-hidden rounded-xl border border-gray-200 bg-gray-100 cursor-zoom-in ${
        square ? 'aspect-square' : 'mb-3 break-inside-avoid'
      }`}
      aria-label={photo.caption || photo.activity}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photo.url}
        alt={photo.caption || photo.activity}
        loading="lazy"
        className={`w-full ${square ? 'h-full' : ''} object-cover group-hover:scale-[1.03] transition-transform duration-500`}
      />
      {showDate && dateLabel(photo.date) && (
        <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-full bg-black/55 text-white text-[10px] font-semibold">
          {dateLabel(photo.date)}
        </span>
      )}
    </button>
  );
}
