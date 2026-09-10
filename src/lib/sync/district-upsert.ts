/**
 * Server-side upsert of canonical district records into public.districts.
 * Shared by the CSV adapter and the portal-export upload route so both
 * write identically. Only fields present on the record are written, so an
 * export that omits a column never nulls out existing district data.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { CanonicalDistrict } from './district-map';
import type { SyncResult } from './types';

export async function upsertDistrictRecords(
  supa: SupabaseClient,
  records: CanonicalDistrict[],
  source: string,
): Promise<SyncResult> {
  const result: SyncResult = {
    total: records.length, inserted: 0, updated: 0, skipped: 0, failed: 0, failures: [],
  };

  // Resolve multiple_district_code → id once.
  const { data: mdRows } = await supa.from('multiple_districts').select('id, code');
  const mdMap = new Map((mdRows ?? []).map((m: { id: string; code: string }) => [m.code, m.id]));
  const syncedAt = new Date().toISOString();

  for (let i = 0; i < records.length; i++) {
    const d = records[i];
    if (!d.code) { result.skipped++; continue; }

    // Build a payload with only the provided fields.
    const payload: Record<string, unknown> = {
      code: d.code,
      source_id: d.code,
      last_portal_sync_at: syncedAt,
      portal_raw: { ...d, _source: source },
    };
    const setStr = (k: keyof CanonicalDistrict, col = k as string) => {
      if (d[k] !== undefined) payload[col] = d[k];
    };
    setStr('name'); setStr('multiple_district_code'); setStr('constitutional_area');
    setStr('status'); setStr('governor_name'); setStr('governor_email'); setStr('governor_phone');
    setStr('first_vice_governor_name'); setStr('second_vice_governor_name');
    setStr('cabinet_secretary_name'); setStr('cabinet_treasurer_name');
    setStr('club_count'); setStr('member_count'); setStr('region_count'); setStr('zone_count');
    setStr('effective_date'); setStr('website'); setStr('lions_year');
    if (d.multiple_district_code && mdMap.has(d.multiple_district_code)) {
      payload.multiple_district_id = mdMap.get(d.multiple_district_code);
    }

    try {
      const { data: existing } = await supa
        .from('districts').select('id').eq('code', d.code).maybeSingle();
      if (existing?.id) {
        const { error } = await supa.from('districts').update(payload).eq('id', existing.id);
        if (error) throw new Error(error.message);
        result.updated++;
      } else {
        const { error } = await supa.from('districts').insert(payload);
        if (error) throw new Error(error.message);
        result.inserted++;
      }
    } catch (e) {
      result.failed++;
      result.failures.push({ row: i + 2, reason: e instanceof Error ? e.message : String(e) });
    }
  }
  return result;
}
