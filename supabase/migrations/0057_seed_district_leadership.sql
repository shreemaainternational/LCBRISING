-- 0057_seed_district_leadership.sql
--
-- Seed the current District 3232 F1 leadership so the mobile "Current
-- Leadership" strip shows real officers. Idempotent: safe to re-run.
--
-- Note: the lions_role enum has a single 'vice_district_governor', so the
-- distinct "1st / 2nd Vice District Governor" titles are stored in
-- officers.notes (used as the display label) and ordered via
-- officers.source_id.

insert into public.members (name, email, lions_role, status)
values
  ('MJF Lion Ashok Jain',        'ashok.jain.dg@lions3232f1.in',    'district_governor',      'active'),
  ('MJF Lion Harish Desai',      'harish.desai.1vdg@lions3232f1.in','vice_district_governor', 'active'),
  ('MJF Lion Nareshkumar Patel', 'naresh.patel.2vdg@lions3232f1.in','vice_district_governor', 'active')
on conflict (email) do update
  set name = excluded.name,
      lions_role = excluded.lions_role,
      status = 'active';

-- Refresh the three district officer rows idempotently.
delete from public.officers
where scope_kind = 'district' and source_id in ('dist-01', 'dist-02', 'dist-03');

insert into public.officers (member_id, scope_kind, scope_id, role, term_start, status, notes, source_id)
select m.id,
       'district',
       (select id from public.districts order by created_at limit 1),
       v.role::lions_role,
       current_date,
       'active',
       v.title,
       v.src
from (values
  ('ashok.jain.dg@lions3232f1.in',     'district_governor',      'District Governor',          'dist-01'),
  ('harish.desai.1vdg@lions3232f1.in', 'vice_district_governor', '1st Vice District Governor', 'dist-02'),
  ('naresh.patel.2vdg@lions3232f1.in', 'vice_district_governor', '2nd Vice District Governor', 'dist-03')
) as v(email, role, title, src)
join public.members m on m.email = v.email;

-- Fallback name on the district row (used when officer rows are absent).
update public.districts
set governor_name = 'MJF Lion Ashok Jain'
where id = (select id from public.districts order by created_at limit 1);
