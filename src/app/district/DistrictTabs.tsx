'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

type Tab = { href: string; label: string; emoji?: string };
type Group = { group: string; emoji?: string; children: Tab[] };
type Entry = Tab | Group;

function isGroup(e: Entry): e is Group {
  return (e as Group).group !== undefined;
}

// The federation hierarchy (Regions / Zones / Clubs) is collapsed under one
// "District" dropdown; the rest stay as flat tabs.
const TABS: Entry[] = [
  { href: '/district', label: 'Overview' },
  {
    group: 'District',
    emoji: '🦁',
    children: [
      { href: '/district/regions', label: 'Regions', emoji: '🗺️' },
      { href: '/district/zones',   label: 'Zones',   emoji: '📍' },
      { href: '/district/clubs',   label: 'Clubs',   emoji: '🏛️' },
    ],
  },
  { href: '/district/map',       label: 'Map',       emoji: '📍' },
  { href: '/district/calendar',  label: 'Calendar',  emoji: '📅' },
  { href: '/district/circulars', label: 'Circulars', emoji: '📢' },
  { href: '/district/sync',      label: 'Sync',      emoji: '🔄' },
  { href: '/district/reports',   label: 'Reports' },
];

const tabCls = (active: boolean) =>
  `inline-flex items-center gap-1.5 py-3 px-2 border-b-2 text-sm font-medium transition-colors ${
    active ? 'border-amber-600 text-amber-700' : 'border-transparent text-gray-600 hover:text-navy-800 hover:border-gray-300'
  }`;

export function DistrictTabs() {
  const pathname = usePathname();
  return (
    <div className="border-b">
      <nav className="-mb-px flex flex-wrap items-center gap-1 md:gap-6">
        {TABS.map((t) =>
          isGroup(t)
            ? <DistrictGroup key={t.group} group={t} pathname={pathname} />
            : (
              <Link key={t.href} href={t.href}
                className={tabCls(t.href === '/district' ? pathname === '/district' : pathname.startsWith(t.href))}>
                {t.emoji && <span className="text-base">{t.emoji}</span>}
                {t.label}
              </Link>
            ),
        )}
      </nav>
    </div>
  );
}

function DistrictGroup({ group, pathname }: { group: Group; pathname: string }) {
  const [open, setOpen] = useState(false);
  const activeChild = group.children.find((c) => pathname.startsWith(c.href));
  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open}
        className={tabCls(Boolean(activeChild))}>
        {group.emoji && <span className="text-base">{group.emoji}</span>}
        {activeChild ? activeChild.label : group.group}
        <ChevronDown size={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} aria-hidden />
          <div className="absolute left-0 top-full z-20 mt-1 min-w-[10rem] rounded-lg border bg-white shadow-lg py-1">
            {group.children.map((c) => {
              const active = pathname.startsWith(c.href);
              return (
                <Link key={c.href} href={c.href} onClick={() => setOpen(false)}
                  className={`flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 ${active ? 'text-amber-700 font-medium' : 'text-gray-700'}`}>
                  {c.emoji && <span className="text-base">{c.emoji}</span>}
                  {c.label}
                </Link>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
