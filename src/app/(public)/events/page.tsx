import type { Metadata } from 'next';
import { getUpcomingPublicEvents, getPastPublicEvents } from '@/lib/events';
import { env } from '@/lib/env';
import { PageHero, PAGE_HERO_BG } from '@/components/site/PageHero';
import { type EventRow } from '@/components/site/EventCard';
import { EventsBrowser } from '@/components/site/EventsBrowser';

function eventsJsonLd(events: EventRow[]) {
  const site = env.NEXT_PUBLIC_SITE_URL;
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: events.slice(0, 20).map((e, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: {
        '@type': 'Event',
        name: e.title,
        startDate: e.date,
        ...(e.end_date ? { endDate: e.end_date } : {}),
        eventStatus: 'https://schema.org/EventScheduled',
        eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
        ...(e.description ? { description: e.description } : {}),
        ...(e.cover_url ? { image: [e.cover_url] } : {}),
        location: {
          '@type': 'Place',
          name: e.location || 'Vadodara',
          address: e.location || 'Vadodara, Gujarat, India',
        },
        organizer: {
          '@type': 'Organization',
          name: 'Lions Club of Baroda Rising Star',
          url: site,
        },
      },
    })),
  };
}

export const metadata: Metadata = { title: 'Events', alternates: { canonical: '/events' } };
export const revalidate = 60;

export default async function EventsPage() {
  // Read through the RLS-resilient helpers (service-role client when
  // configured) so the public listing isn't blanked by the
  // events_public_read policy recursion on databases missing migration 0059.
  const [upcoming, past] = await Promise.all([
    getUpcomingPublicEvents(),
    getPastPublicEvents(24),
  ]);

  const allForSeo = [...upcoming, ...past];

  return (
    <>
      {allForSeo.length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(eventsJsonLd(allForSeo)) }}
        />
      )}
      <PageHero
        pillText="EVENTS"
        headline="Our Events"
        subtitle="Join us at our upcoming service activities, meetings, and community events — and relive our past ones. Everyone is welcome!"
        backgroundImage={PAGE_HERO_BG.events}
      />

      <section className="container-page py-16 md:py-20">
        <EventsBrowser upcoming={upcoming as EventRow[]} past={past as EventRow[]} />
      </section>
    </>
  );
}
