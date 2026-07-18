import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { PageHero, PAGE_HERO_BG } from '@/components/site/PageHero';
import { EventCard, type EventRow } from '@/components/site/EventCard';
import { getEventCategory } from '@/lib/event-categories';

export const metadata: Metadata = { title: 'Events', alternates: { canonical: '/events' } };
export const revalidate = 60;

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category } = await searchParams;
  const activeCategory = category ? getEventCategory(category) : undefined;
  // Ignore an unknown slug so a bad query param never hides every event.
  const filterSlug = activeCategory?.slug ?? null;

  let upcoming: EventRow[] = [];
  let past: EventRow[] = [];
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const now = new Date().toISOString();

    const upcomingQuery = supabase
      .from('events')
      .select('*')
      .eq('is_public', true)
      .gte('date', now)
      .order('date');
    const pastQuery = supabase
      .from('events')
      .select('*')
      .eq('is_public', true)
      .lt('date', now)
      .order('date', { ascending: false })
      .limit(6);

    if (filterSlug) {
      upcomingQuery.eq('category', filterSlug);
      pastQuery.eq('category', filterSlug);
    }

    const [u, p] = await Promise.all([upcomingQuery, pastQuery]);
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

      {/* Upcoming events grid */}
      <section className="container-page py-16 md:py-20">
        <div className="text-center mb-12">
          <span className="inline-block bg-blue-50 text-navy-700 px-3 py-1 rounded-full text-xs font-semibold mb-3">
            Upcoming
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-navy-800">
            {activeCategory
              ? `${activeCategory.label}`
              : "Don't Miss These Events"}
          </h2>
        </div>

        {upcoming.length === 0 ? (
          <p className="text-center text-gray-500">
            {activeCategory
              ? `No upcoming ${activeCategory.label} events scheduled. Check back soon!`
              : 'No upcoming events scheduled. Check back soon!'}
          </p>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-7">
            {upcoming.map((e, i) => (
              <EventCard key={e.id} event={e} fallbackIndex={i} />
            ))}
          </div>
        )}

        {past.length > 0 && (
          <>
            <h2 className="text-2xl font-bold text-navy-800 mt-16 mb-8">
              Past Events
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-7">
              {past.map((e, i) => (
                <EventCard key={e.id} event={e} fallbackIndex={i} muted />
              ))}
            </div>
          </>
        )}
      </section>
    </>
  );
}
