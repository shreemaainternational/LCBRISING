import type { Metadata } from 'next';
import Link from 'next/link';
import { Calendar, MapPin, Users, CalendarDays } from 'lucide-react';
import { PageHero, PAGE_HERO_BG } from '@/components/site/PageHero';
import { getPublicActivities } from '@/lib/activities';
import { getAllPublicEvents } from '@/lib/events';
import { formatDate } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Service Activities',
  description:
    'Browse every service project and event from Lions Club of Baroda Rising Star — filter by cause and see the photos, beneficiaries and impact.',
  alternates: { canonical: '/activities' },
};

// searchParams makes this route dynamic; always render the latest content.
export const dynamic = 'force-dynamic';

// Human-readable labels for the activity `category` slugs (mirrors the
// admin quick-add preset options), plus the synthetic "event" bucket.
const CATEGORY_LABELS: Record<string, string> = {
  event: 'Events',
  vision: 'Vision',
  hunger: 'Hunger Relief',
  environment: 'Environment',
  diabetes: 'Diabetes',
  childhood_cancer: 'Childhood Cancer',
  humanitarian: 'Humanitarian',
  youth: 'Youth',
  education: 'Education',
  healthcare: 'Healthcare',
  women: 'Women Empowerment',
  senior: 'Senior Citizens',
  other: 'Other',
};

// Tolerate slug variants used by older links (e.g. the homepage "Our Work"
// cards deep-link to ?category=health) so they resolve to a real bucket.
const CATEGORY_ALIASES: Record<string, string> = {
  health: 'healthcare',
  medical: 'healthcare',
  sight: 'vision',
  cancer: 'childhood_cancer',
};

const FALLBACK_IMAGES = [
  'https://images.unsplash.com/photo-1497486751825-1233686d5d80?auto=format&fit=crop&w=900&q=70',
  'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?auto=format&fit=crop&w=900&q=70',
  'https://images.unsplash.com/photo-1509099836639-18ba1795216d?auto=format&fit=crop&w=900&q=70',
];

type Item = {
  id: string;
  kind: 'event' | 'activity';
  title: string;
  description: string | null;
  date: string;
  location: string | null;
  category: string;
  categoryLabel: string;
  image: string | null;
  beneficiaries: number | null;
};

function normalizeCategory(raw: string | null | undefined): string {
  const slug = (raw ?? 'other').toLowerCase().trim();
  return CATEGORY_ALIASES[slug] ?? slug;
}

