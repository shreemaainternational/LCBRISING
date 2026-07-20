import Link from 'next/link';
import { Calendar, Clock, MapPin } from 'lucide-react';
import { getEventCategory } from '@/lib/event-categories';

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

export const EVENT_FALLBACK_IMAGES = [
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

export function EventCard({
  event,
  fallbackIndex,
  muted,
}: {
  event: EventRow;
  fallbackIndex: number;
  muted?: boolean;
}) {
  const image =
    event.cover_url ||
    EVENT_FALLBACK_IMAGES[fallbackIndex % EVENT_FALLBACK_IMAGES.length];
  const timeRange = event.end_date
    ? `${fmtTime(event.date)} - ${fmtTime(event.end_date)}`
    : fmtTime(event.date);
  const categoryLabel = event.category
    ? getEventCategory(event.category)?.label ?? event.category
    : 'Community Event';

  return (
    <Link
      href={`/events/${event.id}`}
      className={`group bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col hover:shadow-lg transition-shadow ${
        muted ? 'opacity-80' : ''
      }`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={image}
        alt={event.title}
        className="h-44 w-full object-cover group-hover:scale-[1.02] transition-transform duration-500"
      />
      <div className="p-6 flex flex-col flex-1">
        <span className="inline-block self-start bg-blue-50 text-navy-700 px-3 py-1 rounded-full text-xs font-semibold mb-3">
          {categoryLabel}
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
    </Link>
  );
}
