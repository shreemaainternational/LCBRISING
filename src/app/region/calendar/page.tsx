import { requireRegionChair } from '@/lib/region-portal';
import { RegionTabs } from '../RegionTabs';
import { createAdminClient } from '@/lib/supabase/server';
import { lionsYearFor } from '@/lib/lions-calendar-meta';
import { LionsYearCalendar, type LionsEventRow } from '@/app/zone/lions-year/LionsYearCalendar';

export const dynamic = 'force-dynamic';

interface Props { searchParams: Promise<{ year?: string }>; }

export default async function RegionCalendarPage({ searchParams }: Props) {
  const ctx = await requireRegionChair();
  const sp = await searchParams;
  const year = sp.year ?? lionsYearFor(new Date());
  const db = createAdminClient();
  const { data: zones } = await db.from('zones').select('id').eq('region_id', ctx.region.id).is('deleted_at', null);
  const zoneIds = (zones ?? []).map((z) => z.id);
  const { data } = await db.from('lions_calendar')
    .select('*').is('deleted_at', null).eq('lions_year', year)
    .or(`zone_id.in.(${zoneIds.join(',') || '00000000-0000-0000-0000-000000000000'}),zone_id.is.null`)
    .order('starts_at');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-extrabold text-navy-900 tracking-tight">Region Calendar · {year}</h2>
        <p className="text-gray-600 text-sm mt-1">
          Aggregated view of every Lions event across {ctx.region.name}. Add new region-level events from any zone portal.
        </p>
      </div>
      <RegionTabs />
      <LionsYearCalendar currentYear={year} initialEvents={(data ?? []) as LionsEventRow[]} />
    </div>
  );
}
