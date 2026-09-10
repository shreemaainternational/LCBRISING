import { Globe2, Landmark, ShieldCheck, Users, MapPin } from 'lucide-react';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';

/**
 * Public "Our Lions Structure" section.
 *
 * The Lions organisational hierarchy (Multiple District → District → Club) and
 * the district leadership live in Supabase but were only ever surfaced inside
 * the login-gated member/officer portals. This renders it on the public About
 * page, read live from the database with static fallbacks so it always shows
 * something sensible even before the tables are seeded.
 */

const FALLBACK = {
  md: { code: 'MD 3232', name: 'Multiple District 3232' },
  district: { code: '3232 F1', name: 'District 3232 F1', lionsYear: null as string | null },
  club: 'Lions Club of Baroda Rising Star',
};

const ROLE_LABEL: Record<string, string> = {
  district_governor: 'District Governor',
  vice_district_governor: 'Vice District Governor',
  cabinet_officer: 'Cabinet Officer',
  cabinet_secretary: 'Cabinet Secretary',
  cabinet_treasurer: 'Cabinet Treasurer',
  region_chairperson: 'Region Chairperson',
  zone_chairperson: 'Zone Chairperson',
  council_chairperson: 'Council Chairperson',
};

function humanizeRole(role: string) {
  return ROLE_LABEL[role] ?? role.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

const DISTRICT_RANK: Record<string, number> = {
  district_governor: 0,
  vice_district_governor: 1,
  cabinet_secretary: 2,
  cabinet_treasurer: 3,
  cabinet_officer: 4,
  region_chairperson: 5,
  zone_chairperson: 6,
};

type Leader = { name: string; role: string; avatar: string | null };

function avatar(name: string, url: string | null) {
  if (url) return url;
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(
    name.replace(/^(MJF\s+)?Lion\s+/i, ''),
  )}&background=172554&color=fbbf24&size=160&bold=true`;
}

type Structure = {
  md: { code: string; name: string } | null;
  district: { code: string; name: string; lionsYear: string | null };
  clubName: string;
  clubCount: number;
  memberCount: number;
  leaders: Leader[];
};

async function loadStructure(): Promise<Structure> {
  const base: Structure = {
    md: FALLBACK.md,
    district: FALLBACK.district,
    clubName: FALLBACK.club,
    clubCount: 0,
    memberCount: 0,
    leaders: [],
  };
  if (!isSupabaseConfigured()) return base;

  try {
    // Service-role client bypasses RLS on the hierarchy tables (same approach the
    // homepage stats use); only public organisation-structure info is read here.
    const db = process.env.SUPABASE_SERVICE_ROLE_KEY ? createAdminClient() : await createClient();

    const { data: district } = await db
      .from('districts')
      .select('code, name, lions_year, multiple_district_id')
      .is('deleted_at', null)
      .order('code')
      .limit(1)
      .maybeSingle();

    if (district) {
      base.district = {
        code: district.code ?? FALLBACK.district.code,
        name: district.name ?? FALLBACK.district.name,
        lionsYear: district.lions_year ?? null,
      };
    }

    // Multiple District — prefer the one linked to the district, else any row.
    let mdRow: { code: string; name: string } | null = null;
    if (district?.multiple_district_id) {
      const { data } = await db
        .from('multiple_districts')
        .select('code, name')
        .eq('id', district.multiple_district_id)
        .is('deleted_at', null)
        .maybeSingle();
      mdRow = data ?? null;
    }
    if (!mdRow) {
      const { data } = await db
        .from('multiple_districts')
        .select('code, name')
        .is('deleted_at', null)
        .order('code')
        .limit(1)
        .maybeSingle();
      mdRow = data ?? null;
    }
    base.md = mdRow ?? FALLBACK.md;

    const [{ count: clubCount }, { count: memberCount }, { data: officers }] = await Promise.all([
      db.from('clubs').select('*', { count: 'exact', head: true }).is('deleted_at', null),
      db.from('members').select('*', { count: 'exact', head: true }).is('deleted_at', null),
      db
        .from('officers')
        .select('role, notes, member:members(name, avatar_url)')
        .eq('scope_kind', 'district')
        .eq('status', 'active'),
    ]);

    base.clubCount = clubCount ?? 0;
    base.memberCount = memberCount ?? 0;

    type OfficerRow = { role: string; notes: string | null; member: { name: string; avatar_url: string | null } | null };
    base.leaders = ((officers ?? []) as unknown as OfficerRow[])
      .filter((o) => o.member)
      .sort((a, b) => (DISTRICT_RANK[a.role] ?? 9) - (DISTRICT_RANK[b.role] ?? 9))
      .map((o) => ({ name: o.member!.name, role: o.notes ?? humanizeRole(o.role), avatar: o.member!.avatar_url }));
  } catch {
    return base;
  }

  return base;
}

export async function OrgHierarchy() {
  const { md, district, clubName, clubCount, memberCount, leaders } = await loadStructure();

  const tiers = [
    md && {
      icon: Globe2,
      label: 'Multiple District',
      title: md.name,
      subtitle: md.code,
    },
    {
      icon: Landmark,
      label: 'District',
      title: district.name,
      subtitle: district.lionsYear ? `${district.code} · Lions Year ${district.lionsYear}` : district.code,
    },
    {
      icon: ShieldCheck,
      label: 'Our Club',
      title: clubName,
      subtitle: 'Vadodara, Gujarat',
      highlight: true,
    },
  ].filter(Boolean) as {
    icon: typeof Globe2;
    label: string;
    title: string;
    subtitle: string;
    highlight?: boolean;
  }[];

  return (
    <section className="bg-white py-16 md:py-20">
      <div className="container-page">
        <div className="text-center mb-12">
          <span className="inline-block bg-blue-50 text-navy-700 px-3 py-1 rounded-full text-xs font-semibold mb-3">
            Where We Belong
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-navy-800 mb-3">Our Lions Structure</h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Lions Club of Baroda Rising Star is part of Lions Clubs International — the world&apos;s
            largest service organisation — through this district and multiple-district hierarchy.
          </p>
        </div>

        {/* Hierarchy tiers */}
        <div className="flex flex-col lg:flex-row items-stretch justify-center gap-4 lg:gap-0 max-w-5xl mx-auto">
          {tiers.map((t, i) => (
            <div key={t.label} className="flex flex-col lg:flex-row items-center lg:flex-1">
              <div
                className={`w-full rounded-2xl border p-6 text-center transition-shadow ${
                  t.highlight
                    ? 'bg-navy-800 border-navy-800 text-white shadow-lg'
                    : 'bg-white border-gray-200 shadow-sm'
                }`}
              >
                <div
                  className={`h-12 w-12 rounded-xl flex items-center justify-center mx-auto mb-4 ${
                    t.highlight ? 'bg-white/10' : 'bg-blue-50'
                  }`}
                >
                  <t.icon
                    size={24}
                    className={t.highlight ? 'text-brand-400' : 'text-navy-700'}
                    aria-hidden
                  />
                </div>
                <div
                  className={`text-[11px] uppercase tracking-widest mb-1.5 ${
                    t.highlight ? 'text-brand-300' : 'text-brand-600'
                  }`}
                >
                  {t.label}
                </div>
                <div className={`font-bold leading-snug ${t.highlight ? 'text-white' : 'text-navy-800'}`}>
                  {t.title}
                </div>
                <div className={`text-sm mt-1 ${t.highlight ? 'text-blue-100/90' : 'text-gray-500'}`}>
                  {t.subtitle}
                </div>
              </div>

              {/* Connector arrow between tiers */}
              {i < tiers.length - 1 && (
                <div
                  className="flex items-center justify-center text-gray-300 shrink-0 py-2 lg:py-0 lg:px-2"
                  aria-hidden
                >
                  <span className="lg:hidden text-2xl leading-none">↓</span>
                  <span className="hidden lg:inline text-2xl leading-none">→</span>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* District-wide reach */}
        {(clubCount > 0 || memberCount > 0) && (
          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-sm text-gray-600">
            {clubCount > 0 && (
              <span className="inline-flex items-center gap-2">
                <ShieldCheck size={16} className="text-brand-500" aria-hidden />
                {clubCount.toLocaleString('en-IN')} Lions Clubs in the district
              </span>
            )}
            {memberCount > 0 && (
              <span className="inline-flex items-center gap-2">
                <Users size={16} className="text-brand-500" aria-hidden />
                {memberCount.toLocaleString('en-IN')} Lions members
              </span>
            )}
          </div>
        )}

        {/* District leadership */}
        {leaders.length > 0 && (
          <div className="mt-14">
            <h3 className="text-center text-xl font-bold text-navy-800 mb-8">District Leadership</h3>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl mx-auto">
              {leaders.map((l) => (
                <div
                  key={`${l.name}-${l.role}`}
                  className="bg-white border border-gray-100 rounded-2xl p-6 text-center shadow-sm"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={avatar(l.name, l.avatar)}
                    alt={l.name}
                    className="h-24 w-24 rounded-full object-cover mx-auto mb-4 ring-4 ring-brand-400"
                  />
                  <div className="font-bold text-navy-800">{l.name}</div>
                  <div className="text-brand-600 font-semibold text-sm mt-0.5 inline-flex items-center gap-1">
                    <MapPin size={13} aria-hidden /> {l.role}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
