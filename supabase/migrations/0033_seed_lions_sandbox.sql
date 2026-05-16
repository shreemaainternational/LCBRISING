-- =====================================================================
-- Auto-seed Lions integrations in sandbox mode on a fresh install.
-- If a row already exists (admin has configured real credentials),
-- this is a no-op. Sandbox lets the "Sign in with Lions" button and
-- the MyLCI sync work end-to-end before real LCI credentials are in
-- place — admins flip sandbox off once they paste live values.
-- =====================================================================

insert into public.lions_oidc_settings (id, provider_label, scopes, is_active, sandbox_mode)
values ('singleton', 'Lions International (sandbox)', 'openid profile email lions.member', true, true)
on conflict (id) do nothing;

insert into public.lions_api_settings (id, is_active, sandbox_mode)
values ('singleton', true, true)
on conflict (id) do nothing;
