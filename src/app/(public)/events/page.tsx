import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { PageHero, PAGE_HERO_BG } from '@/components/site/PageHero';
import { type EventRow } from '@/components/site/EventCard';
import { EventsBrowser } from '@/components/site/EventsBrowser';
import { getEventCategory, getEventCategoryGroup } from '@/lib/event-categories';

export const metadata: Metadata = { title: 'Events', alternates: { canonical: '/events' } };
export const revalidate = 60;

// The Events sub-menu (Celebrations & Festivals) drives the on-page tabs.
const CELEBRATION_GROUP = getEventCategoryGroup('celebration');

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category } = await searchParams;
  const activeCategory = category ? getEventCategory(category) : undefined;
  const initialCategory = activeCategory?.slug ?? '';

  let upcoming: EventRow[] = [];
  let past: EventRow[] = [];
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const now = new Date().toISOString();
    const [u, p] = await Promise.all([
      supabase
        .from('events')
        .select('*')
        .eq('is_public', true)
        .gte('date', now)
        .order('date'),
      supabase
        .from('events')
        .select('*')
        .eq('is_public', true)
        .lt('date', now)
        .order('date', { ascending: false })
        .limit(24),
    ]);
    upcoming = (u.data ?? []) as EventRow[];
    past = (p.data ?? []) as EventRow[];
  }

  return (
    <>
      <PageHero
        pillText="EVENTS"
        headline={activeCategory ? activeCategory.label : 'Upcoming Events'}
        subtitle="Join us at our upcoming service activities, meetings, and community events. Everyone is welcome!"
        backgroundImage={PAGE_HERO_BG.events}
      />

      <section className="container-page py-16 md:py-20">
        <EventsBrowser
          upcoming={upcoming}
          past={past}
          tabs={CELEBRATION_GROUP?.items ?? []}
          initialCategory={initialCategory}
        />
      </section>
    </>
  );
}
