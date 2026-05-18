import { createAdminClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { getValidAccessToken } from '@/lib/oidc/auto-refresh';
import type { SyncAdapter, SyncContext, SyncResult } from '../types';
import type { LionsRole } from '@/lib/supabase/database.types';

const VALID_ROLES: ReadonlySet<LionsRole> = new Set([
  'international_admin','multiple_district_admin','district_governor',
  'vice_district_governor','cabinet_officer','region_chairperson',
  'zone_chairperson','club_president','club_secretary','club_treasurer',
  'club_officer','member','guest_viewer',
]);

const ApiOfficer = z.object({
  id: z.string(),
  lions_member_id: z.string(),
  role: z.string(),
  scope_kind: z.enum(['club','zone','region','district','multiple_district','international']),
  scope_external_id: z.string().optional(),
  term_start: z.string(),
  term_end: z.string().optional(),
  status: z.enum(['active','ended','revoked']).optional(),
});

export const restOfficersAdapter: SyncAdapter = {
  source: 'rest_api',
  entity: 'officers',
  async run({ job }: SyncContext): Promise<SyncResult> {
    const endpoint = job.payload?.endpoint as string | undefined;
    const oauthAccountId = job.payload?.oauth_account_id as string | undefined;
    let bearer = job.payload?.bearer_token as string | undefined;
    const pageSize = (job.payload?.page_size as number | undefined) ?? 100;
    const updatedSince = job.payload?.updated_since as string | undefined;
    if (!endpoint) throw new Error('rest-officers: endpoint required');
    if (!bearer && !oauthAccountId) {
      throw new Error('rest-officers: bearer_token or oauth_account_id required');
    }

    const supa = createAdminClient();
    const result: SyncResult = {
      total: 0, inserted: 0, updated: 0, skipped: 0, failed: 0, failures: [],
    };
    let cursor: string | null = (job.cursor as string | null) ?? null;
    let did401Retry = false;

    const scopeTable: Record<string, string | null> = {
      club: 'clubs', zone: 'zones', region: 'regions',
      district: 'districts', multiple_district: 'multiple_districts',
      international: null,
    };

    while (true) {
      if (oauthAccountId) {
        bearer = (await getValidAccessToken(oauthAccountId)).access_token;
      }
      const url = new URL(endpoint);
      url.searchParams.set('page_size', String(pageSize));
      if (cursor) url.searchParams.set('cursor', cursor);
      if (updatedSince) url.searchParams.set('updated_since', updatedSince);

      const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${bearer}`, Accept: 'application/json' },
        cache: 'no-store',
      });
      if (res.status === 401 && oauthAccountId && !did401Retry) {
        did401Retry = true;
        await supa.from('oauth_accounts')
          .update({ access_token_expires_at: new Date(0).toISOString() })
          .eq('id', oauthAccountId);
        continue;
      }
      if (!res.ok) throw new Error(`rest-officers: upstream ${res.status} ${res.statusText}`);

      const body = (await res.json()) as { data?: unknown[]; next_cursor?: string };
      const items = Array.isArray(body.data) ? body.data : [];
      result.total += items.length;
      const syncedAt = new Date().toISOString();

      for (let i = 0; i < items.length; i++) {
        const parsed = ApiOfficer.safeParse(items[i]);
        if (!parsed.success) {
          result.failed++;
          result.failures.push({ row: i, reason: parsed.error.message });
          continue;
        }
        const o = parsed.data;
        if (!VALID_ROLES.has(o.role as LionsRole)) {
          result.skipped++;
          continue;
        }
        const { data: member } = await supa
          .from('members').select('id').eq('lions_member_id', o.lions_member_id).maybeSingle();
        if (!member) { result.skipped++; continue; }

        let scopeId: string | null = null;
        const tbl = scopeTable[o.scope_kind];
        if (tbl && o.scope_external_id) {
          const col = o.scope_kind === 'club' ? 'source_id' : 'code';
          const { data: row } = await supa
            .from(tbl).select('id').eq(col, o.scope_external_id).maybeSingle();
          scopeId = row?.id ?? null;
        }

        const payload = {
          member_id: member.id,
          scope_kind: o.scope_kind,
          scope_id: scopeId,
          role: o.role as LionsRole,
          term_start: o.term_start,
          term_end: o.term_end ?? null,
          status: o.status ?? 'active',
          source_id: o.id,
          last_sync_at: syncedAt,
        };
        const { data: existing } = await supa
          .from('officers').select('id').eq('source_id', o.id).maybeSingle();
        if (existing) {
          const { error } = await supa.from('officers').update(payload).eq('id', existing.id);
          if (error) { result.failed++; result.failures.push({ row: i, reason: error.message }); }
          else result.updated++;
        } else {
          const { error } = await supa.from('officers').insert(payload);
          if (error) { result.failed++; result.failures.push({ row: i, reason: error.message }); }
          else result.inserted++;
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
