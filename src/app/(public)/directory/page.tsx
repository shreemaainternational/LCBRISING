import type { Metadata } from 'next';
import { Phone, Mail, MessageCircle, MapPin, Building2, Users, BookUser } from 'lucide-react';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { PageHero, PAGE_HERO_BG } from '@/components/site/PageHero';
import { humanizeRole } from '@/components/site/OrgHierarchy';

export const metadata: Metadata = {
  title: 'Directory',
  description:
    'Club and officer directory for Lions Club of Baroda Rising Star and District 3232 F1 — chartered clubs, cabinet and club officers, and how to reach them.',
  alternates: { canonical: '/directory' },
};

export const revalidate = 300;

type ClubRow = {
  id: string;
  name: string;
  club_number: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
};

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
      db.from('clubs').select('id, name, club_number, city, latitude, longitude').is('deleted_at', null).order('name'),
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
  const { districtLabel, clubs, districtOfficers, clubOfficers } = await loadDirectory();

  return (
    <>
      <PageHero
        pillText="OUR PEOPLE"
        headline="Club & Officer Directory"
        subtitle={`Chartered clubs and the officers of ${districtLabel} — how to find and reach them.`}
        backgroundImage={PAGE_HERO_BG.about}
      />

      <section className="py-16 md:py-20 bg-white">
        <div className="container-page">
          <SectionHeading icon={Building2} title="Chartered Clubs" />
          {clubs.length === 0 ? (
            <EmptyState>Club listings will appear here once they&apos;re added to the CRM.</EmptyState>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {clubs.map((c) => (
                <div key={c.id} className="rounded-2xl border border-gray-200 bg-white shadow-sm p-5 flex items-start gap-3">
                  <span className="w-11 h-11 rounded-xl bg-blue-50 text-navy-700 flex items-center justify-center flex-shrink-0">
                    <Building2 size={18} />
                  </span>
                  <div className="min-w-0">
                    <div className="font-bold text-navy-800 leading-tight">{c.name}</div>
                    <div className="text-sm text-gray-500 mt-0.5">
                      {c.club_number && <>#{c.club_number}</>}
                      {c.club_number && c.city && ' · '}
                      {c.city}
                    </div>
                    {c.latitude != null && c.longitude != null && (
                      <a
                        href={`https://www.google.com/maps?q=${c.latitude},${c.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700 mt-2"
                      >
                        <MapPin size={12} /> View on map
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
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

function SectionHeading({ icon: Icon, title }: { icon: React.ComponentType<{ size?: number; className?: string }>; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-8">
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
