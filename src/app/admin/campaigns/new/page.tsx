import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { formatDate } from '@/lib/utils';
import { CampaignEditor, type CampaignForm, type ActivityOption } from '@/components/admin/CampaignEditor';

export const dynamic = 'force-dynamic';

const EMPTY: CampaignForm = {
  title: '',
  slug: '',
  description: '',
  tagline: '',
  goal_amount: 0,
  hero_image: '',
  category: '',
  urgency: '',
  impact_metric: '',
  starts_at: '',
  ends_at: '',
  is_active: true,
  is_featured: false,
  match_campaign: false,
  activity_ids: [],
};

async function loadActivities(): Promise<ActivityOption[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from('activities')
      .select('id, title, date, category')
      .order('date', { ascending: false })
      .limit(300);
    return (data ?? []).map((a) => ({
      id: a.id as string,
      title: a.title as string,
      date: a.date ? formatDate(a.date as string) : null,
      category: (a.category as string | null) ?? null,
    }));
  } catch {
    return [];
  }
}

export default async function NewCampaignPage() {
  const activities = await loadActivities();
  return (
    <div>
      <h1 className="text-3xl font-bold text-navy-800 mb-1">New campaign</h1>
      <p className="text-gray-600 mb-6">
        Add a real, time-bound fundraising or service campaign for the public /campaigns page.
      </p>
      <CampaignEditor initial={EMPTY} activities={activities} />
    </div>
  );
}
