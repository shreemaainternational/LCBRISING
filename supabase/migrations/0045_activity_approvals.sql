-- =====================================================================
-- Activity approval queue for Zone Chairpersons. Activities filed by
-- clubs flow into this queue when the zone has approval enabled.
-- Backwards-compatible: existing activities default to 'approved'.
-- =====================================================================

do $$ begin
  create type public.activity_approval_status as enum ('pending', 'approved', 'rejected', 'changes_requested');
exception when duplicate_object then null; end $$;

alter table public.activities
  add column if not exists approval_status public.activity_approval_status not null default 'approved',
  add column if not exists approval_notes text,
  add column if not exists approved_by_member_id uuid references public.members(id) on delete set null,
  add column if not exists approved_at timestamptz,
  add column if not exists submitted_for_approval_at timestamptz;

create index if not exists idx_activities_approval_status
  on public.activities(approval_status)
  where approval_status in ('pending', 'changes_requested');

-- Per-zone setting — when true, new activities are auto-set to 'pending'
-- on insert and surfaced in /zone/approvals.
alter table public.zones
  add column if not exists require_activity_approval boolean not null default false;

-- Trigger: when a zone has approval enabled, force new activities into
-- 'pending'. Run only on INSERT; updates by the zone chair are exempt.
create or replace function public.tg_activity_pre_approve()
returns trigger language plpgsql as $$
declare
  zone_requires boolean;
begin
  if new.approval_status is null then
    new.approval_status := 'approved';
  end if;
  if new.club_id is not null then
    select coalesce(z.require_activity_approval, false)
      into zone_requires
      from public.clubs c
      left join public.zones z on z.id = c.zone_id
      where c.id = new.club_id;
    if zone_requires then
      new.approval_status := 'pending';
      new.submitted_for_approval_at := now();
    end if;
  end if;
  return new;
end $$;

do $$ begin
  drop trigger if exists tg_activity_pre_approve on public.activities;
  create trigger tg_activity_pre_approve
    before insert on public.activities
    for each row execute function public.tg_activity_pre_approve();
end $$;
