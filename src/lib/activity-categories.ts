/**
 * Single source of truth for the activity `category` options, shared by the
 * mobile Log Activity form, the CRM quick-add + Edit Activity forms, and the
 * public report/label lookups — so the list, slugs and spelling never drift
 * between the app, CRM and website.
 *
 * The dropdown keeps only the top-level buckets: the Lions global causes plus
 * the generic Meeting, Leadership Programme, Event and Other. The granular
 * Meetings / Leadership Programme sub-types (BM, GB, Installation, …) were
 * removed from the picker to keep it short; they still exist as filter tabs on
 * the public programme pages.
 */
import { getEventCategory } from '@/lib/event-categories';

export type ActivityCategoryOption = { value: string; label: string };

const CAUSE_CATEGORIES: ActivityCategoryOption[] = [
  { value: 'vision', label: 'Vision' },
  { value: 'hunger', label: 'Hunger Relief' },
  { value: 'environment', label: 'Environment' },
  { value: 'relief', label: 'Disaster Relief' },
  { value: 'diabetes', label: 'Diabetes Awareness' },
  { value: 'childhood_cancer', label: 'Childhood Cancer' },
  { value: 'humanitarian', label: 'Humanitarian' },
  { value: 'youth', label: 'Youth Development' },
  { value: 'education', label: 'Education' },
  { value: 'healthcare', label: 'Healthcare' },
  { value: 'women', label: 'Women Empowerment' },
  { value: 'senior', label: 'Senior Citizens' },
];

export const ACTIVITY_CATEGORY_OPTIONS: ActivityCategoryOption[] = [
  ...CAUSE_CATEGORIES,
  { value: 'meeting', label: 'Meeting' },
  { value: 'leadership_program', label: 'Leadership Programme' },
  { value: 'event', label: 'Event' },
  { value: 'other', label: 'Other' },
];

const LABEL_BY_VALUE: Record<string, string> = Object.fromEntries(
  ACTIVITY_CATEGORY_OPTIONS.map((o) => [o.value, o.label]),
);

/**
 * Human label for an activity category slug. Falls back to the event-category
 * taxonomy so activities still tagged with a granular programme slug (no longer
 * offered in the picker) keep a clean label, then to Title Case.
 */
export function activityCategoryLabel(slug: string | null | undefined): string {
  if (!slug) return 'Service Activity';
  return (
    LABEL_BY_VALUE[slug] ??
    getEventCategory(slug)?.label ??
    slug.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
  );
}
