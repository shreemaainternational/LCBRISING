'use client';

import { useState } from 'react';
import Link from 'next/link';
import { MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/utils';
import { DetailModal, type DetailItem } from '@/components/site/DetailModal';
import { ActivityCard } from '@/components/site/ActivityCard';

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
          {activities.map((a) => (
            <ActivityCard key={a.id} activity={a} onOpen={() => setOpen(toDetail(a))} />
          ))}
        </div>
      )}

      <DetailModal item={open} onClose={() => setOpen(null)} />
    </section>
  );
}
