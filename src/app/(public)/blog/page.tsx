import type { Metadata } from 'next';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { Card, CardContent } from '@/components/ui/card';
import { formatDate } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Blog',
  description: 'Stories, reflections, and updates from Lions Club Baroda Rising Star.',
};
export const revalidate = 300;

type BlogPost = {
  id: string;
  title: string;
  slug: string | null;
  excerpt: string | null;
  cover_url: string | null;
  published_at: string | null;
  author: string | null;
};

export default async function BlogPage() {
  let posts: BlogPost[] = [];
  // Best-effort fetch — if the blog_posts table exists, we use it; otherwise
  // we silently fall back to the empty state below.
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      const { data } = await supabase
        .from('blog_posts')
        .select('id, title, slug, excerpt, cover_url, published_at, author')
        .order('published_at', { ascending: false })
        .limit(20);
      posts = (data ?? []) as BlogPost[];
    } catch {
      // table may not exist yet; render coming-soon
    }
  }

  return (
    <section className="container-page py-16">
      <header className="mb-10 max-w-2xl">
        <p className="text-xs uppercase tracking-[0.18em] text-brand-600 font-semibold mb-2">
          Lions Club Baroda Rising Star · Blog
        </p>
        <h1 className="text-4xl font-bold text-navy-800 mb-3">Stories from the field</h1>
        <p className="text-gray-600">
          Reflections from our members, project recaps, and updates from District
          3232-F1. We post here whenever a project closes or an officer has
          something to share.
        </p>
      </header>

      {posts.length === 0 ? (
        <Card className="bg-gradient-to-br from-brand-50 to-white border-brand-200">
          <CardContent className="p-10 text-center">
            <h2 className="text-2xl font-semibold text-navy-800 mb-2">
              First post coming soon
            </h2>
            <p className="text-gray-600 max-w-md mx-auto mb-6">
              We&rsquo;re collecting stories from recent service projects. In the
              meantime, browse our recent{' '}
              <Link href="/activities" className="text-brand-700 underline">
                Activities
              </Link>{' '}
              or{' '}
              <Link href="/events" className="text-brand-700 underline">
                upcoming Events
              </Link>
              .
            </p>
            <Link
              href="/contact"
              className="inline-flex rounded-md bg-navy-800 hover:bg-navy-900 text-white px-5 py-2.5 text-sm font-medium"
            >
              Suggest a story →
            </Link>
          </CardContent>
        </Card>
      ) : (
        <ul className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {posts.map((p) => (
            <li key={p.id}>
              <Link href={`/blog/${p.slug ?? p.id}`} className="block group">
                <Card className="h-full overflow-hidden hover:shadow-md transition-shadow">
                  {p.cover_url && (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={p.cover_url}
                      alt=""
                      className="w-full h-44 object-cover"
                    />
                  )}
                  <CardContent className="p-5">
                    <p className="text-xs text-gray-500">
                      {p.published_at ? formatDate(p.published_at) : '—'}
                      {p.author && ` · ${p.author}`}
                    </p>
                    <h3 className="text-lg font-semibold text-navy-800 mt-1 mb-2 group-hover:text-brand-700">
                      {p.title}
                    </h3>
                    {p.excerpt && (
                      <p className="text-sm text-gray-600 line-clamp-3">{p.excerpt}</p>
                    )}
                  </CardContent>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
