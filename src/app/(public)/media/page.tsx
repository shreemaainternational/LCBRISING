import type { Metadata } from 'next';
import Link from 'next/link';
import { Image as ImageIcon, Newspaper, Video } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { Card, CardContent } from '@/components/ui/card';
import { PageHero } from '@/components/site/PageHero';

export const metadata: Metadata = {
  title: 'Media',
  description: 'Press coverage, photo galleries, and videos from Lions Club Baroda Rising Star.',
};
export const revalidate = 300;

type Activity = {
  id: string;
  title: string;
  date: string;
  photos: string[] | null;
};

export default async function MediaPage() {
  let gallery: { id: string; title: string; date: string; photo: string }[] = [];
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      const { data } = await supabase
        .from('activities')
        .select('id, title, date, photos')
        .order('date', { ascending: false })
        .limit(24);
      gallery = ((data ?? []) as Activity[])
        .flatMap((a) =>
          (a.photos ?? []).map((url) => ({
            id: a.id + '__' + url,
            title: a.title,
            date: a.date,
            photo: url,
          })),
        )
        .slice(0, 18);
    } catch {
      gallery = [];
    }
  }

  return (
    <>
      <PageHero
        pillText="Lions Club Baroda Rising Star · Media"
        headline="Photos, video"
        accent="& press"
        subtitle="Every service project leaves a record — pictures from the field, video recaps, and the occasional newspaper clipping."
      />
      <section className="container-page py-16">

      {/* Section nav */}
      <div className="grid gap-4 sm:grid-cols-3 mb-12">
        <SectionTile
          icon={<ImageIcon size={20} />}
          label="Photo gallery"
          href="#gallery"
          subtitle={`${gallery.length} images`}
        />
        <SectionTile
          icon={<Video size={20} />}
          label="Video"
          href="#video"
          subtitle="Coming soon"
        />
        <SectionTile
          icon={<Newspaper size={20} />}
          label="Press"
          href="#press"
          subtitle="Coming soon"
        />
      </div>

      {/* Gallery */}
      <div id="gallery" className="scroll-mt-24">
        <h2 className="text-2xl font-semibold text-navy-800 mb-4">Photo gallery</h2>
        {gallery.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-gray-600">
              No photos uploaded yet. Officers can add them from{' '}
              <Link href="/admin/activities" className="text-brand-700 underline">
                /admin/activities
              </Link>{' '}
              — each activity supports a photo URL list.
            </CardContent>
          </Card>
        ) : (
          <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {gallery.map((g) => (
              <li key={g.id}>
                <figure className="group relative overflow-hidden rounded-md aspect-square bg-gray-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={g.photo}
                    alt={g.title}
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                  <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent text-white text-xs p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    {g.title}
                  </figcaption>
                </figure>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Video placeholder */}
      <div id="video" className="scroll-mt-24 mt-16">
        <h2 className="text-2xl font-semibold text-navy-800 mb-4">Video</h2>
        <Card>
          <CardContent className="p-8 text-gray-600">
            Highlight reels and project recaps coming soon. Until then, follow us
            on social media for the latest.
          </CardContent>
        </Card>
      </div>

      {/* Press placeholder */}
      <div id="press" className="scroll-mt-24 mt-16">
        <h2 className="text-2xl font-semibold text-navy-800 mb-4">Press coverage</h2>
        <Card>
          <CardContent className="p-8 text-gray-600">
            News articles and interviews about the club&rsquo;s work will be listed
            here. Drop us a note via{' '}
            <Link href="/contact" className="text-brand-700 underline">
              /contact
            </Link>{' '}
            if you&rsquo;ve covered one of our projects.
          </CardContent>
        </Card>
      </div>
      </section>
    </>
  );
}

function SectionTile({
  icon, label, subtitle, href,
}: {
  icon: React.ReactNode;
  label: string;
  subtitle: string;
  href: string;
}) {
  return (
    <Link href={href} className="block">
      <Card className="hover:border-brand-300 transition-colors">
        <CardContent className="p-5 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 text-brand-700">
            {icon}
          </span>
          <div>
            <div className="font-semibold text-navy-800">{label}</div>
            <div className="text-xs text-gray-500">{subtitle}</div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
