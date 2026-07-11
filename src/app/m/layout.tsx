import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Bell, Settings } from 'lucide-react';
import { getCurrentMember } from '@/lib/auth';
import { env } from '@/lib/env';
import { MobileTabBar } from './MobileTabBar';
import { MobileServiceWorker } from './MobileServiceWorker';

const DISTRICT_CODE = '3232F1';

export const metadata = {
  title: 'Lions District 3232F1 · Service First',
  viewport: 'width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no',
  themeColor: '#1e40af',
};

export default async function MobileLayout({ children }: { children: React.ReactNode }) {
  const member = await getCurrentMember();
  if (!member) redirect('/login?redirectTo=/m');

  return (
    <div className="min-h-screen bg-[#eef1f5] flex flex-col" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <header
        className="sticky top-0 z-30 bg-[#1e40af] text-white shadow-md"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <div className="px-4 py-3 flex items-center justify-between gap-3">
          <Link href="/m" className="flex items-center gap-3 min-w-0">
            <span className="h-11 w-11 rounded-full bg-white flex items-center justify-center ring-1 ring-white/40 flex-none overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={env.NEXT_PUBLIC_BRAND_LOGO_URL || '/logo.png'}
                alt="Lions District 3232F1"
                className="h-9 w-9 object-contain"
              />
            </span>
            <span className="leading-tight min-w-0">
              <span className="block text-lg font-extrabold truncate">District {DISTRICT_CODE}</span>
              <span className="block text-xs text-blue-100/90 -mt-0.5">Service First</span>
            </span>
          </Link>
          <div className="flex items-center gap-1.5 flex-none">
            <Link href="/m/events" aria-label="Updates" className="w-9 h-9 rounded-full hover:bg-white/10 flex items-center justify-center">
              <Bell size={20} />
            </Link>
            <Link href="/m/profile" aria-label="Settings" className="w-9 h-9 rounded-full hover:bg-white/10 flex items-center justify-center">
              <Settings size={20} />
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 pb-24 px-4 pt-4 max-w-screen-sm w-full mx-auto space-y-4">
        {children}
      </main>

      <MobileTabBar />
      <MobileServiceWorker />
    </div>
  );
}
