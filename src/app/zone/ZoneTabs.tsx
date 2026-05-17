'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  { href: '/zone',             label: 'Overview',      emoji: '' },
  { href: '/zone/clubs',       label: 'Clubs',         emoji: '' },
  { href: '/zone/portal',      label: 'Lions Portal',  emoji: '🌐' },
  { href: '/zone/calendar',    label: 'Zone Calendar', emoji: '🦁' },
  { href: '/zone/lions-year',  label: 'Lions Year',    emoji: '📅' },
  { href: '/zone/minutes',     label: 'Minutes',       emoji: '📝' },
  { href: '/zone/action-items', label: 'Action Items', emoji: '✅' },
  { href: '/zone/approvals',   label: 'Approvals',     emoji: '✔️' },
  { href: '/zone/attendance',  label: 'Attendance',    emoji: '' },
  { href: '/zone/advisories',  label: 'Advisories',    emoji: '' },
  { href: '/zone/automations', label: 'Automations',   emoji: '⚡' },
  { href: '/zone/reports',     label: 'Reports',       emoji: '' },
];

export function ZoneTabs() {
  const pathname = usePathname();
  return (
    <div className="border-b">
      <nav className="-mb-px flex flex-wrap gap-1 md:gap-6">
        {TABS.map((t) => {
          const active = t.href === '/zone' ? pathname === '/zone' : pathname.startsWith(t.href);
          return (
            <Link
              key={t.href}
              href={t.href}
              className={`inline-flex items-center gap-1.5 py-3 px-2 border-b-2 text-sm font-medium transition-colors ${
                active
                  ? 'border-blue-600 text-blue-700'
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
