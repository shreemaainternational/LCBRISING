import { createClient, createAdminClient } from '@/lib/supabase/server';
import { isSupabaseConfigured, integrations } from '@/lib/env';

export type PublicEventRow = {
  id: string;
  title: string;
  description: string | null;
  date: string;
  end_date: string | null;
  location: string | null;
  cover_url: string | null;
  category: string | null;
};

/**
 * Reader used for the *public* website event listings.
 *
 * Public events are written through the service-role client (see
 * /api/events POST), so the row exists — but the website reads them back
 * through the anon client, which is gated by the `events_public_read` RLS
 * policy. On any database where migration 0059 has not been applied, that
 * policy sub-selects public.members and trips "infinite recursion detected
 * in policy for relation members". The read then returns no rows and the
 * site shows "No upcoming events scheduled" even though the event saved
 * fine — the exact symptom reported.
 *
 * To make the website resilient regardless of the DB's migration state we
 * read public events through the service-role client when it is configured
 * (bypassing RLS entirely), and keep an explicit `is_public = true` filter
 * so ONLY public events are ever exposed. When no service-role key is set
 * we fall back to the anon client (behaviour unchanged).
 */
async function publicEventReader() {
  return integrations.supabaseAdmin ? createAdminClient() : await createClient();
}

/** Upcoming public events, soonest first. `limit` caps the result set. */
export async function getUpcomingPublicEvents(limit?: number): Promise<PublicEventRow[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const supabase = await publicEventReader();
    let query = supabase
      .from('events')
      .select('*')
      .eq('is_public', true)
      .gte('date', new Date().toISOString())
      .order('date');
    if (limit) query = query.limit(limit);
    const { data, error } = await query;
    if (error) {
      console.error('[events] upcoming read failed:', error.message);
      return [];
    }
    return (data ?? []) as PublicEventRow[];
  } catch (err) {
    console.error('[events] upcoming read threw:', err);
    return [];
  }
}

/** A single public event by id, or null if not found / not public. */
export async function getPublicEventById(id: string): Promise<PublicEventRow | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const supabase = await publicEventReader();
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('id', id)
      .eq('is_public', true)
      .maybeSingle();
    if (error) {
      console.error('[events] byId read failed:', error.message);
      return null;
    }
    return (data ?? null) as PublicEventRow | null;
  } catch (err) {
    console.error('[events] byId read threw:', err);
    return null;
  }
}

/** All public events (past and upcoming), newest first. */
export async function getAllPublicEvents(): Promise<PublicEventRow[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const supabase = await publicEventReader();
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('is_public', true)
      .order('date', { ascending: false });
    if (error) {
      console.error('[events] all read failed:', error.message);
      return [];
    }
    return (data ?? []) as PublicEventRow[];
  } catch (err) {
    console.error('[events] all read threw:', err);
    return [];
  }
}

/** Most recent past public events, newest first. */
export async function getPastPublicEvents(limit = 6): Promise<PublicEventRow[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const supabase = await publicEventReader();
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('is_public', true)
      .lt('date', new Date().toISOString())
      .order('date', { ascending: false })
      .limit(limit);
    if (error) {
      console.error('[events] past read failed:', error.message);
      return [];
    }
    return (data ?? []) as PublicEventRow[];
  } catch (err) {
    console.error('[events] past read threw:', err);
    return [];
  }
}
