import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import {
  type MasterItem,
  type ProgrammeType,
  type ActivityRow,
  type EventRow,
  fromActivity,
  fromEvent,
  ACTIVITY_COLUMNS,
  EVENT_COLUMNS,
} from '@/lib/master-calendar-shared';

export * from '@/lib/master-calendar-shared';

/**
 * Consolidated read model for the /activities "Master Activities &
 * Programmes" calendar. Server-only (imports the Supabase server client) —
 * client components should import types/constants from
 * master-calendar-shared instead.
 *
 * There is no separate meetings/leadership_programmes/celebrations/etc.
 * table — this club's data already lives in two tables:
 *   - `activities`  (approved rows) — cause-tagged Service Activities, plus
 *     historical/CSV-imported rows tagged with a granular Meeting /
 *     Leadership / Celebration category (see ACTIVITY_CATEGORY_OPTIONS +
 *     ProgrammeActivitiesPage, which already powers /meetings and
 *     /leadership-programme this way).
 *   - `events` (public rows) — admin-created via the Events quick-add form,
 *     whose `category` field ("Drives the Meeting / Leadership Programme
 *     filters on the website") tags the same programme types.
 *
 * `classifyCategory` (master-calendar-shared) maps a row's `category` onto
 * a MasterItemType using the single EVENT_CATEGORY_GROUPS taxonomy so both
 * sources agree, and this module unions both tables into one normalized
 * list — one fetch each, no per-card query.
 */

/** One consolidated read: every published activity + public event, normalized. */
export async function getMasterCalendarItems(): Promise<MasterItem[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const supabase = await createClient();
    const [{ data: activities }, { data: events }] = await Promise.all([
      supabase
        .from('activities')
        .select(ACTIVITY_COLUMNS)
        .eq('approval_status', 'approved')
        .order('date', { ascending: false })
        .limit(1000),
      supabase
        .from('events')
        .select(EVENT_COLUMNS)
        .eq('is_public', true)
        .order('date', { ascending: false })
        .limit(1000),
    ]);

    const items: MasterItem[] = [
      ...((activities ?? []) as ActivityRow[]).map(fromActivity),
      ...((events ?? []) as EventRow[]).map(fromEvent),
    ];
    items.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
    return items;
  } catch (err) {
    console.error('[master-calendar] read threw:', err);
    return [];
  }
}

/**
 * A single programme item (Meeting / Leadership / Celebration /
 * International Day / International Committee) by id, checked against
 * both source tables and guarded to the requested type only — so
 * /meetings/[id] 404s if that id is actually a Service Activity or a
 * Leadership Programme, per the click-routing rules.
 */
export async function getProgrammeItemById(
  type: ProgrammeType,
  id: string,
): Promise<MasterItem | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const supabase = await createClient();
    const { data: activityRow } = await supabase
      .from('activities')
      .select(ACTIVITY_COLUMNS)
      .eq('id', id)
      .eq('approval_status', 'approved')
      .maybeSingle();
    if (activityRow) {
      const item = fromActivity(activityRow as ActivityRow);
      if (item.type === type) return item;
    }

    const { data: eventRow } = await supabase
      .from('events')
      .select(EVENT_COLUMNS)
      .eq('id', id)
      .eq('is_public', true)
      .maybeSingle();
    if (eventRow) {
      const item = fromEvent(eventRow as EventRow);
      if (item.type === type) return item;
    }

    return null;
  } catch (err) {
    console.error('[master-calendar] byId read threw:', err);
    return null;
  }
}

/** A single approved Service Activity by id (not a Meeting/Leadership/etc). */
export async function getServiceActivityById(id: string): Promise<MasterItem | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from('activities')
      .select(ACTIVITY_COLUMNS)
      .eq('id', id)
      .eq('approval_status', 'approved')
      .maybeSingle();
    if (!data) return null;
    const item = fromActivity(data as ActivityRow);
    return item.type === 'SERVICE_ACTIVITY' ? item : null;
  } catch (err) {
    console.error('[master-calendar] service activity byId read threw:', err);
    return null;
  }
}
