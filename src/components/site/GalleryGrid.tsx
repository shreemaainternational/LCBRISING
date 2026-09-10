'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, LayoutGrid, CalendarDays } from 'lucide-react';

export type GalleryPhoto = {
  id: string;
  url: string;
  title: string | null;
  caption: string | null;
  /** ISO timestamp used for the date/year collage view. */
  date?: string | null;
};

type View = 'grid' | 'collage';
type Indexed = GalleryPhoto & { i: number };

function yearOf(iso?: string | null): string {
  if (!iso) return 'Undated';
  const y = new Date(iso).getFullYear();
  return Number.isFinite(y) ? String(y) : 'Undated';
}

function dateLabel(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

/**
 * Responsive photo grid with a keyboard-navigable lightbox. Shared by the
 * public website (/gallery) and the mobile app (/m/gallery) so both render
 * the club's gallery identically. When photos carry dates, a "By date &
 * year" collage view groups them by year.
 */
export function GalleryGrid({
  photos,
  compact = false,
}: {
  photos: GalleryPhoto[];
  compact?: boolean;
}) {
  const [index, setIndex] = useState<number | null>(null);
  const [view, setView] = useState<View>('grid');

  const hasDates = useMemo(
    () => photos.some((p) => p.date && !Number.isNaN(new Date(p.date).getTime())),
    [photos],
  );

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
    return () => window.removeEventListener('keydown', onKey);
  }, [index, move]);

  const open = index != null ? photos[index] : null;
  const showToolbar = !compact;

  return (
    <>
      {showToolbar && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-gray-500">
            <strong className="text-navy-800">{photos.length}</strong>{' '}
            {photos.length === 1 ? 'photo' : 'photos'}
          </p>
          {hasDates && (
            <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1">
              <ToggleButton active={view === 'grid'} onClick={() => setView('grid')} icon={LayoutGrid}>
                Full grid
              </ToggleButton>
              <ToggleButton
                active={view === 'collage'}
                onClick={() => setView('collage')}
                icon={CalendarDays}
              >
                By date &amp; year
              </ToggleButton>
            </div>
          )}
        </div>
      )}

      {view === 'grid' || compact || !hasDates ? (
        <div
          className={`grid gap-2.5 ${
            compact ? 'grid-cols-3' : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4'
          }`}
        >
          {photos.map((p, i) => (
            <PhotoTile key={p.id} photo={p} compact={compact} onClick={() => setIndex(i)} />
          ))}
        </div>
      ) : (
        <div className="space-y-12">
          {groups.map(([year, items]) => (
            <section key={year}>
              <div className="mb-5 flex items-center gap-3">
                <CalendarDays size={18} className="text-brand-500" aria-hidden />
                <h2 className="text-2xl font-bold text-navy-800">{year}</h2>
                <span className="text-sm text-gray-500">
                  {items.length} {items.length === 1 ? 'photo' : 'photos'}
                </span>
                <span className="h-px flex-1 bg-gray-200" />
              </div>
              <div className="columns-2 gap-2.5 sm:columns-3 lg:columns-4 [column-fill:_balance]">
                {items.map((p) => (
                  <CollageTile key={p.id} photo={p} onClick={() => setIndex(p.i)} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

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
                {dateLabel(open.date) ? `${dateLabel(open.date)} · ` : ''}
                {index! + 1} / {photos.length}
              </span>
              {(open.title || open.caption) && <p className="mt-1">{open.title ?? open.caption}</p>}
            </figcaption>
          </figure>
        </div>
      )}
    </>
  );
}

function ToggleButton({
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
      className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-semibold transition-colors ${
        active ? 'bg-navy-900 text-white' : 'text-gray-600 hover:bg-gray-100'
      }`}
    >
      <Icon size={15} aria-hidden />
      {children}
    </button>
  );
}

function PhotoTile({
  photo,
  compact,
  onClick,
}: {
  photo: GalleryPhoto;
  compact: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative block aspect-square overflow-hidden rounded-lg bg-gray-100"
      aria-label={photo.title ?? photo.caption ?? 'View photo'}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photo.url}
        alt={photo.title ?? photo.caption ?? ''}
        loading="lazy"
        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
      />
      {(photo.title || photo.caption) && !compact && (
        <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/70 to-transparent px-2 py-1.5 text-left text-[11px] text-white opacity-0 transition-opacity group-hover:opacity-100">
          {photo.title ?? photo.caption}
        </span>
      )}
    </button>
  );
}

function CollageTile({ photo, onClick }: { photo: GalleryPhoto; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative mb-2.5 block w-full break-inside-avoid overflow-hidden rounded-lg bg-gray-100"
      aria-label={photo.title ?? photo.caption ?? 'View photo'}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photo.url}
        alt={photo.title ?? photo.caption ?? ''}
        loading="lazy"
        className="w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
      />
      {dateLabel(photo.date) && (
        <span className="absolute bottom-2 left-2 rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-semibold text-white">
          {dateLabel(photo.date)}
        </span>
      )}
    </button>
  );
}
