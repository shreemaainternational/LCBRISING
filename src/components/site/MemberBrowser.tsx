'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { LayoutGrid, List, Search, Mail, Phone } from 'lucide-react';
import { Pager } from '@/components/site/ClubDirectory';

export type BrowserMember = {
  id: string;
  name: string;
  avatar_url: string | null;
  designation: string | null;
  status: string;
  joined_at: string | null;
  club_id: string | null;
  club_name: string | null;
  zone_name: string | null;
  region_name: string | null;
  district_code: string | null;
  lions_member_id: string | null;
  email: string | null;
  phone: string | null;
};

const PAGE_SIZE = 24;

export function designationLabel(role: string | null) {
  if (!role || role === 'member') return 'Member';
  return role.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Member list with search, filters, grid/table views and pagination.
 * Filtering is client-side over the list the server already scoped and
 * stripped of fields the viewer may not see. The Lionistic Year picker
 * reloads from the server (?year=) because past years come from history.
 */
export function MemberBrowser({
  members, showClub, years, year, currentYear, historyAvailable,
}: {
  members: BrowserMember[];
  showClub: boolean;
  years: string[];
  year: string;
  currentYear: string;
  historyAvailable: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get('q') ?? '');
  const [club, setClub] = useState('');
  const [zone, setZone] = useState('');
  const [region, setRegion] = useState('');
  const [district, setDistrict] = useState('');
  const [designation, setDesignation] = useState('');
  const [status, setStatus] = useState('');
  const [view, setView] = useState<'grid' | 'table'>('grid');
  const [page, setPage] = useState(1);

  const opts = useMemo(() => {
    const uniq = (vals: (string | null)[]) => [...new Set(vals.filter((v): v is string => !!v))].sort();
    return {
      clubs: uniq(members.map((m) => m.club_name)),
      zones: uniq(members.map((m) => m.zone_name)),
      regions: uniq(members.map((m) => m.region_name)),
      districts: uniq(members.map((m) => m.district_code)),
      designations: uniq(members.map((m) => m.designation ?? 'member')),
      statuses: uniq(members.map((m) => m.status)),
    };
  }, [members]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return members.filter((m) =>
      (!club || m.club_name === club) && (!zone || m.zone_name === zone) &&
      (!region || m.region_name === region) && (!district || m.district_code === district) &&
      (!designation || (m.designation ?? 'member') === designation) && (!status || m.status === status) &&
      (!needle || [m.name, m.club_name, m.lions_member_id, designationLabel(m.designation)]
        .some((v) => v?.toLowerCase().includes(needle))));
  }, [members, q, club, zone, region, district, designation, status]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pages);
  const shown = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);
  const on = <T,>(set: (v: T) => void) => (v: T) => { set(v); setPage(1); };

  function chooseYear(next: string) {
    const sp = new URLSearchParams(params.toString());
    if (next === currentYear) sp.delete('year'); else sp.set('year', next);
    router.push(`${pathname}${sp.size ? `?${sp}` : ''}`);
  }

  const select = 'rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-navy-800 focus:outline-none focus:ring-2 focus:ring-brand-400';
  const isPast = year !== currentYear;

  return (
    <div>
      <div className="flex flex-col gap-3 mb-6">
        <label className="relative">
          <span className="sr-only">Search members</span>
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden />
          <input type="search" value={q} onChange={(e) => on(setQ)(e.target.value)}
            placeholder="Search by name, club or designation…"
            className="w-full rounded-lg border border-gray-300 bg-white pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
        </label>
        <div className="flex flex-wrap gap-2">
          <select aria-label="Lionistic Year" className={select} value={year} onChange={(e) => chooseYear(e.target.value)}
            disabled={!historyAvailable && years.length <= 1}>
            {years.map((y) => <option key={y} value={y}>Lionistic Year {y}{y === currentYear ? ' (current)' : ''}</option>)}
          </select>
          {showClub && (
            <>
              <Filter label="District" value={district} onChange={on(setDistrict)} options={opts.districts} format={(v) => `District ${v}`} className={select} />
              <Filter label="Region" value={region} onChange={on(setRegion)} options={opts.regions} className={select} />
              <Filter label="Zone" value={zone} onChange={on(setZone)} options={opts.zones} className={select} />
              <Filter label="Club" value={club} onChange={on(setClub)} options={opts.clubs} className={select} />
            </>
          )}
          <Filter label="Designation" value={designation} onChange={on(setDesignation)} options={opts.designations} format={designationLabel} className={select} />
          <Filter label="Status" value={status} onChange={on(setStatus)} options={opts.statuses} format={(v) => v[0].toUpperCase() + v.slice(1)} className={select} />
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
        {!historyAvailable && (
          <p className="text-xs text-gray-500">Past-year views appear once assignment history is enabled.</p>
        )}
        {isPast && (
          <p className="text-xs text-amber-700">
            Showing club membership during Lionistic Year {year}, from recorded history. Zone, region and district are today’s.
          </p>
        )}
      </div>

      <p className="text-sm text-gray-500 mb-4" aria-live="polite">
        {filtered.length} member{filtered.length === 1 ? '' : 's'}{filtered.length !== members.length && ` of ${members.length}`}
      </p>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-500">
          {members.length === 0 ? 'No members are recorded here yet.' : 'No members match these filters.'}
        </div>
      ) : view === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {shown.map((m) => (
            <Link key={m.id} href={`/directory/member/${m.id}`}
              className="rounded-2xl border border-gray-200 bg-white shadow-sm p-4 flex items-center gap-3 hover:border-brand-400 hover:shadow-md transition">
              <Avatar m={m} />
              <div className="min-w-0">
                <div className="font-bold text-navy-800 leading-tight truncate">{m.name}</div>
                <div className="text-xs font-semibold uppercase tracking-wider text-brand-600 mt-0.5">{designationLabel(m.designation)}</div>
                {showClub && <div className="text-xs text-gray-500 mt-0.5 truncate">{m.club_name ?? 'No club'}</div>}
                {(m.email || m.phone) && (
                  <div className="flex gap-3 mt-1 text-xs text-gray-600">
                    {m.phone && <span className="inline-flex items-center gap-1"><Phone size={11} aria-hidden />{m.phone}</span>}
                    {m.email && <span className="inline-flex items-center gap-1 truncate"><Mail size={11} aria-hidden />{m.email}</span>}
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase tracking-wider text-gray-500">
              <tr>
                <th className="px-4 py-3">Name</th><th className="px-4 py-3">Designation</th>
                {showClub && <><th className="px-4 py-3">Club</th><th className="px-4 py-3">Zone</th><th className="px-4 py-3">Region</th></>}
                <th className="px-4 py-3">Status</th>
                {members.some((m) => m.lions_member_id || m.email || m.phone) && <th className="px-4 py-3">Contact</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {shown.map((m) => (
                <tr key={m.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-semibold">
                    <Link href={`/directory/member/${m.id}`} className="text-navy-800 hover:text-brand-700">{m.name}</Link>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{designationLabel(m.designation)}</td>
                  {showClub && (
                    <>
                      <td className="px-4 py-3 text-gray-600">{m.club_name ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-600">{m.zone_name ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-600">{m.region_name ?? '—'}</td>
                    </>
                  )}
                  <td className="px-4 py-3 text-gray-600 capitalize">{m.status}</td>
                  {members.some((x) => x.lions_member_id || x.email || x.phone) && (
                    <td className="px-4 py-3 text-gray-600 text-xs">
                      {[m.lions_member_id && `#${m.lions_member_id}`, m.phone, m.email].filter(Boolean).join(' · ') || '—'}
                    </td>
                  )}
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

function Filter({ label, value, onChange, options, format, className }: {
  label: string; value: string; onChange: (v: string) => void; options: string[];
  format?: (v: string) => string; className: string;
}) {
  if (options.length <= 1 && !value) return null;
  return (
    <select aria-label={label} className={className} value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">All {label.toLowerCase()}{label.endsWith("s") ? "es" : "s"}</option>
      {options.map((o) => <option key={o} value={o}>{format ? format(o) : o}</option>)}
    </select>
  );
}

export function Avatar({ m, size = 48 }: { m: { name: string; avatar_url: string | null }; size?: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={m.avatar_url ?? `https://ui-avatars.com/api/?name=${encodeURIComponent(m.name)}&background=172554&color=fbbf24&size=96&bold=true`}
      alt=""
      width={size} height={size}
      className="rounded-full object-cover ring-2 ring-brand-300 flex-shrink-0"
      style={{ width: size, height: size }}
    />
  );
}
