'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, LayoutGrid, Users, Briefcase, User } from 'lucide-react';

const TABS = [
  { href: '/m',            label: 'Home',        icon: Home,       match: (p: string) => p === '/m' },
  { href: '/m/district',   label: 'My District', icon: LayoutGrid, match: (p: string) => p.startsWith('/m/district') },
  { href: '/m/club',       label: 'My Club',     icon: Users,      match: (p: string) => p.startsWith('/m/club') },
  { href: '/m/networking', label: 'LBN',         icon: Briefcase,  match: (p: string) => p.startsWith('/m/networking') },
  { href: '/m/profile',    label: 'My Account',  icon: User,       match: (p: string) => p.startsWith('/m/profile') },
] as const;

export function MobileTabBar() {
  const pathname = usePathname();
  return (
    <nav
      className="fixed bottom-0 left-1/2 z-30 w-full max-w-md -translate-x-1/2 bg-white border-t border-gray-200 shadow-[0_-4px_16px_rgba(30,64,175,0.08)]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="grid grid-cols-5">
        {TABS.map((t) => {
          const active = t.match(pathname);
          const Icon = t.icon;
          return (
            <Link
              key={t.href}
              href={t.href}
              className={`relative flex flex-col items-center justify-center py-2.5 text-[11px] font-semibold ${
                active ? 'text-[#1e40af]' : 'text-gray-400'
              }`}
            >
              <Icon size={22} strokeWidth={active ? 2.4 : 1.8} />
              <span className="mt-0.5">{t.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
