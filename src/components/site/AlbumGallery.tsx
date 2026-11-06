'use client';

import { useMemo, useState } from 'react';
import { ChevronLeft, Images } from 'lucide-react';
import { GalleryGrid, type GalleryPhoto } from './GalleryGrid';
import {
  groupPhotosIntoAlbums,
  type AlbumSourcePhoto,
  type ActivityForAlbum,
} from '@/lib/gallery-albums';

function dateLabel(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

/**
 * Public gallery entry point: shows one album per activity/event (see
 * groupPhotosIntoAlbums for how photos are matched), each opening into the
 * existing GalleryGrid lightbox scoped to just that album's photos.
 */
export function AlbumGallery({
  photos,
  activities,
  compact = false,
}: {
  photos: AlbumSourcePhoto[];
  activities: ActivityForAlbum[];
  compact?: boolean;
}) {
  const albums = useMemo(() => groupPhotosIntoAlbums(photos, activities), [photos, activities]);
  const [openKey, setOpenKey] = useState<string | null>(null);

  // Nothing meaningful to group (e.g. every photo is unmatched) — a single
  // flat grid is more useful than a one-album view.
  if (albums.length <= 1) {
    return <GalleryGrid photos={photos as GalleryPhoto[]} compact={compact} />;
  }

  const open = albums.find((a) => a.key === openKey) ?? null;

  if (open) {
    return (
      <div>
        <button
          type="button"
          onClick={() => setOpenKey(null)}
          className="mb-5 inline-flex items-center gap-1.5 text-sm font-semibold text-navy-800 hover:text-brand-600"
        >
          <ChevronLeft size={16} /> All albums
        </button>
        <div className="mb-6 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h2 className={compact ? 'text-lg font-bold text-navy-800' : 'text-2xl font-bold text-navy-800'}>
            {open.name}
          </h2>
          {open.date && <span className="text-sm text-gray-500">{dateLabel(open.date)}</span>}
        </div>
        <GalleryGrid photos={open.photos as GalleryPhoto[]} compact={compact} />
      </div>
    );
  }

  return (
    <div>
      <p className="mb-6 text-sm text-gray-500">
        <strong className="text-navy-800">{albums.length}</strong> {albums.length === 1 ? 'album' : 'albums'} ·{' '}
        <strong className="text-navy-800">{photos.length}</strong> {photos.length === 1 ? 'photo' : 'photos'}
      </p>
      <div className={`grid gap-4 ${compact ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4'}`}>
        {albums.map((a) => (
          <button
            key={a.key}
            type="button"
            onClick={() => setOpenKey(a.key)}
            className="group text-left"
          >
            <div className="relative aspect-square overflow-hidden rounded-lg bg-gray-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={a.photos[0].url}
                alt={a.name}
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
              />
              <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[11px] font-semibold text-white">
                <Images size={11} aria-hidden /> {a.photos.length}
              </span>
            </div>
            <div className="mt-2">
              <p className="truncate text-sm font-semibold text-navy-800">{a.name}</p>
              {a.date && <p className="text-xs text-gray-500">{dateLabel(a.date)}</p>}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
