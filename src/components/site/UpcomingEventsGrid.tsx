'use client';

import { useState } from 'react';
import { Calendar, MapPin } from 'lucide-react';
import { DetailModal, type DetailItem } from '@/components/site/DetailModal';
import { eventToDetail } from '@/components/site/EventsBrowser';
import { eventImage, type EventRow } from '@/components/site/EventCard';

function formatDateParts(d: string) {
  const dt = new Date(d);
  return {
    day: dt.toLocaleString('en-IN', { day: '2-digit' }),
    month: dt.toLocaleString('en-IN', { month: 'short' }).toUpperCase(),
    weekday: dt.toLocaleString('en-IN', { weekday: 'short' }),
    time: dt.toLocaleString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true }),
  };
}

/**
 * Homepage "Upcoming Events" cards. Keeps the date-pill layout but makes each
 * card open the same detail popup (photos + full story) used on the Events
 * page, reusing eventToDetail so both surfaces stay in sync.
 */
export function UpcomingEventsGrid({ events }: { events: EventRow[] }) {
  const [open, setOpen] = useState<DetailItem | null>(null);

  return (
    <>
      <div className="grid md:grid-cols-3 gap-6">
        {events.map((e, i) => {
          const d = formatDateParts(e.date);
          return (
            <button
              key={e.id}
              type="button"
              onClick={() => setOpen(eventToDetail(e, eventImage(e, i)))}
              aria-label={`View details for ${e.title}`}
              className="group text-left rounded-2xl bg-white border border-gray-200 hover:border-brand-300 hover:shadow-lg transition-all overflow-hidden flex focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
            >
              {/* Date pill */}
              <div className="bg-navy-800 text-white text-center flex flex-col justify-center px-5 py-4 min-w-[88px]">
                <span className="text-2xl font-bold leading-none">{d.day}</span>
                <span className="text-xs tracking-widest mt-1">{d.month}</span>
                <span className="text-[10px] text-brand-300 mt-1">{d.weekday}</span>
              </div>

              {/* Body */}
              <div className="flex-1 p-5">
                <h3 className="font-semibold text-navy-800 line-clamp-2 group-hover:text-brand-600 transition-colors">
                  {e.title}
                </h3>
                <div className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                  <Calendar size={12} aria-hidden /> {d.time}
                </div>
                {e.location && (
                  <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                    <MapPin size={12} aria-hidden /> {e.location}
                  </div>
                )}
                {e.description && (
                  <p className="text-sm text-gray-600 mt-3 line-clamp-2">{e.description}</p>
                )}
                <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-brand-600 group-hover:text-brand-700">
                  RSVP &amp; details
                </span>
              </div>
            </button>
          );
        })}
      </div>

      <DetailModal item={open} onClose={() => setOpen(null)} />
    </>
  );
}
