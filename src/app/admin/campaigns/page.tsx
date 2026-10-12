import Link from 'next/link';
import { Plus, Target } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { formatINR } from '@/lib/utils';
import { loadCampaignTotals, type CampaignTotal } from '@/lib/campaign-totals';

export const dynamic = 'force-dynamic';

type Row = {
  id: string;
  slug: string;
  title: string;
  goal_amount: number;
  is_active: boolean;
  is_featured: boolean | null;
  urgency: string | null;
  ends_at: string | null;
};

export default async function AdminCampaignsIndex() {
  let campaigns: Row[] = [];
  let totals = new Map<string, CampaignTotal>();
  let loadError: string | null = null;
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      const [{ data, error }, t] = await Promise.all([
        supabase
          .from('campaigns')
          .select('id, slug, title, goal_amount, is_active, is_featured, urgency, ends_at')
          .order('is_active', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(200),
        loadCampaignTotals(supabase),
      ]);
      if (error) loadError = error.message;
      campaigns = (data ?? []) as Row[];
      totals = t;
    } catch (err) {
      loadError = err instanceof Error ? err.message : 'unknown error';
    }
  }

  const active = campaigns.filter((c) => c.is_active).length;

  return (
    <div>
      <div className="flex items-start justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-navy-800 mb-1">Campaigns</h1>
          <p className="text-gray-600">
            Fundraising goals shown on /campaigns and the homepage thermometer. {active} active ·{' '}
            {campaigns.length - active} archived. Donations made via a campaign&apos;s donate link
            count toward it once payment is captured.
          </p>
        </div>
        <Link
          href="/admin/campaigns/new"
          className="btn-gold inline-flex h-11 px-5 rounded-md items-center gap-2 shrink-0"
        >
          <Plus size={16} aria-hidden /> New campaign
        </Link>
      </div>

      {loadError ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
          Could not load campaigns: {loadError}. Make sure migrations 0051, 0052 and 0081 are applied.
        </div>
      ) : campaigns.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 p-10 text-center bg-white">
          <Target size={36} className="mx-auto text-gray-400 mb-3" aria-hidden />
          <p className="text-gray-600 mb-4">
            No campaigns yet — /campaigns shows a general-donation prompt until you add one.
          </p>
          <Link
            href="/admin/campaigns/new"
            className="btn-navy inline-flex h-10 px-5 rounded-md items-center gap-2"
          >
            <Plus size={16} aria-hidden /> Create first campaign
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase tracking-wider text-gray-500">
              <tr>
                <th className="px-4 py-3">Campaign</th>
                <th className="px-4 py-3">Raised / goal</th>
                <th className="px-4 py-3">Donors</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {campaigns.map((c) => {
                const t = totals.get(c.slug) ?? { raised: 0, donors: 0 };
                const goal = Number(c.goal_amount);
                const pct = goal > 0 ? Math.min(100, (t.raised / goal) * 100) : 0;
                return (
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
                      {(c.urgency === 'urgent' || c.urgency === 'emergency') && (
                        <span className="ml-2 text-[10px] uppercase tracking-wider bg-red-100 text-red-800 px-1.5 py-0.5 rounded">
                          {c.urgency}
                        </span>
                      )}
                      <div className="text-xs text-gray-500 mt-1 font-mono">{c.slug}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-700 tabular-nums">
                      {formatINR(t.raised)} / {formatINR(goal)}
                      <span className="ml-1 text-xs text-gray-500">({pct.toFixed(0)}%)</span>
                    </td>
                    <td className="px-4 py-3 text-gray-700 tabular-nums">{t.donors}</td>
                    <td className="px-4 py-3">
                      {c.is_active ? (
                        <span className="text-xs inline-block bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                          Active
                        </span>
                      ) : (
                        <span className="text-xs inline-block bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">
                          Archived
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
