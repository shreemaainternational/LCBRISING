-- =====================================================================
-- public.events is missing the `category` column that app code already
-- reads and writes (eventsPreset's admin form posts a category value to
-- /api/events, and /admin/events + event-categories.ts read it back) —
-- so far every event insert/select that touches category has been
-- failing/no-op against the real schema. This adds the column plus a
-- `status` column mirroring the vocabulary already used on
-- public.activities.status ('planned' | 'in_progress' | 'completed' |
-- 'cancelled'), so events can be classified and filtered the same way
-- activities are on the master Activities & Programmes calendar.
-- =====================================================================

alter table public.events
  add column if not exists category text,
  add column if not exists status text;

create index if not exists idx_events_category on public.events(category);
