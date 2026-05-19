/**
 * Self-bootstrap District 3232 FI when no districts exist yet.
 * Used by /api/zones and /api/crm/clubs POST so Quick Add stays
 * one-click on a fresh install where migration 0038 hasn't run.
 */
import { createClient, createAdminClient } from '@/lib/supabase/server';

const DEFAULT_CODE = '3232 FI';
const DEFAULT_NAME = 'District 3232 FI';

function currentLionsYear(): string {
  const now = new Date();
  const y = now.getFullYear();
  const start = now.getMonth() >= 6 ? y : y - 1;
  return `${start}-${String((start + 1) % 100).padStart(2, '0')}`;
}

export interface BootstrapResult {
  id: string | null;
  source: 'existing' | 'ssr' | 'admin' | 'none';
  /** When source === 'none', a list of every error we hit. */
  errors: string[];
}

/**
 * Resolve the first existing district id; create the default if none exist.
 * Always returns a `BootstrapResult` so callers can surface a precise error
 * to the UI instead of a generic "could not auto-create".
 */
export async function resolveOrBootstrapDefaultDistrict(): Promise<BootstrapResult> {
  const errors: string[] = [];

  // 1) any existing district wins (cheap read)
  const supa = await createClient();
  try {
    const { data, error } = await supa.from('districts')
      .select('id').is('deleted_at', null).order('code').limit(1).maybeSingle();
    if (data?.id) return { id: data.id as string, source: 'existing', errors };
    if (error) errors.push(`select(ssr): ${error.message}`);
  } catch (e) {
    errors.push(`select(ssr) threw: ${(e as Error).message}`);
  }

  // 2) RPC bootstrap — runs as SECURITY DEFINER so it bypasses RLS
  //    without needing a service-role key. Defined in migration 0049.
  try {
    const { data, error } = await supa.rpc('ensure_default_district');
    if (!error && data) return { id: data as string, source: 'ssr', errors };
    if (error) errors.push(`rpc(ensure_default_district): ${error.message}`);
  } catch (e) {
    errors.push(`rpc(ensure_default_district) threw: ${(e as Error).message}`);
  }

  // 3) SSR direct insert (RLS-gated) — covers projects where 0049
  //    hasn't been applied yet but the caller IS an admin member.
  const row = { code: DEFAULT_CODE, name: DEFAULT_NAME, lions_year: currentLionsYear() };
  const ssrTry = await supa.from('districts').insert(row).select('id').single();
  if (!ssrTry.error && ssrTry.data?.id) return { id: ssrTry.data.id as string, source: 'ssr', errors };
  if (ssrTry.error) errors.push(`insert(ssr): ${ssrTry.error.message}`);

  // race: someone else just inserted it
  const { data: existing } = await supa.from('districts').select('id').eq('code', row.code).maybeSingle();
  if (existing?.id) return { id: existing.id as string, source: 'existing', errors };

  // 4) Last resort — bootstrap via admin (bypasses RLS)
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const admin = createAdminClient();
      const adminTry = await admin.from('districts').insert(row).select('id').single();
      if (!adminTry.error && adminTry.data?.id) return { id: adminTry.data.id as string, source: 'admin', errors };
      if (adminTry.error) errors.push(`insert(admin): ${adminTry.error.message}`);
      const { data: ex } = await admin.from('districts').select('id').eq('code', row.code).maybeSingle();
      if (ex?.id) return { id: ex.id as string, source: 'existing', errors };
    } catch (e) {
      errors.push(`admin client threw: ${(e as Error).message}`);
    }
  } else {
    errors.push('SUPABASE_SERVICE_ROLE_KEY is not configured — cannot bypass RLS to create the default district.');
  }
  return { id: null, source: 'none', errors };
}

/** Just resolve the default district code (no insert) for legacy text column. */
export async function resolveDefaultDistrictCode(districtId: string | null | undefined): Promise<string> {
  if (!districtId) return DEFAULT_CODE;
  const supa = await createClient();
  try {
    const { data } = await supa.from('districts').select('code').eq('id', districtId).maybeSingle();
    if (data?.code) return data.code as string;
  } catch { /* fall through */ }
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const admin = createAdminClient();
      const { data } = await admin.from('districts').select('code').eq('id', districtId).maybeSingle();
      if (data?.code) return data.code as string;
    } catch { /* fall through */ }
  }
  return DEFAULT_CODE;
}

/** Human-friendly explanation of why bootstrap failed. */
export function explainBootstrapFailure(result: BootstrapResult): string {
  const joined = result.errors.join(' | ');

  // "Invalid schema: public" + "Invalid API key" together is the classic
  // signature of a Supabase URL ↔ key mismatch: the project URL points
  // to project A, but one or more of the anon/service-role keys belong
  // to a different project (or the project is paused/deleted). Catch
  // this first because the symptom looks like several different errors.
  const schemaProblem = /invalid schema|schema "public"|relation .* schema/i.test(joined);
  const keyProblem = /invalid api key|invalid jwt|jwsverification|jwt expired/i.test(joined);
  if (schemaProblem || keyProblem) {
    return [
      'Supabase project is unreachable or the keys are mismatched.',
      'Check that NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,',
      'and SUPABASE_SERVICE_ROLE_KEY all belong to the same active project',
      '— Settings → API in the Supabase dashboard. If the project was paused,',
      'restore it. Run /admin/integrations to see live status per key.',
      'Detail: ' + joined,
    ].join(' ');
  }

  // Migration 0049 not yet applied — RPC missing.
  if (/does not exist|undefined function|404|relation.*does not exist|search_path/i.test(joined)) {
    return 'Default district auto-create requires migration 0049_ensure_default_district.sql — apply it in your Supabase project (SQL editor → run the file). Detail: ' + joined;
  }
  if (/row.level security|new row violates|permission denied/i.test(joined)) {
    return process.env.SUPABASE_SERVICE_ROLE_KEY
      ? 'Default district auto-create blocked by RLS even with the service role key. Verify migration 0037_federation_rls.sql ran. Detail: ' + joined
      : 'Default district auto-create blocked by RLS. Apply migration 0049_ensure_default_district.sql for a one-shot fix, or set SUPABASE_SERVICE_ROLE_KEY. Detail: ' + joined;
  }
  // Network / DNS — project URL doesn't resolve.
  if (/fetch failed|ENOTFOUND|ECONNREFUSED|ETIMEDOUT|getaddrinfo/i.test(joined)) {
    return 'Cannot reach the Supabase project — NEXT_PUBLIC_SUPABASE_URL does not resolve, the project is paused, or the network is blocked. Detail: ' + joined;
  }
  if (joined.includes('SUPABASE_SERVICE_ROLE_KEY is not configured')) {
    return 'Default district auto-create needs either migration 0049_ensure_default_district.sql applied, or a real Supabase Auth session signed in as an admin member, or SUPABASE_SERVICE_ROLE_KEY in your environment. Detail: ' + joined;
  }
  return joined || 'Default district auto-create failed for an unknown reason.';
}
