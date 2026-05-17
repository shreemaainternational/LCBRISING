'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  { href: '/district',           label: 'Overview',  emoji: '' },
  { href: '/district/regions',   label: 'Regions',   emoji: '🗺️' },
  { href: '/district/zones',     label: 'Zones',     emoji: '🦁' },
  { href: '/district/clubs',     label: 'Clubs',     emoji: '' },
  { href: '/district/calendar',  label: 'Calendar',  emoji: '📅' },
  { href: '/district/circulars', label: 'Circulars', emoji: '📢' },
  { href: '/district/sync',      label: 'Sync',      emoji: '🔄' },
  { href: '/district/reports',   label: 'Reports',   emoji: '' },
];

export function DistrictTabs() {
  const pathname = usePathname();
  return (
    <div className="border-b">
      <nav className="-mb-px flex flex-wrap gap-1 md:gap-6">
        {TABS.map((t) => {
          const active = t.href === '/district' ? pathname === '/district' : pathname.startsWith(t.href);
          return (
            <Link key={t.href} href={t.href}
              className={`inline-flex items-center gap-1.5 py-3 px-2 border-b-2 text-sm font-medium transition-colors ${
                active ? 'border-amber-600 text-amber-700' : 'border-transparent text-gray-600 hover:text-navy-800 hover:border-gray-300'
              }`}>
              {t.emoji && <span className="text-base">{t.emoji}</span>}
              {t.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
