import { requireZoneChair } from '@/lib/zone-portal';
import { ZoneTabs } from '../ZoneTabs';
import { createAdminClient } from '@/lib/supabase/server';
import { lionsYearFor } from '@/lib/lions-calendar-meta';
import { LionsYearCalendar, type LionsEventRow } from './LionsYearCalendar';

export const dynamic = 'force-dynamic';

interface Props { searchParams: Promise<{ year?: string }>; }

export default async function LionsYearPage({ searchParams }: Props) {
  const ctx = await requireZoneChair();
  const sp = await searchParams;
  const year = sp.year ?? lionsYearFor(new Date());

  const db = createAdminClient();
  const { data } = await db.from('lions_calendar')
    .select('*')
    .is('deleted_at', null)
    .eq('lions_year', year)
    .or(`zone_id.eq.${ctx.zone.id},zone_id.is.null`)
    .order('starts_at', { ascending: true });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-extrabold text-navy-900 tracking-tight">
          Lions Year Calendar · {year}
        </h2>
        <p className="text-gray-600 text-sm mt-1">
          Full tenure plan — service weeks, DG visits, MD &amp; regional conferences, charter nights, training,
          fundraisers and zone socials. Everything {ctx.zone.name} needs in one timeline.
        </p>
      </div>
      <ZoneTabs />
      <LionsYearCalendar
        currentYear={year}
        initialEvents={(data ?? []) as LionsEventRow[]}
      />
    </div>
  );
}
