import { createClient, createAdminClient } from '@/lib/supabase/server';
import { isSupabaseConfigured, integrations } from '@/lib/env';

export type PublicActivityRow = {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  beneficiaries: number | null;
  date: string;
  location: string | null;
  photos: string[] | null;
};

/**
 * Reader for the public activities listing. The `activities_public_read`
 * RLS policy is `using (true)`, so the anon client already works — but we
 * mirror the events reader and prefer the service-role client when it is
 * configured, so a future RLS tightening can't silently blank the website.
 * Falls back to the anon client when no service-role key is set.
 */
async function publicActivityReader() {
  return integrations.supabaseAdmin ? createAdminClient() : await createClient();
}

/** All service activities, newest first. */
export async function getPublicActivities(): Promise<PublicActivityRow[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const supabase = await publicActivityReader();
    const { data, error } = await supabase
      .from('activities')
      .select('id, title, description, category, beneficiaries, date, location, photos')
      .order('date', { ascending: false });
    if (error) {
      console.error('[activities] read failed:', error.message);
      return [];
    }
    return (data ?? []) as PublicActivityRow[];
  } catch (err) {
    console.error('[activities] read threw:', err);
    return [];
  }
}
