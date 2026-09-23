import { CampaignEditor, type CampaignForm } from '@/components/admin/CampaignEditor';

export const dynamic = 'force-dynamic';

const EMPTY: CampaignForm = {
  title: '',
  slug: '',
  tagline: '',
  description: '',
  category: '',
  goal_amount: 0,
  hero_image: '',
  impact_metric: '',
  urgency: '',
  starts_at: '',
  ends_at: '',
  is_active: true,
  is_featured: false,
  match_campaign: false,
};

export default function NewCampaignPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-navy-800 mb-1">New campaign</h1>
      <p className="text-gray-600 mb-6">
        Set a real, time-bound fundraising goal. It appears on /campaigns as soon as it&apos;s active.
      </p>
      <CampaignEditor initial={EMPTY} />
    </div>
  );
}
