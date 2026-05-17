import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { BlogExplorer, type BlogStory } from '@/components/site/BlogExplorer';
import { formatDate } from '@/lib/utils';
import { PageHero, PAGE_HERO_BG } from '@/components/site/PageHero';

export const metadata: Metadata = {
  title: 'Blog',
  description:
    'Stories of service, impact, and community from Lions Clubs International and our local club activities.',
};
export const revalidate = 300;

// Curated Lions International stories — shown alongside any local
// blog_posts so the page always has rich content.
const CURATED: BlogStory[] = [
  {
    id: 'li-measles',
    title: 'Lions and UNICEF: Partners in Measles Prevention',
    excerpt:
      'Lions Clubs International Foundation and UNICEF have been working together to protect children from measles through vaccination campaigns across the globe.',
    category: 'Humanitarian',
    date: '15 Mar 2025',
    image:
      'https://images.unsplash.com/photo-1632053002928-1919f2f2dc1e?auto=format&fit=crop&w=900&q=70',
    url: 'https://www.lionsclubs.org/en/blog',
    source: 'Lions International',
  },
  {
    id: 'li-sight-day',
    title: 'World Sight Day: Lions Leading the Way in Vision Care',
    excerpt:
      'On World Sight Day, Lions Clubs around the world organize free eye screening camps, distribute eyeglasses, and raise awareness about preventable blindness.',
    category: 'Vision',
    date: '12 Oct 2025',
    image:
      'https://images.unsplash.com/photo-1577401239170-897942555fb3?auto=format&fit=crop&w=900&q=70',
    url: 'https://www.lionsclubs.org/en/blog',
    source: 'Lions International',
  },
  {
    id: 'li-feed-world',
    title: 'Fighting Hunger: Lions Feed the World Campaign',
    excerpt:
      'Through the Lions Feed the World initiative, clubs globally have served millions of meals to families facing food insecurity and malnutrition.',
    category: 'Hunger Relief',
    date: '20 Jun 2025',
    image:
      'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?auto=format&fit=crop&w=900&q=70',
    url: 'https://www.lionsclubs.org/en/blog',
    source: 'Lions International',
  },
  {
    id: 'li-environment',
    title: 'Restoring Forests, One Sapling at a Time',
    excerpt:
      'Lions environmental projects have planted millions of trees worldwide, restoring habitats and helping communities fight climate change.',
    category: 'Environment',
    date: '05 Apr 2025',
    image:
      'https://images.unsplash.com/photo-1466692476868-aef1dfb1e735?auto=format&fit=crop&w=900&q=70',
    url: 'https://www.lionsclubs.org/en/blog',
    source: 'Lions International',
  },
  {
    id: 'li-youth',
    title: 'Empowering Youth Through Leo Clubs',
    excerpt:
      'Leo Clubs give young people the chance to lead service projects, build confidence, and become the changemakers of tomorrow.',
    category: 'Youth',
    date: '18 Feb 2025',
    image:
      'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=900&q=70',
    url: 'https://www.lionsclubs.org/en/blog',
    source: 'Lions International',
  },
  {
    id: 'li-disaster',
    title: 'Rapid Response: Lions Disaster Relief in Action',
    excerpt:
      'When disaster strikes, Lions are among the first to respond — providing emergency supplies, shelter, and long-term rebuilding support.',
    category: 'Disaster Relief',
    date: '28 Jan 2025',
    image:
      'https://images.unsplash.com/photo-1547683905-f686c993aae5?auto=format&fit=crop&w=900&q=70',
    url: 'https://www.lionsclubs.org/en/blog',
    source: 'Lions International',
  },
];

type BlogPost = {
  id: string;
  title: string;
  slug: string | null;
  excerpt: string | null;
  cover_url: string | null;
  published_at: string | null;
  category: string | null;
};

export default async function BlogPage() {
  let local: BlogStory[] = [];
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      const { data } = await supabase
        .from('blog_posts')
        .select('id, title, slug, excerpt, cover_url, published_at, category')
        .order('published_at', { ascending: false })
        .limit(20);
      local = ((data ?? []) as BlogPost[]).map((p) => ({
        id: p.id,
        title: p.title,
        excerpt: p.excerpt ?? '',
        category: p.category ?? 'Humanitarian',
        date: p.published_at ? formatDate(p.published_at) : '',
        image:
          p.cover_url ||
          'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?auto=format&fit=crop&w=900&q=70',
        url: `/blog/${p.slug ?? p.id}`,
        source: 'Baroda Rising Star',
      }));
    } catch {
      // table may not exist yet — curated stories still render
    }
  }

  const stories = [...local, ...CURATED];

  return (
    <>
      <PageHero
        pillText="LIONS BLOG"
        headline="Latest News & Stories"
        subtitle="Stories of service, impact, and community from Lions Clubs International and our local club activities."
        backgroundImage={PAGE_HERO_BG.blog}
      />

      <BlogExplorer stories={stories} />
    </>
  );
}
