import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import {
  StoryEditor,
  type StoryForm,
  type CampaignOption,
  type ActivityOption,
} from '@/components/admin/StoryEditor';

export const dynamic = 'force-dynamic';

type Row = {
  id: string;
  title: string;
  slug: string | null;
  subtitle: string | null;
  beneficiary_name: string | null;
  beneficiary_age: number | null;
  location: string | null;
  hero_image: string | null;
  before_image: string | null;
  after_image: string | null;
  body: string | null;
  impact_quote: string | null;
  impact_metric: string | null;
  tags: string[] | null;
  campaign_id: string | null;
  activity_id: string | null;
  is_published: boolean;
  is_featured: boolean | null;
};

async function loadOptions(): Promise<{ campaigns: CampaignOption[]; activities: ActivityOption[] }> {
  const supabase = await createClient();
  const [{ data: campaigns }, { data: activities }] = await Promise.all([
    supabase.from('campaigns').select('id, title').eq('is_active', true).order('title'),
    supabase.from('activities').select('id, title, date').order('date', { ascending: false }).limit(300),
  ]);
  return {
    campaigns: (campaigns ?? []) as CampaignOption[],
    activities: (activities ?? []) as ActivityOption[],
  };
}

export default async function EditStoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!isSupabaseConfigured()) notFound();
  const supabase = await createClient();
  const { data } = await supabase
    .from('stories')
    .select(
      'id, title, slug, subtitle, beneficiary_name, beneficiary_age, location, hero_image, before_image, after_image, body, impact_quote, impact_metric, tags, campaign_id, activity_id, is_published, is_featured',
    )
    .eq('id', id)
    .maybeSingle();
  if (!data) notFound();
  const row = data as Row;
  const { campaigns, activities } = await loadOptions();

  const initial: StoryForm = {
    id: row.id,
    title: row.title,
    slug: row.slug ?? '',
    subtitle: row.subtitle ?? '',
    beneficiary_name: row.beneficiary_name ?? '',
    beneficiary_age: row.beneficiary_age,
    location: row.location ?? '',
    hero_image: row.hero_image ?? '',
    before_image: row.before_image ?? '',
    after_image: row.after_image ?? '',
    body: row.body ?? '',
    impact_quote: row.impact_quote ?? '',
    impact_metric: row.impact_metric ?? '',
    tags: row.tags ?? [],
    campaign_id: row.campaign_id ?? '',
    activity_id: row.activity_id ?? '',
    is_published: row.is_published,
    is_featured: !!row.is_featured,
  };

  return (
    <div>
      <h1 className="text-3xl font-bold text-navy-800 mb-1">Edit story</h1>
      <p className="text-gray-600 mb-6">Editing “{row.title}”.</p>
      <StoryEditor initial={initial} campaignOptions={campaigns} activityOptions={activities} />
    </div>
  );
}
