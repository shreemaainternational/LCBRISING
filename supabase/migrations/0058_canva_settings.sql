-- =====================================================================
-- Canva Connect OAuth 2.0 credentials (singleton).
--
-- The Canva Connect API authenticates resource calls (autofill, export,
-- brand templates) with a per-account OAuth *access token* — a static
-- client_id/secret alone can NOT call those endpoints. This table stores:
--   * the OAuth app credentials (client_id / client_secret), overridable
--     from env (CANVA_CLIENT_ID / CANVA_CLIENT_SECRET); and
--   * the access + refresh tokens obtained via the connect flow at
--     /api/canva/oauth/login → /api/canva/oauth/callback.
--
-- Secrets (client_secret, access_token, refresh_token) are wrapped by
-- src/lib/crypto/secret-box.ts before they land here when
-- SECRET_ENCRYPTION_KEY is set. The runtime helper in
-- src/lib/canva/config.ts refreshes the access token on expiry and
-- rotates the refresh token (Canva issues a new one on every refresh).
--
-- Admins connect / disconnect from /admin/integrations/canva. Mirrors the
-- openai_settings / push_settings singleton pattern.
-- =====================================================================

create table if not exists public.canva_settings (
  id text primary key default 'singleton' check (id = 'singleton'),
  -- OAuth app (falls back to CANVA_CLIENT_ID / CANVA_CLIENT_SECRET env)
  client_id text,
  client_secret text,
  -- Tokens obtained via the connect flow (encrypted at rest)
  access_token text,
  refresh_token text,
  access_token_expires_at timestamptz,
  scope text,
  -- Bookkeeping
  connected_at timestamptz,
  connected_by uuid references public.members(id) on delete set null,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$ begin
  drop trigger if exists set_updated_canva on public.canva_settings;
  create trigger set_updated_canva before update on public.canva_settings
    for each row execute function public.tg_set_updated_at();
end $$;

alter table public.canva_settings enable row level security;

-- Tokens are sensitive; only admins may read/write, and the runtime uses
-- the service-role client which bypasses RLS anyway.
do $$ begin
  create policy canva_admin on public.canva_settings
    for all using (
      exists (select 1 from public.members m
              where m.user_id = auth.uid() and m.role = 'admin')
    ) with check (true);
exception when duplicate_object then null; end $$;

-- Seed an empty singleton so the runtime can UPDATE it in place.
insert into public.canva_settings (id) values ('singleton')
on conflict (id) do nothing;
