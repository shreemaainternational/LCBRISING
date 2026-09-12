import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, CalendarDays } from 'lucide-react';
import { PageHero, PAGE_HERO_BG } from '@/components/site/PageHero';
import { getActivityArchiveMonths, archiveMonthLabel } from '@/lib/activities';

export const metadata: Metadata = {
  title: 'Activities Archive',
  description: 'Browse Lions Club of Baroda Rising Star service activities by month and year.',
  alternates: { canonical: '/activities/archive' },
};
export const revalidate = 300;

export default async function ActivitiesArchivePage() {
  const months = await getActivityArchiveMonths();

  const byYear = new Map<number, typeof months>();
  for (const m of months) {
    const arr = byYear.get(m.year) ?? [];
    arr.push(m);
    byYear.set(m.year, arr);
  }
  const years = Array.from(byYear.keys()).sort((a, b) => b - a);

  return (
    <>
      <PageHero
        pillText="Lions Club of Baroda Rising Star"
        headline="Activities Archive"
        subtitle="Every service activity, organized by month and year."
        backgroundImage={PAGE_HERO_BG.activities}
      />

      <section className="container-page py-14 md:py-16">
        <Link
          href="/activities"
          className="mb-8 inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-navy-800"
        >
          <ArrowLeft size={14} /> All service activities
        </Link>

        {years.length === 0 ? (
          <div className="mx-auto max-w-xl rounded-2xl border border-gray-200 bg-white p-10 text-center">
            <CalendarDays size={28} className="mx-auto mb-4 text-gray-300" aria-hidden />
            <h2 className="mb-2 text-xl font-bold text-navy-800">No activities published yet</h2>
            <p className="text-gray-600">Check back soon — the archive fills in as activities are reported.</p>
          </div>
        ) : (
          <div className="space-y-10">
            {years.map((year) => (
              <div key={year}>
                <h2 className="mb-4 text-2xl font-bold text-navy-800">{year}</h2>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {byYear.get(year)!.map((m) => (
                    <Link
                      key={`${m.year}-${m.month}`}
                      href={`/activities/archive/${m.year}/${m.month}`}
                      className="flex items-center justify-between gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-navy-800 transition-colors hover:border-brand-400 hover:text-brand-600"
                    >
                      <span>{archiveMonthLabel(m.year, m.month).split(' ')[0]}</span>
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-normal text-gray-500">
                        {m.count}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
