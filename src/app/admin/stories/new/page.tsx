import { StoryEditor, type StoryForm } from '@/components/admin/StoryEditor';

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
};

export default function NewStoryPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-navy-800 mb-1">New story</h1>
      <p className="text-gray-600 mb-6">
        Add a real, consented beneficiary story for the public /stories page.
      </p>
      <StoryEditor initial={EMPTY} />
    </div>
  );
}
