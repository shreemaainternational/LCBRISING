import { collectActivityPhotos } from '@/lib/activity-media';
import { EVENT_CATEGORY_GROUPS, type EventCategoryGroup } from '@/lib/event-categories';

/**
 * Types, classification and normalization shared by the server-only data
 * fetchers (master-calendar.ts) and client components (MasterActivitiesBoard,
 * MasterActivityCard) — kept in its own module with no `next/headers` /
 * Supabase server-client import so it can be bundled into the client
 * without dragging server-only code along.
 */

export type MasterItemType =
  | 'SERVICE_ACTIVITY'
  | 'MEETING'
  | 'LEADERSHIP_PROGRAMME'
  | 'CELEBRATION'
  | 'INTERNATIONAL_DAY'
  | 'INTERNATIONAL_COMMITTEE'
  | 'EVENT';

/** Programme types that can live in either `activities` or `events`. */
export type ProgrammeType = Exclude<MasterItemType, 'SERVICE_ACTIVITY' | 'EVENT'>;

const GROUP_KEY_TO_TYPE: Record<string, ProgrammeType> = {
  meeting: 'MEETING',
  leadership: 'LEADERSHIP_PROGRAMME',
  celebration: 'CELEBRATION',
  international_day: 'INTERNATIONAL_DAY',
  international_committee: 'INTERNATIONAL_COMMITTEE',
};

/** Real status values found on public.activities / public.events. Do not
 *  invent statuses that don't exist in the data (e.g. "confirmed",
 *  "tentative", "postponed"). */
export const REAL_STATUSES = ['planned', 'in_progress', 'completed', 'cancelled'] as const;
export type RealStatus = (typeof REAL_STATUSES)[number];

export const STATUS_LABEL: Record<string, string> = {
  planned: 'Planned',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export type MasterItem = {
  /** Unique React key: `${source}:${source_id}`. */
  id: string;
  source: 'activities' | 'events';
  source_id: string;
  type: MasterItemType;
  title: string;
  description: string | null;
  /** ISO date (YYYY-MM-DD). */
  date: string;
  venue: string | null;
  status: string | null;
  beneficiaries: number | null;
  participants: number | null;
  photos: string[];
  href: string;
  ctaLabel: string;
};

export const MASTER_TYPE_LABEL: Record<MasterItemType, string> = {
  SERVICE_ACTIVITY: 'Service Activity',
  MEETING: 'Meeting',
  LEADERSHIP_PROGRAMME: 'Leadership Programme',
  CELEBRATION: 'Celebration',
  INTERNATIONAL_DAY: 'International Day',
  INTERNATIONAL_COMMITTEE: 'International Committee',
  EVENT: 'Event',
};

function hrefFor(type: MasterItemType, id: string): string {
  switch (type) {
    case 'SERVICE_ACTIVITY': return `/activities/${id}`;
    case 'MEETING': return `/meetings/${id}`;
    case 'LEADERSHIP_PROGRAMME': return `/leadership/${id}`;
    case 'CELEBRATION': return `/celebrations/${id}`;
    case 'INTERNATIONAL_DAY': return `/international-days/${id}`;
    case 'INTERNATIONAL_COMMITTEE': return `/international-committee/${id}`;
    case 'EVENT': return `/events/${id}`;
  }
}

function ctaLabelFor(type: MasterItemType): string {
  switch (type) {
    case 'SERVICE_ACTIVITY': return 'View Activity';
    case 'LEADERSHIP_PROGRAMME': return 'View Programme';
    default: return 'View Details';
  }
}

/** Category slug -> which group it belongs to, precomputed once. */
const CATEGORY_TO_GROUP = new Map<string, EventCategoryGroup>();
for (const group of EVENT_CATEGORY_GROUPS) {
  for (const item of group.items) CATEGORY_TO_GROUP.set(item.slug, group);
}

export function classifyCategory(category: string | null | undefined): MasterItemType {
  if (!category) return 'SERVICE_ACTIVITY';
  const group = CATEGORY_TO_GROUP.get(category);
  const type = group ? GROUP_KEY_TO_TYPE[group.key] : undefined;
  return type ?? 'SERVICE_ACTIVITY';
}

export type ActivityRow = {
  id: string;
  title: string;
  description: string | null;
  date: string;
  location: string | null;
  beneficiaries: number | null;
  category: string | null;
  status: string | null;
  photos: string[] | null;
  before_photos: string[] | null;
  after_photos: string[] | null;
  videos: string[] | null;
};

export type EventRow = {
  id: string;
  title: string;
  description: string | null;
  date: string;
  location: string | null;
  capacity: number | null;
  category: string | null;
  status: string | null;
  cover_url: string | null;
  photos: string[] | null;
};

export function fromActivity(a: ActivityRow): MasterItem {
  const type = classifyCategory(a.category);
  const id = a.id;
  return {
    id: `activities:${id}`,
    source: 'activities',
    source_id: id,
    type,
    title: a.title,
    description: a.description,
    date: a.date.slice(0, 10),
    venue: a.location,
    status: a.status,
    beneficiaries: a.beneficiaries,
    participants: null,
    photos: collectActivityPhotos(a),
    href: hrefFor(type, id),
    ctaLabel: ctaLabelFor(type),
  };
}

export function fromEvent(e: EventRow): MasterItem {
  const classified = classifyCategory(e.category);
  const type: MasterItemType = classified === 'SERVICE_ACTIVITY' ? 'EVENT' : classified;
  const id = e.id;
  const photos = e.photos && e.photos.length > 0 ? e.photos : e.cover_url ? [e.cover_url] : [];
  return {
    id: `events:${id}`,
    source: 'events',
    source_id: id,
    type,
    title: e.title,
    description: e.description,
    date: e.date.slice(0, 10),
    venue: e.location,
    status: e.status,
    beneficiaries: null,
    participants: e.capacity,
    photos,
    href: hrefFor(type, id),
    ctaLabel: ctaLabelFor(type),
  };
}

export const ACTIVITY_COLUMNS =
  'id, title, description, date, location, beneficiaries, category, status, photos, before_photos, after_photos, videos';
export const EVENT_COLUMNS =
  'id, title, description, date, location, capacity, category, status, cover_url, photos';

/** The Lionistic Year 2026-27 calendar months, Jul 2026 through Jun 2027. */
export const LIONISTIC_YEAR_MONTHS: { value: string; label: string }[] = (() => {
  const months: { value: string; label: string }[] = [];
  let year = 2026;
  let month = 7; // July
  for (let i = 0; i < 12; i++) {
    const value = `${year}-${String(month).padStart(2, '0')}`;
    const label = new Date(Date.UTC(year, month - 1, 1))
      .toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' })
      .toUpperCase();
    months.push({ value, label });
    month += 1;
    if (month > 12) { month = 1; year += 1; }
  }
  return months;
})();

export function monthKeyOf(date: string): string {
  return date.slice(0, 7);
}
