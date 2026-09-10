import {
  Users,
  GraduationCap,
  PartyPopper,
  type LucideIcon,
} from 'lucide-react';

/**
 * Single source of truth for the event categories surfaced in the public
 * "Service Activities" navigation dropdown and used to filter the /events
 * page. Grouped into the two menu sections requested — "Meeting" and
 * "Leadership Programme" — plus "Celebrations & Festivals", where the
 * Nand Mahotsav / Festival / Celebration items now live as events.
 *
 * Each item's `slug` is the value stored in `events.category`, mirroring the
 * lowercase category convention used for activities in `causes.ts`, so a
 * dropdown link (`/events?category=<slug>`) and the events-page filter always
 * agree on which events belong to which category.
 */
export type EventCategory = {
  slug: string;
  label: string;
};

export type EventCategoryGroup = {
  key: string;
  title: string;
  icon: LucideIcon;
  /** Dedicated landing page listing every event in the group.
   *  Groups without a route (e.g. Celebrations) surface as category links. */
  route?: string;
  blurb?: string;
  items: EventCategory[];
};

export const EVENT_CATEGORY_GROUPS: EventCategoryGroup[] = [
  {
    key: 'meeting',
    title: 'Meetings',
    icon: Users,
    route: '/meetings',
    blurb:
      'Conferences, board and general body meetings, official visits and zone advisory sessions of the club.',
    items: [
      { slug: 'conference', label: 'All Conferences' },
      { slug: 'meeting', label: 'Meetings' },
      { slug: 'bm', label: 'BM' },
      { slug: 'gb', label: 'GB' },
      { slug: 'board_meeting', label: 'Board Meeting' },
      { slug: 'official_visit', label: 'RC / ZC / DG Visit' },
      { slug: 'region_staff_meeting', label: 'Region Staff Meeting Region-6' },
      { slug: 'zone_advisory_meeting', label: '1st Zone Advisory Meeting' },
    ],
  },
  {
    key: 'leadership',
    title: 'Leadership Programme',
    icon: GraduationCap,
    route: '/leadership-programme',
    blurb:
      'Installations and the Global Action Team (GAT) and Global Extension Team (GET) leadership conclaves.',
    items: [
      { slug: 'leadership_program', label: 'Leadership Programme' },
      { slug: 'installation', label: 'Installation' },
      { slug: 'gat_conclave', label: 'GAT Conclave' },
      { slug: 'get_conclave', label: 'GET Conclave' },
    ],
  },
  {
    key: 'celebration',
    title: 'Celebrations & Festivals',
    icon: PartyPopper,
    items: [
      { slug: 'nand_mahotsav', label: 'Nand Mahotsav' },
      { slug: 'festival', label: 'Festival' },
      { slug: 'celebration', label: 'Celebration' },
    ],
  },
];

/** Flat list of every event category across all groups. */
export const EVENT_CATEGORIES: EventCategory[] = EVENT_CATEGORY_GROUPS.flatMap(
  (g) => g.items,
);

const CATEGORY_BY_SLUG: Record<string, EventCategory> = Object.fromEntries(
  EVENT_CATEGORIES.map((c) => [c.slug, c]),
);

/** Look up an event category by its slug. Returns undefined when unknown. */
export function getEventCategory(slug: string): EventCategory | undefined {
  return CATEGORY_BY_SLUG[slug];
}

const GROUP_BY_KEY: Record<string, EventCategoryGroup> = Object.fromEntries(
  EVENT_CATEGORY_GROUPS.map((g) => [g.key, g]),
);

/** Look up a category group by its key. Returns undefined when unknown. */
export function getEventCategoryGroup(
  key: string,
): EventCategoryGroup | undefined {
  return GROUP_BY_KEY[key];
}

/** The category slugs belonging to a group, e.g. for an `in` filter. */
export function groupCategorySlugs(group: EventCategoryGroup): string[] {
  return group.items.map((i) => i.slug);
}

/** Groups that have their own landing page (Meetings, Leadership Programme). */
export const PROGRAMME_GROUPS: EventCategoryGroup[] = EVENT_CATEGORY_GROUPS.filter(
  (g) => !!g.route,
);

/** All valid event-category slugs — used for validation. */
export const EVENT_CATEGORY_SLUGS = EVENT_CATEGORIES.map((c) => c.slug);
