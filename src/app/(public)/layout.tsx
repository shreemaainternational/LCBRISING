import { PublicNav } from '@/components/site/PublicNav';
import { Footer } from '@/components/site/Footer';
import { PWARegister } from '@/components/site/PWARegister';
import { PageViewBeacon } from '@/components/site/PageViewBeacon';
import { OrganizationJsonLd } from '@/components/site/StructuredData';
import { getActivityArchiveMonths } from '@/lib/activities';

export default async function PublicLayout({
  children,
  modal,
}: {
  children: React.ReactNode;
  modal: React.ReactNode;
}) {
  const archiveMonths = await getActivityArchiveMonths(12);

  return (
    <>
      <OrganizationJsonLd />
      <PublicNav archiveMonths={archiveMonths} />
      <main className="min-h-[calc(100vh-4rem)]">{children}</main>
      {modal}
      <Footer />
      <PWARegister />
      <PageViewBeacon />
    </>
  );
}
