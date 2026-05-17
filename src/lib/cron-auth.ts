/**
 * Runtime-overridable CRON secret. The Vercel cron scheduler sends
 * `Authorization: Bearer <CRON_SECRET>` (or `?secret=…` for legacy
 * paths) on every fire. We accept either an env-provided secret OR
 * the singleton row in `cron_settings` so the platform can self-
 * provision auth on first install without forcing a redeploy.
 */
import { env } from '@/lib/env';
import { createAdminClient } from '@/lib/supabase/server';

const TTL_MS = 60_000;
let cache: { value: string | null; expiresAt: number } | null = null;
let inflight: Promise<string | null> | null = null;

export async function loadCronSecret(force = false): Promise<string | null> {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return env.CRON_SECRET ?? null;
  const now = Date.now();
  if (!force && cache && cache.expiresAt > now) return cache.value ?? env.CRON_SECRET ?? null;
  if (!force && inflight) return inflight;

  inflight = (async () => {
    try {
      const db = createAdminClient();
      const { data } = await db.from('cron_settings').select('secret').eq('id', 'singleton').maybeSingle();
      const value = (data?.secret as string | undefined) ?? null;
      cache = { value, expiresAt: now + TTL_MS };
      return value ?? env.CRON_SECRET ?? null;
    } catch {
      cache = { value: null, expiresAt: now + TTL_MS };
      return env.CRON_SECRET ?? null;
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

export function peekCronSecret(): string | null {
  return cache?.value ?? env.CRON_SECRET ?? null;
}

export function invalidateCronCache(): void {
  cache = null;
  inflight = null;
}

/** True when at least one valid secret is known (env or DB). */
export function isCronAuthConfigured(): boolean {
  return !!peekCronSecret();
}

/**
 * Verifies a request from the Vercel scheduler. Accepts:
 *   - Authorization: Bearer <secret>
 *   - x-cron-secret: <secret>
 *   - ?secret=<secret>
 * Returns true if the secret matches the active value (DB or env).
 */
export async function verifyCronAuth(req: Request): Promise<boolean> {
  const expected = await loadCronSecret();
  if (!expected) return true; // no secret configured → leave the door open in dev
  const url = new URL(req.url);
  const provided =
    url.searchParams.get('secret') ??
    req.headers.get('x-cron-secret') ??
    req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  return typeof provided === 'string' && timingSafeEqual(provided, expected);
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
