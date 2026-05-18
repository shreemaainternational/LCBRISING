-- Per-photo captions, stored as a URL → caption JSON map so the
-- existing photos text[] column doesn't need a shape change.
alter table public.activities
  add column if not exists photo_captions jsonb not null default '{}'::jsonb;

alter table public.events
  add column if not exists photo_captions jsonb not null default '{}'::jsonb;

alter table public.beneficiaries
  add column if not exists photo_captions jsonb not null default '{}'::jsonb;
