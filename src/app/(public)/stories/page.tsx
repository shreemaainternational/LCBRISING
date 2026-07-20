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

const CURATED: Story[] = [
  {
    id: 'demo-arya',
    slug: '#',
    title: 'Arya can see the blackboard again',
    subtitle:
      'A free Lions eye-screening camp caught the cataract early — and gave a nine-year-old her classroom back.',
    beneficiary_name: 'Arya',
    beneficiary_age: 9,
    location: 'Vadodara, Gujarat',
    hero_image:
      'https://images.unsplash.com/photo-1606811971618-4486d14f3f99?auto=format&fit=crop&w=1200&q=70',
    impact_quote: '“Now I can read my teacher’s notes from the back of the room.”',
    impact_metric: '1,240 children screened in 2025',
    tags: ['vision', 'children'],
    is_featured: true,
    published_at: '2025-09-10',
  },
  {
    id: 'demo-rekha',
    slug: '#',
    title: 'Rekha runs a tailoring business from her doorstep',
    subtitle:
      'A women’s livelihood programme turned one sewing machine into a steady income for her family of four.',
    beneficiary_name: 'Rekha',
    beneficiary_age: 34,
    location: 'Waghodia, Gujarat',
    hero_image:
      'https://images.unsplash.com/photo-1593113598332-cd288d649433?auto=format&fit=crop&w=1200&q=70',
    impact_quote: '“My daughters do not have to miss school for tuition fees anymore.”',
    impact_metric: '86 women trained this year',
    tags: ['women', 'livelihood'],
    is_featured: false,
    published_at: '2025-06-22',
  },
  {
    id: 'demo-aakash',
    slug: '#',
    title: 'Aakash is back in school after the floods',
    subtitle:
      'A disaster-relief response delivered books, uniforms, and a temporary classroom in three weeks.',
    beneficiary_name: 'Aakash',
    beneficiary_age: 12,
    location: 'Padra, Gujarat',
    hero_image:
      'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=1200&q=70',
    impact_quote: '“We lost everything except the will to study.”',
    impact_metric: '320 children returned to school',
    tags: ['relief', 'education'],
    is_featured: false,
    published_at: '2025-08-05',
  },
];

export default async function StoriesPage() {
  let stories: Story[] = [];
  if (isSupabaseConfigured()) {
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
      stories = (data ?? []) as Story[];
    } catch {
      // stories table may not exist yet — curated stories still render
    }
  }

  const all = stories.length > 0 ? stories : CURATED;
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

      <StoriesBoard featured={featured} rest={rest} />
    </>
  );
}
