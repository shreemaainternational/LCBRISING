import { requireMdChair } from '@/lib/multi-district-portal';
import { MobileSyncBanner } from '@/app/zone/MobileSyncBanner';
import { MdHeader } from './MdHeader';

export const dynamic = 'force-dynamic';

export default async function MultiDistrictLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireMdChair();
  return (
    <div className="min-h-screen bg-gray-50">
      <MdHeader member={ctx.member} />
      <MobileSyncBanner />
      <main className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-6 space-y-6">
        {children}
      </main>
    </div>
  );
}
