'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, BookUser, Sparkles, Gift, Network } from 'lucide-react';

const TABS = [
  { href: '/m',           label: 'Home',       icon: Home,     match: (p: string) => p === '/m' },
  { href: '/m/directory', label: 'Directory',  icon: BookUser, match: (p: string) => p.startsWith('/m/directory') },
  { fab: true },
  { href: '/m/greetings', label: 'Greetings',  icon: Gift,     match: (p: string) => p.startsWith('/m/greetings') },
  { href: '/m/networking', label: 'Network',   icon: Network,  match: (p: string) => p.startsWith('/m/networking') },
] as const;

export function MobileTabBar() {
  const pathname = usePathname();
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t shadow-[0_-4px_16px_rgba(11,45,107,0.08)]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="max-w-screen-sm mx-auto grid grid-cols-5 relative">
        {TABS.map((t, i) => {
          if ('fab' in t) {
            return <RisingStarFab key="fab" />;
          }
          const active = t.match(pathname);
          const Icon = t.icon;
          return (
            <Link
              key={t.href}
              href={t.href}
              className={`relative flex flex-col items-center justify-center py-3 text-[10px] font-semibold ${
                active ? 'text-amber-500' : 'text-gray-500'
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

function RisingStarFab() {
  return (
    <Link href="/m/rising-star" className="relative flex items-start justify-center">
      <span className="absolute -top-7 w-14 h-14 rounded-full bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 text-white flex items-center justify-center shadow-[0_8px_24px_rgba(244,180,0,0.55)] ring-4 ring-white">
        <span className="absolute inset-0 rounded-full bg-amber-400 opacity-60 animate-ping" />
        <Sparkles size={22} className="relative" />
      </span>
      <span className="mt-9 text-[10px] font-bold uppercase tracking-wider text-amber-600">Rising Star</span>
    </Link>
  );
}
