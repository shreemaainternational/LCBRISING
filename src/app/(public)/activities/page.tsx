import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { PageHero, PAGE_HERO_BG } from '@/components/site/PageHero';
import { CAUSES } from '@/lib/causes';
import { PROGRAMME_GROUPS } from '@/lib/event-categories';
import { getMasterCalendarItems } from '@/lib/master-calendar';
import { MasterActivitiesBoard } from '@/components/site/MasterActivitiesBoard';
import { getCurrentMember, isAdminRole } from '@/lib/auth';

export const metadata: Metadata = {
  title: 'Activities & Programmes',
  description:
    'Every scheduled Service Activity, Meeting, Leadership Programme, Event, Celebration, International Day and International Committee programme of Lions Club of Baroda Rising Star — Lionistic Year 2026–2027.',
  alternates: { canonical: '/activities' },
};

export const revalidate = 60;

export default async function ActivitiesPage() {
  const [items, member] = await Promise.all([
    getMasterCalendarItems(),
    getCurrentMember().catch(() => null),
  ]);
  const isAdmin = !!member && isAdminRole(member.role);

  return (
    <>
      <PageHero
        pillText="LIONS CLUB OF BARODA RISING STAR"
        headline="Activities & Programmes"
        subtitle="LCB Rising Star · Lionistic Year 2026–2027 — every Service Activity, Meeting, Leadership Programme, Event, Celebration, International Day and International Committee programme, in one calendar."
        backgroundImage={PAGE_HERO_BG.activities}
      />

      {/* Master Activities & Programmes calendar */}
      <section className="container-page py-14 md:py-16">
        <MasterActivitiesBoard items={items} isAdmin={isAdmin} />
      </section>

      {/* Cause cards — existing Service Activity global cause areas, unchanged */}
      <section id="causes" className="scroll-mt-28 bg-gray-50 border-t border-gray-200 py-16 md:py-20">
        <div className="container-page">
          <div className="mb-10">
            <span className="inline-block bg-blue-50 text-navy-700 px-3 py-1 rounded-full text-xs font-semibold mb-3">
              Lions International Global Causes
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-navy-800 mb-3">
              Explore Service Activities by Cause
            </h2>
            <p className="text-gray-600 max-w-2xl">
              Lions Club of Baroda Rising Star serves the community through these 8 global cause
              areas identified by Lions Clubs International. Select a cause to see its activities and photos.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-7">
            {CAUSES.map((c) => (
              <article
                key={c.slug}
                id={c.slug}
                className="scroll-mt-28 flex flex-col bg-white border border-gray-200 rounded-2xl p-8 target:ring-2 target:ring-brand-400"
              >
                <div className="flex items-start gap-4 mb-4">
                  <div className="h-12 w-12 flex-shrink-0 rounded-xl bg-gray-100 flex items-center justify-center">
                    <c.icon size={24} className="text-navy-700" aria-hidden />
                  </div>
                  <h3 className="text-2xl font-bold text-navy-800 pt-1.5">
                    {c.title}
                  </h3>
                </div>
                <p className="text-gray-600 leading-relaxed mb-5">{c.body}</p>
                <ul className="space-y-2 mb-6">
                  {c.points.map((p) => (
                    <li key={p} className="flex items-start gap-2.5 text-sm">
                      <span
                        className="mt-1.5 h-1.5 w-1.5 rounded-full bg-brand-500 flex-shrink-0"
                        aria-hidden
                      />
                      <span className="text-navy-800">{p}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href={`/activities/${c.slug}`}
                  className="mt-auto inline-flex items-center gap-1.5 text-sm font-semibold text-navy-800 hover:text-brand-600"
                >
                  View {c.title} activities
                  <ArrowRight size={15} aria-hidden />
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Meetings & Leadership cards — same treatment as the cause cards above */}
      <section id="meetings-leadership" className="scroll-mt-28 py-16 md:py-20">
        <div className="container-page">
          <div className="mb-10">
            <span className="inline-block bg-blue-50 text-navy-700 px-3 py-1 rounded-full text-xs font-semibold mb-3">
              Meetings &amp; Leadership
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-navy-800 mb-3">
              Meetings, Leadership &amp; Club Programmes
            </h2>
            <p className="text-gray-600 max-w-2xl">
              Beyond service activities, the club runs a full calendar of meetings, leadership
              programmes, celebrations and international observances. Select a programme to see
              its activities and photos.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-7">
            {PROGRAMME_GROUPS.map((g) => (
              <article
                key={g.key}
                id={g.key}
                className="scroll-mt-28 flex flex-col bg-white border border-gray-200 rounded-2xl p-8 target:ring-2 target:ring-brand-400"
              >
                <div className="flex items-start gap-4 mb-4">
                  <div className="h-12 w-12 flex-shrink-0 rounded-xl bg-gray-100 flex items-center justify-center">
                    <g.icon size={24} className="text-navy-700" aria-hidden />
                  </div>
                  <h3 className="text-2xl font-bold text-navy-800 pt-1.5">
                    {g.title}
                  </h3>
                </div>
                {(g.body ?? g.blurb) && (
                  <p className="text-gray-600 leading-relaxed mb-5">{g.body ?? g.blurb}</p>
                )}
                {!!g.points?.length && (
                  <ul className="space-y-2 mb-6">
                    {g.points.map((p) => (
                      <li key={p} className="flex items-start gap-2.5 text-sm">
                        <span
                          className="mt-1.5 h-1.5 w-1.5 rounded-full bg-brand-500 flex-shrink-0"
                          aria-hidden
                        />
                        <span className="text-navy-800">{p}</span>
                      </li>
                    ))}
                  </ul>
                )}
                <Link
                  href={g.route!}
                  className="mt-auto inline-flex items-center gap-1.5 text-sm font-semibold text-navy-800 hover:text-brand-600"
                >
                  View {g.title} activities
                  <ArrowRight size={15} aria-hidden />
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Get involved CTA */}
      <section className="py-16 md:py-20">
        <div className="container-page text-center max-w-2xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-navy-800 mb-4">
            Want to Get Involved?
          </h2>
          <p className="text-gray-600 mb-8">
            We are always looking for dedicated volunteers to help deliver our
            programs. No experience necessary — just a willingness to serve.
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
