import Link from 'next/link';
import { Plus, HeartHandshake } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { formatDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';

type Row = {
  id: string;
  title: string;
  slug: string | null;
  beneficiary_name: string | null;
  is_published: boolean;
  is_featured: boolean | null;
  published_at: string | null;
  updated_at: string | null;
};

export default async function AdminStoriesIndex() {
  let stories: Row[] = [];
  let tableMissing = false;
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      const { data, error } = await supabase
        .from('stories')
        .select('id, title, slug, beneficiary_name, is_published, is_featured, published_at, updated_at')
        .is('deleted_at', null)
        .order('updated_at', { ascending: false })
        .limit(100);
      if (error) tableMissing = error.message.includes('does not exist');
      stories = (data ?? []) as Row[];
    } catch {
      tableMissing = true;
    }
  }

  const drafts = stories.filter((s) => !s.is_published).length;
  const published = stories.length - drafts;

  return (
    <div>
      <div className="flex items-start justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-navy-800 mb-1">Human Stories</h1>
          <p className="text-gray-600">
            Manage the real beneficiary spotlights shown on /stories. {published} published · {drafts} drafts.
          </p>
        </div>
        <Link
          href="/admin/stories/new"
          className="btn-gold inline-flex h-11 px-5 rounded-md items-center gap-2"
        >
          <Plus size={16} aria-hidden /> New story
        </Link>
      </div>

      {tableMissing ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-6">
          <p className="font-semibold text-amber-900">Stories table not deployed.</p>
          <p className="text-sm text-amber-800 mt-1">
            Run migration <code>0052_blog_storytelling.sql</code> on your Supabase project.
          </p>
        </div>
      ) : stories.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 p-10 text-center bg-white">
          <HeartHandshake size={36} className="mx-auto text-gray-400 mb-3" aria-hidden />
          <p className="text-gray-600 mb-4">
            No stories yet — /stories will show a &quot;coming soon&quot; state until you add one.
          </p>
          <Link
            href="/admin/stories/new"
            className="btn-navy inline-flex h-10 px-5 rounded-md items-center gap-2"
          >
            <Plus size={16} aria-hidden /> Add first story
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase tracking-wider text-gray-500">
              <tr>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Beneficiary</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Published</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {stories.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/stories/${s.id}`}
                      className="font-semibold text-navy-800 hover:text-brand-600"
                    >
                      {s.title}
                    </Link>
                    {s.is_featured && (
                      <span className="ml-2 text-[10px] uppercase tracking-wider bg-brand-100 text-brand-800 px-1.5 py-0.5 rounded">
                        Spotlight
                      </span>
                    )}
                    <div className="text-xs text-gray-500 mt-1">/{s.slug ?? s.id}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-700">{s.beneficiary_name ?? '—'}</td>
                  <td className="px-4 py-3">
                    {s.is_published ? (
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
                    {s.published_at ? formatDate(s.published_at) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
