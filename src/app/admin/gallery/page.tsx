import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { createClient } from '@/lib/supabase/server';
import { GalleryBulkUpload } from '@/components/admin/GalleryBulkUpload';
import DeletePhotoButton from '@/app/admin/media/DeletePhotoButton';

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
};

export default async function AdminGalleryPage() {
  const supa = await createClient();
  const { data } = await supa
    .from('photos')
    .select('id, url, title, caption, category, is_featured, display_order, created_at')
    .is('deleted_at', null)
    .order('display_order')
    .order('created_at', { ascending: false })
    .limit(500);

  const photos = (data ?? []) as Photo[];

  return (
    <div>
      <h1 className="text-3xl font-bold text-navy-800 mb-1">Gallery</h1>
      <p className="text-gray-600 mb-8">
        Upload many photos at once. They appear instantly on the public website
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

      <Card>
        <CardHeader>
          <CardTitle>Gallery ({photos.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {photos.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-500">
              No photos yet. Use the uploader above to add your first batch.
            </div>
          ) : (
            <ul className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {photos.map((p) => (
                <li key={p.id} className="group relative rounded-md overflow-hidden bg-gray-100">
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
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
