import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/server';
import { csvToTable } from '../csv';
import type { SyncAdapter, SyncContext, SyncResult } from '../types';

const RowSchema = z.object({
  member_email: z.string().email().optional(),
  member_id: z.string().uuid().optional(),
  event_id: z.string().uuid().optional(),
  club_id: z.string().uuid().optional(),
  occurred_at: z.string().optional().default(''),
  status: z.enum(['present', 'absent', 'excused', 'remote']).optional().default('present'),
  check_in_method: z.string().optional().default('csv_import'),
  notes: z.string().optional().default(''),
});

/**
 * CSV → attendance adapter. Idempotent on (member_id, event_id) via the
 * existing unique constraint, so re-running an import overwrites rather
 * than duplicating.
 */
export const csvAttendanceAdapter: SyncAdapter = {
  source: 'csv',
  entity: 'attendance',
  async run({ job }: SyncContext): Promise<SyncResult> {
    const csv = (job.payload?.csv as string | undefined) ?? '';
    if (!csv) return { total: 0, inserted: 0, updated: 0, skipped: 0, failed: 0, failures: [] };

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

      let memberId = r.member_id;
      if (!memberId && r.member_email) {
        const { data: m } = await supa
          .from('members')
          .select('id')
          .eq('email', r.member_email)
          .maybeSingle();
        memberId = m?.id;
      }
      if (!memberId) {
        result.failed++;
        result.failures.push({ row: i + 2, reason: 'member not found by id or email' });
        continue;
      }

      const payload = {
        member_id: memberId,
        event_id: r.event_id || null,
        club_id: r.club_id || null,
        occurred_at: r.occurred_at || new Date().toISOString(),
        status: r.status,
        check_in_method: r.check_in_method || 'csv_import',
        notes: r.notes || null,
      };

      const { error } = await supa
        .from('attendance')
        .upsert(payload, { onConflict: 'member_id,event_id' });
      if (error) {
        result.failed++;
        result.failures.push({ row: i + 2, reason: error.message });
      } else {
        result.inserted++;
      }
    }

    return result;
  },
};
