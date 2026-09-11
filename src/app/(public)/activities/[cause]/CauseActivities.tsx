'use client';

import { useState } from 'react';
import { MapPin } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { DetailModal, type DetailItem } from '@/components/site/DetailModal';
import { ActivityCard } from '@/components/site/ActivityCard';
import { causeForCategory } from '@/lib/causes';

export type CauseActivity = {
  id: string;
  title: string;
  description: string | null;
  date: string;
  location: string | null;
  beneficiaries: number | null;
  lionMembers: number | null;
  serviceHours: number | null;
  photos: string[];
  captions: Record<string, string>;
  /** Raw activities.category — used by the programme tab filters. */
  category?: string | null;
};

/** Beneficiaries / Lion members / Service hours as highlight figures. */
function activityStats(a: CauseActivity): { label: string; value: string }[] {
  return [
    ...(a.beneficiaries && a.beneficiaries > 0
      ? [{ label: 'Beneficiaries', value: a.beneficiaries.toLocaleString('en-IN') }] : []),
    ...(a.lionMembers && a.lionMembers > 0
      ? [{ label: 'Lion Members', value: a.lionMembers.toLocaleString('en-IN') }] : []),
    ...(a.serviceHours && a.serviceHours > 0
      ? [{ label: 'Service Hours', value: a.serviceHours.toLocaleString('en-IN') }] : []),
  ];
}

function toDetail(a: CauseActivity, causeSlug?: string): DetailItem {
  const slug = causeSlug ?? causeForCategory(a.category).slug;
  return {
    id: a.id,
    title: a.title,
    dateLabel: formatDate(a.date),
    meta: a.location ? [{ icon: MapPin, text: a.location }] : [],
    stats: activityStats(a),
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
        {activities.map((a) => (
          <ActivityCard key={a.id} activity={a} onOpen={() => setOpen(toDetail(a, causeSlug))} />
        ))}
      </div>

      <DetailModal item={open} onClose={() => setOpen(null)} />
    </>
  );
}
