import { requireDistrictGovernor } from '@/lib/district-portal';
import { DistrictTabs } from '../DistrictTabs';
import { createAdminClient } from '@/lib/supabase/server';
import { lionsYearFor } from '@/lib/lions-calendar-meta';
import { LionsYearCalendar, type LionsEventRow } from '@/app/zone/lions-year/LionsYearCalendar';

export const dynamic = 'force-dynamic';

interface Props { searchParams: Promise<{ year?: string }>; }

export default async function DistrictCalendarPage({ searchParams }: Props) {
  const ctx = await requireDistrictGovernor();
  const sp = await searchParams;
  const year = sp.year ?? lionsYearFor(new Date());

  const db = createAdminClient();
  const { data: zones } = await db.from('zones').select('id').eq('district_id', ctx.district.id).is('deleted_at', null);
  const zoneIds = (zones ?? []).map((z) => z.id);

  const { data } = await db.from('lions_calendar')
    .select('*').is('deleted_at', null).eq('lions_year', year)
    .or(`district_id.eq.${ctx.district.id},zone_id.in.(${zoneIds.join(',') || '00000000-0000-0000-0000-000000000000'}),zone_id.is.null`)
    .order('starts_at');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-extrabold text-navy-900 tracking-tight">District Calendar · {year}</h2>
        <p className="text-gray-600 text-sm mt-1">
          Aggregated Lions Year events for District {ctx.district.code} — every region + zone roll up here.
        </p>
      </div>
      <DistrictTabs />
      <LionsYearCalendar currentYear={year} initialEvents={(data ?? []) as LionsEventRow[]} />
    </div>
  );
}
