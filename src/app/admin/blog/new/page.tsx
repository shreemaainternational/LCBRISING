import { getCurrentMember } from '@/lib/auth';
import { integrations } from '@/lib/env';
import { BlogEditor, type BlogPostForm } from '@/components/admin/BlogEditor';

export const dynamic = 'force-dynamic';

const EMPTY: BlogPostForm = {
  title: '',
  slug: '',
  excerpt: '',
  body: '',
  category: '',
  language: 'en',
  story_type: 'news',
  tags: [],
  cover_url: '',
  hero_quote: '',
  author_name: '',
  is_published: false,
  is_featured: false,
  seo_title: '',
  seo_description: '',
};

export default async function NewBlogPostPage() {
  const me = await getCurrentMember();
  const initial: BlogPostForm = {
    ...EMPTY,
    author_name: me?.name ?? '',
  };

  return (
    <div>
      <h1 className="text-3xl font-bold text-navy-800 mb-1">New post</h1>
      <p className="text-gray-600 mb-6">
        Write a story, generate a draft with AI, or translate an existing piece.
      </p>
      <BlogEditor initial={initial} aiAvailable={integrations.openai} />
    </div>
  );
}
