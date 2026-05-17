'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  { href: '/multi-district',           label: 'Overview',  emoji: '' },
  { href: '/multi-district/districts', label: 'Districts', emoji: '🏛️' },
  { href: '/multi-district/calendar',  label: 'Calendar',  emoji: '📅' },
  { href: '/multi-district/reports',   label: 'Reports',   emoji: '' },
];

export function MdTabs() {
  const pathname = usePathname();
  return (
    <div className="border-b">
      <nav className="-mb-px flex flex-wrap gap-1 md:gap-6">
        {TABS.map((t) => {
          const active = t.href === '/multi-district' ? pathname === '/multi-district' : pathname.startsWith(t.href);
          return (
            <Link key={t.href} href={t.href}
              className={`inline-flex items-center gap-1.5 py-3 px-2 border-b-2 text-sm font-medium transition-colors ${
                active ? 'border-rose-600 text-rose-700' : 'border-transparent text-gray-600 hover:text-navy-800 hover:border-gray-300'
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
