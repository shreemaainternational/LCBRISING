import { createAdminClient } from '@/lib/supabase/server';
import { csvToTable } from '../csv';
import { mapDistrictHeaders, normalizeDistrictRecord, type CanonicalDistrict } from '../district-map';
import { upsertDistrictRecords } from '../district-upsert';
import type { SyncAdapter, SyncContext, SyncResult } from '../types';

/**
 * CSV → districts adapter. Idempotent on district `code`. Accepts a Lions
 * Portal district export (or any sheet with a District Number column) via
 * the shared header/field mapper. Only provided columns are written.
 */
export const csvDistrictsAdapter: SyncAdapter = {
  source: 'csv',
  entity: 'districts',
  async run({ job }: SyncContext): Promise<SyncResult> {
    const csv = (job.payload?.csv as string | undefined) ?? '';
    if (!csv) return { total: 0, inserted: 0, updated: 0, skipped: 0, failed: 0, failures: [] };

    const { headers, rows } = csvToTable<string>(csv);
    const col = mapDistrictHeaders(headers);
    if (col.code === undefined) {
      throw new Error('Could not find a "District Number" column in the uploaded file.');
    }

    const records: CanonicalDistrict[] = [];
    const failures: { row: number; reason: string }[] = [];
    rows.forEach((row, i) => {
      const get = (field: keyof CanonicalDistrict) => {
        const idx = col[field];
        return idx === undefined ? '' : (row[headers[idx]] ?? '');
      };
      const { record, error } = normalizeDistrictRecord(get);
      if (record) records.push(record);
      else if (error) failures.push({ row: i + 2, reason: error });
    });

    const result = await upsertDistrictRecords(createAdminClient(), records, 'csv');
    result.total = rows.length;
    result.skipped += failures.length;
    result.failures.push(...failures);
    return result;
  },
};
