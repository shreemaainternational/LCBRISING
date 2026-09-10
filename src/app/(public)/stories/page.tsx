import type { Metadata } from 'next';
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

async function loadStories(): Promise<Story[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from('stories')
      .select(
        'id, slug, title, subtitle, beneficiary_name, beneficiary_age, location, hero_image, impact_quote, impact_metric, tags, is_featured, published_at',
      )
      .eq('is_published', true)
      .is('deleted_at', null)
      .order('is_featured', { ascending: false })
      .order('published_at', { ascending: false })
      .limit(24);
    return (data ?? []) as Story[];
  } catch {
    return [];
  }
}

export default async function StoriesPage() {
  const all = await loadStories();
  const featured = all.find((s) => s.is_featured) ?? all[0] ?? null;
  const rest = featured ? all.filter((s) => s.id !== featured.id) : all;

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
        <StoriesBoard featured={featured} rest={rest} />
      )}
    </>
  );
}
