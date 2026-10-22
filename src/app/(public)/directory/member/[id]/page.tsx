import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ArrowLeft, Building2, CalendarDays, Clock, Mail, MapPin, Phone } from 'lucide-react';
import { PageHero, PAGE_HERO_BG } from '@/components/site/PageHero';
import { Avatar, designationLabel } from '@/components/site/MemberBrowser';
import { humanizeRole } from '@/components/site/OrgHierarchy';
import { directoryDb, getViewer, loadMemberProfile } from '@/lib/member-directory';
import { loadAssignmentHistory } from '@/lib/org-hierarchy';
import { formatDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Member Profile · Member Directory',
  robots: { index: false },
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Executive Member Profile — signed-in members only. */
export default async function MemberProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const viewer = await getViewer();
  if (!viewer.signedIn) redirect(`/login?redirectTo=${encodeURIComponent(`/directory/member/${id}`)}`);
  if (!UUID.test(id)) notFound();

  const profile = await loadMemberProfile(viewer, id);
  if (!profile) notFound();
  const { member: m, current, lions_year, officerTerms, activities } = profile;
  const history = await loadAssignmentHistory(await directoryDb(), id);
  const openPeriod = history.periods.find((p) => !p.effective_to);
  const pastPeriods = history.periods.filter((p) => p.effective_to);

  return (
    <>
      <PageHero pillText="MEMBER PROFILE" headline={m.name} subtitle={designationLabel(m.designation)} backgroundImage={PAGE_HERO_BG.about} />

      <section className="py-10 md:py-14 bg-white">
        <div className="container-page max-w-5xl">
          <Link
            href={current ? `/directory/club/${current.club_id}` : '/directory/members'}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-navy-700 hover:text-brand-600 mb-6"
          >
            <ArrowLeft size={15} aria-hidden /> {current ? current.club_name : 'All members'}
          </Link>

          <div className="flex flex-col sm:flex-row gap-6 items-start mb-10">
            <Avatar m={m} size={96} />
            <div className="min-w-0">
              <h2 className="text-2xl font-bold text-navy-800">{m.name}</h2>
              <p className="text-sm font-semibold uppercase tracking-wider text-brand-600 mt-1">{designationLabel(m.designation)}</p>
              <p className="text-sm text-gray-600 mt-2 capitalize">
                {m.status}{m.joined_at && <> · Member since {formatDate(m.joined_at)}</>}
                {m.lions_member_id && <> · Membership #{m.lions_member_id}</>}
              </p>
              {(m.email || m.phone) && (
                <div className="flex flex-wrap gap-4 mt-3 text-sm">
                  {m.phone && <a href={`tel:${m.phone}`} className="inline-flex items-center gap-1.5 text-navy-700 hover:text-brand-600"><Phone size={14} aria-hidden />{m.phone}</a>}
                  {m.email && <a href={`mailto:${m.email}`} className="inline-flex items-center gap-1.5 text-navy-700 hover:text-brand-600"><Mail size={14} aria-hidden />{m.email}</a>}
                </div>
              )}
            </div>
          </div>

          <h3 className="text-lg font-bold text-navy-800 mb-3">Current assignment</h3>
          <dl className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-10">
            <Item label="Club" value={current?.club_name} href={current ? `/directory/club/${current.club_id}` : undefined} />
            <Item label="Zone" value={current?.zone_name} />
            <Item label="Region" value={current?.region_name} />
            <Item label="District" value={current?.district_code ? `District ${current.district_code}` : null} />
            <Item label="Lionistic Year" value={lions_year} />
          </dl>
          {openPeriod && (
            <p className="text-xs text-gray-500 -mt-7 mb-10">In this club since {formatDate(openPeriod.effective_from)}.</p>
          )}

          <h3 className="text-lg font-bold text-navy-800 mb-3">Previous assignments</h3>
          {!history.available ? (
            <p className="text-sm text-gray-500 mb-10">Assignment history is not enabled yet.</p>
          ) : pastPeriods.length === 0 ? (
            <p className="text-sm text-gray-500 mb-10">No earlier club assignments are recorded.</p>
          ) : (
            <ol className="space-y-2 mb-10">
              {pastPeriods.map((p) => (
                <li key={p.id} className="rounded-xl border border-gray-200 p-3 text-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                  <span className="font-semibold text-navy-800 inline-flex items-center gap-1.5">
                    <Building2 size={14} className="text-brand-500" aria-hidden /> {p.club_name ?? 'Club removed'}
                    <span className="font-normal text-gray-500">
                      {[p.zone_name, p.region_name, p.district_code && `District ${p.district_code}`].filter(Boolean).join(' · ')}
                    </span>
                  </span>
                  <span className="text-gray-600">
                    {formatDate(p.effective_from)} – {formatDate(p.effective_to!)} · {p.lions_year}
                  </span>
                </li>
              ))}
            </ol>
          )}

          {officerTerms.length > 0 && (
            <>
              <h3 className="text-lg font-bold text-navy-800 mb-3">Leadership</h3>
              <ul className="space-y-2 mb-10">
                {officerTerms.map((t) => (
                  <li key={t.id} className="rounded-xl border border-gray-200 p-3 text-sm flex justify-between gap-3">
                    <span className="font-semibold text-navy-800">{humanizeRole(t.role)} <span className="font-normal text-gray-500 capitalize">· {t.scope_kind.replace(/_/g, ' ')}</span></span>
                    <span className="text-gray-600">
                      {t.term_start ? formatDate(t.term_start) : '—'}{t.term_end ? ` – ${formatDate(t.term_end)}` : t.status === 'active' ? ' – present' : ''}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}

          <h3 className="text-lg font-bold text-navy-800 mb-3">Service activities</h3>
          {activities.length === 0 ? (
            <p className="text-sm text-gray-500">No volunteer hours are recorded against activities for this member.</p>
          ) : (
            <ul className="space-y-2">
              {activities.map((a) => (
                <li key={a.id}>
                  <Link href={`/activities/report/${a.id}`} className="rounded-xl border border-gray-200 p-3 text-sm flex justify-between gap-3 hover:border-brand-400">
                    <span className="font-semibold text-navy-800">{a.title}</span>
                    <span className="text-gray-600 inline-flex items-center gap-3 flex-shrink-0">
                      <span className="inline-flex items-center gap-1"><CalendarDays size={13} aria-hidden />{formatDate(a.date)}</span>
                      <span className="inline-flex items-center gap-1"><Clock size={13} aria-hidden />{a.hours} h</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </>
  );
}

function Item({ label, value, href }: { label: string; value?: string | null; href?: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
      <dt className="text-xs font-semibold uppercase tracking-wider text-gray-500 flex items-center gap-1">
        <MapPin size={11} className="text-brand-500" aria-hidden /> {label}
      </dt>
      <dd className="text-sm font-semibold text-navy-800 mt-1">
        {value ? (href ? <Link href={href} className="hover:text-brand-600">{value}</Link> : value) : <span className="text-gray-400 font-normal">Not assigned</span>}
      </dd>
    </div>
  );
}
