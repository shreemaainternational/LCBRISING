import { requireZoneChair } from '@/lib/zone-portal';
import { ZoneTabs } from '../ZoneTabs';
import { createAdminClient } from '@/lib/supabase/server';
import { MinutesBoard, type MinutesItem } from './MinutesBoard';

export const dynamic = 'force-dynamic';

export default async function ZoneMinutesPage() {
  const ctx = await requireZoneChair();
  const db = createAdminClient();
  const [{ data: minutes }, { data: agenda }] = await Promise.all([
    db.from('zone_meeting_minutes')
      .select('*, agenda:zone_agenda(title)')
      .eq('zone_id', ctx.zone.id)
      .order('meeting_date', { ascending: false }),
    db.from('zone_agenda').select('id, title').eq('zone_id', ctx.zone.id).order('scheduled_at', { ascending: false }).limit(50),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-extrabold text-navy-900 tracking-tight">Meeting Minutes</h2>
        <p className="text-gray-600 text-sm mt-1">
          Capture attendees, decisions, action items and sign-off for every meeting in {ctx.zone.name}.
        </p>
      </div>
      <ZoneTabs />
      <MinutesBoard initialItems={(minutes ?? []) as MinutesItem[]} agendaOptions={agenda ?? []} />
    </div>
  );
}
