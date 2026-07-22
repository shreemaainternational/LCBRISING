'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronRight, Globe, MapPin, Building2, Users, Layers, ExternalLink } from 'lucide-react';
import { ClubMembersPanel, type ClubMember } from './ClubMembersPanel';

export type ClubNode = {
  id: string;
  name: string;
  club_number: string | null;
  members: ClubMember[];
};
export type ZoneNode = { id: string; code: string; name: string; clubs: ClubNode[] };
export type RegionNode = { id: string; code: string; name: string; zones: ZoneNode[] };
export type DistrictNode = {
  id: string;
  code: string;
  name: string;
  governor_name: string | null;
  regions: RegionNode[];
  /** Zones attached straight to the district (no region). */
  looseZones: ZoneNode[];
  /** Clubs attached straight to the district (no zone). */
  looseClubs: ClubNode[];
};

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
  open, onToggle, icon: Icon, iconClass, title, subtitle, type, badges, depth, href,
}: {
  open: boolean;
  onToggle: () => void;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  iconClass: string;
  title: string;
  subtitle?: string;
  /** Lions "Type" column value: District / Region / Zone / Lions Club. */
  type: string;
  badges?: React.ReactNode;
  depth: number;
  href?: string;
}) {
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

function ClubBranch({ club, depth }: { club: ClubNode; depth: number }) {
  const [open, setOpen] = useState(false);
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
        badges={<Pill icon={Users} value={club.members.length} tone="emerald" />}
        depth={depth}
        href={`/admin/clubs/${club.id}`}
      />
      {open && (
        <div className="bg-gray-50/60 px-4 py-4" style={{ paddingLeft: `${depth * 20 + 34}px` }}>
          <ClubMembersPanel club={{ id: club.id, name: club.name }} members={club.members} compact />
        </div>
      )}
    </div>
  );
}

function ZoneBranch({ zone, depth }: { zone: ZoneNode; depth: number }) {
  const [open, setOpen] = useState(false);
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
        badges={<><Pill icon={Building2} value={zone.clubs.length} tone="blue" /><Pill icon={Users} value={members} tone="emerald" /></>}
        depth={depth}
      />
      {open && (
        zone.clubs.length
          ? zone.clubs.map((c) => <ClubBranch key={c.id} club={c} depth={depth + 1} />)
          : <div className="border-t text-xs text-gray-500 py-2.5" style={{ paddingLeft: `${(depth + 1) * 20 + 12}px` }}>No clubs in this zone.</div>
      )}
    </div>
  );
}

function RegionBranch({ region, depth }: { region: RegionNode; depth: number }) {
  const [open, setOpen] = useState(false);
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
        badges={<><Pill icon={MapPin} value={region.zones.length} tone="amber" /><Pill icon={Building2} value={clubs} tone="blue" /></>}
        depth={depth}
      />
      {open && (
        region.zones.length
          ? region.zones.map((z) => <ZoneBranch key={z.id} zone={z} depth={depth + 1} />)
          : <div className="border-t text-xs text-gray-500 py-2.5" style={{ paddingLeft: `${(depth + 1) * 20 + 12}px` }}>No zones in this region.</div>
      )}
    </div>
  );
}

function DistrictBranch({ district, defaultOpen }: { district: DistrictNode; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const hasChildren = district.regions.length || district.looseZones.length || district.looseClubs.length;
  return (
    <div>
      <Row
        open={open}
        onToggle={() => setOpen((o) => !o)}
        icon={Globe}
        iconClass="text-emerald-600"
        title={`District ${district.code}`}
        subtitle={[district.name !== district.code ? district.name : null, district.governor_name ? `DG ${district.governor_name}` : null].filter(Boolean).join(' · ') || undefined}
        type="District"
        badges={<>
          <Pill icon={Building2} value={countClubs(district)} tone="blue" />
          <Pill icon={Users} value={countMembers(district)} tone="emerald" />
        </>}
        depth={0}
        href={`/admin/districts/${district.id}`}
      />
      {open && (
        <div>
          {district.regions.map((r) => <RegionBranch key={r.id} region={r} depth={1} />)}
          {district.looseZones.map((z) => <ZoneBranch key={z.id} zone={z} depth={1} />)}
          {district.looseClubs.map((c) => <ClubBranch key={c.id} club={c} depth={1} />)}
          {!hasChildren && (
            <div className="border-t text-xs text-gray-500 py-2.5" style={{ paddingLeft: '32px' }}>
              No regions, zones or clubs under this district yet.
            </div>
          )}
        </div>
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

export function HierarchyExplorer({ districts, lionsYear }: { districts: DistrictNode[]; lionsYear?: string }) {
  const year = lionsYear || currentLionsYear();
  return (
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
      <div className="divide-y">
        {districts.map((d, i) => (
          <DistrictBranch key={d.id} district={d} defaultOpen={districts.length === 1 || i === 0} />
        ))}
      </div>
    </div>
  );
}
