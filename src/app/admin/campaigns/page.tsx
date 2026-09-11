import Link from 'next/link';
import { Plus, Megaphone } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { formatINR, formatDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';

type Row = {
  id: string;
  title: string;
  slug: string | null;
  goal_amount: number;
  category: string | null;
  is_active: boolean;
  is_featured: boolean | null;
  urgency: string | null;
  ends_at: string | null;
  updated_at: string | null;
};

export default async function AdminCampaignsIndex() {
  let campaigns: Row[] = [];
  let tableMissing = false;
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      const { data, error } = await supabase
        .from('campaigns')
        .select('id, title, slug, goal_amount, category, is_active, is_featured, urgency, ends_at, updated_at')
        .order('updated_at', { ascending: false })
        .limit(100);
      if (error) tableMissing = error.message.includes('does not exist');
      campaigns = (data ?? []) as Row[];
    } catch {
      tableMissing = true;
    }
  }

  const active = campaigns.filter((c) => c.is_active).length;
  const inactive = campaigns.length - active;

  return (
    <div>
      <div className="flex items-start justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-navy-800 mb-1">Campaigns</h1>
          <p className="text-gray-600">
            Manage the fundraising/service campaigns shown on /campaigns. {active} active · {inactive} inactive.
          </p>
        </div>
        <Link
          href="/admin/campaigns/new"
          className="btn-gold inline-flex h-11 px-5 rounded-md items-center gap-2"
        >
          <Plus size={16} aria-hidden /> New campaign
        </Link>
      </div>

      {tableMissing ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-6">
          <p className="font-semibold text-amber-900">Campaigns table not deployed.</p>
          <p className="text-sm text-amber-800 mt-1">
            Run migrations <code>0051_public_site_tables.sql</code>, <code>0052_blog_storytelling.sql</code>,
            and <code>0080_content_relationships.sql</code> on your Supabase project.
          </p>
        </div>
      ) : campaigns.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 p-10 text-center bg-white">
          <Megaphone size={36} className="mx-auto text-gray-400 mb-3" aria-hidden />
          <p className="text-gray-600 mb-4">
            No campaigns yet — /campaigns will show an empty state until you add one.
          </p>
          <Link
            href="/admin/campaigns/new"
            className="btn-navy inline-flex h-10 px-5 rounded-md items-center gap-2"
          >
            <Plus size={16} aria-hidden /> Add first campaign
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase tracking-wider text-gray-500">
              <tr>
                <th className="px-4 py-3">Campaign</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Goal</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Closes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {campaigns.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/campaigns/${c.id}`}
                      className="font-semibold text-navy-800 hover:text-brand-600"
                    >
                      {c.title}
                    </Link>
                    {c.is_featured && (
                      <span className="ml-2 text-[10px] uppercase tracking-wider bg-brand-100 text-brand-800 px-1.5 py-0.5 rounded">
                        Featured
                      </span>
                    )}
                    {c.urgency && c.urgency !== 'normal' && (
                      <span className="ml-2 text-[10px] uppercase tracking-wider bg-red-100 text-red-800 px-1.5 py-0.5 rounded">
                        {c.urgency}
                      </span>
                    )}
                    <div className="text-xs text-gray-500 mt-1">/{c.slug ?? c.id}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-700">{c.category ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-700">{formatINR(Number(c.goal_amount))}</td>
                  <td className="px-4 py-3">
                    {c.is_active ? (
                      <span className="text-xs inline-block bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                        Active
                      </span>
                    ) : (
                      <span className="text-xs inline-block bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">
                        Inactive
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {c.ends_at ? formatDate(c.ends_at) : '—'}
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
