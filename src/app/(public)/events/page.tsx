import type { Metadata } from 'next';
import { Calendar, Clock, MapPin } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';

export const metadata: Metadata = { title: 'Events' };
export const revalidate = 60;

type EventRow = {
  id: string;
  title: string;
  description: string | null;
  date: string;
  end_date: string | null;
  location: string | null;
  cover_url: string | null;
  category: string | null;
};

const FALLBACK_IMAGES = [
  'https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?auto=format&fit=crop&w=900&q=70',
  'https://images.unsplash.com/photo-1466692476868-aef1dfb1e735?auto=format&fit=crop&w=900&q=70',
  'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=900&q=70',
];

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default async function EventsPage() {
  let upcoming: EventRow[] = [];
  let past: EventRow[] = [];
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const now = new Date().toISOString();
    const [u, p] = await Promise.all([
      supabase.from('events').select('*').eq('is_public', true).gte('date', now).order('date'),
      supabase
        .from('events')
        .select('*')
        .eq('is_public', true)
        .lt('date', now)
        .order('date', { ascending: false })
        .limit(6),
    ]);
    upcoming = (u.data ?? []) as EventRow[];
    past = (p.data ?? []) as EventRow[];
  }

  return (
    <>
      {/* Hero */}
      <section className="bg-navy-900 text-white border-t border-white/15">
        <div className="container-page py-20 md:py-24 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 mb-6">
            <Calendar size={14} className="text-brand-400" aria-hidden />
            <span className="text-xs font-semibold tracking-[0.15em] text-brand-400">
              EVENTS
            </span>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold leading-tight mb-4">
            Upcoming Events
          </h1>
          <p className="text-base md:text-lg text-gray-300 max-w-2xl mx-auto">
            Join us at our upcoming service activities, meetings, and community
            events. Everyone is welcome!
          </p>
        </div>
      </section>

      {/* Upcoming events grid */}
      <section className="container-page py-16 md:py-20">
        <div className="text-center mb-12">
          <span className="inline-block bg-blue-50 text-navy-700 px-3 py-1 rounded-full text-xs font-semibold mb-3">
            Upcoming
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-navy-800">
            Don&apos;t Miss These Events
          </h2>
        </div>

        {upcoming.length === 0 ? (
          <p className="text-center text-gray-500">
            No upcoming events scheduled. Check back soon!
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

function EventCard({
  event,
  fallbackIndex,
  muted,
}: {
  event: EventRow;
  fallbackIndex: number;
  muted?: boolean;
}) {
  const image =
    event.cover_url || FALLBACK_IMAGES[fallbackIndex % FALLBACK_IMAGES.length];
  const timeRange = event.end_date
    ? `${fmtTime(event.date)} - ${fmtTime(event.end_date)}`
    : fmtTime(event.date);

  return (
    <article
      className={`bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col ${
        muted ? 'opacity-80' : ''
      }`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={image}
        alt={event.title}
        className="h-44 w-full object-cover"
      />
      <div className="p-6 flex flex-col flex-1">
        <span className="inline-block self-start bg-blue-50 text-navy-700 px-3 py-1 rounded-full text-xs font-semibold mb-3">
          {event.category || 'Community Event'}
        </span>
        <h3 className="font-bold text-lg text-navy-800 mb-2">{event.title}</h3>
        {event.description && (
          <p className="text-sm text-gray-600 line-clamp-2 mb-5">
            {event.description}
          </p>
        )}
        <div className="mt-auto space-y-2.5 text-sm text-gray-700">
          <div className="flex items-center gap-2">
            <Calendar size={15} className="text-brand-500 flex-shrink-0" aria-hidden />
            <span>{fmtDate(event.date)}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock size={15} className="text-brand-500 flex-shrink-0" aria-hidden />
            <span>{timeRange}</span>
          </div>
          {event.location && (
            <div className="flex items-center gap-2">
              <MapPin size={15} className="text-brand-500 flex-shrink-0" aria-hidden />
              <span>{event.location}</span>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
