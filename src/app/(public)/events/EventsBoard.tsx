'use client';

import { useState } from 'react';
import { Calendar, Clock, MapPin } from 'lucide-react';
import { DetailModal, type DetailItem } from '@/components/site/DetailModal';

export type EventRow = {
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
  return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

function toDetail(e: EventRow, image: string): DetailItem {
  const timeRange = e.end_date ? `${fmtTime(e.date)} - ${fmtTime(e.end_date)}` : fmtTime(e.date);
  return {
    id: e.id,
    title: e.title,
    kicker: e.category || 'Community Event',
    dateLabel: fmtDate(e.date),
    meta: [
      { icon: Clock, text: timeRange },
      ...(e.location ? [{ icon: MapPin, text: e.location }] : []),
    ],
    photos: [image],
    body: e.description ?? undefined,
    sharePath: '/events',
  };
}

export function EventsBoard({ upcoming, past }: { upcoming: EventRow[]; past: EventRow[] }) {
  const [open, setOpen] = useState<DetailItem | null>(null);

  return (
    <>
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
              <EventCard key={e.id} event={e} fallbackIndex={i} onOpen={setOpen} />
            ))}
          </div>
        )}

        {past.length > 0 && (
          <>
            <h2 className="text-2xl font-bold text-navy-800 mt-16 mb-8">Past Events</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-7">
              {past.map((e, i) => (
                <EventCard key={e.id} event={e} fallbackIndex={i} onOpen={setOpen} muted />
              ))}
            </div>
          </>
        )}
      </section>

      <DetailModal item={open} onClose={() => setOpen(null)} />
    </>
  );
}

function EventCard({
  event,
  fallbackIndex,
  muted,
  onOpen,
}: {
  event: EventRow;
  fallbackIndex: number;
  muted?: boolean;
  onOpen: (d: DetailItem) => void;
}) {
  const image = event.cover_url || FALLBACK_IMAGES[fallbackIndex % FALLBACK_IMAGES.length];
  const timeRange = event.end_date
    ? `${fmtTime(event.date)} - ${fmtTime(event.end_date)}`
    : fmtTime(event.date);

  return (
    <button
      type="button"
      onClick={() => onOpen(toDetail(event, image))}
      className={`text-left bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col group hover:shadow-md transition-shadow ${
        muted ? 'opacity-80' : ''
      }`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={image} alt={event.title} className="h-44 w-full object-cover" />
      <div className="p-6 flex flex-col flex-1">
        <span className="inline-block self-start bg-blue-50 text-navy-700 px-3 py-1 rounded-full text-xs font-semibold mb-3">
          {event.category || 'Community Event'}
        </span>
        <h3 className="font-bold text-lg text-navy-800 mb-2 group-hover:text-brand-600 transition-colors">
          {event.title}
        </h3>
        {event.description && (
          <p className="text-sm text-gray-600 line-clamp-2 mb-5">{event.description}</p>
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
    </button>
  );
}
