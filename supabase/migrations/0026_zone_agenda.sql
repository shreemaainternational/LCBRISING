-- Zone Chairperson editable agenda. One row per agenda item — could
-- be a meeting line item, a calendar event, an action item, etc.
do $$ begin
  create type agenda_status as enum ('planned', 'in_progress', 'done', 'cancelled');
exception when duplicate_object then null; end $$;

create table if not exists public.zone_agenda (
  id uuid primary key default uuid_generate_v4(),
  zone_id uuid not null references public.zones(id) on delete cascade,
  title text not null,
  notes text,
  scheduled_at timestamptz,
  location text,
  owner_member_id uuid references public.members(id) on delete set null,
  status agenda_status not null default 'planned',
  is_pinned boolean not null default false,
  display_order int not null default 0,
  created_by uuid references public.members(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_zone_agenda_zone on public.zone_agenda(zone_id);
create index if not exists idx_zone_agenda_scheduled on public.zone_agenda(scheduled_at);
create index if not exists idx_zone_agenda_order on public.zone_agenda(zone_id, is_pinned desc, display_order);

do $$ begin
  drop trigger if exists set_updated_zone_agenda on public.zone_agenda;
  create trigger set_updated_zone_agenda before update on public.zone_agenda
    for each row execute function public.tg_set_updated_at();
end $$;

alter table public.zone_agenda enable row level security;

do $$ begin
  create policy zone_agenda_admin_all on public.zone_agenda
    for all using (
      exists (select 1 from public.members m
              where m.user_id = auth.uid()
                and m.role in ('admin','president','secretary','treasurer','officer'))
    ) with check (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy zone_agenda_chair on public.zone_agenda
    for all using (
      zone_id in (
        select z.id from public.zones z
        join public.members m on m.id = z.chairperson_member_id
        where m.user_id = auth.uid()
      )
    ) with check (
      zone_id in (
        select z.id from public.zones z
        join public.members m on m.id = z.chairperson_member_id
        where m.user_id = auth.uid()
      )
    );
exception when duplicate_object then null; end $$;
