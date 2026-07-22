'use client';

import { useState } from 'react';
import Link from 'next/link';
import { MapPin, Images } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { formatDate } from '@/lib/utils';
import { DetailModal, type DetailItem } from '@/components/site/DetailModal';

export type RecentActivity = {
  id: string;
  title: string;
  description: string | null;
  date: string;
  location: string | null;
  beneficiaries: number | null;
  lionMembers: number | null;
  serviceHours: number | null;
  /** Every displayable photo, cover first (already collected on the server). */
  photos: string[];
};

function toDetail(a: RecentActivity): DetailItem {
  return {
    id: a.id,
    title: a.title,
    dateLabel: formatDate(a.date),
    meta: a.location ? [{ icon: MapPin, text: a.location }] : [],
    stats: [
      ...(a.beneficiaries && a.beneficiaries > 0
        ? [{ label: 'Beneficiaries', value: a.beneficiaries.toLocaleString('en-IN') }] : []),
      ...(a.lionMembers && a.lionMembers > 0
        ? [{ label: 'Lion Members', value: a.lionMembers.toLocaleString('en-IN') }] : []),
      ...(a.serviceHours && a.serviceHours > 0
        ? [{ label: 'Service Hours', value: a.serviceHours.toLocaleString('en-IN') }] : []),
    ],
    photos: a.photos,
    body: a.description ?? undefined,
    ctas: [{ href: '/donate', label: 'Support this cause', variant: 'gold' }],
    sharePath: '/activities',
  };
}

export function RecentActivities({ activities }: { activities: RecentActivity[] }) {
  const [open, setOpen] = useState<DetailItem | null>(null);

  return (
    <section className="container-page py-12">
      <div className="flex items-end justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold text-navy-800">Recent Activities</h2>
          <p className="text-gray-600 mt-2">A glimpse of our service in action.</p>
        </div>
        <Button asChild variant="outline">
          <Link href="/activities">View all</Link>
        </Button>
      </div>

      {activities.length === 0 ? (
        <p className="text-gray-500">Activities will appear here once added.</p>
      ) : (
        <div className="grid md:grid-cols-3 gap-6">
          {activities.map((a) => {
            const cover = a.photos[0];
            return (
              <button
                key={a.id}
                type="button"
                onClick={() => setOpen(toDetail(a))}
                aria-label={`View details for ${a.title}`}
                className="group text-left w-full focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 rounded-xl"
              >
                <Card className="overflow-hidden h-full transition-shadow group-hover:shadow-md">
                  {cover && (
                    <div className="relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={cover}
                        alt={a.title}
                        loading="lazy"
                        className="h-44 w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                      />
                      {a.photos.length > 1 && (
                        <span className="absolute bottom-2 right-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/60 text-white text-[11px] font-semibold">
                          <Images size={12} aria-hidden /> {a.photos.length}
                        </span>
                      )}
                    </div>
                  )}
                  <CardContent className="p-6">
                    <div className="text-xs text-brand-600 font-medium mb-1">{formatDate(a.date)}</div>
                    <h3 className="font-semibold text-lg text-navy-800 mb-2 group-hover:text-brand-600 transition-colors">
                      {a.title}
                    </h3>
                    <p className="text-sm text-gray-600 line-clamp-3">{a.description ?? ''}</p>
                    <div className="text-xs text-gray-500 mt-4 flex flex-wrap gap-x-3 gap-y-1">
                      {!!a.beneficiaries && a.beneficiaries > 0 && (
                        <span>{a.beneficiaries.toLocaleString('en-IN')} beneficiaries</span>
                      )}
                      {!!a.lionMembers && a.lionMembers > 0 && (
                        <span>{a.lionMembers.toLocaleString('en-IN')} Lions</span>
                      )}
                      {!!a.serviceHours && a.serviceHours > 0 && (
                        <span>{a.serviceHours.toLocaleString('en-IN')} hrs</span>
                      )}
                      <span>{a.location ?? 'Vadodara'}</span>
                    </div>
                  </CardContent>
                </Card>
              </button>
            );
          })}
        </div>
      )}

      <DetailModal item={open} onClose={() => setOpen(null)} />
    </section>
  );
}
