import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Calendar, Clock } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { BlogExplorer, type BlogStory } from '@/components/site/BlogExplorer';
import { formatDate } from '@/lib/utils';
import { PageHero, PAGE_HERO_BG } from '@/components/site/PageHero';

export const metadata: Metadata = {
  title: 'Newsroom & Stories',
  description:
    'Stories of service, impact, and community from Lions Clubs International and Baroda Rising Star — including activity reports, campaigns, and human spotlights.',
  alternates: { canonical: '/blog' },
};
export const revalidate = 300;

// Curated Lions International stories — shown alongside any local
// blog_posts so the newsroom always has rich content even on a fresh
// install.
const CURATED: BlogStory[] = [
  {
    id: 'li-measles',
    title: 'Lions and UNICEF: Partners in Measles Prevention',
    excerpt:
      'Lions Clubs International Foundation and UNICEF have been working together to protect children from measles through vaccination campaigns across the globe.',
    category: 'Humanitarian',
    date: '15 Mar 2025',
    image: 'https://images.unsplash.com/photo-1632053002928-1919f2f2dc1e?auto=format&fit=crop&w=900&q=70',
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
    image: 'https://images.unsplash.com/photo-1577401239170-897942555fb3?auto=format&fit=crop&w=900&q=70',
    url: 'https://www.lionsclubs.org/en/blog',
    source: 'Lions International',
  },
  {
    id: 'li-feed-world',
    title: 'Fighting Hunger: Lions Feed the World Campaign',
    excerpt:
      'Through the Lions Feed the World initiative, clubs globally have served millions of meals to families facing food insecurity.',
    category: 'Hunger Relief',
    date: '20 Jun 2025',
    image: 'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?auto=format&fit=crop&w=900&q=70',
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
    image: 'https://images.unsplash.com/photo-1466692476868-aef1dfb1e735?auto=format&fit=crop&w=900&q=70',
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
    image: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=900&q=70',
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
    image: 'https://images.unsplash.com/photo-1547683905-f686c993aae5?auto=format&fit=crop&w=900&q=70',
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
  is_featured: boolean | null;
  reading_time: number | null;
  author_name: string | null;
};

export default async function BlogPage() {
  let posts: BlogPost[] = [];
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      const { data } = await supabase
        .from('blog_posts')
        .select(
          'id, title, slug, excerpt, cover_url, published_at, category, is_featured, reading_time, author_name',
        )
        .eq('is_published', true)
        .is('deleted_at', null)
        .order('is_featured', { ascending: false })
        .order('published_at', { ascending: false })
        .limit(40);
      posts = (data ?? []) as BlogPost[];
    } catch {
      // table may not exist yet — curated stories still render
    }
  }

  const featured = posts.find((p) => p.is_featured) ?? posts[0] ?? null;
  const restPosts = posts.filter((p) => p.id !== featured?.id);

  const local: BlogStory[] = restPosts.map((p) => ({
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
  const stories = [...local, ...CURATED];

  return (
    <>
      <PageHero
        pillText="LIONS NEWSROOM"
        headline="Stories of Service & Impact"
        subtitle="The work of Lions, told in the voices of the people we serve. Read the latest from Baroda Rising Star and Lions Clubs International."
        backgroundImage={PAGE_HERO_BG.blog}
      />

      {featured && (
        <FeaturedStory
          post={featured}
          href={`/blog/${featured.slug ?? featured.id}`}
        />
      )}

      <BlogExplorer stories={stories} />
    </>
  );
}

function FeaturedStory({ post, href }: { post: BlogPost; href: string }) {
  return (
    <section className="bg-white py-12 md:py-16">
      <div className="container-page">
        <div className="flex items-center gap-2 mb-6">
          <span className="h-px flex-1 bg-gray-200" />
          <span className="text-xs uppercase tracking-[0.2em] text-brand-600 font-semibold">
            Featured Story
          </span>
          <span className="h-px flex-1 bg-gray-200" />
        </div>

        <Link
          href={href}
          className="group grid md:grid-cols-2 gap-8 lg:gap-12 items-center"
        >
          <div className="relative aspect-[4/3] md:aspect-[5/4] rounded-2xl overflow-hidden bg-gray-100">
            {post.cover_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={post.cover_url}
                alt={post.title}
                className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-700"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-navy-900 to-navy-700" />
            )}
            {post.category && (
              <span className="absolute top-4 left-4 inline-block bg-brand-500 text-navy-900 text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full">
                {post.category}
              </span>
            )}
          </div>

          <div>
            <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
              {post.published_at && (
                <span className="inline-flex items-center gap-1.5">
                  <Calendar size={14} aria-hidden /> {formatDate(post.published_at)}
                </span>
              )}
              {post.reading_time && (
                <span className="inline-flex items-center gap-1.5">
                  <Clock size={14} aria-hidden /> {post.reading_time} min read
                </span>
              )}
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-navy-900 leading-tight group-hover:text-brand-600 transition-colors">
              {post.title}
            </h2>
            {post.excerpt && (
              <p className="mt-4 text-lg text-gray-600 leading-relaxed">{post.excerpt}</p>
            )}
            <span className="mt-6 inline-flex items-center gap-2 text-navy-800 font-semibold group-hover:text-brand-600">
              Read the full story <ArrowRight size={16} aria-hidden />
            </span>
          </div>
        </Link>
      </div>
    </section>
  );
}
