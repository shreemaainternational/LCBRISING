'use client';

import { useState, useContext, createContext } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight, Globe, MapPin, Building2, Users, Layers, Boxes, Landmark, ExternalLink, Pencil, Plus, AlertTriangle } from 'lucide-react';
import { ClubMembersPanel, type ClubMember } from './ClubMembersPanel';
import { HierarchyEditContext, HierarchyEditModal, type EditEntity } from './HierarchyEditModal';
import { HierarchyCreateContext, HierarchyCreateModal, type CreateSpec } from './HierarchyCreateModal';

export type ClubNode = {
  id: string; name: string; club_number: string | null;
  city: string | null; state: string | null; zone_id: string | null;
  members: ClubMember[];
};
export type ZoneNode = { id: string; code: string; name: string; chairperson_name: string | null; region_id: string | null; clubs: ClubNode[] };
type Opt = { id: string; code: string; name: string };
export type RegionNode = { id: string; code: string; name: string; chairperson_name: string | null; zones: ZoneNode[] };
export type DistrictNode = {
  id: string; code: string; name: string; governor_name: string | null; lions_year: string | null;
  regions: RegionNode[];
  /** Zones attached straight to the district (no region). */
  looseZones: ZoneNode[];
  /** Clubs attached straight to the district (no zone). */
  looseClubs: ClubNode[];
};
export type MdNode = {
  id: string; code: string; name: string; country: string | null; council_chairperson_name: string | null;
  districts: DistrictNode[];
};
export type CaNode = { id: string; code: string; name: string; mds: MdNode[] };

// When non-null, forces every branch's initial open state (Expand/Collapse All).
// The tree is remounted (keyed) on toggle so this re-seeds each useState.
const ForceOpenContext = createContext<boolean | null>(null);

function countClubs(d: DistrictNode): number {
  const inZones = (zs: ZoneNode[]) => zs.reduce((a, z) => a + z.clubs.length, 0);
  return d.regions.reduce((a, r) => a + inZones(r.zones), 0) + inZones(d.looseZones) + d.looseClubs.length;
}
function countMembers(d: DistrictNode): number {
  const clubMembers = (cs: ClubNode[]) => cs.reduce((a, c) => a + c.members.length, 0);
  const zoneMembers = (zs: ZoneNode[]) => zs.reduce((a, z) => a + clubMembers(z.clubs), 0);
  return d.regions.reduce((a, r) => a + zoneMembers(r.zones), 0) + zoneMembers(d.looseZones) + clubMembers(d.looseClubs);
}

function Row({
  open, onToggle, icon: Icon, iconClass, title, subtitle, type, editEntity, createSpec, createLabel, badges, depth, href,
}: {
  open: boolean;
  onToggle: () => void;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  iconClass: string;
  title: string;
  subtitle?: string;
  type: string;
  editEntity?: EditEntity;
  createSpec?: CreateSpec;
  createLabel?: string;
  badges?: React.ReactNode;
  depth: number;
  href?: string;
}) {
  const openEdit = useContext(HierarchyEditContext);
  const openCreate = useContext(HierarchyCreateContext);
  return (
    <div
      className="flex items-center gap-2 py-2.5 pr-3 hover:bg-gray-50 cursor-pointer select-none"
      style={{ paddingLeft: `${depth * 20 + 12}px` }}
      onClick={onToggle}
    >
      <ChevronRight size={15} className={`text-gray-400 transition-transform shrink-0 ${open ? 'rotate-90' : ''}`} />
      <Icon size={16} className={`${iconClass} shrink-0`} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-navy-800 text-sm truncate">{title}</span>
          {href && (
            <Link href={href} onClick={(e) => e.stopPropagation()} className="text-gray-400 hover:text-amber-600" title="Open detail page">
              <ExternalLink size={12} />
            </Link>
          )}
        </div>
        {subtitle && <div className="text-xs text-gray-500 truncate">{subtitle}</div>}
      </div>
      {createSpec && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); openCreate(createSpec); }}
          className="shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-md border border-emerald-200 text-emerald-700 text-[11px] hover:bg-emerald-50"
          title={`Add ${createLabel}`}
        >
          <Plus size={12} /> {createLabel}
        </button>
      )}
      {editEntity && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); openEdit(editEntity); }}
          className="shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-md border border-gray-200 text-gray-600 text-[11px] hover:bg-gray-50 hover:text-emerald-700"
          title={`Edit ${type.toLowerCase()}`}
        >
          <Pencil size={12} /> Edit
        </button>
      )}
      {badges && <div className="hidden md:flex items-center gap-1.5 shrink-0">{badges}</div>}
      <span className="w-24 md:w-28 shrink-0 text-xs font-medium text-gray-500 text-right">{type}</span>
    </div>
  );
}

