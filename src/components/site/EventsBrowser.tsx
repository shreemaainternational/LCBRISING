'use client';

import { useMemo, useState } from 'react';
import { EventCard, type EventRow } from '@/components/site/EventCard';
import { CategoryTabs, type CategoryTab } from '@/components/site/CategoryTabs';

/**
 * Client wrapper for the Events page: a tab bar (mapped to the Events
 * navigation sub-menu — Celebrations & Festivals) that filters the fetched
 * events by category, keeping the upcoming / past split.
 */
export function EventsBrowser({
  upcoming,
  past,
  tabs,
  initialCategory = '',
}: {
  upcoming: EventRow[];
  past: EventRow[];
  tabs: CategoryTab[];
  initialCategory?: string;
}) {
  const [active, setActive] = useState(initialCategory);

  const vUpcoming = useMemo(
    () => (active ? upcoming.filter((e) => e.category === active) : upcoming),
    [upcoming, active],
  );
  const vPast = useMemo(
    () => (active ? past.filter((e) => e.category === active) : past),
    [past, active],
  );

  return (
    <div className="space-y-10">
      <CategoryTabs
        tabs={tabs}
        active={active}
        onChange={setActive}
        allLabel="All Events"
      />

      {vUpcoming.length === 0 ? (
        <p className="text-center text-gray-500">
          No upcoming events in this category. Check back soon!
        </p>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-7">
          {vUpcoming.map((e, i) => (
            <EventCard key={e.id} event={e} fallbackIndex={i} />
          ))}
        </div>
      )}

      {vPast.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold text-navy-800 mb-8">Past Events</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-7">
            {vPast.map((e, i) => (
              <EventCard key={e.id} event={e} fallbackIndex={i} muted />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
