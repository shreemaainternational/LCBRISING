import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured, env } from '@/lib/env';
import { PageHero, PAGE_HERO_BG } from '@/components/site/PageHero';
import { CAUSES, CAUSE_SLUGS, getCause, type Cause } from '@/lib/causes';
import { collectActivityPhotos } from '@/lib/activity-media';
import { CauseActivities, type CauseActivity } from './CauseActivities';

export const revalidate = 300;

// Pre-render one page per cause; the set is fixed and small.
export function generateStaticParams() {
  return CAUSE_SLUGS.map((cause) => ({ cause }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ cause: string }>;
}): Promise<Metadata> {
  const { cause: slug } = await params;
  const cause = getCause(slug);
  if (!cause) return { title: 'Cause not found' };
  const title = `${cause.title} Activities`;
  const description = `${cause.title} service activities by Lions Club of Baroda Rising Star — ${cause.tagline}.`;
  return {
    title,
    description,
    alternates: { canonical: `/activities/${cause.slug}` },
    openGraph: {
      title,
      description,
      url: `${env.NEXT_PUBLIC_SITE_URL}/activities/${cause.slug}`,
    },
  };
}

type ActivityRow = {
  id: string;
  title: string;
  description: string | null;
  date: string;
  location: string | null;
  beneficiaries: number | null;
  photos: string[] | null;
  before_photos: string[] | null;
  after_photos: string[] | null;
  videos: string[] | null;
  photo_captions: Record<string, string> | null;
};

/** Fetch the approved activities for a single cause, newest first. */
async function loadActivities(cause: Cause): Promise<CauseActivity[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from('activities')
      .select(
        'id, title, description, date, location, beneficiaries, photos, before_photos, after_photos, videos, photo_captions',
      )
      .in('category', cause.categories)
      .eq('approval_status', 'approved')
      .order('date', { ascending: false })
      .limit(200);

    return ((data ?? []) as ActivityRow[]).map((a) => ({
      id: a.id,
      title: a.title,
      description: a.description,
      date: a.date,
      location: a.location,
      beneficiaries: a.beneficiaries,
      // Combine all media columns (incl. images misfiled into videos).
      photos: collectActivityPhotos(a),
      captions: a.photo_captions ?? {},
    }));
  } catch {
    return [];
  }
}

export default async function CauseActivitiesPage({
  params,
}: {
  params: Promise<{ cause: string }>;
}) {
  const { cause: slug } = await params;
  const cause = getCause(slug);
  if (!cause) notFound();

  const activities = await loadActivities(cause);
  const totalPhotos = activities.reduce((n, a) => n + a.photos.length, 0);
  const otherCauses = CAUSES.filter((c) => c.slug !== cause.slug);
  const Icon = cause.icon;

  return (
    <>
      <PageHero
        pillText="Lions International Global Causes"
        headline={cause.title}
        subtitle={cause.body}
        backgroundImage={PAGE_HERO_BG.activities}
      />

      {/* Cause summary bar */}
      <section className="border-b border-gray-200 bg-white">
        <div className="container-page py-6 flex flex-wrap items-center justify-between gap-4">
          <Link
            href="/activities"
            className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-navy-800"
          >
            <ArrowLeft size={14} /> All service activities
          </Link>
          <div className="flex items-center gap-6 text-sm">
            <span className="inline-flex items-center gap-2 text-navy-800 font-semibold">
              <span className="h-9 w-9 rounded-xl bg-gray-100 flex items-center justify-center">
                <Icon size={18} className="text-navy-700" aria-hidden />
              </span>
              {cause.title}
            </span>
            <span className="text-gray-500">
              <strong className="text-navy-800">{activities.length}</strong>{' '}
              {activities.length === 1 ? 'activity' : 'activities'}
            </span>
            <span className="text-gray-500">
              <strong className="text-navy-800">{totalPhotos}</strong>{' '}
              {totalPhotos === 1 ? 'photo' : 'photos'}
            </span>
          </div>
        </div>
      </section>

      {/* Single-cause activity gallery */}
      <section className="container-page py-14 md:py-16">
        {activities.length > 0 ? (
          <CauseActivities activities={activities} />
        ) : (
          <div className="max-w-xl mx-auto text-center bg-white border border-gray-200 rounded-2xl p-10">
            <div className="mx-auto mb-4 h-14 w-14 rounded-2xl bg-gray-100 flex items-center justify-center">
              <Icon size={26} className="text-navy-700" aria-hidden />
            </div>
            <h2 className="text-xl font-bold text-navy-800 mb-2">
              No {cause.title} activities published yet
            </h2>
            <p className="text-gray-600 mb-6">
              We&apos;re actively serving this cause. Photos and reports from
              our {cause.title.toLowerCase()} projects will appear here as they
              are uploaded.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link
                href="/contact"
                className="btn-navy inline-flex items-center rounded-md px-5 py-2.5 text-sm"
              >
                Volunteer With Us
              </Link>
              <Link
                href="/donate"
                className="btn-gold inline-flex items-center rounded-md px-5 py-2.5 text-sm"
              >
                Support This Cause
              </Link>
            </div>
          </div>
        )}
      </section>

      {/* Explore other causes */}
      <section className="bg-gray-50 border-t border-gray-200 py-12">
        <div className="container-page">
          <h2 className="text-sm font-semibold uppercase tracking-[0.15em] text-gray-500 mb-5">
            Explore other causes
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
            {otherCauses.map((c) => (
              <Link
                key={c.slug}
                href={`/activities/${c.slug}`}
                className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-navy-800 hover:border-brand-400 hover:text-brand-600 transition-colors"
              >
                <c.icon size={16} className="text-brand-500 flex-shrink-0" aria-hidden />
                <span className="truncate">{c.title}</span>
              </Link>
            ))}
          </div>
          <Link
            href="/activities"
            className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-navy-800 hover:text-brand-600"
          >
            View all service activities <ArrowRight size={14} aria-hidden />
          </Link>
        </div>
      </section>
    </>
  );
}