function Pill({ icon: Icon, value, tone = 'gray' }: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  value: number | string;
  tone?: 'gray' | 'emerald' | 'blue' | 'amber';
}) {
  const tones = {
    gray: 'bg-gray-100 text-gray-600',
    emerald: 'bg-emerald-100 text-emerald-700',
    blue: 'bg-blue-100 text-blue-700',
    amber: 'bg-amber-100 text-amber-700',
  };
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-1.5 py-0.5 rounded ${tones[tone]}`}>
      <Icon size={11} /> {value}
    </span>
  );
}

function ClubBranch({ club, depth, districtZones }: { club: ClubNode; depth: number; districtZones: Opt[] }) {
  const forceOpen = useContext(ForceOpenContext);
  const [open, setOpen] = useState(forceOpen ?? false);
  const openEdit = useContext(HierarchyEditContext);
  return (
    <div className="border-t">
      <Row
        open={open}
        onToggle={() => setOpen((o) => !o)}
        icon={Building2}
        iconClass="text-blue-500"
        title={club.name}
        subtitle={club.club_number ? `LCI #${club.club_number}` : undefined}
        type="Lions Club"
        editEntity={{ type: 'club', id: club.id, name: club.name, club_number: club.club_number, city: club.city, state: club.state, zone_id: club.zone_id, zones: districtZones }}
        badges={<Pill icon={Users} value={club.members.length} tone="emerald" />}
        depth={depth}
        href={`/admin/clubs/${club.id}`}
      />
      {open && (
        <div className="bg-gray-50/60 px-4 py-4" style={{ paddingLeft: `${depth * 20 + 34}px` }}>
          <ClubMembersPanel
            club={{ id: club.id, name: club.name }}
            members={club.members}
            compact
            onEditMember={(m) => openEdit({ type: 'member', id: m.id, name: m.name, email: m.email, phone: m.phone, status: m.status })}
          />
        </div>
      )}
    </div>
  );
}

function ZoneBranch({ zone, depth, districtId, districtRegions, districtZones, districtClubs }: { zone: ZoneNode; depth: number; districtId: string; districtRegions: Opt[]; districtZones: Opt[]; districtClubs: { id: string; name: string; club_number: string | null; zone_id: string | null }[] }) {
  const forceOpen = useContext(ForceOpenContext);
  const [open, setOpen] = useState(forceOpen ?? false);
  const members = zone.clubs.reduce((a, c) => a + c.members.length, 0);
  return (
    <div className="border-t">
      <Row
        open={open}
        onToggle={() => setOpen((o) => !o)}
        icon={MapPin}
        iconClass="text-amber-500"
        title={zone.name}
        subtitle={zone.code && zone.code !== zone.name ? zone.code : undefined}
        type="Zone"
        editEntity={{ type: 'zone', id: zone.id, code: zone.code, name: zone.name, chairperson_name: zone.chairperson_name, region_id: zone.region_id, regions: districtRegions, clubs: districtClubs }}
        createSpec={{ childType: 'club', parentLabel: zone.name, district_id: districtId, zone_id: zone.id }}
        createLabel="Club"
        badges={<><Pill icon={Building2} value={zone.clubs.length} tone="blue" /><Pill icon={Users} value={members} tone="emerald" /></>}
        depth={depth}
      />
      {open && (
        zone.clubs.length
          ? zone.clubs.map((c) => <ClubBranch key={c.id} club={c} depth={depth + 1} districtZones={districtZones} />)
          : <div className="border-t text-xs text-gray-500 py-2.5" style={{ paddingLeft: `${(depth + 1) * 20 + 12}px` }}>No clubs in this zone.</div>
      )}
    </div>
  );
}

