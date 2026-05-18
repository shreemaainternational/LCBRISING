import { requireDistrictGovernor } from '@/lib/district-portal';
import { MobileSyncBanner } from '@/app/zone/MobileSyncBanner';
import { DistrictHeader } from './DistrictHeader';

export const dynamic = 'force-dynamic';

export default async function DistrictLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireDistrictGovernor();
  return (
    <div className="min-h-screen bg-gray-50">
      <DistrictHeader member={ctx.member} />
      <MobileSyncBanner />
      <main className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-6 space-y-6">
        {children}
      </main>
    </div>
  );
}
