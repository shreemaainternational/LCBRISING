import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/server';
import { csvToTable } from '../csv';
import type { SyncAdapter, SyncContext, SyncResult } from '../types';

const RowSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional().default(''),
  date: z.string().min(1),
  end_date: z.string().optional().default(''),
  location: z.string().optional().default(''),
  capacity: z.coerce.number().int().nonnegative().optional(),
  is_public: z.coerce.boolean().optional().default(true),
  cover_url: z.string().optional().default(''),
  club_id: z.string().uuid().optional().or(z.literal('')).default(''),
});

/**
 * CSV → events adapter.
 *
 * Expected columns:
 *   title, description, date, end_date, location, capacity,
 *   is_public, cover_url, club_id
 *
 * Idempotent on (title, date) — re-runs update the existing row.
 */
export const csvEventsAdapter: SyncAdapter = {
  source: 'csv',
  entity: 'events',
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
        date: r.date,
        end_date: r.end_date || null,
        location: r.location || null,
        capacity: r.capacity ?? null,
        is_public: r.is_public,
        cover_url: r.cover_url || null,
        club_id: r.club_id || null,
      };

      const { data: existing } = await supa
        .from('events')
        .select('id')
        .eq('title', r.title)
        .eq('date', r.date)
        .maybeSingle();

      if (existing) {
        const { error } = await supa
          .from('events')
          .update(payload)
          .eq('id', existing.id);
        if (error) {
          result.failed++;
          result.failures.push({ row: i + 2, reason: error.message });
        } else {
          result.updated++;
        }
      } else {
        const { error } = await supa.from('events').insert(payload);
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
