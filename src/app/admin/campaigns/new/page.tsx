import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { CampaignEditor, type CampaignForm, type ActivityOption } from '@/components/admin/CampaignEditor';

export const dynamic = 'force-dynamic';

const EMPTY: CampaignForm = {
  title: '',
  slug: '',
  description: '',
  tagline: '',
  goal_amount: 0,
  currency: 'INR',
  starts_at: '',
  ends_at: '',
  hero_image: '',
  urgency: '',
  impact_metric: '',
  category: '',
  match_campaign: false,
  is_active: true,
  is_featured: false,
  activity_ids: [],
};

async function loadActivityOptions(): Promise<ActivityOption[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from('activities')
    .select('id, title, date, category')
    .order('date', { ascending: false })
    .limit(300);
  return (data ?? []) as ActivityOption[];
}

export default async function NewCampaignPage() {
  const activityOptions = await loadActivityOptions();
  return (
    <div>
      <h1 className="text-3xl font-bold text-navy-800 mb-1">New campaign</h1>
      <p className="text-gray-600 mb-6">
        Add a real, time-bound fundraising campaign for the public /campaigns page.
      </p>
      <CampaignEditor initial={EMPTY} activityOptions={activityOptions} />
    </div>
  );
}
