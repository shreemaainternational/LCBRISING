import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { createClient } from '@/lib/supabase/server';
import PhotoUploader from './PhotoUploader';
import DeletePhotoButton from './DeletePhotoButton';

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

export default async function AdminMediaPage() {
  const supa = await createClient();
  const { data } = await supa
    .from('photos')
    .select('id, url, title, caption, category, is_featured, display_order, created_at')
    .is('deleted_at', null)
    .order('category')
    .order('display_order')
    .order('created_at', { ascending: false })
    .limit(200);

  const photos = (data ?? []) as Photo[];

  return (
    <div>
      <h1 className="text-3xl font-bold text-navy-800 mb-1">Media library</h1>
      <p className="text-gray-600 mb-8">
        Upload and curate photos used across the public site (gallery, about
        section, hero images, press shots).
      </p>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Add new photo</CardTitle>
        </CardHeader>
        <CardContent>
          <PhotoUploader />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Library ({photos.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {photos.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-500">
              No photos yet. Add one above to populate the public Media gallery
              and About-section collage.
            </div>
          ) : (
            <ul className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {photos.map((p) => (
                <li key={p.id} className="group relative rounded-md overflow-hidden bg-gray-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={p.url}
                    alt={p.title ?? 'Club photo'}
                    className="w-full h-40 object-cover"
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent text-white px-2 pt-6 pb-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-xs font-medium truncate">{p.title ?? '(untitled)'}</div>
                        <div className="text-[10px] text-gray-200 flex items-center gap-1.5 mt-0.5">
                          <Badge variant={p.is_featured ? 'success' : 'outline'} className="text-[10px]">
                            {p.category ?? 'gallery'}
                          </Badge>
                          {p.is_featured && (
                            <span className="text-brand-300 font-semibold">★ featured</span>
                          )}
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
