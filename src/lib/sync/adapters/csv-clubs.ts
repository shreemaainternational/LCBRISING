import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/server';
import { csvToTable } from '../csv';
import type { SyncAdapter, SyncContext, SyncResult } from '../types';

const RowSchema = z.object({
  name: z.string().min(1),
  club_number: z.string().optional().default(''),
  district_id: z.string().uuid().optional(),
  zone_id: z.string().uuid().optional(),
  region_id: z.string().uuid().optional(),
  district: z.string().optional().default(''),
  city: z.string().optional().default(''),
  state: z.string().optional().default(''),
  country: z.string().optional().default('India'),
  source_id: z.string().optional().default(''),
});

/**
 * CSV → clubs adapter. Idempotent on (`club_number`, `name`).
 */
export const csvClubsAdapter: SyncAdapter = {
  source: 'csv',
  entity: 'clubs',
  async run({ job }: SyncContext): Promise<SyncResult> {
    const csv = (job.payload?.csv as string | undefined) ?? '';
    if (!csv) {
      return { total: 0, inserted: 0, updated: 0, skipped: 0, failed: 0, failures: [] };
    }

    const { rows } = csvToTable<string>(csv);
    const supa = createAdminClient();
    const result: SyncResult = {
      total: rows.length, inserted: 0, updated: 0, skipped: 0, failed: 0, failures: [],
    };

    for (let i = 0; i < rows.length; i++) {
      const parsed = RowSchema.safeParse(rows[i]);
      if (!parsed.success) {
        result.failed++;
        result.failures.push({ row: i + 2, reason: parsed.error.message });
        continue;
      }
      const r = parsed.data;
      const dedupeKey = r.club_number || r.source_id || r.name;

      const { data: existing } = await supa
        .from('clubs')
        .select('id')
        .or(
          [
            r.club_number ? `club_number.eq.${r.club_number}` : null,
            r.source_id ? `source_id.eq.${r.source_id}` : null,
            `name.eq.${r.name.replace(/,/g, '\\,')}`,
          ].filter(Boolean).join(','),
        )
        .maybeSingle();

      const payload = {
        name: r.name,
        club_number: r.club_number || null,
        district_id: r.district_id || null,
        zone_id: r.zone_id || null,
        region_id: r.region_id || null,
        district: r.district || '',
        city: r.city || null,
        state: r.state || null,
        country: r.country || 'India',
        source_id: r.source_id || null,
      };

      if (existing) {
        const { error } = await supa.from('clubs').update(payload).eq('id', existing.id);
        if (error) {
          result.failed++;
          result.failures.push({ row: i + 2, reason: error.message });
        } else result.updated++;
      } else {
        const { error } = await supa.from('clubs').insert(payload);
        if (error) {
          result.failed++;
          result.failures.push({ row: i + 2, reason: `${error.message} (key=${dedupeKey})` });
        } else result.inserted++;
      }
    }

    return result;
  },
};
