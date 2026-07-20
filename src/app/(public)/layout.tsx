import { PublicNav } from '@/components/site/PublicNav';
import { Footer } from '@/components/site/Footer';
import { PWARegister } from '@/components/site/PWARegister';
import { PageViewBeacon } from '@/components/site/PageViewBeacon';

export default function PublicLayout({
  children,
  modal,
}: {
  children: React.ReactNode;
  modal: React.ReactNode;
}) {
  return (
    <>
      <PublicNav />
      <main className="min-h-[calc(100vh-4rem)]">{children}</main>
      {modal}
      <Footer />
      <PWARegister />
      <PageViewBeacon />
    </>
  );
}
