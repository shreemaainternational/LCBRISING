import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Calendar, Clock, MapPin } from 'lucide-react';
import { getPublicEventById } from '@/lib/events';
import { getEventCategory } from '@/lib/event-categories';
import { LocationMap } from '@/components/site/LocationMap';
import { ShareButtons } from '@/components/site/ShareButtons';

export const dynamic = 'force-dynamic';

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

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const event = await getPublicEventById(id);
  if (!event) return { title: 'Event not found' };
  return {
    title: event.title,
    description: event.description ?? `${event.title} — Lions Club of Baroda Rising Star`,
    alternates: { canonical: `/events/${event.id}` },
  };
}

export default async function EventReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const event = await getPublicEventById(id);
  if (!event) notFound();

  const categoryLabel = event.category
    ? getEventCategory(event.category)?.label ?? event.category
    : 'Community Event';
  const timeRange = event.end_date
    ? `${fmtTime(event.date)} – ${fmtTime(event.end_date)}`
    : fmtTime(event.date);

  return (
    <article className="pb-16">
      {/* Cover */}
      {event.cover_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={event.cover_url}
          alt={event.title}
          className="w-full max-h-[520px] object-contain bg-navy-900"
        />
      )}

      <div className="container-page pt-8">
        <Link
          href="/events"
          className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-navy-800 mb-6"
        >
          <ArrowLeft size={14} /> All events
        </Link>

        <span className="inline-block bg-blue-50 text-navy-700 px-3 py-1 rounded-full text-xs font-semibold mb-3">
          {categoryLabel}
        </span>
        <h1 className="text-3xl md:text-4xl font-bold text-navy-800 mb-5">{event.title}</h1>

        {/* Meta */}
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-700 mb-8">
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

        {/* Full report */}
        <div className="grid lg:grid-cols-3 gap-10">
          <div className="lg:col-span-2">
            {event.description ? (
              <div className="prose prose-navy max-w-none whitespace-pre-line text-gray-700 leading-relaxed">
                {event.description}
              </div>
            ) : (
              <p className="text-gray-500">Full details for this event will be shared soon.</p>
            )}
          </div>

          {/* Location map */}
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
