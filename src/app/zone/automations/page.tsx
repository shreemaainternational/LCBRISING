import { requireZoneChair } from '@/lib/zone-portal';
import { ZoneTabs } from '../ZoneTabs';
import { createAdminClient } from '@/lib/supabase/server';
import { ZONE_AUTOMATION_CATALOG } from '@/lib/zone-automation-catalog';
import { AutomationBoard, type AutomationRow } from './AutomationBoard';

export const dynamic = 'force-dynamic';

export default async function ZoneAutomationsPage() {
  const ctx = await requireZoneChair();
  const { data: rows } = await createAdminClient()
    .from('zone_automations').select('*').eq('zone_id', ctx.zone.id);
  const byKind = new Map((rows ?? []).map((r) => [r.kind, r as AutomationRow]));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-extrabold text-navy-900 tracking-tight">Zone Automations</h2>
        <p className="text-gray-600 text-sm mt-1">
          Set-and-forget rules that send advisories, reminders and reports automatically across {ctx.zone.name}.
        </p>
      </div>
      <ZoneTabs />
      <AutomationBoard
        catalog={ZONE_AUTOMATION_CATALOG}
        existing={Array.from(byKind.values())}
      />
    </div>
  );
}
