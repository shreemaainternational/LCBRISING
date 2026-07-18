import { PROGRAMME_GROUPS } from '@/lib/event-categories';

/**
 * Single source of truth for the activity `category` options, shared by the
 * mobile Log Activity form, the CRM quick-add + Edit Activity forms, and the
 * public report/label lookups — so the list, slugs and spelling never drift
 * between the app, CRM and website.
 *
 * Cause categories carry the Lions global-cause labels; the Meetings and
 * Leadership Programme sub-categories are pulled from the same taxonomy that
 * drives the public programme pages and their filter tabs.
 */
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

// Meetings / Leadership Programme sub-categories. A sub-category whose label
// already equals its group title (the generic bucket) is shown as just the
// group title; the rest are prefixed for context, e.g. "Meetings · BM".
const PROGRAMME_CATEGORIES: ActivityCategoryOption[] = PROGRAMME_GROUPS.flatMap((g) =>
  g.items.map((i) => ({
    value: i.slug,
    label: i.label === g.title ? g.title : `${g.title} · ${i.label}`,
  })),
);

export const ACTIVITY_CATEGORY_OPTIONS: ActivityCategoryOption[] = [
  ...CAUSE_CATEGORIES,
  ...PROGRAMME_CATEGORIES,
  { value: 'event', label: 'Event' },
  { value: 'other', label: 'Other' },
];

const LABEL_BY_VALUE: Record<string, string> = Object.fromEntries(
  ACTIVITY_CATEGORY_OPTIONS.map((o) => [o.value, o.label]),
);

/** Human label for an activity category slug, with a Title-Case fallback. */
export function activityCategoryLabel(slug: string | null | undefined): string {
  if (!slug) return 'Service Activity';
  return (
    LABEL_BY_VALUE[slug] ??
    slug.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
  );
}
