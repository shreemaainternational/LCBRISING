/**
 * Self-bootstrap District 3232 FI when no districts exist yet.
 * Used by /api/zones and /api/crm/clubs POST so Quick Add stays
 * one-click on a fresh install where migration 0038 hasn't run.
 *
 * Returns the resolved district id, or null if both SSR and admin
 * inserts failed (e.g., no service-role key + RLS blocks).
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

/** Resolve the first existing district id; create the default if none exist. */
export async function resolveOrBootstrapDefaultDistrict(): Promise<string | null> {
  // 1) any existing district wins
  const supa = await createClient();
  try {
    const { data } = await supa.from('districts')
      .select('id').is('deleted_at', null).order('code').limit(1).maybeSingle();
    if (data?.id) return data.id as string;
  } catch { /* fall through */ }

  // 2) bootstrap the default — try SSR first, then admin
  const row = { code: DEFAULT_CODE, name: DEFAULT_NAME, lions_year: currentLionsYear() };

  const ssrTry = await supa.from('districts').insert(row).select('id').single();
  if (!ssrTry.error && ssrTry.data?.id) return ssrTry.data.id as string;

  // race: someone else just inserted it
  const { data: existing } = await supa.from('districts').select('id').eq('code', row.code).maybeSingle();
  if (existing?.id) return existing.id as string;

  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const admin = createAdminClient();
      const adminTry = await admin.from('districts').insert(row).select('id').single();
      if (!adminTry.error && adminTry.data?.id) return adminTry.data.id as string;
      const { data: ex } = await admin.from('districts').select('id').eq('code', row.code).maybeSingle();
      if (ex?.id) return ex.id as string;
    } catch { /* fall through */ }
  }
  return null;
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
