-- =====================================================================
-- Link a Multiple-District council chairperson (or coordinator) to a
-- members.id so /multi-district/* can scope to the logged-in MD admin
-- the same way zones / regions / districts do.
-- =====================================================================

alter table public.multiple_districts
  add column if not exists council_chairperson_member_id uuid references public.members(id) on delete set null,
  add column if not exists notes text;

create index if not exists idx_md_chair on public.multiple_districts(council_chairperson_member_id);
