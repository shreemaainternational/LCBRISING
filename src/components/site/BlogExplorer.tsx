'use client';

import { useMemo, useState } from 'react';
import { BookOpen, ExternalLink, Search } from 'lucide-react';

export type BlogStory = {
  id: string;
  title: string;
  excerpt: string;
  category: string;
  date: string;
  image: string;
  url: string;
  source: string;
};

const CATEGORY_STYLES: Record<string, string> = {
  Humanitarian: 'bg-orange-100 text-orange-700',
  Vision: 'bg-blue-100 text-blue-700',
  'Hunger Relief': 'bg-amber-100 text-amber-800',
  Environment: 'bg-green-100 text-green-700',
  'Disaster Relief': 'bg-red-100 text-red-700',
  Youth: 'bg-purple-100 text-purple-700',
  'Childhood Cancer': 'bg-pink-100 text-pink-700',
  Diabetes: 'bg-cyan-100 text-cyan-700',
};

export function BlogExplorer({ stories }: { stories: BlogStory[] }) {
  const [query, setQuery] = useState('');
  const [cause, setCause] = useState('all');

  const causes = useMemo(
    () => Array.from(new Set(stories.map((s) => s.category))).sort(),
    [stories],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return stories.filter((s) => {
      const matchesCause = cause === 'all' || s.category === cause;
      const matchesQuery =
        !q ||
        s.title.toLowerCase().includes(q) ||
        s.excerpt.toLowerCase().includes(q);
      return matchesCause && matchesQuery;
    });
  }, [stories, query, cause]);

  return (
    <>
      {/* Toolbar */}
      <div className="border-b border-gray-200 bg-white">
        <div className="container-page py-5 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              aria-hidden
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search blogs..."
              className="w-full h-11 pl-9 pr-3 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
            />
          </div>
          <select
            value={cause}
            onChange={(e) => setCause(e.target.value)}
            className="h-11 px-3 rounded-md border border-gray-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-400"
          >
            <option value="all">All Causes</option>
            {causes.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <a
            href="https://www.lionsclubs.org/en/blog"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-navy inline-flex items-center gap-2 h-11 px-5 rounded-md text-sm"
          >
            <ExternalLink size={15} aria-hidden />
            Lions International Blog
          </a>
        </div>
      </div>

      {/* Grid */}
      <section className="bg-gray-50 py-14">
        <div className="container-page">
          {filtered.length === 0 ? (
            <p className="text-center text-gray-500 py-10">
              No stories match your search.
            </p>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-7">
              {filtered.map((s) => (
                <article
                  key={s.id}
                  className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col"
                >
                  <div className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={s.image}
                      alt={s.title}
                      className="h-48 w-full object-cover"
                    />
                    <span className="absolute top-3 left-3 inline-flex items-center gap-1.5 bg-navy-900 text-white text-xs font-semibold px-3 py-1 rounded-full">
                      <BookOpen size={12} aria-hidden />
                      {s.source}
                    </span>
                  </div>
                  <div className="p-6 flex flex-col flex-1">
                    <div className="flex items-center justify-between mb-3">
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                          CATEGORY_STYLES[s.category] ?? 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {s.category}
                      </span>
                      <span className="text-xs text-gray-500">{s.date}</span>
                    </div>
                    <h3 className="font-bold text-lg text-navy-800 mb-2">
                      {s.title}
                    </h3>
                    <p className="text-sm text-gray-600 line-clamp-3 mb-5">
                      {s.excerpt}
                    </p>
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-auto inline-flex items-center gap-1.5 text-sm font-semibold text-navy-800 hover:text-brand-600"
                    >
                      Read on LionsClubs.org
                      <ExternalLink size={14} aria-hidden />
                    </a>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
