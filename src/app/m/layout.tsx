import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Bell } from 'lucide-react';
import { getCurrentMember } from '@/lib/auth';
import { MobileTabBar } from './MobileTabBar';
import { MobileServiceWorker } from './MobileServiceWorker';

export const metadata = {
  title: 'Lions Mobile · Baroda Rising Star',
  viewport: 'width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no',
  themeColor: '#0B1F4D',
};

export default async function MobileLayout({ children }: { children: React.ReactNode }) {
  const member = await getCurrentMember();
  if (!member) redirect('/login?redirectTo=/m');

  const initial = member.name.charAt(0).toUpperCase();
  const isSandbox = process.env.NEXT_PUBLIC_ENV !== 'production';

  return (
    <div
      className="min-h-screen bg-gradient-to-b from-slate-100 to-gray-50 flex flex-col"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <header className="sticky top-0 z-30 border-b border-white/10 bg-navy-900/95 text-white backdrop-blur supports-[backdrop-filter]:bg-navy-900/85">
        <div className="px-4 py-2.5 flex items-center justify-between">
          <Link href="/m" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/15 ring-1 ring-amber-400/30 text-lg">
              🦁
            </span>
            <div className="leading-tight">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-semibold tracking-tight">LCBRS</span>
                {isSandbox && (
                  <span className="rounded bg-amber-500/20 px-1 py-px text-[8px] font-bold uppercase tracking-wider text-amber-300 ring-1 ring-amber-400/30">
                    Sandbox
                  </span>
                )}
              </div>
              <div className="text-[10px] text-amber-200/70 -mt-px font-medium">
                District 3232 FI
              </div>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            <Link
              href="/m/profile"
              className="relative flex h-9 w-9 items-center justify-center rounded-full text-white/80 ring-1 ring-white/10 hover:bg-white/10 transition"
              aria-label="Notifications"
            >
              <Bell size={16} />
              <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-amber-400" />
            </Link>
            <Link
              href="/m/profile"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-amber-600 text-navy-900 text-sm font-bold shadow-sm ring-1 ring-amber-300/30"
              aria-label={member.name}
            >
              {initial}
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 pb-24 px-4 pt-4 max-w-screen-sm w-full mx-auto">
        {children}
      </main>

      <MobileTabBar />
      <MobileServiceWorker />
    </div>
  );
}
