import { createClient, createAdminClient } from '@/lib/supabase/server';
import { EmptyState } from '@/components/admin/EmptyState';
import { Network, Globe } from 'lucide-react';
import Link from 'next/link';
import {
  type CaNode,
  type MdNode,
  type DistrictNode,
  type RegionNode,
  type ZoneNode,
  type ClubNode,
} from '@/components/admin/HierarchyExplorer';
import { HierarchyViews } from '@/components/admin/HierarchyViews';
import type { ClubMember } from '@/components/admin/ClubMembersPanel';

export const dynamic = 'force-dynamic';

export default async function HierarchyPage() {
  // Read via the service-role client (this page is gated by the admin layout)
  // so the tree survives databases where the `members` RLS policy recurses.
  const db = process.env.SUPABASE_SERVICE_ROLE_KEY ? createAdminClient() : await createClient();

  const [{ data: cas }, { data: mds }, { data: districts }, { data: regions }, { data: zones }, { data: clubs }, { data: members }] = await Promise.all([
    db.from('constitutional_areas').select('id, code, name').is('deleted_at', null).order('code'),
    db.from('multiple_districts').select('id, code, name, country, council_chairperson_name, constitutional_area_id').is('deleted_at', null).order('code'),
    db.from('districts').select('id, code, name, governor_name, lions_year, multiple_district_id').is('deleted_at', null).order('code'),
    db.from('regions').select('id, code, name, chairperson_name, district_id').is('deleted_at', null).order('code'),
    db.from('zones').select('id, code, name, chairperson_name, district_id, region_id').is('deleted_at', null).order('code'),
    db.from('clubs').select('id, name, club_number, city, state, district_id, zone_id, region_id').is('deleted_at', null).order('name'),
    db.from('members').select('id, name, email, phone, role, lions_role, lions_member_id, status, club_id')
      .is('deleted_at', null).order('name'),
  ]);

  // Members grouped by club; members with no club go to the "unassigned" bucket.
  const membersByClub = new Map<string, ClubMember[]>();
  const unassignedMembers: ClubMember[] = [];
  for (const m of members ?? []) {
    const cm: ClubMember = {
      id: m.id, name: m.name, email: m.email ?? null, phone: m.phone ?? null,
      role: m.role ?? null, lions_role: m.lions_role ?? null,
      lions_member_id: m.lions_member_id ?? null, status: m.status ?? null,
    };
    if (!m.club_id) { unassignedMembers.push(cm); continue; }
    const arr = membersByClub.get(m.club_id) ?? [];
    arr.push(cm);
    membersByClub.set(m.club_id, arr);
  }

  const toClubNode = (c: { id: string; name: string; club_number: string | null; city?: string | null; state?: string | null; zone_id?: string | null }): ClubNode => ({
    id: c.id, name: c.name, club_number: c.club_number ?? null,
    city: c.city ?? null, state: c.state ?? null, zone_id: c.zone_id ?? null,
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
    const node: ZoneNode = { id: z.id, code: z.code, name: z.name, chairperson_name: z.chairperson_name ?? null, region_id: z.region_id ?? null, clubs: clubsByZone.get(z.id) ?? [] };
    if (z.region_id) {
      const arr = zonesByRegion.get(z.region_id) ?? []; arr.push(node); zonesByRegion.set(z.region_id, arr);
    } else if (z.district_id) {
      const arr = looseZonesByDistrict.get(z.district_id) ?? []; arr.push(node); looseZonesByDistrict.set(z.district_id, arr);
    }
  }

  // Index regions by district.
  const regionsByDistrict = new Map<string, RegionNode[]>();
  for (const r of regions ?? []) {
    const node: RegionNode = { id: r.id, code: r.code, name: r.name, chairperson_name: r.chairperson_name ?? null, zones: zonesByRegion.get(r.id) ?? [] };
    const arr = regionsByDistrict.get(r.district_id) ?? []; arr.push(node); regionsByDistrict.set(r.district_id, arr);
  }

  const districtNodes: (DistrictNode & { multiple_district_id: string | null })[] = (districts ?? []).map((d) => ({
    id: d.id, code: d.code, name: d.name, governor_name: d.governor_name ?? null, lions_year: d.lions_year ?? null,
    multiple_district_id: (d as { multiple_district_id?: string | null }).multiple_district_id ?? null,
    regions: regionsByDistrict.get(d.id) ?? [],
    looseZones: looseZonesByDistrict.get(d.id) ?? [],
    looseClubs: looseClubsByDistrict.get(d.id) ?? [],
  }));

  // Group districts under their multiple district; districts with none stay loose.
  const districtsByMd = new Map<string, DistrictNode[]>();
  const looseDistricts: DistrictNode[] = [];
  for (const d of districtNodes) {
    if (d.multiple_district_id) {
      const arr = districtsByMd.get(d.multiple_district_id) ?? []; arr.push(d); districtsByMd.set(d.multiple_district_id, arr);
    } else {
      looseDistricts.push(d);
    }
  }
  const mdNodesFull: (MdNode & { constitutional_area_id: string | null })[] = (mds ?? []).map((m) => ({
    id: m.id, code: m.code, name: m.name, country: m.country ?? null,
    council_chairperson_name: m.council_chairperson_name ?? null,
    constitutional_area_id: (m as { constitutional_area_id?: string | null }).constitutional_area_id ?? null,
    districts: districtsByMd.get(m.id) ?? [],
  }));

  // Group multiple districts under their constitutional area; MDs with none stay loose.
  const mdsByCa = new Map<string, MdNode[]>();
  const looseMds: MdNode[] = [];
  for (const m of mdNodesFull) {
    if (m.constitutional_area_id) {
      const arr = mdsByCa.get(m.constitutional_area_id) ?? []; arr.push(m); mdsByCa.set(m.constitutional_area_id, arr);
    } else {
      looseMds.push(m);
    }
  }
  const caNodes: CaNode[] = (cas ?? []).map((c) => ({
    id: c.id, code: c.code, name: c.name, mds: mdsByCa.get(c.id) ?? [],
  }));

  const totalMembers = (members ?? []).length;
  const totalClubs = (clubs ?? []).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-navy-800 mb-1 flex items-center gap-2">
          <Network size={26} className="text-emerald-600" /> Region / Zone Management
        </h1>
        <p className="text-gray-600">
          The active structure — Constitutional Area → Multiple District → District → Region → Zone → Club → Members.
          Expand or collapse any node, <strong>+ Add</strong> a child, and <strong>Edit</strong> to update or
          re-parent it (zone → region, club → zone). Expand a club to manage its roster.
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
          <HierarchyViews cas={caNodes} looseMds={looseMds} looseDistricts={looseDistricts} unassignedMembers={unassignedMembers} />
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
