import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { EmptyState } from '@/components/admin/EmptyState';
import { Network, Globe } from 'lucide-react';
import Link from 'next/link';
import {
  HierarchyExplorer,
  type DistrictNode,
  type RegionNode,
  type ZoneNode,
  type ClubNode,
} from '@/components/admin/HierarchyExplorer';
import type { ClubMember } from '@/components/admin/ClubMembersPanel';

export const dynamic = 'force-dynamic';

export default async function HierarchyPage() {
  // Read via the service-role client (this page is gated by the admin layout)
  // so the tree survives databases where the `members` RLS policy recurses.
  const db = process.env.SUPABASE_SERVICE_ROLE_KEY ? createAdminClient() : await createClient();

  const [{ data: districts }, { data: regions }, { data: zones }, { data: clubs }, { data: members }] = await Promise.all([
    db.from('districts').select('id, code, name, governor_name').is('deleted_at', null).order('code'),
    db.from('regions').select('id, code, name, district_id').is('deleted_at', null).order('code'),
    db.from('zones').select('id, code, name, district_id, region_id').is('deleted_at', null).order('code'),
    db.from('clubs').select('id, name, club_number, district_id, zone_id, region_id').is('deleted_at', null).order('name'),
    db.from('members').select('id, name, email, phone, role, lions_role, lions_member_id, status, club_id')
      .is('deleted_at', null).order('name'),
  ]);

  // Members grouped by club.
  const membersByClub = new Map<string, ClubMember[]>();
  for (const m of members ?? []) {
    if (!m.club_id) continue;
    const arr = membersByClub.get(m.club_id) ?? [];
    arr.push({
      id: m.id, name: m.name, email: m.email ?? null, phone: m.phone ?? null,
      role: m.role ?? null, lions_role: m.lions_role ?? null,
      lions_member_id: m.lions_member_id ?? null, status: m.status ?? null,
    });
    membersByClub.set(m.club_id, arr);
  }

  const toClubNode = (c: { id: string; name: string; club_number: string | null }): ClubNode => ({
    id: c.id, name: c.name, club_number: c.club_number ?? null,
    members: membersByClub.get(c.id) ?? [],
  });

  // Index clubs by zone / by district-with-no-zone.
  const clubsByZone = new Map<string, ClubNode[]>();
  const looseClubsByDistrict = new Map<string, ClubNode[]>();
  for (const c of clubs ?? []) {
    const node = toClubNode(c);
    if (c.zone_id) {
      const arr = clubsByZone.get(c.zone_id) ?? []; arr.push(node); clubsByZone.set(c.zone_id, arr);
    } else if (c.district_id) {
      const arr = looseClubsByDistrict.get(c.district_id) ?? []; arr.push(node); looseClubsByDistrict.set(c.district_id, arr);
    }
  }

  // Index zones by region / by district-with-no-region.
  const zonesByRegion = new Map<string, ZoneNode[]>();
  const looseZonesByDistrict = new Map<string, ZoneNode[]>();
  for (const z of zones ?? []) {
    const node: ZoneNode = { id: z.id, code: z.code, name: z.name, clubs: clubsByZone.get(z.id) ?? [] };
    if (z.region_id) {
      const arr = zonesByRegion.get(z.region_id) ?? []; arr.push(node); zonesByRegion.set(z.region_id, arr);
    } else if (z.district_id) {
      const arr = looseZonesByDistrict.get(z.district_id) ?? []; arr.push(node); looseZonesByDistrict.set(z.district_id, arr);
    }
  }

  // Index regions by district.
  const regionsByDistrict = new Map<string, RegionNode[]>();
  for (const r of regions ?? []) {
    const node: RegionNode = { id: r.id, code: r.code, name: r.name, zones: zonesByRegion.get(r.id) ?? [] };
    const arr = regionsByDistrict.get(r.district_id) ?? []; arr.push(node); regionsByDistrict.set(r.district_id, arr);
  }

  const tree: DistrictNode[] = (districts ?? []).map((d) => ({
    id: d.id, code: d.code, name: d.name, governor_name: d.governor_name ?? null,
    regions: regionsByDistrict.get(d.id) ?? [],
    looseZones: looseZonesByDistrict.get(d.id) ?? [],
    looseClubs: looseClubsByDistrict.get(d.id) ?? [],
  }));

  const totalMembers = (members ?? []).length;
  const totalClubs = (clubs ?? []).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-navy-800 mb-1 flex items-center gap-2">
          <Network size={26} className="text-emerald-600" /> Federation Hierarchy
        </h1>
        <p className="text-gray-600">
          Drill down District → Region → Zone → Club → Members. Expand a club to see its roster and
          add members (single or bulk).
        </p>
      </div>

      {!districts?.length ? (
        <EmptyState
          icon={<Globe size={26} />}
          title="No districts yet"
          description="Create a district first — then add regions, zones, clubs and members beneath it."
          cta={<Link href="/admin/districts" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-emerald-600 text-white text-sm font-semibold">Go to Districts</Link>}
        />
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3 max-w-lg">
            <Stat label="Districts" value={districts.length} />
            <Stat label="Clubs" value={totalClubs} />
            <Stat label="Members" value={totalMembers} />
          </div>
          <Card>
            <CardHeader><CardTitle className="text-sm">Structure</CardTitle></CardHeader>
            <CardContent className="p-0">
              <HierarchyExplorer districts={tree} />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white rounded-xl border shadow-sm p-3 text-center">
      <div className="text-2xl font-extrabold text-navy-900">{value}</div>
      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{label}</div>
    </div>
  );
}
