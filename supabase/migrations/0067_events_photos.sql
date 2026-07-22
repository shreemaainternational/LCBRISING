-- Multi-photo support for events. Events already carry a single `cover_url`
-- plus a `photo_captions` map (0024); this adds the photo gallery array so an
-- event's story popup can show several images, mirroring `activities.photos`.
-- Additive and idempotent — safe to re-run.
alter table public.events
  add column if not exists photos text[] not null default '{}'::text[];
