import { createClient, createAdminClient } from '@/lib/supabase/server';
import { isSupabaseConfigured, integrations } from '@/lib/env';
import type { CauseActivity } from '@/components/site/CauseActivities';
import type { ActivityArchiveMonth } from '@/lib/activity-archive';

export type ActivityReport = {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  beneficiaries: number | null;
  service_hours: number | null;
  amount_raised: number | null;
  date: string;
  location: string | null;
  photos: string[];
  captions: Record<string, string>;
};

/**
 * Reader for public activity content. The `activities_public_read` RLS
 * policy is `using (true)`, so the anon client already works — but we mirror
 * the events reader and prefer the service-role client when configured, so a
 * future RLS tightening can't silently blank the website. Falls back to the
 * anon client when no service-role key is set.
 */
async function publicActivityReader() {
  return integrations.supabaseAdmin ? createAdminClient() : await createClient();
}

/**
 * Full report for a single approved activity, combining every media bucket
 * (photos + before/after) into one de-duplicated gallery. Returns null when
 * the activity is missing or not approved for public display.
 */
export async function getActivityReport(id: string): Promise<ActivityReport | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const supabase = await publicActivityReader();
    const { data, error } = await supabase
      .from('activities')
      .select(
        'id, title, description, category, beneficiaries, service_hours, amount_raised, date, location, photos, before_photos, after_photos, photo_captions, approval_status',
      )
      .eq('id', id)
      .maybeSingle();
    if (error) {
      console.error('[activities] report read failed:', error.message);
      return null;
    }
    if (!data) return null;

    const row = data as {
      id: string;
      title: string;
      description: string | null;
      category: string | null;
      beneficiaries: number | null;
      service_hours: number | null;
      amount_raised: number | null;
      date: string;
      location: string | null;
      photos: string[] | null;
      before_photos: string[] | null;
      after_photos: string[] | null;
      photo_captions: Record<string, string> | null;
      approval_status: string | null;
    };

    // Only surface approved activities publicly (matches the cause / programme
    // listing pages). Treat a null status as approved for older rows created
    // before the approval workflow existed.
    if (row.approval_status && row.approval_status !== 'approved') return null;

    return {
      id: row.id,
      title: row.title,
      description: row.description,
      category: row.category,
      beneficiaries: row.beneficiaries,
      service_hours: row.service_hours,
      amount_raised: row.amount_raised,
      date: row.date,
      location: row.location,
      photos: Array.from(
        new Set([
          ...(row.photos ?? []),
          ...(row.before_photos ?? []),
          ...(row.after_photos ?? []),
        ]),
      ).filter(Boolean),
      captions: row.photo_captions ?? {},
    };
  } catch (err) {
    console.error('[activities] report read threw:', err);
    return null;
  }
}

export type { ActivityArchiveMonth };
export { archiveMonthLabel } from '@/lib/activity-archive';

/**
 * Distinct (year, month) buckets that have at least one approved activity,
 * most recent first — powers the "By month & year" nav menu and the
 * /activities/archive index. Grouped in JS from a single date-only query
 * rather than a SQL date_trunc, since this club's activity volume is small
 * enough that it isn't worth a dedicated RPC.
 */
export async function getActivityArchiveMonths(limit = 500): Promise<ActivityArchiveMonth[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const supabase = await publicActivityReader();
    const { data } = await supabase
      .from('activities')
      .select('date, approval_status')
      .order('date', { ascending: false })
      .limit(2000);

    const buckets = new Map<string, ActivityArchiveMonth>();
    for (const row of (data ?? []) as { date: string; approval_status: string | null }[]) {
      if (row.approval_status && row.approval_status !== 'approved') continue;
      const d = new Date(row.date);
      if (Number.isNaN(d.getTime())) continue;
      const year = d.getFullYear();
      const month = d.getMonth() + 1;
      const key = `${year}-${month}`;
      const existing = buckets.get(key);
      if (existing) existing.count += 1;
      else buckets.set(key, { year, month, count: 1 });
    }

    return Array.from(buckets.values())
      .sort((a, b) => (b.year - a.year) || (b.month - a.month))
      .slice(0, limit);
  } catch (err) {
    console.error('[activities] archive months read threw:', err);
    return [];
  }
}

/** Approved activities within one calendar month, newest first. */
export async function getActivitiesForMonth(year: number, month: number): Promise<CauseActivity[]> {
  if (!isSupabaseConfigured()) return [];
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 1);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return [];
  try {
    const supabase = await publicActivityReader();
    const { data } = await supabase
      .from('activities')
      .select(
        'id, title, description, category, beneficiaries, lion_members_count, service_hours, date, location, photos, before_photos, after_photos, photo_captions, approval_status',
      )
      .gte('date', start.toISOString().slice(0, 10))
      .lt('date', end.toISOString().slice(0, 10))
      .order('date', { ascending: false })
      .limit(200);

    type Row = {
      id: string; title: string; description: string | null; category: string | null;
      beneficiaries: number | null; lion_members_count: number | null; service_hours: number | null;
      date: string; location: string | null;
      photos: string[] | null; before_photos: string[] | null; after_photos: string[] | null;
      photo_captions: Record<string, string> | null; approval_status: string | null;
    };

    return ((data ?? []) as Row[])
      .filter((row) => !row.approval_status || row.approval_status === 'approved')
      .map((row) => ({
        id: row.id,
        title: row.title,
        description: row.description,
        category: row.category,
        date: row.date,
        location: row.location,
        beneficiaries: row.beneficiaries,
        lionMembers: row.lion_members_count,
        serviceHours: row.service_hours,
        photos: Array.from(
          new Set([
            ...(row.photos ?? []),
            ...(row.before_photos ?? []),
            ...(row.after_photos ?? []),
          ]),
        ).filter(Boolean),
        captions: row.photo_captions ?? {},
      }));
  } catch (err) {
    console.error('[activities] month read threw:', err);
    return [];
  }
}
