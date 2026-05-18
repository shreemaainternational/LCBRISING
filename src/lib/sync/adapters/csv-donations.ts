import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/server';
import { csvToTable } from '../csv';
import { buildReceiptNo } from '@/lib/utils';
import type { SyncAdapter, SyncContext, SyncResult } from '../types';

const RowSchema = z.object({
  donor_name: z.string().min(1),
  donor_email: z.string().email().optional().or(z.literal('')).default(''),
  donor_phone: z.string().optional().default(''),
  donor_pan: z.string().optional().default(''),
  amount: z.coerce.number().nonnegative(),
  campaign: z.string().optional().default(''),
  message: z.string().optional().default(''),
  receipt_no: z.string().optional().default(''),
  created_at: z.string().optional().default(''),
});

/**
 * CSV → donations adapter.
 *
 * Expected columns (header row required):
 *   donor_name, donor_email, donor_phone, donor_pan, amount, campaign,
 *   message, receipt_no, created_at
 *
 * Idempotent on receipt_no when provided; otherwise generates a fresh
 * DON-* receipt and inserts a new row. Marks every imported donation
 * captured (status='captured' on the related payments row would be
 * added by the donations API, but for imports we treat them as final).
 */
export const csvDonationsAdapter: SyncAdapter = {
  source: 'csv',
  entity: 'donations',
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
      const receiptNo = r.receipt_no || buildReceiptNo('DON');

      const payload = {
        donor_name: r.donor_name,
        donor_email: r.donor_email || null,
        donor_phone: r.donor_phone || null,
        donor_pan: r.donor_pan || null,
        amount: r.amount,
        campaign: r.campaign || null,
        message: r.message || null,
        receipt_no: receiptNo,
        created_at: r.created_at || new Date().toISOString(),
      };

      const { data: existing } = await supa
        .from('donations')
        .select('id')
        .eq('receipt_no', receiptNo)
        .maybeSingle();

      if (existing) {
        const { error } = await supa
          .from('donations')
          .update(payload)
          .eq('id', existing.id);
        if (error) {
          result.failed++;
          result.failures.push({ row: i + 2, reason: error.message });
        } else {
          result.updated++;
        }
      } else {
        const { error } = await supa.from('donations').insert(payload);
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
