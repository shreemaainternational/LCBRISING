import { createAdminClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth';
import { ShieldCheck } from 'lucide-react';
import { GovernanceConsole, type ClubRow, type ZoneRow } from './GovernanceConsole';

export const dynamic = 'force-dynamic';

export default async function GovernancePage() {
  await requireAdmin();
  const db = createAdminClient();

  const [{ data: clubs }, { data: zones }, { data: districts }, { data: history }] = await Promise.all([
    db.from('clubs')
      .select('id, name, club_number, category, zone_id, district_id, district, city, state, health_score, health_assessed_at, health_commentary, assistant_chair_member_id')
      .is('deleted_at', null)
      .order('name'),
    db.from('zones')
      .select('id, code, name, district_id, chairperson_name, chairperson_member_id, assistant_chair_member_id')
      .is('deleted_at', null).order('code'),
    db.from('districts').select('id, code, name').is('deleted_at', null).order('code'),
    db.from('club_assignment_history')
      .select('id, club_id, action, from_zone_id, to_zone_id, reason, performed_at, performed_by, clubs(name)')
      .order('performed_at', { ascending: false }).limit(25),
  ]);

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-navy-800 mb-1 flex items-center gap-2">
            <ShieldCheck className="text-blue-500" /> Multi-Club Governance Console
          </h1>
          <p className="text-gray-600 max-w-3xl">
            Assign clubs to zones, set assistant chairs, categorize clubs, score health,
            and audit every reassignment. Use this page when a district reorg or quarterly
            cabinet review requires moving clubs between zones.
          </p>
        </div>
      </div>

      <GovernanceConsole
        clubs={(clubs ?? []) as ClubRow[]}
        zones={(zones ?? []) as ZoneRow[]}
        districts={districts ?? []}
        history={(history ?? []) as ConsoleHistoryRow[]}
      />
    </div>
  );
}

type ConsoleHistoryRow = {
  id: string; club_id: string; action: string;
  from_zone_id: string | null; to_zone_id: string | null;
  reason: string | null; performed_at: string;
  clubs?: { name?: string } | null;
};
