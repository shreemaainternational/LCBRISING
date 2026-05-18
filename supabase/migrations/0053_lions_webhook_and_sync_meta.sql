-- =====================================================================
-- 0053 — Lions inbound webhook receiver + per-row sync metadata
-- =====================================================================
-- Adds:
--   * lions_webhook_events: idempotency + audit log for inbound Lions push
--   * clubs.last_sync_at / officers.last_sync_at: lets REST adapters do
--     incremental ?updated_since= pulls without re-reading every row
--   * lions_api_settings.webhook_secret: HMAC shared secret for the
--     inbound /api/webhooks/lions endpoint. Stored as text and wrapped
--     by the app-side AES-GCM helper (src/lib/crypto/secret-box.ts).
--
-- Token encryption at rest:
--   Existing oauth_accounts.access_token / refresh_token / id_token,
--   lions_oidc_settings.client_secret, and lions_api_settings.api_key /
--   access_token columns are reused. The application now wraps newly
--   written values with the "enc:v1:" envelope when SECRET_ENCRYPTION_KEY
--   is set; legacy plaintext rows continue to read transparently.
-- =====================================================================

alter table public.clubs
  add column if not exists last_sync_at timestamptz;

alter table public.officers
  add column if not exists last_sync_at timestamptz;

alter table public.lions_api_settings
  add column if not exists webhook_secret text;

-- ---------------------------------------------------------------------
-- Inbound Lions webhook event log
-- ---------------------------------------------------------------------
create table if not exists public.lions_webhook_events (
  id uuid primary key default uuid_generate_v4(),
  -- event_id is the upstream identifier (e.g. Lions delivery ID).
  -- Treated as the idempotency key; duplicates are rejected at insert.
  event_id text not null unique,
  event_type text not null,                  -- 'member.updated', 'club.officer.appointed', etc.
  signature text,                            -- raw header value (for forensics)
  payload jsonb not null,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  status text not null default 'pending'     -- pending | processed | failed | skipped
    check (status in ('pending','processed','failed','skipped')),
  error text,
  sync_log_id uuid                           -- link to enqueued sync_logs row, if any
);

create index if not exists idx_lions_webhook_received on public.lions_webhook_events(received_at desc);
create index if not exists idx_lions_webhook_status   on public.lions_webhook_events(status);
create index if not exists idx_lions_webhook_type     on public.lions_webhook_events(event_type);

alter table public.lions_webhook_events enable row level security;

do $$ begin
  drop policy if exists lions_webhook_admin_read on public.lions_webhook_events;
  create policy lions_webhook_admin_read on public.lions_webhook_events
    for select using (
      exists (
        select 1 from public.members m
        where m.user_id = auth.uid()
          and (m.role = 'admin' or m.lions_role in ('international_admin','multiple_district_admin','district_governor'))
      )
    );
end $$;
