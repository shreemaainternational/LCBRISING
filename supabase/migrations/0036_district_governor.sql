-- =====================================================================
-- Link a District Governor to a member so /district/* can scope by the
-- logged-in DG, in the same way zones.chairperson_member_id powers
-- /zone/*.
-- =====================================================================

alter table public.districts
  add column if not exists governor_member_id uuid references public.members(id) on delete set null,
  add column if not exists vice_governor_member_id uuid references public.members(id) on delete set null,
  add column if not exists cabinet_notes text;

create index if not exists idx_districts_governor on public.districts(governor_member_id);
