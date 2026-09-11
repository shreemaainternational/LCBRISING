-- =====================================================================
-- Lions Report Validator / Lions Portal submission workflow.
--
-- Adds the CRM-side state machine that sits between a logged service
-- activity and the club's official report on the Lions Portal:
--
--   not_submitted -> validated -> ready -> submitted
--
-- The Lions Portal itself has no public submission API, so "submitted"
-- is recorded by an authorized officer after they file the report by
-- hand on the actual portal; `lions_report_id` holds the confirmation
-- / Service Activity ID they get back. That same ID is what the
-- existing Lion-Portal CSV import (src/lib/sync/adapters/csv-activities.ts)
-- reconciles against `service_activities.service_activity_id`, so a
-- later export-and-reimport auto-confirms (or corrects) the submission
-- without a human re-typing anything.
-- =====================================================================

alter table public.activities
  add column if not exists lions_status text not null default 'not_submitted'
    check (lions_status in ('not_submitted', 'validated', 'ready', 'submitted')),
  add column if not exists lions_description text,
  add column if not exists lions_validation jsonb,
  add column if not exists lions_report_id text,
  add column if not exists lions_validated_at timestamptz,
  add column if not exists lions_ready_at timestamptz,
  add column if not exists lions_submitted_at timestamptz,
  add column if not exists lions_submitted_by uuid references public.members(id) on delete set null;

create index if not exists activities_lions_status_idx on public.activities(lions_status);
create unique index if not exists activities_lions_report_id_idx
  on public.activities(lions_report_id) where lions_report_id is not null;
