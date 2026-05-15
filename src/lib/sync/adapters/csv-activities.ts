import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/server';
import { csvToTable } from '../csv';
import type { SyncAdapter, SyncContext, SyncResult } from '../types';

const RowSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional().default(''),
  category: z.string().optional().default(''),
  beneficiaries: z.coerce.number().int().nonnegative().default(0),
  service_hours: z.coerce.number().nonnegative().default(0),
  amount_raised: z.coerce.number().nonnegative().default(0),
  date: z.string().min(1),
  location: z.string().optional().default(''),
  club_id: z.string().uuid().optional().or(z.literal('')).default(''),
});

/**
 * CSV → activities adapter.
 *
 * Expected columns:
 *   title, description, category, beneficiaries, service_hours,
 *   amount_raised, date, location, club_id
 *
 * Idempotent on (title, date) — re-runs update the existing row.
 */
export const csvActivitiesAdapter: SyncAdapter = {
  source: 'csv',
  entity: 'activities',
  async run({ job }: SyncContext): Promise<SyncResult> {
    const csv = (job.payload?.csv as string | undefined) ?? '';
    if (!csv) {
      return { total: 0, inserted: 0, updated: 0, skipped: 0, failed: 0, failures: [] };
    }

    const { rows } = csvToTable<string>(csv);
    const supa = createAdminClient();

    const result: SyncResult = {
      total: rows.length,
      inserted: 0,
      updated: 0,
      skipped: 0,
      failed: 0,
      failures: [],
    };

    for (let i = 0; i < rows.length; i++) {
      const parsed = RowSchema.safeParse(rows[i]);
      if (!parsed.success) {
        result.failed++;
        result.failures.push({
          row: i + 2,
          reason: parsed.error.issues
            .map((s) => `${s.path.join('.')}: ${s.message}`)
            .join('; '),
        });
        continue;
      }
      const r = parsed.data;

      const payload = {
        title: r.title,
        description: r.description || null,
        category: r.category || null,
        beneficiaries: r.beneficiaries,
        service_hours: r.service_hours,
        amount_raised: r.amount_raised,
        date: r.date,
        location: r.location || null,
        club_id: r.club_id || null,
      };

      const { data: existing } = await supa
        .from('activities')
        .select('id')
        .eq('title', r.title)
        .eq('date', r.date)
        .maybeSingle();

      if (existing) {
        const { error } = await supa
          .from('activities')
          .update(payload)
          .eq('id', existing.id);
        if (error) {
          result.failed++;
          result.failures.push({ row: i + 2, reason: error.message });
        } else {
          result.updated++;
        }
      } else {
        const { error } = await supa.from('activities').insert(payload);
        if (error) {
          result.failed++;
          result.failures.push({ row: i + 2, reason: error.message });
        } else {
          result.inserted++;
        }
      }
    }

    return result;
  },
};
