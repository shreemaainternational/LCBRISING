import { requireRegionChair } from '@/lib/region-portal';
import { MobileSyncBanner } from '@/app/zone/MobileSyncBanner';
import { RegionHeader } from './RegionHeader';

export const dynamic = 'force-dynamic';

export default async function RegionLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireRegionChair();
  return (
    <div className="min-h-screen bg-gray-50">
      <RegionHeader member={ctx.member} />
      <MobileSyncBanner />
      <main className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-6 space-y-6">
        {children}
      </main>
    </div>
  );
}
