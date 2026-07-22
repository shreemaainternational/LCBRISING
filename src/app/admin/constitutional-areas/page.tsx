import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { QuickAddCard } from '@/components/admin/QuickAddCard';
import { EmptyState } from '@/components/admin/EmptyState';
import { constitutionalAreasPreset } from '@/components/admin/quick-add-presets';
import { ConstitutionalAreasTable, type CaRow } from '@/components/admin/ConstitutionalAreasTable';
import { Landmark } from 'lucide-react';

export const dynamic = 'force-dynamic';

type Ca = { id: string; code: string; name: string };

export default async function ConstitutionalAreasPage() {
  const supa = process.env.SUPABASE_SERVICE_ROLE_KEY ? createAdminClient() : await createClient();

  const [{ data: cas }, { data: mds }] = await Promise.all([
    supa.from('constitutional_areas').select('id, code, name').is('deleted_at', null).order('code'),
    supa.from('multiple_districts').select('constitutional_area_id').is('deleted_at', null),
  ]);

  const mdCount = new Map<string, number>();
  for (const m of (mds ?? []) as { constitutional_area_id: string | null }[]) {
    if (m.constitutional_area_id) mdCount.set(m.constitutional_area_id, (mdCount.get(m.constitutional_area_id) ?? 0) + 1);
  }

  const rows: CaRow[] = ((cas ?? []) as Ca[]).map((c) => ({
    id: c.id, code: c.code, name: c.name, md_count: mdCount.get(c.id) ?? 0,
  }));

  const preset = constitutionalAreasPreset();

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-navy-800 mb-1">Constitutional Areas</h1>
          <p className="text-gray-600">
            Top of the Lions federation hierarchy (Constitutional Area → Multiple District →
            District → Region → Zone → Club → Member). Multiple districts roll up into a
            constitutional area (e.g. ISAAME).
          </p>
        </div>
        <QuickAddCard title="Constitutional Area" {...preset} />
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={<Landmark size={26} />}
          title="No constitutional areas yet"
          description="Create the constitutional area your multiple district belongs to (e.g. ISAAME)."
          cta={<QuickAddCard title="Constitutional Area" {...preset} />}
        />
      ) : (
        <Card>
          <CardHeader><CardTitle>{rows.length} constitutional areas</CardTitle></CardHeader>
          <CardContent className="p-0">
            <ConstitutionalAreasTable rows={rows} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
