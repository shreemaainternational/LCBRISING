import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { PageHero, PAGE_HERO_BG } from '@/components/site/PageHero';
import { ProgrammeActivities } from '@/components/site/ProgrammeActivities';
import type { CauseActivity } from '@/app/(public)/activities/[cause]/CauseActivities';
import {
  getEventCategoryGroup,
  groupCategorySlugs,
} from '@/lib/event-categories';

type ActivityRow = {
  id: string;
  title: string;
  description: string | null;
  date: string;
  location: string | null;
  beneficiaries: number | null;
  category: string | null;
  photos: string[] | null;
  before_photos: string[] | null;
  after_photos: string[] | null;
  photo_captions: Record<string, string> | null;
};

/**
 * Landing page for a programme group (Meetings, Leadership Programme).
 * Lists the club's approved activities whose category belongs to the group,
 * with a tab bar (mapped to the nav sub-menu) to filter by sub-category.
 */
export async function ProgrammeActivitiesPage({
  groupKey,
  initialCategory = '',
}: {
  groupKey: string;
  initialCategory?: string;
}) {
  const group = getEventCategoryGroup(groupKey);
  if (!group) notFound();
  const slugs = groupCategorySlugs(group);

  let activities: CauseActivity[] = [];
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      const { data } = await supabase
        .from('activities')
        .select(
          'id, title, description, date, location, beneficiaries, category, photos, before_photos, after_photos, photo_captions',
        )
        .in('category', slugs)
        .eq('approval_status', 'approved')
        .order('date', { ascending: false })
        .limit(300);

      activities = ((data ?? []) as ActivityRow[]).map((a) => ({
        id: a.id,
        title: a.title,
        description: a.description,
        date: a.date,
        location: a.location,
        beneficiaries: a.beneficiaries,
        category: a.category,
        photos: Array.from(
          new Set([
            ...(a.photos ?? []),
            ...(a.before_photos ?? []),
            ...(a.after_photos ?? []),
          ]),
        ),
        captions: a.photo_captions ?? {},
      }));
    } catch {
      activities = [];
    }
  }

  return (
    <>
      <PageHero
        pillText="LIONS CLUB OF BARODA RISING STAR"
        headline={group.title}
        subtitle={group.blurb}
        backgroundImage={PAGE_HERO_BG.activities}
      />

      <section className="container-page py-14 md:py-16">
        {activities.length === 0 ? (
          <p className="text-center text-gray-500">
            No {group.title.toLowerCase()} have been published yet. Check back
            soon!
          </p>
        ) : (
          <ProgrammeActivities
            activities={activities}
            tabs={group.items}
            initialCategory={initialCategory}
          />
        )}
      </section>
    </>
  );
}
