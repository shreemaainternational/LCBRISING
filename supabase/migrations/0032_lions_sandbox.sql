-- Sandbox flag for the Lions integrations. When enabled, the
-- "Sign in with Lions" button works without real LCI credentials —
-- it provisions a synthetic Lion via the existing service-role auth
-- and signs the user in as that identity. The REST sync similarly
-- returns canned data instead of dry-run zeroes, so all downstream
-- UI can be exercised end-to-end before partnership with LCI is in
-- place.
alter table public.lions_oidc_settings
  add column if not exists sandbox_mode boolean not null default false;

alter table public.lions_api_settings
  add column if not exists sandbox_mode boolean not null default false;
