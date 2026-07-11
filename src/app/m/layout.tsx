import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentMember } from '@/lib/auth';
import { env } from '@/lib/env';
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

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <header className="sticky top-0 z-30 bg-navy-900 text-white shadow-sm">
        <div className="px-4 py-3 flex items-center justify-between">
          <Link href="/m" className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={env.NEXT_PUBLIC_BRAND_LOGO_URL || '/logo.png'}
              alt="Lions Club of Baroda Rising Star"
              className="h-9 w-9 rounded-full object-cover ring-2 ring-amber-300/40"
            />
            <div className="leading-tight">
              <div className="text-sm font-bold text-amber-300">Service First</div>
              <div className="text-[10px] text-blue-100/80 -mt-0.5">
                District 3232 F1 | Region V | Zone I Year 2026-2027
              </div>
            </div>
          </Link>
          <Link href="/m/profile" className="w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center text-sm font-bold">
            {member.name.charAt(0).toUpperCase()}
          </Link>
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
