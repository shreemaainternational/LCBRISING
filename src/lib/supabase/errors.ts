/**
 * Turns cryptic Supabase/PostgREST error strings into actionable guidance.
 *
 * The raw messages ("Invalid schema: public", "Invalid API key", …) are almost
 * always environment/config problems — the wrong project URL, a stale anon /
 * service-role key, or `public` missing from the project's Exposed Schemas —
 * rather than application bugs. Surfacing the fix steps lets an admin self-serve
 * instead of seeing an opaque error on a form.
 */

export function projectRefFromUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const m = url.match(/https?:\/\/([a-z0-9]+)\.supabase\.co/i);
  return m?.[1] ?? '(unknown)';
}

export function supabaseMismatchDiagnostic(detail: string): string {
  const ref = projectRefFromUrl();
  const hasSR = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
  return [
    `Supabase keys are misconfigured — the request is reaching project ref "${ref}" but at least one key was rejected.`,
    `Fix steps:`,
    `(1) Open https://supabase.com/dashboard → pick the project at db.${ref}.supabase.co`,
    `(2) Settings → API → copy Project URL, anon (public) key, and service_role (secret) key`,
    `(3) Vercel project → Settings → Environment Variables — verify all THREE of NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY${hasSR ? ', and SUPABASE_SERVICE_ROLE_KEY' : ' (and add SUPABASE_SERVICE_ROLE_KEY)'} match the values from step 2.`,
    `(4) Redeploy without build cache.`,
    `Detail: ${detail}`,
  ].join(' ');
}

export function supabaseSchemaDiagnostic(detail: string): string {
  const ref = projectRefFromUrl();
  return [
    `PostgREST rejected the "public" schema on project "${ref}". Two likely causes:`,
    `(A) Supabase Dashboard → Project Settings → API → "Exposed schemas" doesn't include "public". Add it and save.`,
    `(B) NEXT_PUBLIC_SUPABASE_URL on Vercel points at a different/stale project than where you applied the migrations. Confirm the URL hostname matches the project you've been editing.`,
    `Detail: ${detail}`,
  ].join(' ');
}

/**
 * Map a raw Supabase error message to a human-friendly diagnostic.
 * Returns the original message unchanged when it isn't a known config error.
 */
export function describeSupabaseError(message: string | null | undefined): string {
  const detail = (message ?? '').trim();
  if (!detail) return 'Supabase request failed for an unknown reason.';
  if (/invalid schema/i.test(detail) && /invalid api key/i.test(detail)) {
    return supabaseMismatchDiagnostic(detail);
  }
  if (/invalid schema/i.test(detail)) return supabaseSchemaDiagnostic(detail);
  if (/invalid api key|jwt|jws/i.test(detail)) return supabaseMismatchDiagnostic(detail);
  return detail;
}
