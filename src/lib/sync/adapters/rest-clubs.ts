import { createAdminClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { getValidAccessToken } from '@/lib/oidc/auto-refresh';
import type { SyncAdapter, SyncContext, SyncResult } from '../types';

const ApiClub = z.object({
  id: z.string(),
  name: z.string(),
  club_number: z.string().optional(),
  district_code: z.string().optional(),
  charter_date: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  meeting_schedule: z.unknown().optional(),
});

/**
 * REST → clubs adapter. Either supply `bearer_token` directly, or
 * `oauth_account_id` and the adapter will pull a valid token (auto-
 * refreshed) from oauth_accounts. Supports incremental sync via
 * `updated_since` (ISO date passed through to the upstream).
 */
export const restClubsAdapter: SyncAdapter = {
  source: 'rest_api',
  entity: 'clubs',
  async run({ job }: SyncContext): Promise<SyncResult> {
    const endpoint = job.payload?.endpoint as string | undefined;
    const oauthAccountId = job.payload?.oauth_account_id as string | undefined;
    let bearer = job.payload?.bearer_token as string | undefined;
    const pageSize = (job.payload?.page_size as number | undefined) ?? 100;
    const updatedSince = job.payload?.updated_since as string | undefined;
    if (!endpoint) throw new Error('rest-clubs: endpoint required');
    if (!bearer && !oauthAccountId) {
      throw new Error('rest-clubs: bearer_token or oauth_account_id required');
    }

    const supa = createAdminClient();
    const result: SyncResult = {
      total: 0, inserted: 0, updated: 0, skipped: 0, failed: 0, failures: [],
    };
    let cursor: string | null = (job.cursor as string | null) ?? null;
    let did401Retry = false;

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
        await supa
          .from('oauth_accounts')
          .update({ access_token_expires_at: new Date(0).toISOString() })
          .eq('id', oauthAccountId);
        continue;
      }
      if (!res.ok) throw new Error(`rest-clubs: upstream ${res.status} ${res.statusText}`);

      const body = (await res.json()) as { data?: unknown[]; next_cursor?: string };
      const items = Array.isArray(body.data) ? body.data : [];
      result.total += items.length;
      const syncedAt = new Date().toISOString();

      for (let i = 0; i < items.length; i++) {
        const parsed = ApiClub.safeParse(items[i]);
        if (!parsed.success) {
          result.failed++;
          result.failures.push({ row: i, reason: parsed.error.message });
          continue;
        }
        const c = parsed.data;
        let districtId: string | null = null;
        if (c.district_code) {
          const { data: d } = await supa
            .from('districts').select('id, name').eq('code', c.district_code).maybeSingle();
          districtId = d?.id ?? null;
        }
        const payload: Record<string, unknown> = {
          name: c.name,
          club_number: c.club_number ?? null,
          district: c.district_code ?? '',
          district_id: districtId,
          charter_date: c.charter_date ?? null,
          city: c.city ?? null,
          state: c.state ?? null,
          country: c.country ?? null,
          meeting_schedule: c.meeting_schedule ?? null,
          source_id: c.id,
          last_sync_at: syncedAt,
        };
        const { data: existing } = await supa
          .from('clubs').select('id').eq('source_id', c.id).maybeSingle();
        if (existing) {
          const { error } = await supa.from('clubs').update(payload).eq('id', existing.id);
          if (error) { result.failed++; result.failures.push({ row: i, reason: error.message }); }
          else result.updated++;
        } else {
          const { error } = await supa.from('clubs').insert(payload);
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
