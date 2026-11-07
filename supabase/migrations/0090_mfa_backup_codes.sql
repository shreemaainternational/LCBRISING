-- Two-factor authentication: single-use backup (recovery) codes.
--
-- The TOTP factor itself lives in Supabase Auth (auth.mfa_factors). This
-- table only stores SHA-256 hashes of recovery codes so a user who loses
-- their authenticator can get back in. A used code removes the user's TOTP
-- factor (server-side, service role) and forces re-enrolment.
--
-- RLS is enabled with NO policies: only the service role (API routes under
-- /api/auth/mfa/*) can read or write. Codes are never readable by clients.

CREATE TABLE IF NOT EXISTS public.mfa_backup_codes (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code_hash  text NOT NULL,
  used_at    timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS mfa_backup_codes_user_idx
  ON public.mfa_backup_codes (user_id) WHERE used_at IS NULL;

ALTER TABLE public.mfa_backup_codes ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.mfa_backup_codes FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.mfa_backup_codes TO service_role;
