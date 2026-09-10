import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { getUpcomingPublicEvents } from '@/lib/events';
import { type EventRow } from '@/components/site/EventCard';
import { UpcomingEventsGrid } from '@/components/site/UpcomingEventsGrid';

// Reads through the RLS-resilient helper (service-role client when
// configured) so the homepage strip isn't blanked by the events_public_read
// policy recursion on databases missing migration 0059.
async function getUpcoming(): Promise<EventRow[]> {
  return (await getUpcomingPublicEvents(3)) as EventRow[];
}

export async function UpcomingEventsStrip() {
  const events = await getUpcoming();

  // Hide entirely when there are no public upcoming events.
  if (events.length === 0) return null;

  return (
    <section className="container-page py-16">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-10">
        <div>
          <span className="inline-block bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-xs font-semibold mb-3">
            Coming Up
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-navy-800">
            Upcoming Events
          </h2>
        </div>
        <Link
          href="/events"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-navy-700 hover:text-brand-600"
        >
          See full calendar
          <ArrowRight size={14} aria-hidden />
        </Link>
      </div>

      <UpcomingEventsGrid events={events} />
    </section>
  );
}
