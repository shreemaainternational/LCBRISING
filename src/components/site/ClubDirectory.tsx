'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Building2, LayoutGrid, List, Search, Users, MapPin, ChevronLeft, ChevronRight } from 'lucide-react';

export type ClubCard = {
  club_id: string;
  club_name: string;
  club_number: string | null;
  city: string | null;
  zone_id: string | null;
  zone_name: string | null;
  region_id: string | null;
  region_name: string | null;
  district_id: string | null;
  district_code: string | null;
  active_members: number;
};

const PAGE_SIZE = 12;

/** Searchable, filterable club list for the public Member Directory. */
export function ClubDirectory({ clubs }: { clubs: ClubCard[] }) {
  const [q, setQ] = useState('');
  const [district, setDistrict] = useState('');
  const [region, setRegion] = useState('');
  const [zone, setZone] = useState('');
  const [sort, setSort] = useState<'name' | 'members'>('name');
  const [view, setView] = useState<'grid' | 'table'>('grid');
  const [page, setPage] = useState(1);

  const options = useMemo(() => {
    const uniq = (pairs: [string | null, string | null][]) =>
      [...new Map(pairs.filter((p): p is [string, string] => !!p[0] && !!p[1])).entries()]
        .sort((a, b) => a[1].localeCompare(b[1]));
    return {
      districts: uniq(clubs.map((c) => [c.district_id, c.district_code ? `District ${c.district_code}` : null])),
      regions: uniq(clubs.filter((c) => !district || c.district_id === district).map((c) => [c.region_id, c.region_name])),
      zones: uniq(clubs
        .filter((c) => (!district || c.district_id === district) && (!region || c.region_id === region))
        .map((c) => [c.zone_id, c.zone_name])),
    };
  }, [clubs, district, region]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = clubs.filter((c) =>
      (!district || c.district_id === district) &&
      (!region || c.region_id === region) &&
      (!zone || c.zone_id === zone) &&
      (!needle || [c.club_name, c.club_number, c.city, c.zone_name, c.region_name]
        .some((v) => v?.toLowerCase().includes(needle))));
    return list.sort((a, b) => sort === 'members'
      ? b.active_members - a.active_members || a.club_name.localeCompare(b.club_name)
      : a.club_name.localeCompare(b.club_name));
  }, [clubs, q, district, region, zone, sort]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pages);
  const shown = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);
  const reset = () => setPage(1);

  const select = 'rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-navy-800 focus:outline-none focus:ring-2 focus:ring-brand-400';

  return (
    <div>
      <div className="flex flex-col lg:flex-row gap-3 mb-6">
        <label className="relative flex-1">
          <span className="sr-only">Search clubs</span>
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden />
          <input
            type="search" value={q}
            onChange={(e) => { setQ(e.target.value); reset(); }}
            placeholder="Search clubs by name, number, city or zone…"
            className="w-full rounded-lg border border-gray-300 bg-white pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
          />
        </label>
        <div className="flex flex-wrap gap-2">
          <select aria-label="District" className={select} value={district}
            onChange={(e) => { setDistrict(e.target.value); setRegion(''); setZone(''); reset(); }}>
            <option value="">All districts</option>
            {options.districts.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
          </select>
          <select aria-label="Region" className={select} value={region}
            onChange={(e) => { setRegion(e.target.value); setZone(''); reset(); }}>
            <option value="">All regions</option>
            {options.regions.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
          </select>
          <select aria-label="Zone" className={select} value={zone}
            onChange={(e) => { setZone(e.target.value); reset(); }}>
            <option value="">All zones</option>
            {options.zones.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
          </select>
          <select aria-label="Sort" className={select} value={sort} onChange={(e) => setSort(e.target.value as 'name' | 'members')}>
            <option value="name">Sort: Name</option>
            <option value="members">Sort: Members</option>
          </select>
          <div className="inline-flex rounded-lg border border-gray-300 bg-white p-0.5" role="group" aria-label="View">
            <button type="button" onClick={() => setView('grid')} aria-pressed={view === 'grid'}
              className={`p-1.5 rounded-md ${view === 'grid' ? 'bg-navy-800 text-white' : 'text-gray-500'}`}>
              <LayoutGrid size={16} /><span className="sr-only">Grid view</span>
            </button>
            <button type="button" onClick={() => setView('table')} aria-pressed={view === 'table'}
              className={`p-1.5 rounded-md ${view === 'table' ? 'bg-navy-800 text-white' : 'text-gray-500'}`}>
              <List size={16} /><span className="sr-only">Table view</span>
            </button>
          </div>
        </div>
      </div>

      <p className="text-sm text-gray-500 mb-4" aria-live="polite">
        {filtered.length} club{filtered.length === 1 ? '' : 's'}
        {filtered.length !== clubs.length && ` of ${clubs.length}`}
      </p>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-500">
          {clubs.length === 0 ? 'Club listings will appear here once they’re added to the CRM.' : 'No clubs match these filters.'}
        </div>
      ) : view === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {shown.map((c) => (
            <Link key={c.club_id} href={`/directory/club/${c.club_id}`}
              className="group rounded-2xl border border-gray-200 bg-white shadow-sm p-5 flex items-start gap-3 hover:border-brand-400 hover:shadow-md transition">
              <span className="w-11 h-11 rounded-xl bg-blue-50 text-navy-700 flex items-center justify-center flex-shrink-0">
                <Building2 size={18} aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <div className="font-bold text-navy-800 leading-tight group-hover:text-brand-700">{c.club_name}</div>
                <div className="text-xs text-gray-500 mt-0.5">
                  {[c.club_number && `#${c.club_number}`, c.city].filter(Boolean).join(' · ') || '—'}
                </div>
                <div className="text-xs text-gray-600 mt-2 flex items-start gap-1">
                  <MapPin size={12} className="mt-0.5 flex-shrink-0 text-brand-500" aria-hidden />
                  <span>{placement(c)}</span>
                </div>
                <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-navy-800">
                  <Users size={12} aria-hidden /> {c.active_members} active member{c.active_members === 1 ? '' : 's'}
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase tracking-wider text-gray-500">
              <tr>
                <th className="px-4 py-3">Club</th><th className="px-4 py-3">No.</th>
                <th className="px-4 py-3">Zone</th><th className="px-4 py-3">Region</th>
                <th className="px-4 py-3">District</th><th className="px-4 py-3 text-right">Active members</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {shown.map((c) => (
                <tr key={c.club_id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-semibold">
                    <Link href={`/directory/club/${c.club_id}`} className="text-navy-800 hover:text-brand-700">{c.club_name}</Link>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{c.club_number ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{c.zone_name ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{c.region_name ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{c.district_code ?? '—'}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{c.active_members}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pages > 1 && <Pager page={current} pages={pages} onPage={setPage} />}
    </div>
  );
}

function placement(c: ClubCard) {
  const parts = [c.zone_name, c.region_name, c.district_code ? `District ${c.district_code}` : null].filter(Boolean);
  return parts.length ? parts.join(' · ') : 'Zone not assigned';
}

export function Pager({ page, pages, onPage }: { page: number; pages: number; onPage: (p: number) => void }) {
  return (
    <nav className="mt-6 flex items-center justify-center gap-3 text-sm" aria-label="Pagination">
      <button type="button" disabled={page <= 1} onClick={() => onPage(page - 1)}
        className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 disabled:opacity-40">
        <ChevronLeft size={14} aria-hidden /> Previous
      </button>
      <span className="text-gray-600">Page {page} of {pages}</span>
      <button type="button" disabled={page >= pages} onClick={() => onPage(page + 1)}
        className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 disabled:opacity-40">
        Next <ChevronRight size={14} aria-hidden />
      </button>
    </nav>
  );
}
