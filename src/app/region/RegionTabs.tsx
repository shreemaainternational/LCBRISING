'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  { href: '/region',           label: 'Overview',      emoji: '' },
  { href: '/region/zones',     label: 'Zones',         emoji: '🦁' },
  { href: '/region/portal',    label: 'Lions Portal',  emoji: '🌐' },
  { href: '/region/calendar',  label: 'Region Calendar', emoji: '📅' },
  { href: '/region/reports',   label: 'Reports',       emoji: '' },
];

export function RegionTabs() {
  const pathname = usePathname();
  return (
    <div className="border-b">
      <nav className="-mb-px flex flex-wrap gap-1 md:gap-6">
        {TABS.map((t) => {
          const active = t.href === '/region' ? pathname === '/region' : pathname.startsWith(t.href);
          return (
            <Link
              key={t.href}
              href={t.href}
              className={`inline-flex items-center gap-1.5 py-3 px-2 border-b-2 text-sm font-medium transition-colors ${
                active
                  ? 'border-purple-600 text-purple-700'
                  : 'border-transparent text-gray-600 hover:text-navy-800 hover:border-gray-300'
              }`}
            >
              {t.emoji && <span className="text-base">{t.emoji}</span>}
              {t.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
