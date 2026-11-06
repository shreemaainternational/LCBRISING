'use client';

import { ActivityCard } from '@/components/site/ActivityCard';

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

export function CauseActivities({
  activities,
}: {
  activities: CauseActivity[];
  /** @deprecated no longer used — cards link to the canonical activity URL. */
  causeSlug?: string;
}) {
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {activities.map((a) => (
        <ActivityCard key={a.id} activity={a} />
      ))}
    </div>
  );
}
