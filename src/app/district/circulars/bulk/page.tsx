import Link from 'next/link';
import { ArrowLeft, Table2 } from 'lucide-react';
import { requireDistrictGovernor } from '@/lib/district-portal';
import { createAdminClient } from '@/lib/supabase/server';
import { DistrictTabs } from '../../DistrictTabs';
import { BulkCircularStudio, type EntryRow } from './BulkCircularStudio';

export const dynamic = 'force-dynamic';

export default async function BulkCircularsPage() {
  const ctx = await requireDistrictGovernor();
  const db = createAdminClient();

  const [{ data: regions }, { data: zones }, { data: clubs }, { data: entries }] = await Promise.all([
    db.from('regions').select('id, name, code').eq('district_id', ctx.district.id).is('deleted_at', null).order('code'),
    db.from('zones').select('id, name, code, region_id').eq('district_id', ctx.district.id).is('deleted_at', null).order('code'),
    db.from('clubs').select('id, name, zone_id, region_id').eq('district_id', ctx.district.id).is('deleted_at', null).order('name'),
    db.from('district_circular_entries')
      .select('id, reference_no, entry_type, title, description, category, priority, event_date, start_time, end_time, venue, chief_guest, region_id, zone_id, club_id, source_kind, source_url, source_filename, extracted, extraction_confidence, short_message, whatsapp_text, social_caption, social_hashtags, flyer, presentation, presentation_url, minutes, assets_generated_at, status, created_at')
      .eq('district_id', ctx.district.id)
      .order('created_at', { ascending: false })
      .limit(300),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-extrabold text-navy-900 tracking-tight inline-flex items-center gap-2">
          <Table2 className="text-amber-500" size={28} />
          Circular Studio — Bulk upload &amp; auto-generate
        </h2>
        <p className="text-gray-600 text-sm mt-1 max-w-3xl">
          Maintain every district communication — circulars, events, programmes, cabinet meetings,
          DG visits, festivals, felicitations — in one structured table. Bulk-upload a spreadsheet,
          or drop a flyer / PDF / presentation to auto-segregate its details. Then generate a short
          message, WhatsApp text, social post, flyer, presentation and minutes for each — filtered
          club-wise, zone-wise or region-wise.
        </p>
        <Link href="/district/circulars" className="inline-flex items-center gap-1.5 text-sm text-amber-700 hover:underline mt-2">
          <ArrowLeft size={14} /> Back to circulars
        </Link>
      </div>
      <DistrictTabs />

      <BulkCircularStudio
        regions={regions ?? []}
        zones={zones ?? []}
        clubs={clubs ?? []}
        initialEntries={(entries ?? []) as EntryRow[]}
      />
    </div>
  );
}
