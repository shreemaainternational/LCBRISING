import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/server';
import { csvToTable } from '../csv';
import { LIONS_ROLE_VALUES } from '@/lib/validation/schemas';
import type { SyncAdapter, SyncContext, SyncResult } from '../types';

const RowSchema = z.object({
  member_email: z.string().email().optional(),
  member_id: z.string().uuid().optional(),
  role: z.enum(LIONS_ROLE_VALUES),
  scope_kind: z.enum(['club', 'zone', 'region', 'district', 'multiple_district', 'international']),
  scope_id: z.string().uuid().optional(),
  term_start: z.string(),
  term_end: z.string().optional().default(''),
  status: z.enum(['active', 'past', 'pending']).optional().default('active'),
  source_id: z.string().optional().default(''),
});

/**
 * CSV → officers adapter.
 *
 * Required columns: role, scope_kind, term_start + one of
 *   (member_id | member_email) and (scope_id when scope_kind != 'international').
 *
 * Idempotent on (member_id, scope_kind, scope_id, role, term_start) when
 * source_id is empty; otherwise on source_id.
 */
export const csvOfficersAdapter: SyncAdapter = {
  source: 'csv',
  entity: 'officers',
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

      // Resolve member id from email if needed.
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
        role: r.role,
        scope_kind: r.scope_kind,
        scope_id: r.scope_id || null,
        term_start: r.term_start,
        term_end: r.term_end || null,
        status: r.status,
        source_id: r.source_id || null,
      };

      // Dedupe lookup
      const dedupe = r.source_id
        ? supa.from('officers').select('id').eq('source_id', r.source_id).maybeSingle()
        : supa
            .from('officers')
            .select('id')
            .eq('member_id', memberId)
            .eq('scope_kind', r.scope_kind)
            .eq('role', r.role)
            .eq('term_start', r.term_start)
            .maybeSingle();
      const { data: existing } = await dedupe;

      if (existing) {
        const { error } = await supa.from('officers').update(payload).eq('id', existing.id);
        if (error) {
          result.failed++;
          result.failures.push({ row: i + 2, reason: error.message });
        } else result.updated++;
      } else {
        const { error } = await supa.from('officers').insert(payload);
        if (error) {
          result.failed++;
          result.failures.push({ row: i + 2, reason: error.message });
        } else result.inserted++;
      }
    }

    return result;
  },
};
