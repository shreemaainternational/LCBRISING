import { Calendar, Clock, MapPin } from 'lucide-react';
import { getEventCategory } from '@/lib/event-categories';
import { LocationMap } from '@/components/site/LocationMap';
import { ShareButtons } from '@/components/site/ShareButtons';
import type { PublicEventRow } from '@/lib/events';

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

/** Full event report body — shared by the /events/[id] page and the modal. */
export function EventReport({ event }: { event: PublicEventRow }) {
  const categoryLabel = event.category
    ? getEventCategory(event.category)?.label ?? event.category
    : 'Community Event';
  const timeRange = event.end_date
    ? `${fmtTime(event.date)} – ${fmtTime(event.end_date)}`
    : fmtTime(event.date);

  return (
    <article>
      {event.cover_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={event.cover_url}
          alt={event.title}
          className="w-full max-h-[460px] object-contain bg-navy-900"
        />
      )}

      <div className="mx-auto max-w-4xl px-5 sm:px-8 py-7">
        <span className="inline-block bg-blue-50 text-navy-700 px-3 py-1 rounded-full text-xs font-semibold mb-3">
          {categoryLabel}
        </span>
        <h1 className="text-2xl md:text-3xl font-bold text-navy-800 mb-5">{event.title}</h1>

        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-700 mb-6">
          <span className="inline-flex items-center gap-2">
            <Calendar size={15} className="text-brand-500" aria-hidden /> {fmtDate(event.date)}
          </span>
          <span className="inline-flex items-center gap-2">
            <Clock size={15} className="text-brand-500" aria-hidden /> {timeRange}
          </span>
          {event.location && (
            <span className="inline-flex items-center gap-2">
              <MapPin size={15} className="text-brand-500" aria-hidden /> {event.location}
            </span>
          )}
        </div>

        <ShareButtons title={event.title} className="mb-8" />

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            {event.description ? (
              <div className="prose prose-navy max-w-none whitespace-pre-line text-gray-700 leading-relaxed">
                {event.description}
              </div>
            ) : (
              <p className="text-gray-500">Full details for this event will be shared soon.</p>
            )}
          </div>

          {event.location && (
            <aside className="lg:col-span-1">
              <h2 className="text-sm font-semibold uppercase tracking-[0.15em] text-gray-500 mb-3">
                Venue
              </h2>
              <LocationMap location={event.location} />
              <p className="text-sm text-gray-600 mt-3 flex items-start gap-2">
                <MapPin size={15} className="text-brand-500 mt-0.5 flex-shrink-0" aria-hidden />
                {event.location}
              </p>
            </aside>
          )}
        </div>
      </div>
    </article>
  );
}
