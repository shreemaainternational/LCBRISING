import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { createAdminClient } from '@/lib/supabase/server';
import { getCurrentMember, isAdminRole } from '@/lib/auth';
import { GalleryGrid, type GalleryPhoto } from '@/components/site/GalleryGrid';
import { GalleryBulkUpload } from '@/components/admin/GalleryBulkUpload';

export const dynamic = 'force-dynamic';

export default async function MobileGallery() {
  const member = await getCurrentMember();
  const canUpload = member ? isAdminRole(member.role) : false;

  const { data } = await createAdminClient()
    .from('photos')
    .select('id, url, title, caption, category, display_order, created_at')
    .is('deleted_at', null)
    .neq('category', 'hero')
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: false })
    .limit(500);

  const photos = ((data ?? []) as (GalleryPhoto & { created_at?: string })[]).map((p) => ({
    id: p.id,
    url: p.url,
    title: p.title,
    caption: p.caption,
    date: p.created_at ?? null,
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

      {/* Admins/officers can add photos straight from their phone — they merge
          into the same gallery shown in the CRM and on the public website. */}
      {canUpload && (
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-navy-800 mb-3">Add photos</h2>
          <GalleryBulkUpload />
        </div>
      )}

      {photos.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 text-center text-sm text-gray-500 shadow-sm">
          No photos yet.{' '}
          {canUpload ? 'Use “Add photos” above to upload your first batch.' : 'They’ll appear here once the team uploads them.'}
        </div>
      ) : (
        <div className="bg-white rounded-2xl p-3 shadow-sm">
          <GalleryGrid photos={photos} compact />
        </div>
      )}
    </div>
  );
}
