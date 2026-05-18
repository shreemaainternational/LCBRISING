import { requireMdChair } from '@/lib/multi-district-portal';
import { MdTabs } from '../MdTabs';
import { createAdminClient } from '@/lib/supabase/server';
import { lionsYearFor } from '@/lib/lions-calendar-meta';
import { LionsYearCalendar, type LionsEventRow } from '@/app/zone/lions-year/LionsYearCalendar';

export const dynamic = 'force-dynamic';

interface Props { searchParams: Promise<{ year?: string }>; }

export default async function MdCalendarPage({ searchParams }: Props) {
  const ctx = await requireMdChair();
  const sp = await searchParams;
  const year = sp.year ?? lionsYearFor(new Date());

  const db = createAdminClient();
  const { data: districts } = await db.from('districts').select('id')
    .eq('multiple_district_id', ctx.md.id).is('deleted_at', null);
  const districtIds = (districts ?? []).map((d) => d.id);

  const { data } = await db.from('lions_calendar')
    .select('*').is('deleted_at', null).eq('lions_year', year)
    .or(`multiple_district_id.eq.${ctx.md.id},district_id.in.(${districtIds.join(',') || '00000000-0000-0000-0000-000000000000'}),scope.eq.international`)
    .order('starts_at');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-extrabold text-navy-900 tracking-tight">MD Calendar · {year}</h2>
        <p className="text-gray-600 text-sm mt-1">
          Federation-wide events across every district in MD {ctx.md.code}.
        </p>
      </div>
      <MdTabs />
      <LionsYearCalendar currentYear={year} initialEvents={(data ?? []) as LionsEventRow[]} />
    </div>
  );
}
