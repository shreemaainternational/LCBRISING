import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { type EventRow } from '@/components/site/EventCard';
import { UpcomingEventsGrid } from '@/components/site/UpcomingEventsGrid';

async function getUpcoming(): Promise<EventRow[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const supa = await createClient();
    const { data } = await supa
      .from('events')
      .select('id, title, date, end_date, location, description, cover_url, category, photos')
      .eq('is_public', true)
      .gte('date', new Date().toISOString())
      .order('date')
      .limit(3);
    return (data ?? []) as EventRow[];
  } catch {
    return [];
  }
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