function RegionBranch({ region, depth, districtId, districtRegions, districtZones, districtClubs }: { region: RegionNode; depth: number; districtId: string; districtRegions: Opt[]; districtZones: Opt[]; districtClubs: { id: string; name: string; club_number: string | null; zone_id: string | null }[] }) {
  const forceOpen = useContext(ForceOpenContext);
  const [open, setOpen] = useState(forceOpen ?? false);
  const clubs = region.zones.reduce((a, z) => a + z.clubs.length, 0);
  return (
    <div className="border-t">
      <Row
        open={open}
        onToggle={() => setOpen((o) => !o)}
        icon={Layers}
        iconClass="text-purple-500"
        title={region.name}
        subtitle={region.code && region.code !== region.name ? region.code : undefined}
        type="Region"
        editEntity={{ type: 'region', id: region.id, code: region.code, name: region.name, chairperson_name: region.chairperson_name }}
        createSpec={{ childType: 'zone', parentLabel: region.name, district_id: districtId, region_id: region.id }}
        createLabel="Zone"
        badges={<><Pill icon={MapPin} value={region.zones.length} tone="amber" /><Pill icon={Building2} value={clubs} tone="blue" /></>}
        depth={depth}
      />
      {open && (
        region.zones.length
          ? region.zones.map((z) => <ZoneBranch key={z.id} zone={z} depth={depth + 1} districtId={districtId} districtRegions={districtRegions} districtZones={districtZones} districtClubs={districtClubs} />)
          : <div className="border-t text-xs text-gray-500 py-2.5" style={{ paddingLeft: `${(depth + 1) * 20 + 12}px` }}>No zones in this region.</div>
      )}
    </div>
  );
}

