import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Calendar, Clock, User, Quote } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured, env } from '@/lib/env';
import { formatDate } from '@/lib/utils';
import { renderMarkdown } from '@/lib/markdown';
import { ReadingProgress } from '@/components/site/ReadingProgress';
import { ShareBar } from '@/components/site/ShareBar';
import { estimateReadingTime } from '@/lib/ai/blog';

export const revalidate = 300;

type BlogPost = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  body: string | null;
  body_html: string | null;
  cover_url: string | null;
  category: string | null;
  tags: string[] | null;
  language: string | null;
  reading_time: number | null;
  hero_quote: string | null;
  author_name: string | null;
  published_at: string | null;
  is_featured: boolean | null;
  story_type: string | null;
  seo_title: string | null;
  seo_description: string | null;
};

async function getPost(slug: string): Promise<BlogPost | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from('blog_posts')
      .select(
        'id, slug, title, excerpt, body, body_html, cover_url, category, tags, language, reading_time, hero_quote, author_name, published_at, is_featured, story_type, seo_title, seo_description',
      )
      .eq('slug', slug)
      .eq('is_published', true)
      .is('deleted_at', null)
      .maybeSingle();
    return (data ?? null) as BlogPost | null;
  } catch {
    return null;
  }
}

async function getRelated(post: BlogPost): Promise<
  Array<Pick<BlogPost, 'id' | 'slug' | 'title' | 'excerpt' | 'cover_url' | 'category' | 'published_at'>>
