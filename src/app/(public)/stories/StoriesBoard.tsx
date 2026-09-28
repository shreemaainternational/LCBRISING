'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ExternalLink, MapPin } from 'lucide-react';
import { DetailModal, type DetailItem } from '@/components/site/DetailModal';
import { formatDate } from '@/lib/utils';

export type Story = {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  beneficiary_name: string | null;
  beneficiary_age: number | null;
  location: string | null;
  hero_image: string | null;
  impact_quote: string | null;
  impact_metric: string | null;
  tags: string[] | null;
  is_featured: boolean | null;
  published_at: string | null;
  /** Set on stories imported from lionsclubs.org (migration 0082). */
  external_source?: string | null;
  source_url?: string | null;
};

const FALLBACK_HERO =
  'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?auto=format&fit=crop&w=1200&q=70';

function toDetail(s: Story): DetailItem {
  const hasSlug = !!s.slug && s.slug !== '#';
  const name = s.beneficiary_name
    ? `${s.beneficiary_name}${s.beneficiary_age ? `, ${s.beneficiary_age}` : ''}`
    : undefined;
  const body = [s.subtitle, s.impact_quote, s.impact_metric]
    .filter(Boolean)
    .join('\n\n');
  return {
    id: s.id,
    title: s.title,
    kicker: name ? `Story of ${name}` : 'Story of impact',
    dateLabel: s.published_at ? formatDate(s.published_at) : undefined,
    meta: s.location ? [{ icon: MapPin, text: s.location }] : undefined,
    photos: [s.hero_image || FALLBACK_HERO],
    body,
    ctas: [
      ...(hasSlug
        ? [{ href: `/stories/${s.slug}`, label: 'Read full story', variant: 'navy' as const }]
        : []),
      { href: '/donate', label: 'Support this work', variant: 'gold' as const },
    ],
    sharePath: hasSlug ? `/stories/${s.slug}` : '/stories',
  };
}

export function StoriesBoard({
  featured,
  rest,
  lions = [],
}: {
  featured: Story | null;
  rest: Story[];
  lions?: Story[];
}) {
  const [open, setOpen] = useState<DetailItem | null>(null);

  return (
    <>
      {featured && <SpotlightStory story={featured} onOpen={() => setOpen(toDetail(featured))} />}

      {rest.length > 0 && (
        <section className="bg-white py-14">
          <div className="container-page">
            <h2 className="text-2xl md:text-3xl font-bold text-navy-900 mb-8">
              More stories of impact
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-7">
              {rest.map((s) => (
                <StoryCard key={s.id} story={s} onOpen={() => setOpen(toDetail(s))} />
              ))}
            </div>
          </div>
        </section>
      )}

      {lions.length > 0 && <LionsStories stories={lions} />}

      <section className="bg-gradient-to-br from-navy-900 to-navy-800 text-white py-16">
        <div className="container-page text-center max-w-2xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold mb-3">Help us write the next story.</h2>
          <p className="text-white/80 mb-6">
            Every donation funds a screening, a meal, a school bag, a future. Stand with us.
          </p>
          <Link
            href="/donate"
            className="inline-flex items-center justify-center h-12 px-7 rounded-md btn-gold"
          >
            Donate now
          </Link>
        </div>
      </section>

      <DetailModal item={open} onClose={() => setOpen(null)} />
    </>
  );
}