function labelFor(slug: string): string {
  return CATEGORY_LABELS[slug] ?? slug.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export default async function ActivitiesPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category } = await searchParams;
  const selected = category ? normalizeCategory(category) : 'all';

  const [events, activities] = await Promise.all([
    getAllPublicEvents(),
    getPublicActivities(),
  ]);

  const items: Item[] = [
    ...events.map((e): Item => ({
      id: `event-${e.id}`,
      kind: 'event',
      title: e.title,
      description: e.description,
      date: e.date,
      location: e.location,
      category: 'event',
      categoryLabel: 'Event',
      image: e.cover_url,
      beneficiaries: null,
    })),
    ...activities.map((a): Item => {
      const slug = normalizeCategory(a.category);
      return {
        id: `activity-${a.id}`,
        kind: 'activity',
        title: a.title,
        description: a.description,
        date: a.date,
        location: a.location,
        category: slug,
        categoryLabel: labelFor(slug),
        image: a.photos?.find(Boolean) ?? null,
        beneficiaries: a.beneficiaries,
      };
    }),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Build the filter chips from the categories actually present in the data,
  // so we never show an empty bucket. "Events" is pinned first when present.
  const counts = new Map<string, number>();
  for (const it of items) counts.set(it.category, (counts.get(it.category) ?? 0) + 1);

  const presentCategories = Array.from(counts.keys()).filter((c) => c !== 'event');
  presentCategories.sort((a, b) => labelFor(a).localeCompare(labelFor(b)));

  const chips: { slug: string; label: string; count: number }[] = [
    { slug: 'all', label: 'All', count: items.length },
    ...(counts.has('event')
      ? [{ slug: 'event', label: 'Events', count: counts.get('event')! }]
      : []),
    ...presentCategories.map((c) => ({ slug: c, label: labelFor(c), count: counts.get(c)! })),
  ];

  const visible = selected === 'all' ? items : items.filter((it) => it.category === selected);

  return (
    <>
      <PageHero
        pillText="Our Work in Action"
        headline="Service Activities & Events"
        subtitle="Every project and event we run — filter by cause to see the photos, people reached and impact across Vadodara."
        backgroundImage={PAGE_HERO_BG.activities}
      />

      <section className="container-page py-14 md:py-20">
        {/* Filter chips */}
        {chips.length > 1 && (
          <div className="flex flex-wrap gap-2.5 justify-center mb-10">
            {chips.map((chip) => {
              const active = chip.slug === selected;
              const href = chip.slug === 'all' ? '/activities' : `/activities?category=${chip.slug}`;
              return (
                <Link
                  key={chip.slug}
                  href={href}
                  scroll={false}
                  className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-semibold border transition-colors ${
                    active
                      ? 'bg-navy-800 text-white border-navy-800'
                      : 'bg-white text-navy-700 border-gray-200 hover:border-brand-300 hover:text-brand-600'
                  }`}
                >
                  {chip.label}
                  <span
                    className={`text-xs tabular-nums ${active ? 'text-white/70' : 'text-gray-400'}`}
                  >
                    {chip.count}
                  </span>
                </Link>
              );
            })}
          </div>
        )}

        {visible.length === 0 ? (
          <p className="text-center text-gray-500 py-10">
            No {selected === 'all' ? 'activities or events' : labelFor(selected).toLowerCase()} to
            show yet. Check back soon!
          </p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-7">
            {visible.map((it, i) => (
              <ItemCard key={it.id} item={it} fallbackIndex={i} />
            ))}
          </div>
        )}
      </section>

      {/* Get involved CTA */}
      <section className="bg-gray-50 py-16 md:py-20">
        <div className="container-page text-center max-w-2xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-navy-800 mb-4">
            Want to Get Involved?
          </h2>
          <p className="text-gray-600 mb-8">
            We are always looking for dedicated volunteers to help deliver our programs. No
            experience necessary — just a willingness to serve.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/contact"
              className="btn-navy inline-flex items-center rounded-md px-6 py-3 text-sm"
            >
              Volunteer With Us
            </Link>
            <Link
              href="/donate"
              className="btn-gold inline-flex items-center rounded-md px-6 py-3 text-sm"
            >
              Support Our Programs
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

function ItemCard({ item, fallbackIndex }: { item: Item; fallbackIndex: number }) {
  const image = item.image || FALLBACK_IMAGES[fallbackIndex % FALLBACK_IMAGES.length];
  const isEvent = item.kind === 'event';

  return (
    <article className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col hover:shadow-lg transition-shadow">
      <div className="relative">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={image} alt={item.title} loading="lazy" className="h-48 w-full object-cover" />
        <span
          className={`absolute top-3 left-3 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
            isEvent ? 'bg-brand-500 text-white' : 'bg-white/90 text-navy-700'
          }`}
        >
          {isEvent ? <CalendarDays size={12} aria-hidden /> : null}
          {isEvent ? 'Event' : item.categoryLabel}
        </span>
      </div>
      <div className="p-6 flex flex-col flex-1">
        <div className="text-xs text-brand-600 font-medium mb-1.5 flex items-center gap-1.5">
          <Calendar size={13} aria-hidden />
          {formatDate(item.date)}
        </div>
        <h3 className="font-bold text-lg text-navy-800 mb-2">{item.title}</h3>
        {item.description && (
          <p className="text-sm text-gray-600 line-clamp-3 mb-4">{item.description}</p>
        )}
        <div className="mt-auto space-y-1.5 text-xs text-gray-500">
          {!isEvent && item.beneficiaries != null && (
            <div className="flex items-center gap-1.5">
              <Users size={13} className="text-brand-500 flex-shrink-0" aria-hidden />
              <span>
                {item.beneficiaries.toLocaleString('en-IN')} beneficiaries
              </span>
            </div>
          )}
          {item.location && (
            <div className="flex items-center gap-1.5">
              <MapPin size={13} className="text-brand-500 flex-shrink-0" aria-hidden />
              <span>{item.location}</span>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
