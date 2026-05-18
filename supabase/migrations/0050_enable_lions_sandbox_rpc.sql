-- =====================================================================
-- One-click Lions sandbox enable. Flips both the OIDC and REST API
-- singletons to sandbox_mode=true so /admin/integrations cards turn
-- green without needing SUPABASE_SERVICE_ROLE_KEY.
--
-- Uses SECURITY DEFINER so the synthetic-admin (lcbr_crm cookie) path,
-- where auth.uid() is null inside RLS, still works. The function only
-- ever flips the singleton sandbox flags — no privileged data leaks.
-- =====================================================================

create or replace function public.enable_lions_sandbox()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  oidc_id  text := 'singleton';
  api_id   text := 'singleton';
begin
  -- OIDC settings singleton (table created in migration 0030)
  insert into public.lions_oidc_settings (id, is_active, sandbox_mode, provider_label, scopes, configured_at)
  values (oidc_id, true, true, 'Lions International (sandbox)', 'openid profile email lions.member', now())
  on conflict (id) do update set
    is_active = true,
    sandbox_mode = true,
    provider_label = coalesce(public.lions_oidc_settings.provider_label, 'Lions International (sandbox)'),
    scopes = coalesce(public.lions_oidc_settings.scopes, 'openid profile email lions.member'),
    configured_at = now();

  -- Lions REST API settings singleton (table created in migration 0031)
  insert into public.lions_api_settings (id, is_active, sandbox_mode, configured_at)
  values (api_id, true, true, now())
  on conflict (id) do update set
    is_active = true,
    sandbox_mode = true,
    configured_at = now();

  return jsonb_build_object(
    'ok', true,
    'oidc_sandbox', true,
    'api_sandbox', true
  );
end
$$;

revoke all on function public.enable_lions_sandbox() from public;
grant execute on function public.enable_lions_sandbox() to anon, authenticated, service_role;
