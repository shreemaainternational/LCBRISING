-- =====================================================================
-- Runtime helper: ensure_default_district()
--
-- Self-bootstrap for the Quick Add flows on /admin/zones and
-- /admin/clubs. Returns the id of District 3232 F1, creating it on
-- first call. Runs as SECURITY DEFINER so an authenticated user with
-- no admin members row can still trigger the bootstrap without us
-- needing SUPABASE_SERVICE_ROLE_KEY.
--
-- Also seeds the row directly when the migration is applied, so this
-- migration alone is enough — the runtime function is the belt-and-
-- braces fallback for projects that get re-applied out of order.
-- =====================================================================

insert into public.districts (code, name, lions_year)
values (
  '3232 F1',
  'District 3232 F1',
  case
    when extract(month from now()) >= 7
      then extract(year from now())::int || '-' || lpad(((extract(year from now())::int + 1) % 100)::text, 2, '0')
    else (extract(year from now())::int - 1) || '-' || lpad((extract(year from now())::int % 100)::text, 2, '0')
  end
)
on conflict (code) do nothing;

create or replace function public.ensure_default_district()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  did uuid;
  ly  text;
begin
  -- Reuse any existing district first.
  select id into did from public.districts
   where deleted_at is null
   order by code
   limit 1;
  if did is not null then
    return did;
  end if;

  ly := case
    when extract(month from now()) >= 7
      then extract(year from now())::int || '-' || lpad(((extract(year from now())::int + 1) % 100)::text, 2, '0')
    else (extract(year from now())::int - 1) || '-' || lpad((extract(year from now())::int % 100)::text, 2, '0')
  end;

  insert into public.districts (code, name, lions_year)
  values ('3232 F1', 'District 3232 F1', ly)
  on conflict (code) do update set name = excluded.name
  returning id into did;

  return did;
end
$$;

-- Anyone authenticated can call it — the function only ever creates the
-- single default district, no privileged data is leaked.
revoke all on function public.ensure_default_district() from public;
grant execute on function public.ensure_default_district() to anon, authenticated, service_role;
