import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { CampaignEditor, type CampaignForm } from '@/components/admin/CampaignEditor';

export const dynamic = 'force-dynamic';

type Row = {
  id: string;
  slug: string;
  title: string;
  tagline: string | null;
  description: string | null;
  category: string | null;
  goal_amount: number;
  hero_image: string | null;
  impact_metric: string | null;
  urgency: string | null;
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean;
  is_featured: boolean | null;
  match_campaign: boolean | null;
};

const URGENCY = new Set(['normal', 'urgent', 'emergency']);

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
      'id, slug, title, tagline, description, category, goal_amount, hero_image, impact_metric, urgency, starts_at, ends_at, is_active, is_featured, match_campaign',
    )
    .eq('id', id)
    .maybeSingle();
  if (!data) notFound();
  const row = data as Row;

  const initial: CampaignForm = {
    id: row.id,
    title: row.title,
    slug: row.slug,
    tagline: row.tagline ?? '',
    description: row.description ?? '',
    category: row.category ?? '',
    goal_amount: Number(row.goal_amount ?? 0),
    hero_image: row.hero_image ?? '',
    impact_metric: row.impact_metric ?? '',
    urgency: row.urgency && URGENCY.has(row.urgency) ? (row.urgency as CampaignForm['urgency']) : '',
    starts_at: row.starts_at ?? '',
    ends_at: row.ends_at ?? '',
    is_active: row.is_active,
    is_featured: !!row.is_featured,
    match_campaign: !!row.match_campaign,
  };

  return (
    <div>
      <h1 className="text-3xl font-bold text-navy-800 mb-1">Edit campaign</h1>
      <p className="text-gray-600 mb-6">Editing “{row.title}”. Untick Active to archive it.</p>
      <CampaignEditor initial={initial} />
    </div>
  );
}