function DistrictBranch({ district, depth, defaultOpen }: { district: DistrictNode; depth: number; defaultOpen: boolean }) {
  const forceOpen = useContext(ForceOpenContext);
  const [open, setOpen] = useState(forceOpen ?? defaultOpen);
  const hasChildren = district.regions.length || district.looseZones.length || district.looseClubs.length;
  const districtRegions: Opt[] = district.regions.map((r) => ({ id: r.id, code: r.code, name: r.name }));
  const districtZones: Opt[] = [...district.regions.flatMap((r) => r.zones), ...district.looseZones]
    .map((z) => ({ id: z.id, code: z.code, name: z.name }));
  const districtClubs = [
    ...district.regions.flatMap((r) => r.zones.flatMap((z) => z.clubs)),
    ...district.looseZones.flatMap((z) => z.clubs),
    ...district.looseClubs,
  ].map((c) => ({ id: c.id, name: c.name, club_number: c.club_number, zone_id: c.zone_id }));
  // Consistency: if regions exist every zone needs a region; if zones exist every club needs a zone.
  const orphanZones = district.regions.length ? district.looseZones.length : 0;
  const orphanClubs = districtZones.length ? district.looseClubs.length : 0;
  const indent = `${(depth + 1) * 20 + 12}px`;
  return (
    <div className="border-t first:border-t-0">
      <Row
        open={open}
        onToggle={() => setOpen((o) => !o)}
        icon={Globe}
        iconClass="text-emerald-600"
        title={`District ${district.code}`}
        subtitle={[district.name !== district.code ? district.name : null, district.governor_name ? `DG ${district.governor_name}` : null].filter(Boolean).join(' · ') || undefined}
        type="District"
        editEntity={{ type: 'district', id: district.id, code: district.code, name: district.name, governor_name: district.governor_name, lions_year: district.lions_year }}
        createSpec={{ childType: 'region', parentLabel: `District ${district.code}`, district_id: district.id }}
        createLabel="Region"
        badges={<>
          <Pill icon={Building2} value={countClubs(district)} tone="blue" />
          <Pill icon={Users} value={countMembers(district)} tone="emerald" />
        </>}
        depth={depth}
        href={`/admin/districts/${district.id}`}
      />
      {open && (
        <div>
          {district.regions.map((r) => <RegionBranch key={r.id} region={r} depth={depth + 1} districtId={district.id} districtRegions={districtRegions} districtZones={districtZones} districtClubs={districtClubs} />)}
          {(orphanZones > 0 || orphanClubs > 0) && (
            <div className="border-t bg-amber-50 text-[11px] text-amber-800 py-2 flex items-start gap-1.5" style={{ paddingLeft: indent, paddingRight: 12 }}>
              <AlertTriangle size={12} className="mt-0.5 shrink-0" />
              <span>
                Structure inconsistent —{' '}
                {orphanZones > 0 && <>{orphanZones} zone(s) not parented to a region</>}
                {orphanZones > 0 && orphanClubs > 0 && ', '}
                {orphanClubs > 0 && <>{orphanClubs} club(s) not assigned to a zone</>}
                . Use <strong>Edit</strong> on each to set its parent.
              </span>
            </div>
          )}
          {district.looseZones.map((z) => <ZoneBranch key={z.id} zone={z} depth={depth + 1} districtId={district.id} districtRegions={districtRegions} districtZones={districtZones} districtClubs={districtClubs} />)}
          {district.looseClubs.map((c) => <ClubBranch key={c.id} club={c} depth={depth + 1} districtZones={districtZones} />)}
          {!hasChildren && (
            <div className="border-t text-xs text-gray-500 py-2.5" style={{ paddingLeft: indent }}>
              No regions, zones or clubs under this district yet.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MdBranch({ md, depth = 0, defaultOpen }: { md: MdNode; depth?: number; defaultOpen: boolean }) {
  const forceOpen = useContext(ForceOpenContext);
  const [open, setOpen] = useState(forceOpen ?? defaultOpen);
  return (
    <div className="border-t first:border-t-0">
      <Row
        open={open}
        onToggle={() => setOpen((o) => !o)}
        icon={Boxes}
        iconClass="text-navy-700"
        title={md.name}
        subtitle={[md.code && md.code !== md.name ? md.code : null, md.council_chairperson_name ? `CC ${md.council_chairperson_name}` : null].filter(Boolean).join(' · ') || undefined}
        type="Multiple District"
        editEntity={{ type: 'md', id: md.id, name: md.name, code: md.code, country: md.country, council_chairperson_name: md.council_chairperson_name }}
        createSpec={{ childType: 'district', parentLabel: md.name, multiple_district_id: md.id }}
        createLabel="District"
        badges={<Pill icon={Globe} value={md.districts.length} tone="blue" />}
        depth={depth}
      />
      {open && (
        md.districts.length
          ? md.districts.map((d) => <DistrictBranch key={d.id} district={d} depth={depth + 1} defaultOpen={md.districts.length === 1} />)
          : <div className="border-t text-xs text-gray-500 py-2.5" style={{ paddingLeft: `${(depth + 1) * 20 + 12}px` }}>No districts under this multiple district.</div>
      )}
    </div>
  );
}

function CaBranch({ ca, defaultOpen }: { ca: CaNode; defaultOpen: boolean }) {
  const forceOpen = useContext(ForceOpenContext);
  const [open, setOpen] = useState(forceOpen ?? defaultOpen);
  return (
    <div className="border-t first:border-t-0">
      <Row
        open={open}
        onToggle={() => setOpen((o) => !o)}
        icon={Landmark}
        iconClass="text-rose-600"
        title={ca.name}
        subtitle={ca.code && ca.code !== ca.name ? ca.code : undefined}
        type="Constitutional Area"
        editEntity={{ type: 'ca', id: ca.id, name: ca.name, code: ca.code }}
        createSpec={{ childType: 'md', parentLabel: ca.name, constitutional_area_id: ca.id }}
        createLabel="Multiple District"
        badges={<Pill icon={Boxes} value={ca.mds.length} tone="blue" />}
        depth={0}
      />
      {open && (
        ca.mds.length
          ? ca.mds.map((m) => <MdBranch key={m.id} md={m} depth={1} defaultOpen={ca.mds.length === 1} />)
          : <div className="border-t text-xs text-gray-500 py-2.5" style={{ paddingLeft: '32px' }}>No multiple districts under this constitutional area.</div>
      )}
    </div>
  );
}

/** Current Lions year (runs 1 Jul – 30 Jun), e.g. "2026-2027". */
function currentLionsYear(): string {
  const now = new Date();
  const y = now.getFullYear();
  return now.getMonth() >= 6 ? `${y}-${y + 1}` : `${y - 1}-${y}`;
}

export function HierarchyExplorer({
  cas = [], looseMds = [], looseDistricts = [], lionsYear,
}: { cas?: CaNode[]; looseMds?: MdNode[]; looseDistricts?: DistrictNode[]; lionsYear?: string }) {
  const router = useRouter();
  const [editing, setEditing] = useState<EditEntity | null>(null);
  const [creating, setCreating] = useState<CreateSpec | null>(null);
  // Expand/Collapse All: bump `version` to remount the tree so each branch's
  // useState re-seeds from `forceOpen`.
  const [forceOpen, setForceOpen] = useState<boolean | null>(null);
  const [version, setVersion] = useState(0);
  const year = lionsYear || currentLionsYear();
  const onlyOne = cas.length + looseMds.length + looseDistricts.length === 1;

  function expandAll(open: boolean) { setForceOpen(open); setVersion((v) => v + 1); }

  return (
    <HierarchyEditContext.Provider value={setEditing}>
      <HierarchyCreateContext.Provider value={setCreating}>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => expandAll(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-xs font-semibold text-gray-700 hover:bg-gray-50">
            <Plus size={13} /> Expand all
          </button>
          <button type="button" onClick={() => expandAll(false)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-xs font-semibold text-gray-700 hover:bg-gray-50">
            <ChevronRight size={13} /> Collapse all
          </button>
        </div>
        <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between gap-2 px-3 py-2 bg-navy-900 text-white">
            <span className="text-xs font-bold uppercase tracking-wide">Account Name</span>
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center rounded bg-white/15 px-2 py-0.5 text-[10px] font-semibold">
                {year} · Active Structure
              </span>
              <span className="w-24 md:w-28 text-right text-xs font-bold uppercase tracking-wide">Type</span>
            </div>
          </div>
          <ForceOpenContext.Provider value={forceOpen}>
            <div key={version}>
              {cas.map((c) => <CaBranch key={c.id} ca={c} defaultOpen={onlyOne} />)}
              {looseMds.map((m) => <MdBranch key={m.id} md={m} defaultOpen={onlyOne} />)}
              {looseDistricts.map((d) => <DistrictBranch key={d.id} district={d} depth={0} defaultOpen={onlyOne} />)}
            </div>
          </ForceOpenContext.Provider>
        </div>
        <p className="mt-3 flex items-start gap-1.5 text-xs text-gray-500">
          <AlertTriangle size={12} className="mt-0.5 shrink-0 text-amber-500" />
          <span><strong>District structure must be consistent:</strong> if zones exist, every club must be assigned to a zone; if regions exist, every zone must be parented to a region. Use <strong>Edit</strong> on a zone or club to set its parent.</span>
        </p>

        {editing && (
          <HierarchyEditModal
            entity={editing}
            onClose={() => setEditing(null)}
            onSaved={() => { setEditing(null); router.refresh(); }}
          />
        )}
        {creating && (
          <HierarchyCreateModal
            spec={creating}
            onClose={() => setCreating(null)}
            onCreated={() => { setCreating(null); router.refresh(); }}
          />
        )}
      </HierarchyCreateContext.Provider>
    </HierarchyEditContext.Provider>
  );
}
