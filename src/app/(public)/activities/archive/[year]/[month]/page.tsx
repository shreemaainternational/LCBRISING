import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { PageHero, PAGE_HERO_BG } from '@/components/site/PageHero';
import { CauseActivities } from '@/components/site/CauseActivities';
import { getActivitiesForMonth, archiveMonthLabel } from '@/lib/activities';
import { env } from '@/lib/env';

export const revalidate = 300;

function parseParams(year: string, month: string): { year: number; month: number } | null {
  const y = Number(year);
  const m = Number(month);
  if (!Number.isInteger(y) || y < 2000 || y > 2100) return null;
  if (!Number.isInteger(m) || m < 1 || m > 12) return null;
  return { year: y, month: m };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ year: string; month: string }>;
}): Promise<Metadata> {
  const { year, month } = await params;
  const parsed = parseParams(year, month);
  if (!parsed) return { title: 'Activities archive' };
  const label = archiveMonthLabel(parsed.year, parsed.month);
  const title = `${label} Activities`;
  return {
    title,
    description: `Service activities by Lions Club of Baroda Rising Star in ${label}.`,
    alternates: { canonical: `/activities/archive/${parsed.year}/${parsed.month}` },
    openGraph: {
      title,
      url: `${env.NEXT_PUBLIC_SITE_URL}/activities/archive/${parsed.year}/${parsed.month}`,
    },
  };
}

export default async function ActivitiesArchiveMonthPage({
  params,
}: {
  params: Promise<{ year: string; month: string }>;
}) {
  const { year, month } = await params;
  const parsed = parseParams(year, month);
  if (!parsed) notFound();

  const activities = await getActivitiesForMonth(parsed.year, parsed.month);
  const label = archiveMonthLabel(parsed.year, parsed.month);
  const totalPhotos = activities.reduce((n, a) => n + a.photos.length, 0);

  return (
    <>
      <PageHero
        pillText="Activities Archive"
        headline={label}
        subtitle={`Service activities reported by Lions Club of Baroda Rising Star in ${label}.`}
        backgroundImage={PAGE_HERO_BG.activities}
      />

      <section className="border-b border-gray-200 bg-white">
        <div className="container-page flex flex-wrap items-center justify-between gap-4 py-6">
          <Link
            href="/activities/archive"
            className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-navy-800"
          >
            <ArrowLeft size={14} /> Full archive
          </Link>
          <div className="flex items-center gap-6 text-sm">
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

      <section className="container-page py-14 md:py-16">
        {activities.length > 0 ? (
          <CauseActivities activities={activities} />
        ) : (
          <div className="mx-auto max-w-xl rounded-2xl border border-gray-200 bg-white p-10 text-center">
            <h2 className="mb-2 text-xl font-bold text-navy-800">No activities in {label}</h2>
            <p className="text-gray-600">
              Nothing was reported for this month.{' '}
              <Link href="/activities/archive" className="font-semibold text-brand-600 hover:underline">
                Browse other months
              </Link>
              .
            </p>
          </div>
        )}
      </section>
    </>
  );
}
