import type { Metadata } from 'next';
import Link from 'next/link';
import { Phone, Mail, MessageCircle, Building2, Users, BookUser, Search } from 'lucide-react';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { PageHero, PAGE_HERO_BG } from '@/components/site/PageHero';
import { humanizeRole } from '@/components/site/OrgHierarchy';
import { ClubDirectory } from '@/components/site/ClubDirectory';
import { loadDirectoryClubs } from '@/lib/member-directory';

export const metadata: Metadata = {
  title: 'Member Directory',
  description:
    'Club-wise member directory for Lions Club of Baroda Rising Star and District 3232 F1 — every chartered club with its zone, region and district, plus cabinet and club officers.',
  alternates: { canonical: '/directory' },
};

export const revalidate = 300;

type ClubRow = { id: string; name: string };

type OfficerRow = {
  id: string;
  role: string;
  scope_kind: string;
  scope_id: string | null;
  member: { name: string; email: string | null; phone: string | null; whatsapp: string | null; avatar_url: string | null } | null;
};

type Officer = {
  id: string;
  role: string;
  name: string;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  avatar: string | null;
};

async function loadDirectory(): Promise<{
  districtLabel: string;
  clubs: ClubRow[];
  districtOfficers: Officer[];
  clubOfficers: Map<string, Officer[]>;
}> {
  const empty = { districtLabel: 'District 3232 F1', clubs: [], districtOfficers: [], clubOfficers: new Map<string, Officer[]>() };
  if (!isSupabaseConfigured()) return empty;

  try {
    // Service-role client bypasses RLS on the hierarchy/officer tables (same
    // approach as OrgHierarchy on the About page) so the directory shows real
    // data even though these tables are normally member/admin-only.
    const db = process.env.SUPABASE_SERVICE_ROLE_KEY ? createAdminClient() : await createClient();

    const [{ data: district }, { data: clubs }, { data: officers }] = await Promise.all([
      db.from('districts').select('code, name').is('deleted_at', null).order('code').limit(1).maybeSingle(),
      db.from('clubs').select('id, name').is('deleted_at', null).order('name'),
      db
        .from('officers')
        .select('id, role, scope_kind, scope_id, member:members(name, email, phone, whatsapp, avatar_url)')
        .in('scope_kind', ['district', 'club'])
        .eq('status', 'active'),
    ]);

    const districtLabel = district ? `District ${district.code}${district.name ? ` · ${district.name}` : ''}` : empty.districtLabel;

    const toOfficer = (o: OfficerRow): Officer | null => {
      if (!o.member) return null;
      return {
        id: o.id,
        role: humanizeRole(o.role),
        name: o.member.name,
        email: o.member.email,
        phone: o.member.phone,
        whatsapp: o.member.whatsapp,
        avatar: o.member.avatar_url,
      };
    };

    const rows = ((officers ?? []) as unknown as OfficerRow[]);
    const districtOfficers = rows
      .filter((o) => o.scope_kind === 'district')
      .map(toOfficer)
      .filter((o): o is Officer => !!o);

    const clubOfficers = new Map<string, Officer[]>();
    for (const row of rows) {
      if (row.scope_kind !== 'club' || !row.scope_id) continue;
      const officer = toOfficer(row);
      if (!officer) continue;
      const list = clubOfficers.get(row.scope_id) ?? [];
      list.push(officer);
      clubOfficers.set(row.scope_id, list);
    }

    return { districtLabel, clubs: (clubs ?? []) as ClubRow[], districtOfficers, clubOfficers };
  } catch {
    return empty;
  }
}

