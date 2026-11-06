import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { ArrowLeft, Building2, LogIn, MapPin, Users } from 'lucide-react';
import { PageHero, PAGE_HERO_BG } from '@/components/site/PageHero';
import { MemberBrowser, Avatar } from '@/components/site/MemberBrowser';
import { humanizeRole } from '@/components/site/OrgHierarchy';
import {
  currentLionsYear,
  getViewer,
  loadClubOfficers,
  loadDirectoryClubs,
  loadDirectoryMembers,
} from '@/lib/member-directory';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ year?: string }> };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function findClub(id: string) {
  if (!UUID.test(id)) return null;
  const clubs = await loadDirectoryClubs();
  return clubs.find((c) => c.club_id === id) ?? null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const club = await findClub((await params).id);
  return {
    title: club ? `${club.club_name} · Member Directory` : 'Club not found',
    alternates: club ? { canonical: `/directory/club/${club.club_id}` } : undefined,
  };
}

export default async function ClubDirectoryPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { year: yearParam } = await searchParams;
  const club = await findClub(id);
  if (!club) notFound();

  const currentYear = currentLionsYear();
  const year = yearParam && /^\d{4}-\d{2}$/.test(yearParam) ? yearParam : currentYear;
  const viewer = await getViewer();
  const [officers, roster] = await Promise.all([
    loadClubOfficers(club.club_id),
    loadDirectoryMembers(viewer, { clubId: club.club_id, year }),
  ]);

  const placement = [
    club.zone_name ? `Zone: ${club.zone_name}` : 'Zone not assigned',
    club.region_name ? `Region: ${club.region_name}` : club.zone_name ? 'Zone not linked to a region' : null,
    club.district_code ? `District ${club.district_code}` : null,
  ].filter(Boolean);

  return (
    <>
      <PageHero
        pillText="MEMBER DIRECTORY"
        headline={club.club_name}
        subtitle={[club.club_number && `Club #${club.club_number}`, club.city].filter(Boolean).join(' · ') || undefined}
        backgroundImage={PAGE_HERO_BG.about}
      />

      <section className="py-10 md:py-14 bg-white">
        <div className="container-page">
          <Link href="/directory" className="inline-flex items-center gap-1.5 text-sm font-semibold text-navy-700 hover:text-brand-600 mb-6">
            <ArrowLeft size={15} aria-hidden /> All clubs
          </Link>

          <div className="grid sm:grid-cols-3 gap-4 mb-10">
            <Fact icon={MapPin} label="Placement" value={placement.join(' · ')} />
            <Fact icon={Users} label="Active members" value={String(club.active_members)} />
            <Fact icon={Building2} label="Lionistic Year" value={currentYear} />
          </div>

          {officers.length > 0 && (
            <div className="mb-12">
              <h2 className="text-xl font-bold text-navy-800 mb-4">Club officers</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {officers.map((o) => (
                  <div key={o.id} className="rounded-2xl border border-gray-200 bg-white p-4 flex items-center gap-3">
                    <Avatar m={{ name: o.name, avatar_url: o.avatar_url }} size={44} />
                    <div className="min-w-0">
                      <div className="font-bold text-navy-800 truncate">{o.name}</div>
                      <div className="text-xs font-semibold uppercase tracking-wider text-brand-600">{humanizeRole(o.role)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <h2 className="text-xl font-bold text-navy-800 mb-4">Members</h2>
          {viewer.signedIn ? (
            <Suspense fallback={<p className="text-sm text-gray-500">Loading members…</p>}>
              <MemberBrowser
                members={roster.members}
                showClub={false}
                years={roster.years}
                year={year}
                currentYear={currentYear}
                historyAvailable={roster.historyAvailable}
              />
            </Suspense>
          ) : (
            <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center">
              <p className="text-sm text-gray-600 mb-4">The member list is visible to signed-in Lions.</p>
              <Link
                href={`/login?redirectTo=${encodeURIComponent(`/directory/club/${club.club_id}`)}`}
                className="btn-navy inline-flex items-center gap-2 rounded-md px-5 py-2.5 text-sm"
              >
                <LogIn size={15} aria-hidden /> Sign in to view members
              </Link>
            </div>
          )}
        </div>
      </section>
    </>
  );
}

function Fact({ icon: Icon, label, value }: { icon: React.ComponentType<{ size?: number; className?: string }>; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">
        <Icon size={13} className="text-brand-500" /> {label}
      </div>
      <div className="text-sm font-semibold text-navy-800">{value}</div>
    </div>
  );
}