function SpotlightStory({ story, onOpen }: { story: Story; onOpen: () => void }) {
  return (
    <section className="bg-gray-50 py-14">
      <div className="container-page">
        <div className="grid md:grid-cols-2 gap-8 lg:gap-14 items-center">
          <button
            type="button"
            onClick={onOpen}
            className="relative aspect-[4/5] rounded-3xl overflow-hidden group text-left"
            aria-label={`Open ${story.title}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={story.hero_image || FALLBACK_HERO}
              alt={story.beneficiary_name ?? story.title}
              className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
            />
            <div className="absolute inset-x-0 bottom-0 p-6 bg-gradient-to-t from-black/85 via-black/40 to-transparent text-white">
              <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-brand-300 font-semibold">
                Spotlight
              </div>
              {story.beneficiary_name && (
                <p className="mt-2 text-lg font-bold">
                  {story.beneficiary_name}
                  {story.beneficiary_age ? `, ${story.beneficiary_age}` : ''}
                </p>
              )}
              {story.location && (
                <p className="inline-flex items-center gap-1 text-sm text-white/80">
                  <MapPin size={12} /> {story.location}
                </p>
              )}
            </div>
          </button>

          <div>
            <h2 className="text-3xl md:text-5xl font-bold text-navy-900 leading-tight">
              {story.title}
            </h2>
            {story.subtitle && (
              <p className="mt-5 text-lg text-gray-700 leading-relaxed">{story.subtitle}</p>
            )}
            {story.impact_quote && (
              <figure className="mt-7 border-l-4 border-brand-500 pl-5 italic text-navy-800 text-lg">
                {story.impact_quote}
              </figure>
            )}
            {story.impact_metric && (
              <div className="mt-7 inline-flex items-center gap-3 rounded-full bg-brand-50 text-brand-800 px-5 py-2 font-semibold text-sm">
                {story.impact_metric}
              </div>
            )}
            <div className="mt-8 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={onOpen}
                className="btn-navy inline-flex h-12 px-6 rounded-md items-center"
              >
                Read full story
              </button>
              <Link href="/donate" className="btn-gold inline-flex h-12 px-6 rounded-md items-center">
                Support this work
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function StoryCard({ story, onOpen }: { story: Story; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group text-left block overflow-hidden rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={story.hero_image || FALLBACK_HERO}
          alt={story.title}
          className="w-full h-full object-cover group-hover:scale-[1.05] transition-transform duration-500"
        />
        {story.beneficiary_name && (
          <span className="absolute top-3 left-3 bg-white/95 text-navy-900 text-xs font-semibold px-3 py-1 rounded-full">
            {story.beneficiary_name}
            {story.beneficiary_age ? `, ${story.beneficiary_age}` : ''}
          </span>
        )}
      </div>
      <div className="p-5">
        <h3 className="font-bold text-lg text-navy-800 group-hover:text-brand-600 line-clamp-2">
          {story.title}
        </h3>
        {story.subtitle && (
          <p className="mt-2 text-sm text-gray-600 line-clamp-3">{story.subtitle}</p>
        )}
        {story.impact_metric && (
          <p className="mt-3 text-xs font-semibold text-brand-700">{story.impact_metric}</p>
        )}
      </div>
    </button>
  );
}

const LIONS_STORIES_URL = 'https://www.lionsclubs.org/en/our-impact/our-stories/lion-stories';

/**
 * Stories imported from Lions Clubs International. Shown as link-outs to
 * the original on lionsclubs.org — they are not this club's beneficiaries,
 * so they never appear in the spotlight or open the local story modal.
 */
function LionsStories({ stories }: { stories: Story[] }) {
  return (
    <section className="bg-gray-50 py-14">
      <div className="container-page">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-brand-600 font-semibold">
              Lions Clubs International
            </p>
            <h2 className="mt-1 text-2xl md:text-3xl font-bold text-navy-900">
              From Lions around the world
            </h2>
            <p className="text-gray-600 mt-1">
              Lion Stories from the global network — read each one on lionsclubs.org.
            </p>
          </div>
          <a
            href={LIONS_STORIES_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm font-semibold text-navy-800 hover:text-brand-600"
          >
            All Lion Stories <ExternalLink size={14} aria-hidden />
          </a>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-7">
          {stories.map((s) => (
            <a
              key={s.id}
              href={s.source_url || LIONS_STORIES_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="group block overflow-hidden rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={s.hero_image || FALLBACK_HERO}
                  alt={s.title}
                  loading="lazy"
                  className="w-full h-full object-cover group-hover:scale-[1.05] transition-transform duration-500"
                />
                <span className="absolute top-3 left-3 bg-navy-900/90 text-white text-[11px] font-semibold px-3 py-1 rounded-full">
                  Lions International
                </span>
              </div>
              <div className="p-5">
                {s.published_at && (
                  <p className="text-xs text-gray-500">{formatDate(s.published_at)}</p>
                )}
                <h3 className="mt-1 font-bold text-lg text-navy-800 group-hover:text-brand-600 line-clamp-2">
                  {s.title}
                </h3>
                {s.subtitle && (
                  <p className="mt-2 text-sm text-gray-600 line-clamp-3">{s.subtitle}</p>
                )}
                <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-navy-800 group-hover:text-brand-600">
                  Read on lionsclubs.org <ExternalLink size={13} aria-hidden />
                </span>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
