'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Activity, Users, BarChart3, QrCode } from 'lucide-react';

const TABS = [
  { href: '/m',               label: 'Home',     icon: Home,      match: (p: string) => p === '/m' },
  { href: '/m/activities',    label: 'Activity', icon: Activity,  match: (p: string) => p.startsWith('/m/activities') },
  { href: '/m/checkin',       label: 'Scan',     icon: QrCode,    match: (p: string) => p.startsWith('/m/checkin') },
  { href: '/m/beneficiaries', label: 'People',   icon: Users,     match: (p: string) => p.startsWith('/m/beneficiaries') },
  { href: '/m/reports',       label: 'Reports',  icon: BarChart3, match: (p: string) => p.startsWith('/m/reports') },
];

export function MobileTabBar() {
  const pathname = usePathname();
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-30 border-t border-gray-200/80 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="max-w-screen-sm mx-auto grid grid-cols-5 px-2 py-1.5">
        {TABS.map((t) => {
          const active = t.match(pathname);
          const Icon = t.icon;
          return (
            <Link
              key={t.href}
              href={t.href}
              className="relative flex flex-col items-center justify-center py-1.5"
            >
              <span className={`flex h-9 w-12 items-center justify-center rounded-xl transition ${
                active ? 'bg-amber-500/10 text-amber-700 ring-1 ring-amber-500/30' : 'text-gray-500'
              }`}>
                <Icon size={18} strokeWidth={active ? 2.4 : 1.8} />
              </span>
              <span className={`mt-0.5 text-[10px] font-semibold tracking-wide ${
                active ? 'text-amber-700' : 'text-gray-500'
              }`}>
                {t.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
