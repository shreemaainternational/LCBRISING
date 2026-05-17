-- =====================================================================
-- Governance enhancements for the multi-club zone management system.
--   * Assistant zone chair + deputy assignments
--   * Club categories + health & compliance scores
--   * Append-only assignment history so every club ↔ zone move is
--     auditable forever
-- =====================================================================

alter table public.zones
  add column if not exists assistant_chair_member_id uuid references public.members(id) on delete set null,
  add column if not exists notes text;

create index if not exists idx_zones_assistant on public.zones(assistant_chair_member_id);

alter table public.clubs
  add column if not exists assistant_chair_member_id uuid references public.members(id) on delete set null,
  add column if not exists category text,
  add column if not exists health_score int check (health_score is null or (health_score >= 0 and health_score <= 100)),
  add column if not exists compliance_score int check (compliance_score is null or (compliance_score >= 0 and compliance_score <= 100)),
  add column if not exists health_assessed_at timestamptz,
  add column if not exists health_commentary text,
  add column if not exists governance_notes text;

create index if not exists idx_clubs_category on public.clubs(category);
create index if not exists idx_clubs_health on public.clubs(health_score);
create index if not exists idx_clubs_zone_active on public.clubs(zone_id) where deleted_at is null;

-- ---------------------------------------------------------------------
-- Assignment history — every reassignment, deletion, restoration.
-- ---------------------------------------------------------------------
do $$ begin
  create type assignment_action as enum ('assigned', 'reassigned', 'unassigned', 'category_changed', 'chair_changed');
exception when duplicate_object then null; end $$;

create table if not exists public.club_assignment_history (
  id uuid primary key default uuid_generate_v4(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  action assignment_action not null,
  from_zone_id uuid references public.zones(id) on delete set null,
  to_zone_id   uuid references public.zones(id) on delete set null,
  from_region_id uuid references public.regions(id) on delete set null,
  to_region_id   uuid references public.regions(id) on delete set null,
  from_district_id uuid references public.districts(id) on delete set null,
  to_district_id   uuid references public.districts(id) on delete set null,
  changed_field text,            -- e.g. "category", "assistant_chair"
  changed_from text,
  changed_to text,
  reason text,
  performed_by uuid references public.members(id) on delete set null,
  performed_at timestamptz not null default now()
);

create index if not exists idx_cah_club on public.club_assignment_history(club_id, performed_at desc);
create index if not exists idx_cah_to_zone on public.club_assignment_history(to_zone_id);

alter table public.club_assignment_history enable row level security;

do $$ begin
  create policy cah_admin on public.club_assignment_history
    for all using (
      exists (select 1 from public.members m
              where m.user_id = auth.uid()
                and m.role in ('admin','president','secretary','treasurer','officer'))
    ) with check (true);
exception when duplicate_object then null; end $$;
