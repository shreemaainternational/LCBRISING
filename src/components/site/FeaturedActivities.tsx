import Link from 'next/link';
import {
  ArrowRight,
  HandHeart,
  BookOpen,
  Heart,
  type LucideIcon,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';

type Featured = {
  category: string;
  title: string;
  description: string;
  icon: LucideIcon;
  href: string;
};

const FEATURED: Featured[] = [
  {
    category: 'humanitarian',
    title: 'Community Outreach',
    description:
      'Connecting with underserved neighbourhoods to provide essential resources and support for families in need.',
    icon: HandHeart,
    href: '/activities?category=humanitarian',
  },
  {
    category: 'youth',
    title: 'Youth Development',
    description:
      'Mentorship programs, tutoring, and leadership workshops that empower the next generation to succeed.',
    icon: BookOpen,
    href: '/activities?category=youth',
  },
  {
    category: 'health',
    title: 'Health & Wellness',
    description:
      'Free health screenings, wellness workshops, and mental health support for community members.',
    icon: Heart,
    href: '/activities?category=health',
  },
];

async function getCategoryCounts(): Promise<Record<string, number>> {
  if (!isSupabaseConfigured()) return {};
  try {
    const supa = await createClient();
    const { data } = await supa
      .from('activities')
      .select('category');
    const counts: Record<string, number> = {};
    for (const row of (data ?? []) as { category: string | null }[]) {
      const c = (row.category ?? 'other').toLowerCase();
      counts[c] = (counts[c] ?? 0) + 1;
    }
    return counts;
  } catch {
    return {};
  }
}

export async function FeaturedActivities() {
  const counts = await getCategoryCounts();

  return (
    <section className="bg-gray-50 py-16 md:py-24">
      <div className="container-page">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="inline-block bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-xs font-semibold mb-4">
            Our Work
          </span>
          <h2 className="text-3xl md:text-5xl font-bold text-navy-800 mb-4">
            Featured Service Activities
          </h2>
          <p className="text-gray-600">
            Discover the impactful service activities we&apos;re working on to
            make our community a better place.
          </p>
        </div>

        {/* 3 cards */}
        <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
          {FEATURED.map((f, i) => (
            <FeaturedCard
              key={f.category}
              featured={i === 1}
              count={counts[f.category]}
              {...f}
            />
          ))}
        </div>

        {/* CTA */}
        <div className="text-center mt-12">
          <Link
            href="/activities"
            className="btn-navy inline-flex items-center gap-2 rounded-md px-6 py-3 text-sm"
          >
            View All Programs
            <ArrowRight size={16} aria-hidden />
          </Link>
        </div>
      </div>
    </section>
  );
}

function FeaturedCard({
  title,
  description,
  icon: Icon,
  href,
  featured,
  count,
}: Featured & { featured: boolean; count?: number }) {
  return (
    <Link
      href={href}
      className={`block bg-white rounded-2xl p-7 transition-all hover:-translate-y-1 hover:shadow-xl ${
        featured ? 'shadow-2xl md:-translate-y-3' : 'shadow-md'
      }`}
    >
      <div
        className={`flex h-14 w-14 items-center justify-center rounded-xl mb-6 ${
          featured ? 'bg-brand-500 text-white' : 'bg-gray-100 text-navy-800'
        }`}
      >
        <Icon size={26} aria-hidden />
      </div>
      <h3 className="text-xl font-bold text-navy-800 mb-3">{title}</h3>
      <p className="text-gray-600 leading-relaxed mb-6">{description}</p>
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 hover:text-brand-700">
          Learn More
          <ArrowRight size={14} aria-hidden />
        </span>
        {typeof count === 'number' && count > 0 && (
          <span className="text-xs text-gray-400 tabular-nums">
            {count} {count === 1 ? 'project' : 'projects'}
          </span>
        )}
      </div>
    </Link>
  );
}
