import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { ArrowLeft } from 'lucide-react';
import { PageHero, PAGE_HERO_BG } from '@/components/site/PageHero';
import { MemberBrowser } from '@/components/site/MemberBrowser';
import { currentLionsYear, getViewer, loadDirectoryMembers } from '@/lib/member-directory';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Search Members · Member Directory',
  robots: { index: false },
};

/** Global member search across every club the viewer may see (signed-in only). */
export default async function MemberSearchPage({ searchParams }: { searchParams: Promise<{ year?: string }> }) {
  const viewer = await getViewer();
  if (!viewer.signedIn) redirect('/login?redirectTo=/directory/members');

  const { year: yearParam } = await searchParams;
  const currentYear = currentLionsYear();
  const year = yearParam && /^\d{4}-\d{2}$/.test(yearParam) ? yearParam : currentYear;
  const { members, years, historyAvailable } = await loadDirectoryMembers(viewer, { year });

  return (
    <>
      <PageHero
        pillText="MEMBER DIRECTORY"
        headline="Search Members"
        subtitle="Every member across our clubs — filter by district, region, zone, club, designation or Lionistic Year."
        backgroundImage={PAGE_HERO_BG.about}
      />
      <section className="py-10 md:py-14 bg-white">
        <div className="container-page">
          <Link href="/directory" className="inline-flex items-center gap-1.5 text-sm font-semibold text-navy-700 hover:text-brand-600 mb-6">
            <ArrowLeft size={15} aria-hidden /> Browse by club
          </Link>
          <Suspense fallback={<p className="text-sm text-gray-500">Loading members…</p>}>
            <MemberBrowser
              members={members}
              showClub
              years={years}
              year={year}
              currentYear={currentYear}
              historyAvailable={historyAvailable}
            />
          </Suspense>
        </div>
      </section>
    </>
  );
}
