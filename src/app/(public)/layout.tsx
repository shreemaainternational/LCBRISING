import { BrandHeader } from '@/components/site/BrandHeader';
import { PublicNav } from '@/components/site/PublicNav';
import { Footer } from '@/components/site/Footer';
import { PWARegister } from '@/components/site/PWARegister';
import { PageViewBeacon } from '@/components/site/PageViewBeacon';

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <BrandHeader />
      <PublicNav />
      <main className="min-h-[calc(100vh-4rem)]">{children}</main>
      <Footer />
      <PWARegister />
      <PageViewBeacon />
    </>
  );
}
