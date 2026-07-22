'use client';

import { useState } from 'react';
import { Calendar, MapPin, Users, Images, ImageOff } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { DetailModal, type DetailItem } from '@/components/site/DetailModal';
import { causeForCategory } from '@/lib/causes';

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

function toDetail(a: CauseActivity, causeSlug?: string): DetailItem {
  const slug = causeSlug ?? causeForCategory(a.category).slug;
  return {
    id: a.id,
    title: a.title,
    dateLabel: formatDate(a.date),
    meta: [
      ...(a.location ? [{ icon: MapPin, text: a.location }] : []),
      ...(a.beneficiaries && a.beneficiaries > 0
        ? [{ icon: Users, text: `${a.beneficiaries.toLocaleString('en-IN')} reached` }]
        : []),
    ],
    photos: a.photos,
    body: a.description ?? undefined,
    ctas: [{ href: '/donate', label: 'Support this cause', variant: 'gold' }],
    sharePath: `/activities/${slug}`,
  };
}

export function CauseActivities({
  activities,
  causeSlug,
}: {
  activities: CauseActivity[];
  causeSlug?: string;
}) {
  const [open, setOpen] = useState<DetailItem | null>(null);

  return (
    <>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {activities.map((a) => {
          const cover = a.photos[0];
          return (
            <button
              key={a.id}
              type="button"
              onClick={() => setOpen(toDetail(a, causeSlug))}
              className="group text-left flex flex-col bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="relative block aspect-[16/10] bg-gray-100 overflow-hidden">
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
              </div>

              <div className="flex flex-col flex-1 p-5">
                <h3 className="font-bold text-navy-800 leading-snug line-clamp-2 group-hover:text-brand-600 transition-colors">
                  {a.title}
                </h3>
                {a.description && (
                  <p className="mt-2 text-sm text-gray-600 line-clamp-3">{a.description}</p>
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
                      <Users size={13} aria-hidden /> {a.beneficiaries.toLocaleString('en-IN')} reached
                    </span>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <DetailModal item={open} onClose={() => setOpen(null)} />
    </>
  );
}