> {
  if (!isSupabaseConfigured()) return [];
  try {
    const supabase = await createClient();
    const q = supabase
      .from('blog_posts')
      .select('id, slug, title, excerpt, cover_url, category, published_at')
      .neq('id', post.id)
      .eq('is_published', true)
      .is('deleted_at', null)
      .order('published_at', { ascending: false })
      .limit(3);
    if (post.category) q.eq('category', post.category);
    const { data } = await q;
    return (data ?? []) as Array<
      Pick<BlogPost, 'id' | 'slug' | 'title' | 'excerpt' | 'cover_url' | 'category' | 'published_at'>
    >;
  } catch {
    return [];
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) return { title: 'Story not found' };
  const title = post.seo_title || post.title;
  const description =
    post.seo_description || post.excerpt || 'A story from Lions Club Baroda Rising Star.';
  const url = `${env.NEXT_PUBLIC_SITE_URL}/blog/${post.slug}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      type: 'article',
      url,
      images: post.cover_url ? [{ url: post.cover_url }] : undefined,
      publishedTime: post.published_at ?? undefined,
      authors: post.author_name ? [post.author_name] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: post.cover_url ? [post.cover_url] : undefined,
    },
  };
}

export default async function BlogDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) notFound();

  const related = await getRelated(post);
  const body = post.body_html || (post.body ? renderMarkdown(post.body) : '');
  const readingMinutes = post.reading_time ?? estimateReadingTime(post.body ?? post.excerpt ?? '');
  const canonical = `${env.NEXT_PUBLIC_SITE_URL}/blog/${post.slug}`;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: post.title,
    description: post.excerpt ?? undefined,
    image: post.cover_url ? [post.cover_url] : undefined,
    datePublished: post.published_at ?? undefined,
    author: post.author_name
      ? { '@type': 'Person', name: post.author_name }
      : { '@type': 'Organization', name: 'Lions Club Baroda Rising Star' },
    publisher: {
      '@type': 'Organization',
      name: 'Lions Club Baroda Rising Star',
      logo: {
        '@type': 'ImageObject',
        url: `${env.NEXT_PUBLIC_SITE_URL}/icon.svg`,
      },
    },
    mainEntityOfPage: canonical,
    articleSection: post.category ?? undefined,
    keywords: post.tags?.join(', ') ?? undefined,
  };

  return (
    <>
      <ReadingProgress />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Emotional full-bleed hero */}
      <header className="relative isolate text-white overflow-hidden">
        <div className="absolute inset-0 -z-10">
          {post.cover_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={post.cover_url}
              alt=""
              aria-hidden
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-navy-900 to-navy-700" />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-navy-900/40 via-navy-900/60 to-navy-900/95" />
        </div>

        <div className="container-page pt-24 pb-16 md:pt-32 md:pb-24">
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 text-sm text-white/80 hover:text-white mb-6"
          >
            <ArrowLeft size={14} /> Back to all stories
          </Link>

          {post.category && (
            <span className="inline-block bg-brand-500/95 text-navy-900 text-xs uppercase tracking-wider font-bold px-3 py-1 rounded-full">
              {post.category}
            </span>
          )}

          <h1 className="mt-5 text-3xl md:text-5xl lg:text-6xl font-bold leading-tight max-w-4xl drop-shadow-lg">
            {post.title}
          </h1>

          {post.excerpt && (
            <p className="mt-5 text-lg md:text-xl text-white/90 max-w-3xl leading-relaxed drop-shadow">
              {post.excerpt}
            </p>
          )}

          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-white/80">
            {post.author_name && (
              <span className="inline-flex items-center gap-1.5">
                <User size={14} aria-hidden /> {post.author_name}
              </span>
            )}
            {post.published_at && (
              <span className="inline-flex items-center gap-1.5">
                <Calendar size={14} aria-hidden /> {formatDate(post.published_at)}
              </span>
            )}
            <span className="inline-flex items-center gap-1.5">
              <Clock size={14} aria-hidden /> {readingMinutes} min read
            </span>
          </div>
        </div>
      </header>

      {/* Body */}
      <article className="bg-white">
        <div className="container-page py-12 md:py-16 grid lg:grid-cols-[1fr_280px] gap-12">
          <div>
            {post.hero_quote && (
              <figure className="my-2 mb-10 relative rounded-2xl bg-gradient-to-br from-navy-900 to-navy-700 text-white p-8 md:p-10">
                <Quote
                  size={42}
                  aria-hidden
                  className="absolute -top-4 -left-2 text-brand-400 opacity-90"
                />
                <blockquote className="text-xl md:text-2xl font-medium leading-snug">
                  {post.hero_quote}
                </blockquote>
              </figure>
            )}

            {body ? (
              <div
                className="prose-like text-[17px] leading-relaxed"
                // Safe: body_html is admin-authored and body markdown is escaped.
                dangerouslySetInnerHTML={{ __html: body }}
              />
            ) : (
              <p className="text-gray-500 italic">This story is still being written.</p>
            )}

            <div className="mt-10 pt-6 border-t border-gray-200">
              <ShareBar url={canonical} title={post.title} />
            </div>

            {post.tags && post.tags.length > 0 && (
              <div className="mt-8 flex flex-wrap gap-2">
                {post.tags.map((t) => (
                  <span
                    key={t}
                    className="text-xs uppercase tracking-wider bg-gray-100 text-gray-700 px-3 py-1 rounded-full"
                  >
                    #{t}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <aside className="hidden lg:block">
            <div className="sticky top-24">
              <div className="bg-gradient-to-br from-navy-900 to-navy-700 text-white rounded-2xl p-6 mb-6">
                <h3 className="text-lg font-bold mb-2">Stand with us</h3>
                <p className="text-sm text-white/80 mb-4">
                  Every story you read is powered by donors and volunteers. Help us write the next one.
                </p>
                <Link
                  href="/donate"
                  className="inline-flex items-center justify-center w-full h-11 rounded-md btn-gold"
                >
                  Donate now
                </Link>
              </div>
              <div className="rounded-2xl border border-gray-200 p-6">
                <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500 mb-3">
                  Get more stories
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Subscribe to our newsletter for monthly impact updates.
                </p>
                <Link
                  href="/#newsletter"
                  className="text-sm font-semibold text-navy-800 hover:text-brand-600"
                >
                  Subscribe →
                </Link>
              </div>
            </div>
          </aside>
        </div>
      </article>

      {/* Related stories */}
      {related.length > 0 && (
        <section className="bg-gray-50 py-14">
          <div className="container-page">
            <div className="flex items-end justify-between mb-8">
              <h2 className="text-2xl md:text-3xl font-bold text-navy-900">
                Continue reading
              </h2>
              <Link
                href="/blog"
                className="text-sm font-semibold text-navy-800 hover:text-brand-600"
              >
                All stories →
              </Link>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {related.map((r) => (
                <Link
                  key={r.id}
                  href={`/blog/${r.slug}`}
                  className="group block bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"
                >
                  <div className="aspect-[16/10] bg-gray-100 overflow-hidden">
                    {r.cover_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={r.cover_url}
                        alt=""
                        className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
                      />
                    )}
                  </div>
                  <div className="p-5">
                    {r.category && (
                      <span className="text-xs uppercase tracking-wider font-semibold text-brand-600">
                        {r.category}
                      </span>
                    )}
                    <h3 className="mt-1 font-bold text-navy-800 group-hover:text-brand-600 line-clamp-2">
                      {r.title}
                    </h3>
                    {r.excerpt && (
                      <p className="mt-2 text-sm text-gray-600 line-clamp-2">{r.excerpt}</p>
                    )}
                    {r.published_at && (
                      <p className="mt-3 text-xs text-gray-500">{formatDate(r.published_at)}</p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
