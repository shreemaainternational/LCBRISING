import { requireZoneChair } from '@/lib/zone-portal';
import { ZoneTabs } from '../ZoneTabs';
import { createAdminClient } from '@/lib/supabase/server';
import { AgendaBoard, type AgendaItem } from './AgendaBoard';

export const dynamic = 'force-dynamic';

export default async function ZoneCalendarPage() {
  const ctx = await requireZoneChair();
  const { data: agenda } = await createAdminClient()
    .from('zone_agenda')
    .select('*, owner:members!zone_agenda_owner_member_id_fkey(name)')
    .eq('zone_id', ctx.zone.id)
    .order('is_pinned', { ascending: false })
    .order('scheduled_at', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-extrabold text-navy-900 tracking-tight">Zone Calendar &amp; Agenda</h2>
        <p className="text-gray-600 text-sm mt-1">
          Plan, edit and track every meeting, action item and event for {ctx.zone.name}.
        </p>
      </div>
      <ZoneTabs />
      <AgendaBoard initialItems={(agenda ?? []) as AgendaItem[]} />
    </div>
  );
}
