import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { CampaignEditor, type CampaignForm, type ActivityOption } from '@/components/admin/CampaignEditor';

export const dynamic = 'force-dynamic';

type Row = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  tagline: string | null;
  goal_amount: number;
  currency: string;
  starts_at: string | null;
  ends_at: string | null;
  hero_image: string | null;
  urgency: string | null;
  impact_metric: string | null;
  category: string | null;
  match_campaign: boolean;
  is_active: boolean;
  is_featured: boolean | null;
};

function toDateInput(v: string | null): string {
  if (!v) return '';
  return v.slice(0, 10);
}

async function loadActivityOptions(): Promise<ActivityOption[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('activities')
    .select('id, title, date, category')
    .order('date', { ascending: false })
    .limit(300);
  return (data ?? []) as ActivityOption[];
}

async function loadLinkedActivityIds(campaignId: string): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('campaign_activities')
    .select('activity_id')
    .eq('campaign_id', campaignId);
  return (data ?? []).map((r) => (r as { activity_id: string }).activity_id);
}

export default async function EditCampaignPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!isSupabaseConfigured()) notFound();
  const supabase = await createClient();
  const { data } = await supabase
    .from('campaigns')
    .select(
      'id, title, slug, description, tagline, goal_amount, currency, starts_at, ends_at, hero_image, urgency, impact_metric, category, match_campaign, is_active, is_featured',
    )
    .eq('id', id)
    .maybeSingle();
  if (!data) notFound();
  const row = data as Row;

  const [activityOptions, activityIds] = await Promise.all([
    loadActivityOptions(),
    loadLinkedActivityIds(row.id),
  ]);

  const initial: CampaignForm = {
    id: row.id,
    title: row.title,
    slug: row.slug,
    description: row.description ?? '',
    tagline: row.tagline ?? '',
    goal_amount: Number(row.goal_amount),
    currency: row.currency || 'INR',
    starts_at: toDateInput(row.starts_at),
    ends_at: toDateInput(row.ends_at),
    hero_image: row.hero_image ?? '',
    urgency: row.urgency ?? '',
    impact_metric: row.impact_metric ?? '',
    category: row.category ?? '',
    match_campaign: !!row.match_campaign,
    is_active: row.is_active,
    is_featured: !!row.is_featured,
    activity_ids: activityIds,
  };

  return (
    <div>
      <h1 className="text-3xl font-bold text-navy-800 mb-1">Edit campaign</h1>
      <p className="text-gray-600 mb-6">Editing “{row.title}”.</p>
      <CampaignEditor initial={initial} activityOptions={activityOptions} />
    </div>
  );
}
