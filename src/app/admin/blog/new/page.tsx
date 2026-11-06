import { getCurrentMember } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { integrations, isSupabaseConfigured } from '@/lib/env';
import { BlogEditor, type BlogPostForm, type StoryOption, type CampaignOption } from '@/components/admin/BlogEditor';

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
  story_id: null,
  campaign_id: null,
};

async function loadOptions(): Promise<{ stories: StoryOption[]; campaigns: CampaignOption[] }> {
  if (!isSupabaseConfigured()) return { stories: [], campaigns: [] };
  try {
    const supabase = await createClient();
    const [{ data: stories }, { data: campaigns }] = await Promise.all([
      supabase.from('stories').select('id, title').is('deleted_at', null).order('title'),
      supabase.from('campaigns').select('id, title').order('title'),
    ]);
    return { stories: (stories ?? []) as StoryOption[], campaigns: (campaigns ?? []) as CampaignOption[] };
  } catch {
    return { stories: [], campaigns: [] };
  }
}

export default async function NewBlogPostPage() {
  const [me, { stories, campaigns }] = await Promise.all([getCurrentMember(), loadOptions()]);
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
      <BlogEditor initial={initial} aiAvailable={integrations.openai} stories={stories} campaigns={campaigns} />
    </div>
  );
}
