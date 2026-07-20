import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { PageHero, PAGE_HERO_BG } from '@/components/site/PageHero';
import { GalleryGrid, type GalleryPhoto } from '@/components/site/GalleryGrid';

export const metadata: Metadata = {
  title: 'Photo Gallery',
  description:
    'Photos from the service activities, events and community work of Lions Club of Baroda Rising Star.',
  alternates: { canonical: '/gallery' },
};

export const revalidate = 120;

async function loadPhotos(): Promise<GalleryPhoto[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from('photos')
      .select('id, url, title, caption, category, display_order, created_at')
      .is('deleted_at', null)
      .neq('category', 'hero')
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: false })
      .limit(500);
    return ((data ?? []) as GalleryPhoto[]).map((p) => ({
      id: p.id,
      url: p.url,
      title: p.title,
      caption: p.caption,
    }));
  } catch {
    return [];
  }
}

export default async function GalleryPage() {
  const photos = await loadPhotos();

  return (
    <>
      <PageHero
        pillText="LIONS CLUB OF BARODA RISING STAR"
        headline="Photo Gallery"
        subtitle="Moments from our service activities, events and community work."
        backgroundImage={PAGE_HERO_BG.media}
      />

      <section className="container-page py-14 md:py-16">
        {photos.length === 0 ? (
          <p className="text-center text-gray-500">
            Photos will appear here soon. Check back shortly!
          </p>
        ) : (
          <>
            <p className="mb-6 text-sm text-gray-500">
              {photos.length} {photos.length === 1 ? 'photo' : 'photos'}
            </p>
            <GalleryGrid photos={photos} />
          </>
        )}
      </section>
    </>
  );
}
