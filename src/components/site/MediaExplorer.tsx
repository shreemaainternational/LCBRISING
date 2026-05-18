'use client';

import { useMemo, useState } from 'react';
import { Search, Calendar, Newspaper, Globe, Tv } from 'lucide-react';

export type MediaItem = {
  id: string;
  title: string;
  outlet: string;
  date: string;
  type: 'Newspaper' | 'Online' | 'TV';
  image: string;
  url?: string;
};

const TYPE_META: Record<
  MediaItem['type'],
  { className: string; icon: typeof Newspaper }
> = {
  Newspaper: { className: 'bg-blue-100 text-blue-700', icon: Newspaper },
  Online: { className: 'bg-green-100 text-green-700', icon: Globe },
  TV: { className: 'bg-red-100 text-red-700', icon: Tv },
};

export function MediaExplorer({ items }: { items: MediaItem[] }) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (m) =>
        m.title.toLowerCase().includes(q) ||
        m.outlet.toLowerCase().includes(q) ||
        m.type.toLowerCase().includes(q),
    );
  }, [items, query]);

  return (
    <>
      {/* Search */}
      <div className="border-b border-gray-200 bg-white">
        <div className="container-page py-5">
          <div className="relative max-w-md">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              aria-hidden
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search media..."
              className="w-full h-11 pl-9 pr-3 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
            />
          </div>
        </div>
      </div>

      {/* Grid */}
      <section className="bg-gray-50 py-14">
        <div className="container-page">
          {filtered.length === 0 ? (
            <p className="text-center text-gray-500 py-10">
              No coverage matches your search.
            </p>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-7">
              {filtered.map((m) => {
                const meta = TYPE_META[m.type];
                const Icon = meta.icon;
                const Wrapper = m.url ? 'a' : 'div';
                return (
                  <Wrapper
                    key={m.id}
                    {...(m.url
                      ? {
                          href: m.url,
                          target: '_blank',
                          rel: 'noopener noreferrer',
                        }
                      : {})}
                    className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col group"
                  >
                    <div className="relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={m.image}
                        alt={m.title}
                        className="h-48 w-full object-cover"
                      />
                      <span
                        className={`absolute top-3 left-3 inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full ${meta.className}`}
                      >
                        <Icon size={12} aria-hidden />
                        {m.type}
                      </span>
                    </div>
                    <div className="p-6 flex flex-col flex-1">
                      <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-2">
                        <Calendar size={13} aria-hidden />
                        <span>
                          {m.date} &middot; {m.outlet}
                        </span>
                      </div>
                      <h3 className="font-bold text-lg text-navy-800 group-hover:text-brand-600 transition-colors">
                        {m.title}
                      </h3>
                    </div>
                  </Wrapper>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
