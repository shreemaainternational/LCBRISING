import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { createAdminClient } from '@/lib/supabase/server';
import { GalleryGrid, type GalleryPhoto } from '@/components/site/GalleryGrid';

export const dynamic = 'force-dynamic';

export default async function MobileGallery() {
  const { data } = await createAdminClient()
    .from('photos')
    .select('id, url, title, caption, category, display_order, created_at')
    .is('deleted_at', null)
    .neq('category', 'hero')
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: false })
    .limit(500);

  const photos = ((data ?? []) as GalleryPhoto[]).map((p) => ({
    id: p.id,
    url: p.url,
    title: p.title,
    caption: p.caption,
  }));

  return (
    <div className="space-y-4">
      <Link href="/m" className="inline-flex items-center gap-1 text-sm text-gray-600">
        <ArrowLeft size={14} /> Back
      </Link>

      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <h1 className="text-xl font-bold text-navy-800">Photo Gallery</h1>
        <p className="text-xs text-gray-500 mt-1">
          {photos.length} {photos.length === 1 ? 'photo' : 'photos'} from our service &amp; events
        </p>
      </div>

      {photos.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 text-center text-sm text-gray-500 shadow-sm">
          No photos yet. They&apos;ll appear here once the team uploads them.
        </div>
      ) : (
        <div className="bg-white rounded-2xl p-3 shadow-sm">
          <GalleryGrid photos={photos} compact />
        </div>
      )}
    </div>
  );
}
