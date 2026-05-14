import { Heart, Target } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { formatINR, formatINRShort } from '@/lib/utils';

type Campaign = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  goal_amount: number;
  match_campaign: string | null;
};

async function loadCampaign(slug?: string): Promise<{
  campaign: Campaign;
  raised: number;
  donors: number;
} | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const supa = await createClient();
    const q = supa
      .from('campaigns')
      .select('id, slug, title, description, goal_amount, match_campaign')
      .eq('is_active', true);
    const { data: c } = slug
      ? await q.eq('slug', slug).maybeSingle()
      : await q.eq('is_featured', true).limit(1).maybeSingle();
    if (!c) return null;
    const campaign = c as Campaign;

    let donationsQuery = supa.from('donations').select('amount');
    if (campaign.match_campaign) {
      donationsQuery = donationsQuery.eq('campaign', campaign.match_campaign);
    }
    const { data: rows } = await donationsQuery;
    const list = (rows ?? []) as { amount: number | string }[];
    const raised = list.reduce((s, d) => s + Number(d.amount), 0);
    const donors = list.length;

    return { campaign, raised, donors };
  } catch {
    return null;
  }
}

/**
 * Live progress thermometer for a fundraising campaign. Drops in
 * anywhere on the public site. Featured campaign auto-discovered
 * when no slug is passed.
 *
 * Server component — reads live from public.donations each ISR cycle.
 */
export async function DonationThermometer({
  slug,
  compact = false,
}: {
  slug?: string;
  compact?: boolean;
}) {
  const data = await loadCampaign(slug);
  if (!data) return null;

  const { campaign, raised, donors } = data;
  // Show at least a sliver of progress so the bar isn't an empty line.
  const pct = Math.min(100, Math.max(2, (raised / Number(campaign.goal_amount)) * 100));
  const remaining = Math.max(0, Number(campaign.goal_amount) - raised);

  if (compact) {
    return (
      <div className="rounded-xl bg-white border border-gray-200 shadow-sm p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-navy-800">{campaign.title}</span>
          <span className="text-xs text-gray-500">
            <strong className="text-navy-800">{formatINRShort(raised)}</strong> / {formatINRShort(Number(campaign.goal_amount))}
          </span>
        </div>
        <ProgressBar pct={pct} />
        <div className="text-[11px] text-gray-500 mt-1 text-right">{pct.toFixed(0)}% of goal</div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-gradient-to-br from-navy-900 via-navy-800 to-navy-900 text-white p-7 md:p-9 shadow-xl">
      <div className="flex items-center gap-2 text-brand-300 text-xs uppercase tracking-[0.18em] font-semibold mb-3">
        <Target size={14} aria-hidden />
        Active Campaign
      </div>
      <h3 className="text-2xl md:text-3xl font-bold mb-2">{campaign.title}</h3>
      {campaign.description && (
        <p className="text-gray-300 text-sm mb-6 max-w-2xl">{campaign.description}</p>
      )}

      <div className="grid sm:grid-cols-3 gap-4 mb-5">
        <Cell label="Raised" value={formatINR(raised)} highlight />
        <Cell label="Goal" value={formatINR(Number(campaign.goal_amount))} />
        <Cell label="Donors" value={String(donors)} />
      </div>

      <ProgressBar pct={pct} large />
      <div className="flex items-center justify-between text-xs text-gray-300 mt-2">
        <span>{pct.toFixed(1)}% of goal</span>
        {remaining > 0 && (
          <span>
            <Heart size={11} className="inline mb-0.5 text-brand-400" aria-hidden />{' '}
            <strong className="text-white">{formatINR(remaining)}</strong> still needed
          </span>
        )}
      </div>
    </div>
  );
}

function Cell({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-gray-400">{label}</div>
      <div className={`text-xl font-bold tabular-nums ${highlight ? 'text-brand-400' : 'text-white'}`}>
        {value}
      </div>
    </div>
  );
}

function ProgressBar({ pct, large = false }: { pct: number; large?: boolean }) {
  return (
    <div
      className={`relative w-full rounded-full bg-navy-700/40 overflow-hidden ${large ? 'h-4' : 'h-2'}`}
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full bg-gradient-to-r from-brand-400 to-brand-500 transition-all"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
