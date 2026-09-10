'use client';

import { useState } from 'react';
import { Clock, MapPin } from 'lucide-react';
import { EventCard, type EventRow } from '@/components/site/EventCard';
import { DetailModal, type DetailItem } from '@/components/site/DetailModal';
import { getEventCategory } from '@/lib/event-categories';

export function eventToDetail(e: EventRow, image: string): DetailItem {
  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-IN', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  const fmtTime = (iso: string) =>
    new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  const timeRange = e.end_date ? `${fmtTime(e.date)} - ${fmtTime(e.end_date)}` : fmtTime(e.date);
  const categoryLabel = e.category
    ? getEventCategory(e.category)?.label ?? e.category
    : 'Community Event';
  // Cover first (the clicked image), then the rest of the gallery, de-duped.
  const photos = Array.from(
    new Set([image, ...(e.photos ?? [])].filter(Boolean)),
  );
  return {
    id: e.id,
    title: e.title,
    kicker: categoryLabel,
    dateLabel: fmtDate(e.date),
    meta: [
      { icon: Clock, text: timeRange },
      ...(e.location ? [{ icon: MapPin, text: e.location }] : []),
    ],
    photos,
    body: e.description ?? undefined,
    sharePath: '/events',
  };
}

/**
 * Client wrapper for the Events page. Renders every event in one full grid —
 * upcoming first, then past — and opens each event's story in a popup (with
 * photos) on click. No category dropdown/tabs: all events live on this page.
 */
export function EventsBrowser({
  upcoming,
  past,
}: {
  upcoming: EventRow[];
  past: EventRow[];
}) {
  const [open, setOpen] = useState<DetailItem | null>(null);
  const onOpen = (e: EventRow, image: string) => setOpen(eventToDetail(e, image));

  return (
    <div className="space-y-14">
      <section>
        <h2 className="text-2xl font-bold text-navy-800 mb-8">Upcoming Events</h2>
        {upcoming.length === 0 ? (
          <p className="text-center text-gray-500">
            No upcoming events right now. Check back soon!
          </p>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-7">
            {upcoming.map((e, i) => (
              <EventCard key={e.id} event={e} fallbackIndex={i} onOpen={onOpen} />
            ))}
          </div>
        )}
      </section>

      {past.length > 0 && (
        <section>
          <h2 className="text-2xl font-bold text-navy-800 mb-8">Past Events</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-7">
            {past.map((e, i) => (
              <EventCard key={e.id} event={e} fallbackIndex={i} muted onOpen={onOpen} />
            ))}
          </div>
        </section>
      )}

      <DetailModal item={open} onClose={() => setOpen(null)} />
    </div>
  );
}
