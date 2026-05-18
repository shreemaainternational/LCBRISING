'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Activity, Users, BarChart3, QrCode } from 'lucide-react';

const TABS = [
  { href: '/m',              label: 'Home',     icon: Home,      match: (p: string) => p === '/m' },
  { href: '/m/activities',   label: 'Activity', icon: Activity,  match: (p: string) => p.startsWith('/m/activities') },
  { href: '/m/checkin',      label: 'Check-in', icon: QrCode,    match: (p: string) => p.startsWith('/m/checkin') },
  { href: '/m/beneficiaries',label: 'Benef.',   icon: Users,     match: (p: string) => p.startsWith('/m/beneficiaries') },
  { href: '/m/reports',      label: 'Reports',  icon: BarChart3, match: (p: string) => p.startsWith('/m/reports') },
];

export function MobileTabBar() {
  const pathname = usePathname();
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t shadow-lg"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="max-w-screen-sm mx-auto grid grid-cols-5">
        {TABS.map((t) => {
          const active = t.match(pathname);
          const Icon = t.icon;
          return (
            <Link
              key={t.href}
              href={t.href}
              className={`flex flex-col items-center justify-center py-2.5 text-[10px] font-medium ${
                active ? 'text-amber-600' : 'text-gray-500'
              }`}
            >
              <Icon size={20} strokeWidth={active ? 2.5 : 1.8} />
              <span className="mt-0.5">{t.label}</span>
              {active && <div className="absolute top-0 h-0.5 w-8 rounded-b-full bg-amber-500" />}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
