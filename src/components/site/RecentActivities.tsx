'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
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

export function RecentActivities({ activities }: { activities: RecentActivity[] }) {
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
            <ActivityCard key={a.id} activity={a} />
          ))}
        </div>
      )}
    </section>
  );
}
