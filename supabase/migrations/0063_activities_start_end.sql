-- Add optional start/end timestamps to activities so field teams can log the
-- precise start date+time and end date+time of a service project. The existing
-- `date` (date) column is retained for backwards-compatible sorting/reporting
-- and is derived from the start timestamp when both are provided.

alter table public.activities
  add column if not exists start_at timestamptz,
  add column if not exists end_at   timestamptz;

create index if not exists idx_activities_start_at on public.activities(start_at);
