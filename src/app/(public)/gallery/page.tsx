import type { Metadata } from 'next';
import Link from 'next/link';
import { ImageOff } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { PageHero, PAGE_HERO_BG } from '@/components/site/PageHero';
import { GalleryGrid, type GalleryPhoto } from './GalleryGrid';

export const metadata: Metadata = {
  title: 'Photo Gallery',
  description:
    'A photo gallery of Lions Club of Baroda Rising Star service activities — moments from our projects across every cause we serve.',
  alternates: { canonical: '/gallery' },
};
export const revalidate = 300;

type ActivityRow = {
  title: string;
  date: string;
  photos: string[] | null;
  before_photos: string[] | null;
  after_photos: string[] | null;
  photo_captions: Record<string, string> | null;
};

async function loadPhotos(): Promise<GalleryPhoto[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from('activities')
      .select('title, date, photos, before_photos, after_photos, photo_captions')
      .eq('approval_status', 'approved')
      .order('date', { ascending: false })
      .limit(300);

    const out: GalleryPhoto[] = [];
    const seen = new Set<string>();
    for (const a of (data ?? []) as ActivityRow[]) {
      const urls = [...(a.photos ?? []), ...(a.before_photos ?? []), ...(a.after_photos ?? [])];
      for (const url of urls) {
        if (!url || seen.has(url)) continue;
        seen.add(url);
        out.push({
          url,
          caption: a.photo_captions?.[url] ?? '',
          activity: a.title,
          date: a.date,
        });
      }
    }
    return out;
  } catch {
    return [];
  }
}

export default async function GalleryPage() {
  const photos = await loadPhotos();

  return (
    <>
      <PageHero
        pillText="PHOTO GALLERY"
        headline="Moments of Service"
        subtitle="Photographs from our service projects across every Lions global cause. Tap any photo to view it full-size."
        backgroundImage={PAGE_HERO_BG.media}
      />

      <section className="container-page py-14 md:py-16">
        {photos.length > 0 ? (
          <GalleryGrid photos={photos} />
        ) : (
          <div className="max-w-xl mx-auto text-center bg-white border border-gray-200 rounded-2xl p-10">
            <div className="mx-auto mb-4 h-14 w-14 rounded-2xl bg-gray-100 flex items-center justify-center">
              <ImageOff size={26} className="text-navy-700" aria-hidden />
            </div>
            <h2 className="text-xl font-bold text-navy-800 mb-2">No photos yet</h2>
            <p className="text-gray-600 mb-6">
              Photos from our service activities will appear here as they are uploaded.
            </p>
            <Link
              href="/activities"
              className="btn-navy inline-flex items-center rounded-md px-5 py-2.5 text-sm"
            >
              Explore our activities
            </Link>
          </div>
        )}
      </section>
    </>
  );
}