export default async function DirectoryPage() {
  const [{ districtLabel, clubs, districtOfficers, clubOfficers }, directoryClubs] = await Promise.all([
    loadDirectory(),
    loadDirectoryClubs(),
  ]);

  return (
    <>
      <PageHero
        pillText="OUR PEOPLE"
        headline="Member Directory"
        subtitle={`Every club of ${districtLabel}, club-wise — with its zone, region, members and officers.`}
        backgroundImage={PAGE_HERO_BG.about}
      />

      <section className="py-16 md:py-20 bg-white">
        <div className="container-page">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
            <SectionHeading icon={Building2} title="Clubs" flush />
            <Link
              href="/directory/members"
              className="inline-flex items-center gap-2 self-start rounded-lg border border-navy-800 px-4 py-2 text-sm font-semibold text-navy-800 hover:bg-navy-800 hover:text-white transition"
            >
              <Search size={15} aria-hidden /> Search all members
            </Link>
          </div>
          <p className="text-gray-600 max-w-3xl mb-6">
            Select a club to see its members. Member lists are visible to signed-in Lions; club
            details, member counts and officers are public.
          </p>
          <ClubDirectory clubs={directoryClubs} />
        </div>
      </section>

      <section className="py-16 md:py-20 bg-gray-50">
        <div className="container-page">
          <SectionHeading icon={BookUser} title="District Cabinet" />
          {districtOfficers.length === 0 ? (
            <EmptyState>Cabinet officers will appear here once they&apos;re added to the CRM.</EmptyState>
          ) : (
            <OfficerGrid officers={districtOfficers} />
          )}
        </div>
      </section>

      {[...clubOfficers.entries()].map(([clubId, officers]) => {
        const club = clubs.find((c) => c.id === clubId);
        return (
          <section key={clubId} className="py-16 md:py-20 bg-white border-t border-gray-100">
            <div className="container-page">
              <SectionHeading icon={Users} title={`Club Officers${club ? ` — ${club.name}` : ''}`} />
              <OfficerGrid officers={officers} />
            </div>
          </section>
        );
      })}
    </>
  );
}

function SectionHeading({ icon: Icon, title, flush }: { icon: React.ComponentType<{ size?: number; className?: string }>; title: string; flush?: boolean }) {
  return (
    <div className={`flex items-center gap-2 ${flush ? '' : 'mb-8'}`}>
      <span className="w-9 h-9 rounded-full bg-navy-800 text-brand-400 flex items-center justify-center">
        <Icon size={16} />
      </span>
      <h2 className="text-2xl md:text-3xl font-bold text-navy-800">{title}</h2>
    </div>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-500">
      {children}
    </div>
  );
}

function OfficerGrid({ officers }: { officers: Officer[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {officers.map((o) => (
        <div key={o.id} className="rounded-2xl border border-gray-200 bg-white shadow-sm p-5">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={
                o.avatar ??
                `https://ui-avatars.com/api/?name=${encodeURIComponent(o.name)}&background=172554&color=fbbf24&size=96&bold=true`
              }
              alt={o.name}
              className="h-12 w-12 rounded-full object-cover ring-2 ring-brand-300 flex-shrink-0"
            />
            <div className="min-w-0">
              <div className="font-bold text-navy-800 leading-tight truncate">{o.name}</div>
              <div className="text-xs font-semibold uppercase tracking-wider text-brand-600 mt-0.5">{o.role}</div>
            </div>
          </div>
          {(o.phone || o.whatsapp || o.email) && (
            <div className="flex items-center gap-2 mt-4">
              {o.phone && (
                <a href={`tel:${o.phone}`} aria-label={`Call ${o.name}`}
                  className="w-9 h-9 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center hover:bg-emerald-100">
                  <Phone size={14} />
                </a>
              )}
              {(o.whatsapp || o.phone) && (
                <a
                  href={`https://wa.me/${(o.whatsapp ?? o.phone ?? '').replace(/[^\d]/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`WhatsApp ${o.name}`}
                  className="w-9 h-9 rounded-full bg-green-50 text-green-700 flex items-center justify-center hover:bg-green-100"
                >
                  <MessageCircle size={14} />
                </a>
              )}
              {o.email && (
                <a href={`mailto:${o.email}`} aria-label={`Email ${o.name}`}
                  className="w-9 h-9 rounded-full bg-blue-50 text-blue-700 flex items-center justify-center hover:bg-blue-100">
                  <Mail size={14} />
                </a>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
