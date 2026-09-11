import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { MediaExplorer, type MediaItem } from '@/components/site/MediaExplorer';
import { PageHero, PAGE_HERO_BG } from '@/components/site/PageHero';
import { LionsResourceLink } from '@/components/site/LionsResourceLink';

export const metadata: Metadata = {
  title: 'Media',
  description:
    'News articles, TV features, and online coverage of Lions Club Baroda Rising Star service activities.',
  alternates: { canonical: '/media' },
};
export const revalidate = 300;

function formatDate(value: string | null): string {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
}

async function loadCoverage(): Promise<MediaItem[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const supa = await createClient();
    const { data } = await supa
      .from('photos')
      .select('id, url, title, source_name, source_url, media_type, taken_on, created_at')
      .eq('category', 'press')
      .is('deleted_at', null)
      .not('source_name', 'is', null)
      .order('taken_on', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
      .limit(200);

    return (data ?? [])
      .filter((p) => p.source_name)
      .map((p) => ({
        id: p.id,
        title: p.title ?? 'Coverage of our service activities',
        outlet: p.source_name as string,
        date: formatDate(p.taken_on ?? p.created_at),
        type: (p.media_type as MediaItem['type']) ?? 'Online',
        image: p.url,
        url: p.source_url ?? undefined,
      }));
  } catch {
    return [];
  }
}

export default async function MediaPage() {
  const coverage = await loadCoverage();

  return (
    <>
      <PageHero
        pillText="MEDIA"
        headline="Media Coverage"
        subtitle="News articles, TV features, and online coverage of our service activities and community impact."
        backgroundImage={PAGE_HERO_BG.media}
      />

      {coverage.length === 0 ? (
        <section className="container-page py-16 text-center text-gray-500">
          <p>Press coverage will appear here as it&apos;s published. Check back soon!</p>
          <LionsResourceLink
            href="https://www.lionsclubs.org/en/footer/lions-press-center"
            label="Visit the Lions Press Center"
            className="mt-4 justify-center"
          />
        </section>
      ) : (
        <MediaExplorer items={coverage} />
      )}
    </>
  );
}
