import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { PageHero, PAGE_HERO_BG } from '@/components/site/PageHero';
import { EventsBoard, type EventRow } from './EventsBoard';

export const metadata: Metadata = { title: 'Events', alternates: { canonical: '/events' } };
export const revalidate = 60;

export default async function EventsPage() {
  let upcoming: EventRow[] = [];
  let past: EventRow[] = [];
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const now = new Date().toISOString();
    const [u, p] = await Promise.all([
      supabase.from('events').select('*').eq('is_public', true).gte('date', now).order('date'),
      supabase
        .from('events')
        .select('*')
        .eq('is_public', true)
        .lt('date', now)
        .order('date', { ascending: false })
        .limit(6),
    ]);
    upcoming = (u.data ?? []) as EventRow[];
    past = (p.data ?? []) as EventRow[];
  }

  return (
    <>
      <PageHero
        pillText="EVENTS"
        headline="Upcoming Events"
        subtitle="Join us at our upcoming service activities, meetings, and community events. Everyone is welcome!"
        backgroundImage={PAGE_HERO_BG.events}
      />

      <EventsBoard upcoming={upcoming} past={past} />
    </>
  );
}
