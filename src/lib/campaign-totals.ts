import type { SupabaseClient } from '@supabase/supabase-js';

export type CampaignTotal = { raised: number; donors: number };

/**
 * Raised / donor counts per campaign slug, via the public
 * `campaign_totals()` RPC (migration 0081). Donations are tagged with the
 * campaign slug in `donations.campaign`; only captured or admin-recorded
 * donations are counted. Returns an empty map (and logs) on failure so
 * public pages degrade to "₹0 raised" rather than erroring.
 */
export async function loadCampaignTotals(
  supabase: SupabaseClient,
): Promise<Map<string, CampaignTotal>> {
  const totals = new Map<string, CampaignTotal>();
  const { data, error } = await supabase.rpc('campaign_totals');
  if (error) {
    console.error('[campaign-totals] rpc failed:', error.message);
    return totals;
  }
  for (const row of (data ?? []) as { campaign: string; raised: number | string; donors: number | string }[]) {
    if (!row.campaign) continue;
    totals.set(row.campaign, { raised: Number(row.raised ?? 0), donors: Number(row.donors ?? 0) });
  }
  return totals;
}
