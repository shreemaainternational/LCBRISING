'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Search, ChevronDown, Plus, LayoutGrid } from 'lucide-react';
import {
  type MasterItem,
  type MasterItemType,
  REAL_STATUSES,
  STATUS_LABEL,
  LIONISTIC_YEAR_MONTHS,
  monthKeyOf,
} from '@/lib/master-calendar-shared';
import { MasterActivityCard } from '@/components/site/MasterActivityCard';

const SUMMARY_CARDS: { type: MasterItemType | 'ALL'; label: string }[] = [
  { type: 'ALL', label: 'Total Programmes' },
  { type: 'SERVICE_ACTIVITY', label: 'Service Activities' },
  { type: 'CELEBRATION', label: 'Celebration Days' },
  { type: 'INTERNATIONAL_DAY', label: 'International Days' },
  { type: 'MEETING', label: 'Meetings' },
  { type: 'LEADERSHIP_PROGRAMME', label: 'Leadership' },
  { type: 'EVENT', label: 'Events' },
  { type: 'INTERNATIONAL_COMMITTEE', label: 'International Committee' },
];

const VIEW_TABS: { type: MasterItemType | 'ALL'; label: string }[] = [
  { type: 'ALL', label: 'All' },
  { type: 'SERVICE_ACTIVITY', label: 'Service' },
  { type: 'CELEBRATION', label: 'Celebration' },
  { type: 'INTERNATIONAL_DAY', label: 'International Day' },
  { type: 'MEETING', label: 'Meeting' },
  { type: 'LEADERSHIP_PROGRAMME', label: 'Leadership' },
  { type: 'EVENT', label: 'Event' },
  { type: 'INTERNATIONAL_COMMITTEE', label: 'International Committee' },
];

const DATE_QUICK_FILTERS = ['Full Year', 'Today', 'This Week', 'This Month', 'Next Month', 'Custom Range'] as const;
type DateQuickFilter = (typeof DATE_QUICK_FILTERS)[number];

function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function matchesDateFilter(dateStr: string, filter: DateQuickFilter, custom: { from: string; to: string }): boolean {
  if (filter === 'Full Year') return true;
  const now = new Date();
  const today = toISODate(now);
  if (filter === 'Today') return dateStr === today;
  if (filter === 'This Week') {
    const start = new Date(now);
    start.setDate(now.getDate() - now.getDay());
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return dateStr >= toISODate(start) && dateStr <= toISODate(end);
  }
  if (filter === 'This Month') {
    return dateStr.slice(0, 7) === today.slice(0, 7);
  }
  if (filter === 'Next Month') {
    const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return dateStr.slice(0, 7) === toISODate(next).slice(0, 7);
  }
  if (filter === 'Custom Range') {
    if (!custom.from && !custom.to) return true;
    if (custom.from && dateStr < custom.from) return false;
    if (custom.to && dateStr > custom.to) return false;
    return true;
  }
  return true;
}

const ADD_LINKS: { type: Exclude<MasterItemType, 'EVENT'> | 'EVENT'; label: string; href: string }[] = [
  { type: 'SERVICE_ACTIVITY', label: 'Service Activity', href: '/admin/activities' },
  { type: 'MEETING', label: 'Meeting', href: '/admin/events?group=meeting' },
  { type: 'LEADERSHIP_PROGRAMME', label: 'Leadership Programme', href: '/admin/events?group=leadership' },
  { type: 'EVENT', label: 'Event', href: '/admin/events' },
  { type: 'CELEBRATION', label: 'Celebration', href: '/admin/events?group=celebration' },
  { type: 'INTERNATIONAL_DAY', label: 'International Day', href: '/admin/events?group=international_day' },
  { type: 'INTERNATIONAL_COMMITTEE', label: 'International Committee', href: '/admin/events?group=international_committee' },
];

