import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { PageHero, PAGE_HERO_BG } from '@/components/site/PageHero';
import { EventCard, type EventRow } from '@/components/site/EventCard';
import {
  getEventCategoryGroup,
  groupCategorySlugs,
} from '@/lib/event-categories';

/**
 * Landing page for a programme group (Meetings, Leadership Programme).
 * Lists every public event whose category belongs to the group — upcoming
 * first, then past — reusing the same card as the Events page.
 */
export async function ProgrammeEventsPage({ groupKey }: { groupKey: string }) {
  const group = getEventCategoryGroup(groupKey);
  if (!group) notFound();
  const slugs = groupCategorySlugs(group);

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
        .in('category', slugs)
        .gte('date', now)
        .order('date'),
      supabase
        .from('events')
        .select('*')
        .eq('is_public', true)
        .in('category', slugs)
        .lt('date', now)
        .order('date', { ascending: false })
        .limit(12),
    ]);
    upcoming = (u.data ?? []) as EventRow[];
    past = (p.data ?? []) as EventRow[];
  }

  const empty = upcoming.length === 0 && past.length === 0;

  return (
    <>
      <PageHero
        pillText="LIONS CLUB OF BARODA RISING STAR"
        headline={group.title}
        subtitle={group.blurb}
        backgroundImage={PAGE_HERO_BG.events}
      />

      <section className="container-page py-16 md:py-20">
        {empty ? (
          <p className="text-center text-gray-500">
            No {group.title.toLowerCase()} have been published yet. Check back
            soon!
          </p>
        ) : (
          <>
            {upcoming.length > 0 && (
              <>
                <div className="text-center mb-12">
                  <span className="inline-block bg-blue-50 text-navy-700 px-3 py-1 rounded-full text-xs font-semibold mb-3">
                    Upcoming
                  </span>
                  <h2 className="text-3xl md:text-4xl font-bold text-navy-800">
                    Upcoming {group.title}
                  </h2>
                </div>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-7">
                  {upcoming.map((e, i) => (
                    <EventCard key={e.id} event={e} fallbackIndex={i} />
                  ))}
                </div>
              </>
            )}

            {past.length > 0 && (
              <>
                <h2 className="text-2xl font-bold text-navy-800 mt-16 mb-8">
                  {upcoming.length > 0 ? 'Past' : 'Recent'} {group.title}
                </h2>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-7">
                  {past.map((e, i) => (
                    <EventCard key={e.id} event={e} fallbackIndex={i} muted />
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </section>
    </>
  );
}
