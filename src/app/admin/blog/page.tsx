import Link from 'next/link';
import { Plus, FileText, Sparkles, Coins } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured, integrations } from '@/lib/env';
import { formatDate } from '@/lib/utils';
import { LionsBlogSyncButton } from '@/components/admin/LionsBlogSyncButton';

export const dynamic = 'force-dynamic';

type Row = {
  id: string;
  title: string;
  slug: string | null;
  category: string | null;
  language: string | null;
  is_published: boolean;
  is_featured: boolean | null;
  story_type: string | null;
  published_at: string | null;
  view_count: number | null;
  updated_at: string | null;
  author_name: string | null;
};

export default async function AdminBlogIndex() {
  let posts: Row[] = [];
  let tableMissing = false;
  let aiSpend = { calls: 0, cost_usd: 0 };
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      const startOfMonth = new Date(
        Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1),
      ).toISOString();
      const [postsRes, usageRes] = await Promise.all([
        supabase
          .from('blog_posts')
          .select(
            'id, title, slug, category, language, is_published, is_featured, story_type, published_at, view_count, updated_at, author_name',
          )
          .order('updated_at', { ascending: false })
          .limit(100),
        supabase
          .from('ai_generations')
          .select('cost_usd')
          .gte('created_at', startOfMonth),
      ]);
      if (postsRes.error)
        tableMissing = postsRes.error.message.includes('does not exist');
      posts = (postsRes.data ?? []) as Row[];
      const usageRows = (usageRes.data ?? []) as Array<{ cost_usd: number | null }>;
      aiSpend = {
        calls: usageRows.length,
        cost_usd: usageRows.reduce((s, r) => s + (Number(r.cost_usd) || 0), 0),
      };
    } catch {
      tableMissing = true;
    }
  }

  const drafts = posts.filter((p) => !p.is_published).length;
  const published = posts.length - drafts;

  return (
    <div>
      <div className="flex items-start justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-navy-800 mb-1">Newsroom</h1>
          <p className="text-gray-600">
            Manage blog posts, news, and stories. {published} published · {drafts} drafts.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {integrations.openai && (
            <div className="hidden md:flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 bg-white text-xs">
              <Coins size={14} className="text-brand-600" aria-hidden />
              <div className="leading-tight">
                <div className="font-semibold text-navy-800">
                  ${aiSpend.cost_usd.toFixed(4)}
                </div>
                <div className="text-gray-500">
                  AI spend this month · {aiSpend.calls} call{aiSpend.calls === 1 ? '' : 's'}
                </div>
              </div>
            </div>
          )}
          <LionsBlogSyncButton />
          <Link
            href="/admin/blog/new"
            className="btn-gold inline-flex h-11 px-5 rounded-md items-center gap-2"
          >
            <Plus size={16} aria-hidden /> New post
          </Link>
        </div>
      </div>

      {!integrations.openai && (
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 flex items-start gap-3">
          <Sparkles size={18} className="text-amber-600 mt-0.5" aria-hidden />
          <div>
            <strong>AI writer is offline.</strong> Add{' '}
            <code className="bg-white/60 px-1 rounded">OPENAI_API_KEY</code> in your Vercel project
            settings to enable AI draft, title brainstorm, SEO meta, and Gujarati / Hindi
            translation.
          </div>
        </div>
      )}

      {tableMissing ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-6">
          <p className="font-semibold text-amber-900">Blog table not deployed.</p>
          <p className="text-sm text-amber-800 mt-1">
            Run migration <code>0052_blog_storytelling.sql</code> (and the earlier
            <code> 0051_public_site_tables.sql</code>) on your Supabase project.
          </p>
        </div>
      ) : posts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 p-10 text-center bg-white">
          <FileText size={36} className="mx-auto text-gray-400 mb-3" aria-hidden />
          <p className="text-gray-600 mb-4">No posts yet. Draft your first story to get going.</p>
          <Link
            href="/admin/blog/new"
            className="btn-navy inline-flex h-10 px-5 rounded-md items-center gap-2"
          >
            <Plus size={16} aria-hidden /> Create post
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase tracking-wider text-gray-500">
              <tr>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Lang</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Published</th>
                <th className="px-4 py-3 text-right">Views</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {posts.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/blog/${p.id}`}
                      className="font-semibold text-navy-800 hover:text-brand-600"
                    >
                      {p.title}
                    </Link>
                    {p.is_featured && (
                      <span className="ml-2 text-[10px] uppercase tracking-wider bg-brand-100 text-brand-800 px-1.5 py-0.5 rounded">
                        Featured
                      </span>
                    )}
                    <div className="text-xs text-gray-500 mt-1">
                      /{p.slug ?? p.id} · {p.author_name ?? 'Unattributed'}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-700">{p.category ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-700 capitalize">{p.story_type ?? 'news'}</td>
                  <td className="px-4 py-3 text-gray-700 uppercase text-xs">{p.language ?? 'en'}</td>
                  <td className="px-4 py-3">
                    {p.is_published ? (
                      <span className="text-xs inline-block bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                        Published
                      </span>
                    ) : (
                      <span className="text-xs inline-block bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">
                        Draft
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {p.published_at ? formatDate(p.published_at) : '—'}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-700">{p.view_count ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
