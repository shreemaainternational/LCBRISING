import { createAdminClient } from '@/lib/supabase/server';
import { z } from 'zod';
import type { SyncAdapter, SyncContext, SyncResult } from '../types';

const ApiMember = z.object({
  id: z.string(),
  email: z.string().email().optional(),
  full_name: z.string().optional(),
  name: z.string().optional(),
  phone: z.string().optional(),
  club_id: z.string().uuid().optional(),
  district_id: z.string().uuid().optional(),
  lions_role: z.string().optional(),
});

/**
 * REST → members adapter. Fetches a paginated JSON list from an
 * authorized endpoint (the integration must supply `endpoint` and
 * `bearer_token` in `job.payload`). Stops when the response contains
 * fewer than `page_size` records.
 */
export const restMembersAdapter: SyncAdapter = {
  source: 'rest_api',
  entity: 'members',
  async run({ job }: SyncContext): Promise<SyncResult> {
    const endpoint = job.payload?.endpoint as string | undefined;
    const bearer = job.payload?.bearer_token as string | undefined;
    const pageSize = (job.payload?.page_size as number | undefined) ?? 100;
    if (!endpoint || !bearer) {
      throw new Error('rest-members: endpoint and bearer_token are required in payload');
    }

    const supa = createAdminClient();
    const result: SyncResult = {
      total: 0, inserted: 0, updated: 0, skipped: 0, failed: 0, failures: [],
    };
    let cursor: string | null = (job.cursor as string | null) ?? null;

    while (true) {
      const url = new URL(endpoint);
      url.searchParams.set('page_size', String(pageSize));
      if (cursor) url.searchParams.set('cursor', cursor);

      const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${bearer}`, Accept: 'application/json' },
        cache: 'no-store',
      });
      if (!res.ok) {
        throw new Error(`rest-members: upstream ${res.status} ${res.statusText}`);
      }
      const body = (await res.json()) as { data?: unknown[]; next_cursor?: string };
      const items = Array.isArray(body.data) ? body.data : [];
      result.total += items.length;

      for (let i = 0; i < items.length; i++) {
        const parsed = ApiMember.safeParse(items[i]);
        if (!parsed.success) {
          result.failed++;
          result.failures.push({ row: result.total - items.length + i, reason: parsed.error.message });
          continue;
        }
        const m = parsed.data;
        const email = m.email;
        if (!email) {
          result.skipped++;
          continue;
        }
        const payload = {
          email,
          name: m.full_name || m.name || email,
          phone: m.phone || null,
          club_id: m.club_id || null,
          district_id: m.district_id || null,
          lions_member_id: m.id,
          lions_role: m.lions_role || null,
          last_sync_at: new Date().toISOString(),
        };
        const { data: existing } = await supa
          .from('members')
          .select('id')
          .eq('lions_member_id', m.id)
          .maybeSingle();
        if (existing) {
          const { error } = await supa.from('members').update(payload).eq('id', existing.id);
          if (error) {
            result.failed++;
            result.failures.push({ row: 0, reason: error.message });
          } else {
            result.updated++;
          }
        } else {
          const { error } = await supa.from('members').insert(payload);
          if (error) {
            result.failed++;
            result.failures.push({ row: 0, reason: error.message });
          } else {
            result.inserted++;
          }
        }
      }

      if (!body.next_cursor || items.length < pageSize) {
        result.next_cursor = body.next_cursor ?? null;
        break;
      }
      cursor = body.next_cursor;
    }

    return result;
  },
};
