import { PublicNav } from '@/components/site/PublicNav';
import { Footer } from '@/components/site/Footer';
import { PWARegister } from '@/components/site/PWARegister';
import { PageViewBeacon } from '@/components/site/PageViewBeacon';
import { OrganizationJsonLd } from '@/components/site/StructuredData';
import { loadMenuVisibility } from '@/lib/site-menu';

// Re-checks menu visibility roughly once a minute so a hide/unhide toggle
// from the admin Website Menu page reaches visitors without a redeploy.
export const revalidate = 60;

export default async function PublicLayout({
  children,
  modal,
}: {
  children: React.ReactNode;
  modal: React.ReactNode;
}) {
  const visibility = await loadMenuVisibility();

  return (
    <>
      <OrganizationJsonLd />
      <PublicNav visibility={visibility} />
      <main className="min-h-[calc(100vh-4rem)]">{children}</main>
      {modal}
      <Footer />
      <PWARegister />
      <PageViewBeacon />
    </>
  );
}
