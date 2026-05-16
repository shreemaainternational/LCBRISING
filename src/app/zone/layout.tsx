import { requireZoneChair } from '@/lib/zone-portal';
import { MobileSyncBanner } from './MobileSyncBanner';
import { ZoneHeader } from './ZoneHeader';

export const dynamic = 'force-dynamic';

export default async function ZoneLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireZoneChair();
  return (
    <div className="min-h-screen bg-gray-50">
      <ZoneHeader member={ctx.member} />
      <MobileSyncBanner />
      <main className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-6 space-y-6">
        {children}
      </main>
    </div>
  );
}
