import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/server';
import { csvToTable } from '../csv';
import type { SyncAdapter, SyncContext, SyncResult } from '../types';

const RowSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  phone: z.string().optional().default(''),
  whatsapp: z.string().optional().default(''),
  lions_member_id: z.string().optional().default(''),
  club_id: z.string().uuid().optional(),
  district_id: z.string().uuid().optional(),
  lions_role: z.string().optional().default(''),
  birthday: z.string().optional().default(''),
});

/**
 * CSV → members adapter.
 *
 * Expected columns (header row required):
 *   email, name, phone, whatsapp, lions_member_id,
 *   club_id, district_id, lions_role, birthday
 *
 * Idempotent on `email`. Existing rows are merged (non-empty fields win).
 * The payload passed to the runner must contain `csv` (raw text).
 */
export const csvMembersAdapter: SyncAdapter = {
  source: 'csv',
  entity: 'members',
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
      const raw = rows[i];
      const parsed = RowSchema.safeParse(raw);
      if (!parsed.success) {
        result.failed++;
        result.failures.push({
          row: i + 2, // +1 header, +1 1-based
          reason: parsed.error.issues.map((s) => `${s.path.join('.')}: ${s.message}`).join('; '),
        });
        continue;
      }
      const r = parsed.data;

      const { data: existing } = await supa
        .from('members')
        .select('id')
        .eq('email', r.email)
        .maybeSingle();

      const upsertPayload = {
        email: r.email,
        name: r.name,
        phone: r.phone || null,
        whatsapp: r.whatsapp || null,
        lions_member_id: r.lions_member_id || null,
        club_id: r.club_id || null,
        district_id: r.district_id || null,
        lions_role: r.lions_role || null,
        birthday: r.birthday || null,
        last_sync_at: new Date().toISOString(),
      };

      if (existing) {
        const { error } = await supa
          .from('members')
          .update(upsertPayload)
          .eq('id', existing.id);
        if (error) {
          result.failed++;
          result.failures.push({ row: i + 2, reason: error.message });
        } else {
          result.updated++;
        }
      } else {
        const { error } = await supa.from('members').insert(upsertPayload);
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
