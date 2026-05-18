import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured, integrations } from '@/lib/env';
import { BlogEditor, type BlogPostForm } from '@/components/admin/BlogEditor';

export const dynamic = 'force-dynamic';

type Row = {
  id: string;
  title: string;
  slug: string | null;
  excerpt: string | null;
  body: string | null;
  category: string | null;
  language: string | null;
  story_type: string | null;
  tags: string[] | null;
  cover_url: string | null;
  hero_quote: string | null;
  author_name: string | null;
  is_published: boolean;
  is_featured: boolean | null;
  seo_title: string | null;
  seo_description: string | null;
  reading_time: number | null;
};

export default async function EditBlogPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!isSupabaseConfigured()) notFound();
  const supabase = await createClient();
  const { data } = await supabase
    .from('blog_posts')
    .select(
      'id, title, slug, excerpt, body, category, language, story_type, tags, cover_url, hero_quote, author_name, is_published, is_featured, seo_title, seo_description, reading_time',
    )
    .eq('id', id)
    .maybeSingle();
  if (!data) notFound();
  const row = data as Row;

  const initial: BlogPostForm = {
    id: row.id,
    title: row.title,
    slug: row.slug ?? '',
    excerpt: row.excerpt ?? '',
    body: row.body ?? '',
    category: row.category ?? '',
    language: (row.language as 'en' | 'gu' | 'hi') ?? 'en',
    story_type: (row.story_type as BlogPostForm['story_type']) ?? 'news',
    tags: row.tags ?? [],
    cover_url: row.cover_url ?? '',
    hero_quote: row.hero_quote ?? '',
    author_name: row.author_name ?? '',
    is_published: row.is_published,
    is_featured: !!row.is_featured,
    seo_title: row.seo_title ?? '',
    seo_description: row.seo_description ?? '',
    reading_time: row.reading_time ?? undefined,
  };

  return (
    <div>
      <h1 className="text-3xl font-bold text-navy-800 mb-1">Edit post</h1>
      <p className="text-gray-600 mb-6">Editing “{row.title}”.</p>
      <BlogEditor initial={initial} aiAvailable={integrations.openai} />
    </div>
  );
}
