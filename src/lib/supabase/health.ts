/**
 * Cheap Supabase environment preflight.
 *
 * Tests the configured URL + anon key + (optional) service-role key by
 * issuing a tiny `select id from districts limit 0` against each
 * client. Returns a structured report so admin pages can surface a
 * banner before the user hits a form-submit error.
 *
 * Cached for 30s per request lane to keep the cost negligible.
 */
import { createClient, createAdminClient } from './server';

export type ClientHealth = {
  ok: boolean;
  error?: string;
  /** Classified error code: 'invalid_key' | 'invalid_schema' | 'network' | 'rls' | 'unknown' */
  code?: 'invalid_key' | 'invalid_schema' | 'network' | 'rls' | 'unknown';
};

export type SupabaseHealth = {
  url: string | null;
  anon: ClientHealth;
  serviceRole: ClientHealth | null;
  /** True when at least one client can read public schema. */
  reachable: boolean;
  /** True when URL + keys appear to belong to the same project. */
  consistent: boolean;
};

const CACHE_TTL_MS = 30_000;
let cache: { value: SupabaseHealth; expiresAt: number } | null = null;

function classify(message: string): NonNullable<ClientHealth['code']> {
  if (/invalid api key|invalid jwt|jwsverification|jwt expired/i.test(message)) return 'invalid_key';
  if (/invalid schema|schema "public"|relation .* schema/i.test(message)) return 'invalid_schema';
  if (/fetch failed|ENOTFOUND|ECONNREFUSED|ETIMEDOUT|getaddrinfo/i.test(message)) return 'network';
  if (/row.level security|permission denied|new row violates/i.test(message)) return 'rls';
  return 'unknown';
}

async function probe(label: 'anon' | 'admin'): Promise<ClientHealth> {
  try {
    const supa = label === 'anon' ? await createClient() : createAdminClient();
    const { error } = await supa.from('districts').select('id').limit(0);
    if (error) return { ok: false, error: error.message, code: classify(error.message) };
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg, code: classify(msg) };
  }
}

export async function checkSupabaseHealth(force = false): Promise<SupabaseHealth> {
  if (!force && cache && cache.expiresAt > Date.now()) return cache.value;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? null;
  const anon = await probe('anon');
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY ? await probe('admin') : null;

  // "Consistent" means: every configured client can read. If service role
  // is missing it's allowed to be null without breaking consistency.
  const consistent = anon.ok && (!serviceRole || serviceRole.ok);
  const reachable = anon.ok || (serviceRole?.ok ?? false);

  const value: SupabaseHealth = { url, anon, serviceRole, reachable, consistent };
  cache = { value, expiresAt: Date.now() + CACHE_TTL_MS };
  return value;
}

/** One-line diagnosis suitable for an admin banner. */
export function diagnoseSupabase(h: SupabaseHealth): string | null {
  if (h.consistent) return null;
  const codes = [h.anon.code, h.serviceRole?.code].filter(Boolean) as string[];
  if (codes.includes('invalid_key') || codes.includes('invalid_schema')) {
    return 'Supabase URL/keys are mismatched — they must all belong to the same active project.';
  }
  if (codes.includes('network')) {
    return 'Supabase project is unreachable (DNS/network or paused project).';
  }
  if (!h.serviceRole) {
    return 'SUPABASE_SERVICE_ROLE_KEY is not set — admin writes will fall back to RLS.';
  }
  return 'Supabase connectivity check failed.';
}
