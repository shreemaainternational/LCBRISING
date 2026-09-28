import type { Metadata } from 'next';
import { unstable_rethrow } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { PageHero, PAGE_HERO_BG } from '@/components/site/PageHero';
import { StoriesBoard, type Story } from './StoriesBoard';

export const metadata: Metadata = {
  title: 'Human Stories',
  description:
    'Real lives, real change. Meet the children, families, and communities whose lives have been touched by the work of Lions Club Baroda Rising Star.',
  alternates: { canonical: '/stories' },
};
export const revalidate = 300;

const BASE_COLUMNS =
  'id, slug, title, subtitle, beneficiary_name, beneficiary_age, location, hero_image, impact_quote, impact_metric, tags, is_featured, published_at';

async function loadStories(): Promise<Story[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const supabase = await createClient();
    const query = (columns: string) =>
      supabase
        .from('stories')
        .select(columns)
        .eq('is_published', true)
        .is('deleted_at', null)
        .order('is_featured', { ascending: false })
        .order('published_at', { ascending: false })
        .limit(60);
    let { data, error } = await query(`${BASE_COLUMNS}, external_source, source_url`);
    if (error) {
      // Provenance columns arrive with migration 0082; until it is applied,
      // fall back so the club's own stories still render.
      console.error('[stories] query failed, retrying without sync columns:', error.message);
      ({ data, error } = await query(BASE_COLUMNS));
      if (error) console.error('[stories] query failed:', error.message);
    }
    return (data ?? []) as unknown as Story[];
  } catch (err) {
    unstable_rethrow(err);
    console.error('[stories] load failed:', err);
    return [];
  }
}

export default async function StoriesPage() {
  const all = await loadStories();
  // The club's own beneficiary stories lead; stories imported from Lions
  // International are shown separately and link out to lionsclubs.org.
  const own = all.filter((s) => !s.external_source);
  const lions = all.filter((s) => !!s.external_source);
  const featured = own.find((s) => s.is_featured) ?? own[0] ?? null;
  const rest = featured ? own.filter((s) => s.id !== featured.id) : own;

  return (
    <>
      <PageHero
        pillText="HUMAN STORIES"
        headline="Real lives. Real change."
        subtitle="Behind every statistic is a name, a face, and a story. Meet the people whose lives have been transformed by the work of Lions Baroda Rising Star."
        backgroundImage={PAGE_HERO_BG.activities}
      />

      {all.length === 0 ? (
        <section className="container-page py-16 text-center text-gray-500">
          Real stories from the people we have served will appear here soon. Check back shortly!
        </section>
      ) : (
        <StoriesBoard featured={featured} rest={rest} lions={lions} />
      )}
    </>
  );
}
