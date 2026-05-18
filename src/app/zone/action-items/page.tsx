import { requireZoneChair } from '@/lib/zone-portal';
import { ZoneTabs } from '../ZoneTabs';
import { createAdminClient } from '@/lib/supabase/server';
import { ActionItemsBoard, type ActionItemRow } from './ActionItemsBoard';

export const dynamic = 'force-dynamic';

export default async function ActionItemsPage() {
  const ctx = await requireZoneChair();
  const db = createAdminClient();

  const [{ data: items }, { data: members }, { data: clubs }] = await Promise.all([
    db.from('zone_action_items')
      .select('*, owner:members!zone_action_items_owner_member_id_fkey(name,email), club:clubs(name)')
      .eq('zone_id', ctx.zone.id)
      .order('is_pinned', { ascending: false })
      .order('due_date', { ascending: true, nullsFirst: false }),
    db.from('members').select('id, name, email')
      .in('club_id', (await db.from('clubs').select('id').eq('zone_id', ctx.zone.id).is('deleted_at', null)).data?.map((c) => c.id) ?? ['00'])
      .is('deleted_at', null).order('name'),
    db.from('clubs').select('id, name').eq('zone_id', ctx.zone.id).is('deleted_at', null).order('name'),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-extrabold text-navy-900 tracking-tight">Action Items</h2>
        <p className="text-gray-600 text-sm mt-1">
          Track every commitment, assign owners, and let the system nudge them automatically.
        </p>
      </div>
      <ZoneTabs />
      <ActionItemsBoard
        initialItems={(items ?? []) as ActionItemRow[]}
        members={members ?? []}
        clubs={clubs ?? []}
      />
    </div>
  );
}
