import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { createClient } from '@/lib/supabase/server';
import { GalleryBulkUpload } from '@/components/admin/GalleryBulkUpload';
import DeletePhotoButton from '@/app/admin/media/DeletePhotoButton';
import { Images } from 'lucide-react';

export const dynamic = 'force-dynamic';

type Photo = {
  id: string;
  url: string;
  title: string | null;
  caption: string | null;
  category: string | null;
  is_featured: boolean;
  display_order: number;
  created_at: string;
  activities: { id: string; title: string; date: string } | null;
};

type Album = { id: string; title: string; date: string | null; photos: Photo[] };

export default async function AdminGalleryPage() {
  const supa = await createClient();
  const { data } = await supa
    .from('photos')
    .select(
      'id, url, title, caption, category, is_featured, display_order, created_at, activities(id, title, date)',
    )
    .is('deleted_at', null)
    .order('display_order')
    .order('created_at', { ascending: false })
    .limit(500);

  const photos = (data ?? []) as unknown as Photo[];

  // Split into per-event albums (photos.activity_id -> activities) and the
  // catch-all general gallery, so each event's uploads read as one album.
  const albumMap = new Map<string, Album>();
  const general: Photo[] = [];
  for (const p of photos) {
    if (p.activities) {
      const existing = albumMap.get(p.activities.id);
      if (existing) existing.photos.push(p);
      else albumMap.set(p.activities.id, { id: p.activities.id, title: p.activities.title, date: p.activities.date, photos: [p] });
    } else {
      general.push(p);
    }
  }
  const albums = Array.from(albumMap.values()).sort((a, b) => {
    const ad = a.date ? new Date(a.date).getTime() : 0;
    const bd = b.date ? new Date(b.date).getTime() : 0;
    return bd - ad;
  });

  return (
    <div>
      <h1 className="text-3xl font-bold text-navy-800 mb-1">Gallery</h1>
      <p className="text-gray-600 mb-8">
        Upload many photos at once. Pick an event to file a batch into that
        event&apos;s album — albums show up grouped on the public website
        gallery (<code>/gallery</code>) and in the mobile app.
      </p>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Bulk upload photos</CardTitle>
        </CardHeader>
        <CardContent>
          <GalleryBulkUpload />
        </CardContent>
      </Card>

      {albums.length > 0 && (
        <div className="space-y-6 mb-8">
          {albums.map((album) => (
            <Card key={album.id}>
              <CardHeader>
                <CardTitle className="flex flex-wrap items-center gap-2">
                  <Images size={16} className="text-brand-500" aria-hidden />
                  {album.title}
                  <Badge variant="outline" className="text-[10px] font-normal">
                    {album.photos.length} photo{album.photos.length === 1 ? '' : 's'}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {album.photos.map((p) => (
                    <PhotoCard key={p.id} photo={p} />
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>General gallery ({general.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {general.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-500">
              {albums.length
                ? "All photos are filed into an event album above."
                : 'No photos yet. Use the uploader above to add your first batch.'}
            </div>
          ) : (
            <ul className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {general.map((p) => (
                <PhotoCard key={p.id} photo={p} />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function PhotoCard({ photo: p }: { photo: Photo }) {
  return (
    <li className="group relative rounded-md overflow-hidden bg-gray-100">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={p.url}
        alt={p.title ?? p.caption ?? 'Gallery photo'}
        className="w-full h-40 object-cover"
      />
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent text-white px-2 pt-6 pb-2">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="text-xs font-medium truncate">{p.title ?? p.caption ?? '(untitled)'}</div>
            <div className="text-[10px] text-gray-200 flex items-center gap-1.5 mt-0.5">
              <Badge variant={p.is_featured ? 'success' : 'outline'} className="text-[10px]">
                {p.category ?? 'gallery'}
              </Badge>
              {p.is_featured && <span className="text-brand-300 font-semibold">★ featured</span>}
            </div>
          </div>
          <DeletePhotoButton id={p.id} />
        </div>
      </div>
    </li>
  );
}
