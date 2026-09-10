import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import {
  StoryEditor,
  type StoryForm,
  type CampaignOption,
  type ActivityOption,
} from '@/components/admin/StoryEditor';

export const dynamic = 'force-dynamic';

const EMPTY: StoryForm = {
  title: '',
  slug: '',
  subtitle: '',
  beneficiary_name: '',
  beneficiary_age: null,
  location: '',
  hero_image: '',
  before_image: '',
  after_image: '',
  body: '',
  impact_quote: '',
  impact_metric: '',
  tags: [],
  campaign_id: '',
  activity_id: '',
  is_published: false,
  is_featured: false,
};

async function loadOptions(): Promise<{ campaigns: CampaignOption[]; activities: ActivityOption[] }> {
  if (!isSupabaseConfigured()) return { campaigns: [], activities: [] };
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

export default async function NewStoryPage() {
  const { campaigns, activities } = await loadOptions();
  return (
    <div>
      <h1 className="text-3xl font-bold text-navy-800 mb-1">New story</h1>
      <p className="text-gray-600 mb-6">
        Add a real, consented beneficiary story for the public /stories page.
      </p>
      <StoryEditor initial={EMPTY} campaignOptions={campaigns} activityOptions={activities} />
    </div>
  );
}
