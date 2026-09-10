-- =====================================================================
-- Seed the top of the Lions hierarchy: Multiple District 323, and link
-- the default district (3232 F1) under it. Idempotent.
--
--   Multiple District 323
--     └─ District 3232 F1  (→ Regions → Zones → Clubs → Members)
-- =====================================================================

insert into public.multiple_districts (code, name, country)
values ('323', 'Multiple District 323', 'India')
on conflict (code) do nothing;

update public.districts d
   set multiple_district_id = md.id
  from public.multiple_districts md
 where md.code = '323'
   and d.code = '3232 F1'
   and d.multiple_district_id is null;