export function MasterActivitiesBoard({ items, isAdmin }: { items: MasterItem[]; isAdmin: boolean }) {
  const [mode, setMode] = useState<'MASTER' | 'ACTIVITY_ONLY'>('MASTER');
  const [view, setView] = useState<MasterItemType | 'ALL'>('ALL');
  const [month, setMonth] = useState<string>('ALL');
  const [status, setStatus] = useState<string>('ALL');
  const [dateFilter, setDateFilter] = useState<DateQuickFilter>('Full Year');
  const [customRange, setCustomRange] = useState({ from: '', to: '' });
  const [search, setSearch] = useState('');
  const [addOpen, setAddOpen] = useState(false);

  const counts = useMemo(() => {
    const c: Record<string, number> = { ALL: items.length };
    for (const item of items) c[item.type] = (c[item.type] ?? 0) + 1;
    return c;
  }, [items]);

  const effectiveView = mode === 'ACTIVITY_ONLY' ? 'SERVICE_ACTIVITY' : view;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((item) => {
      if (effectiveView !== 'ALL' && item.type !== effectiveView) return false;
      if (month !== 'ALL' && monthKeyOf(item.date) !== month) return false;
      if (status !== 'ALL' && item.status !== status) return false;
      if (!matchesDateFilter(item.date, dateFilter, customRange)) return false;
      if (q) {
        const haystack = `${item.title} ${item.venue ?? ''} ${item.description ?? ''}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [items, effectiveView, month, status, dateFilter, customRange, search]);

  const groups = useMemo(() => {
    const byMonth = new Map<string, MasterItem[]>();
    for (const item of filtered) {
      const key = monthKeyOf(item.date);
      if (!byMonth.has(key)) byMonth.set(key, []);
      byMonth.get(key)!.push(item);
    }
    return Array.from(byMonth.entries())
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([key, monthItems]) => ({
        key,
        label: LIONISTIC_YEAR_MONTHS.find((m) => m.value === key)?.label
          ?? new Date(`${key}-01T00:00:00Z`).toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' }).toUpperCase(),
        items: monthItems.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0)),
      }));
  }, [filtered]);

  const selectClass = 'rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-navy-800';

  return (
    <div>
      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-8">
        {SUMMARY_CARDS.map((c) => (
          <button
            key={c.type}
            type="button"
            onClick={() => { setMode('MASTER'); setView(c.type); }}
            className={`text-left bg-white border rounded-2xl p-4 hover:shadow-md transition-shadow ${
              effectiveView === c.type && mode === 'MASTER' ? 'border-brand-500 ring-1 ring-brand-400' : 'border-gray-200'
            }`}
          >
            <div className="text-2xl font-bold text-navy-800">{counts[c.type] ?? 0}</div>
            <div className="text-xs text-gray-500 mt-1">{c.label}</div>
          </button>
        ))}
      </div>

      {/* Master view / Activity only toggle + Add button */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div className="inline-flex rounded-lg border border-gray-300 overflow-hidden">
          {(['MASTER', 'ACTIVITY_ONLY'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`px-4 py-2 text-xs font-semibold ${
                mode === m ? 'bg-navy-800 text-white' : 'bg-white text-navy-800 hover:bg-gray-50'
              }`}
            >
              {m === 'MASTER' ? 'Master View' : 'Activity Only'}
            </button>
          ))}
        </div>

        {isAdmin && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setAddOpen((o) => !o)}
              className="btn-navy inline-flex items-center gap-1.5 rounded-md px-4 py-2 text-sm"
            >
              <Plus size={15} aria-hidden /> Add <ChevronDown size={14} aria-hidden />
            </button>
            {addOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-white border border-gray-200 rounded-xl shadow-lg z-10 py-2">
                <div className="px-4 py-1.5 text-[10px] font-semibold tracking-wide text-gray-400">ADD NEW</div>
                {ADD_LINKS.map((l) => (
                  <Link
                    key={l.type}
                    href={l.href}
                    className="block px-4 py-2 text-sm text-navy-800 hover:bg-gray-50"
                    onClick={() => setAddOpen(false)}
                  >
                    {l.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* View tabs (hidden in Activity Only mode) */}
      {mode === 'MASTER' && (
        <div className="flex flex-wrap gap-2 mb-5">
          {VIEW_TABS.map((t) => (
            <button
              key={t.type}
              type="button"
              onClick={() => setView(t.type)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                view === t.type
                  ? 'bg-navy-800 text-white border-navy-800'
                  : 'bg-white text-navy-800 border-gray-300 hover:border-navy-400'
              }`}
            >
              {t.label} ({counts[t.type] ?? (t.type === 'ALL' ? counts.ALL : 0)})
            </button>
          ))}
        </div>
      )}

      {/* Filters row */}
      <div className="flex flex-col md:flex-row md:items-center gap-3 mb-5">
        <div className="relative flex-1 min-w-0">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search activities, meetings, programmes, events…"
            className="w-full rounded-lg border border-gray-300 pl-9 pr-3 py-2 text-sm text-navy-800 placeholder:text-gray-400"
          />
        </div>
        <select value={month} onChange={(e) => setMonth(e.target.value)} className={selectClass}>
          <option value="ALL">All Months</option>
          {LIONISTIC_YEAR_MONTHS.map((m) => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className={selectClass}>
          <option value="ALL">All Statuses</option>
          {REAL_STATUSES.map((s) => (
            <option key={s} value={s}>{STATUS_LABEL[s]}</option>
          ))}
        </select>
        <select
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value as DateQuickFilter)}
          className={selectClass}
        >
          {DATE_QUICK_FILTERS.map((f) => (
            <option key={f} value={f}>{f}</option>
          ))}
        </select>
        {dateFilter === 'Custom Range' && (
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={customRange.from}
              onChange={(e) => setCustomRange((r) => ({ ...r, from: e.target.value }))}
              className={selectClass}
            />
            <span className="text-gray-400 text-xs">to</span>
            <input
              type="date"
              value={customRange.to}
              onChange={(e) => setCustomRange((r) => ({ ...r, to: e.target.value }))}
              className={selectClass}
            />
          </div>
        )}
      </div>

      {/* Master timeline */}
      {groups.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <LayoutGrid size={28} className="mx-auto mb-3 text-gray-300" aria-hidden />
          No programmes match these filters.
        </div>
      ) : (
        <div className="space-y-12">
          {groups.map((g) => (
            <section key={g.key}>
              <div className="flex items-center gap-4 mb-5">
                <div className="h-px flex-1 bg-navy-200" aria-hidden />
                <h3 className="text-sm font-bold tracking-[0.2em] text-navy-800">{g.label}</h3>
                <div className="h-px flex-1 bg-navy-200" aria-hidden />
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {g.items.map((item) => (
                  <MasterActivityCard key={item.id} item={item} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
