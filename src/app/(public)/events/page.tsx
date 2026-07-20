import type { Metadata } from 'next';
import { getUpcomingPublicEvents, getPastPublicEvents } from '@/lib/events';
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

  // Read through the RLS-resilient helpers (service-role client when
  // configured) so the public listing isn't blanked by the
  // events_public_read policy recursion on databases missing migration 0059.
  const [upcoming, past] = await Promise.all([
    getUpcomingPublicEvents(),
    getPastPublicEvents(24),
  ]);

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
          upcoming={upcoming as EventRow[]}
          past={past as EventRow[]}
          tabs={CELEBRATION_GROUP?.items ?? []}
          initialCategory={initialCategory}
        />
      </section>
    </>
  );
}
