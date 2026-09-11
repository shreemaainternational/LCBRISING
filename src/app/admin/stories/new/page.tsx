import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { formatDate } from '@/lib/utils';
import { StoryEditor, type StoryForm, type ActivityOption, type CampaignOption } from '@/components/admin/StoryEditor';

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
  is_published: false,
  is_featured: false,
  activity_id: null,
  campaign_id: null,
};

async function loadOptions(): Promise<{ activities: ActivityOption[]; campaigns: CampaignOption[] }> {
  if (!isSupabaseConfigured()) return { activities: [], campaigns: [] };
  try {
    const supabase = await createClient();
    const [{ data: activities }, { data: campaigns }] = await Promise.all([
      supabase.from('activities').select('id, title, date').order('date', { ascending: false }).limit(300),
      supabase.from('campaigns').select('id, title').order('title'),
    ]);
    return {
      activities: (activities ?? []).map((a) => ({
        id: a.id as string,
        title: a.title as string,
        date: a.date ? formatDate(a.date as string) : null,
      })),
      campaigns: (campaigns ?? []) as CampaignOption[],
    };
  } catch {
    return { activities: [], campaigns: [] };
  }
}

export default async function NewStoryPage() {
  const { activities, campaigns } = await loadOptions();
  return (
    <div>
      <h1 className="text-3xl font-bold text-navy-800 mb-1">New story</h1>
      <p className="text-gray-600 mb-6">
        Add a real, consented beneficiary story for the public /stories page.
      </p>
      <StoryEditor initial={EMPTY} activities={activities} campaigns={campaigns} />
    </div>
  );
}
