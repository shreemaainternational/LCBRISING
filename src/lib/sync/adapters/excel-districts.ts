import { createAdminClient } from '@/lib/supabase/server';
import { upsertDistrictRecords } from '../district-upsert';
import type { CanonicalDistrict } from '../district-map';
import type { SyncAdapter, SyncContext, SyncResult } from '../types';

/**
 * Excel → districts adapter. The client uploader parses the .xlsx/.csv the
 * DG downloads from the Lions Portal (handling banner/footer rows and
 * column aliases) and posts already-normalized CanonicalDistrict records as
 * `payload.districts`. This adapter just validates + upserts them.
 */
export const excelDistrictsAdapter: SyncAdapter = {
  source: 'excel',
  entity: 'districts',
  async run({ job }: SyncContext): Promise<SyncResult> {
    const raw = job.payload?.districts;
    const list = Array.isArray(raw) ? (raw as CanonicalDistrict[]) : [];
    const records = list.filter((d) => d && typeof d.code === 'string' && d.code.trim());
    if (records.length === 0) {
      return { total: list.length, inserted: 0, updated: 0, skipped: list.length, failed: 0, failures: [] };
    }
    const result = await upsertDistrictRecords(createAdminClient(), records, 'excel');
    result.total = list.length;
    result.skipped += list.length - records.length;
    return result;
  },
};
