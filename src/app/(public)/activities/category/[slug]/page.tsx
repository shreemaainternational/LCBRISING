import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { isSupabaseConfigured, integrations } from '@/lib/env';
import { PageHero, PAGE_HERO_BG } from '@/components/site/PageHero';
import {
  CauseActivities,
  type CauseActivity,
} from '@/app/(public)/activities/[cause]/CauseActivities';
import { activityCategoryLabel } from '@/lib/activity-categories';

export const dynamic = 'force-dynamic';

type ActivityRow = {
  id: string;
  title: string;
  description: string | null;
  date: string;
  location: string | null;
  beneficiaries: number | null;
  category: string | null;
  photos: string[] | null;
  before_photos: string[] | null;
  after_photos: string[] | null;
  photo_captions: Record<string, string> | null;
};

// Read through the service-role client when configured, for the same RLS
// resilience as the other public activity readers.
async function activityReader() {
  return integrations.supabaseAdmin ? createAdminClient() : await createClient();
}

async function loadByCategory(slug: string): Promise<CauseActivity[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const supabase = await activityReader();
    const { data } = await supabase
      .from('activities')
      .select(
        'id, title, description, date, location, beneficiaries, category, photos, before_photos, after_photos, photo_captions',
      )
      .eq('category', slug)
      .eq('approval_status', 'approved')
      .order('date', { ascending: false })
      .limit(300);

    return ((data ?? []) as ActivityRow[]).map((a) => ({
      id: a.id,
      title: a.title,
      description: a.description,
      date: a.date,
      location: a.location,
      beneficiaries: a.beneficiaries,
      category: a.category,
      photos: Array.from(
        new Set([
          ...(a.photos ?? []),
          ...(a.before_photos ?? []),
          ...(a.after_photos ?? []),
        ]),
      ).filter(Boolean),
      captions: a.photo_captions ?? {},
    }));
  } catch {
    return [];
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const label = activityCategoryLabel(slug);
  return {
    title: `${label} Activities`,
    description: `${label} activities by Lions Club of Baroda Rising Star.`,
    alternates: { canonical: `/activities/category/${slug}` },
  };
}

export default async function CategoryActivitiesPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const label = activityCategoryLabel(slug);
  const activities = await loadByCategory(slug);
  const totalPhotos = activities.reduce((n, a) => n + a.photos.length, 0);

  return (
    <>
      <PageHero
        pillText="CATEGORY"
        headline={label}
        subtitle={`${label} activities and events from Lions Club of Baroda Rising Star.`}
        backgroundImage={PAGE_HERO_BG.activities}
      />

      {/* Summary bar */}
      <section className="border-b border-gray-200 bg-white">
        <div className="container-page py-6 flex flex-wrap items-center justify-between gap-4">
          <Link
            href="/impact"
            className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-navy-800"
          >
            <ArrowLeft size={14} /> Impact by category
          </Link>
          <div className="flex items-center gap-6 text-sm text-gray-500">
            <span>
              <strong className="text-navy-800">{activities.length}</strong>{' '}
              {activities.length === 1 ? 'activity' : 'activities'}
            </span>
            <span>
              <strong className="text-navy-800">{totalPhotos}</strong>{' '}
              {totalPhotos === 1 ? 'photo' : 'photos'}
            </span>
          </div>
        </div>
      </section>

      <section className="container-page py-14 md:py-16">
        {activities.length > 0 ? (
          <CauseActivities activities={activities} />
        ) : (
          <div className="max-w-xl mx-auto text-center bg-white border border-gray-200 rounded-2xl p-10">
            <h2 className="text-xl font-bold text-navy-800 mb-2">
              No {label.toLowerCase()} activities published yet
            </h2>
            <p className="text-gray-600 mb-6">
              Reports and photos from our {label.toLowerCase()} work will appear here as they are
              uploaded.
            </p>
            <Link
              href="/activities"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-navy-800 hover:text-brand-600"
            >
              Browse all service activities <ArrowRight size={14} aria-hidden />
            </Link>
          </div>
        )}
      </section>
    </>
  );
}
