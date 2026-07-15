import Link from 'next/link';
import { Calendar, MapPin, ArrowRight } from 'lucide-react';
import { getUpcomingPublicEvents } from '@/lib/events';

type EventRow = {
  id: string;
  title: string;
  date: string;
  location: string | null;
  description: string | null;
};

async function getUpcoming(): Promise<EventRow[]> {
  return getUpcomingPublicEvents(3);
}

function formatDateParts(d: string) {
  const dt = new Date(d);
  return {
    day: dt.toLocaleString('en-IN', { day: '2-digit' }),
    month: dt.toLocaleString('en-IN', { month: 'short' }).toUpperCase(),
    weekday: dt.toLocaleString('en-IN', { weekday: 'short' }),
    time: dt.toLocaleString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true }),
  };
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

      <div className="grid md:grid-cols-3 gap-6">
        {events.map((e) => {
          const d = formatDateParts(e.date);
          return (
            <article
              key={e.id}
              className="rounded-2xl bg-white border border-gray-200 hover:border-brand-300 hover:shadow-lg transition-all overflow-hidden flex"
            >
              {/* Date pill */}
              <div className="bg-navy-800 text-white text-center flex flex-col justify-center px-5 py-4 min-w-[88px]">
                <span className="text-2xl font-bold leading-none">{d.day}</span>
                <span className="text-xs tracking-widest mt-1">{d.month}</span>
                <span className="text-[10px] text-brand-300 mt-1">{d.weekday}</span>
              </div>

              {/* Body */}
              <div className="flex-1 p-5">
                <h3 className="font-semibold text-navy-800 line-clamp-2">{e.title}</h3>
                <div className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                  <Calendar size={12} aria-hidden /> {d.time}
                </div>
                {e.location && (
                  <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                    <MapPin size={12} aria-hidden /> {e.location}
                  </div>
                )}
                {e.description && (
                  <p className="text-sm text-gray-600 mt-3 line-clamp-2">
                    {e.description}
                  </p>
                )}
                <Link
                  href={`/events#${e.id}`}
                  className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700"
                >
                  RSVP & details
                  <ArrowRight size={12} aria-hidden />
                </Link>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
