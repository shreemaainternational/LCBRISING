import { createClient, createAdminClient } from '@/lib/supabase/server';
import { isSupabaseConfigured, integrations } from '@/lib/env';

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
