-- =====================================================================
-- merge_duplicate_activities.sql
-- 1. Removes the 26 empty duplicate activity records found by
--    audit_duplicate_activities.sql (run #19, 15 Oct 2026). Each one is an
--    empty copy of a filled record with the same title and date.
--    For every (empty, filled) pair, re-checked at run time:
--      - the empty copy still exists, has no description, all four figures
--        are 0 and it carries no photos/videos;
--      - the filled copy still exists, has a description, and has the same
--        title (case/space-insensitive) and date.
--    Then:
--      - the filled copy takes the empty copy's category, only when its own
--        category is empty or 'other' (it keeps a real cause category,
--        which matches the club's Lions portal export);
--      - any row in another table that points at the empty copy is moved
--        to the filled copy (found from the live foreign keys);
--      - the empty copy is deleted.
--    A pair that fails any check is skipped and left untouched.
-- 2. Writes a description for "Doctors Day Celebration" (12 Jul 2026),
--    only while its description is still just its title. Uses only the
--    facts on the record: location, Lion members and service hours.
-- Idempotent: a second run finds nothing to do.
-- Run via:
--   Actions -> "Apply database migration (one-shot)"
--   -> sql_path = supabase/scripts/merge_duplicate_activities.sql
-- =====================================================================

do $lcbmerge$
declare
  p        record;
  e        jsonb;
  f        jsonb;
  fk       record;
  k        text;
  has_media boolean;
begin
  for p in
    select * from (values
      ('08b77cee-2b67-43b7-8deb-be166652ff06'::uuid, 'ab36f860-bcd0-45ba-92f3-3ef1456893e2'::uuid),  -- Zone social at Vakal seva kandra sayjigunj
      ('60d8850a-12b9-4de7-85bf-9755d7629769'::uuid, 'a5a266dc-550a-4d7c-bea9-c62a922dbfba'::uuid),  -- Installation Ceremony
      ('8e27e2de-d5b8-44b7-bfa5-546ca8b3fe5a'::uuid, '9b359445-d6e6-40d1-a811-de4b27c87279'::uuid),  -- TB Kit Distribution
      ('5618bfbe-333c-455a-8890-fa2fd252ac2b'::uuid, 'e96ae0ea-5c61-4b0a-a014-a65f01fb9ec1'::uuid),  -- Board Meeting
      ('9edf9847-0b92-483c-8e6a-50e50f29cabc'::uuid, 'a78140ae-7be1-4cc9-9974-0bde1030bbd2'::uuid),  -- Board & General Board Meeting
      ('e6c1255c-6de5-488b-8979-3f882e39cd15'::uuid, '8728fc98-ca59-4269-a283-1b8ef897f415'::uuid),  -- DISTRICT SERVICE WEEK CELEBRATION 2024/2025
      ('8b600de3-db07-4157-827e-c53d4416ff4c'::uuid, 'ff25ea9a-b9bf-49ff-ace6-47f3cd612780'::uuid),  -- GB-4
      ('163380ae-2f0c-4cc5-8b12-b03d3d93a86a'::uuid, '43e930a8-b98e-4155-9a51-7824b820a1fd'::uuid),  -- Region -5 Samrprpan Region Confrance.
      ('efff41af-246c-4f0f-83c5-432dcbe01dbc'::uuid, '245fcbfc-669c-4756-9bc5-1852f09848bb'::uuid),  -- THE RANKAR DISTRICT CONFERENCE
      ('5ac098eb-e9f5-47e2-8d6a-4513a74d2911'::uuid, '5afc304c-0e8c-4c14-83da-9a93ce16140e'::uuid),  -- BM-5& GB-5
      ('42fdda75-ce67-4be6-9a6c-ee47fc7a2970'::uuid, '094d7eb5-9307-486d-9092-8ad7fb67e702'::uuid),  -- BM-6 & GB-6
      ('7c61ef1d-444f-451f-b569-9c6b19be48f0'::uuid, '8a516b72-738b-457d-b418-7c7b8eeb3dd8'::uuid),  -- DISTRICT SCHOOLING MEETING FOR PST & VP-1
      ('5dd3faa5-78e5-4d5e-8198-eb3681a81d5d'::uuid, '7a877ed3-80fb-4556-be70-04729c15eb97'::uuid),  -- YOGA DAY CELEBRATION
      ('ecf86109-9020-4409-89b6-9d27fabbc81d'::uuid, '7a877ed3-80fb-4556-be70-04729c15eb97'::uuid),  -- YOGA DAY CELEBRATION
      ('23b74ffb-a228-43da-9088-f8504a4cdd14'::uuid, '166c4fc7-3cb6-47f0-985c-6c96bcff1cbf'::uuid),  -- PRELIMINARY CABINET MEETING
      ('8eafb900-35d1-430d-8b05-6398e8bc5ab9'::uuid, '8675658e-d89f-41e9-a741-ec77d55348ba'::uuid),  -- ZC/RC AND DG VISIT IN LIONS CLUB OF BARODA RISING STAR
      ('b6decc6d-1467-48f6-8a16-2f0ec14195fb'::uuid, '4eecdf32-7cee-465a-b660-8606bad3a05d'::uuid),  -- Doctors day Celebration
      ('4f6e6587-2935-41b1-8a70-0167ee6537f3'::uuid, '667573ea-81ef-45b5-b185-07f98be2ab13'::uuid),  -- BLOOD DONATION CAMP
      ('e4789c3d-838a-4db6-a937-e0807153d99b'::uuid, '80dfed09-459b-45a2-b94f-449d3d9c80a3'::uuid),  -- NAND MAHOTSAV
      ('482c791e-cd01-44ec-96f8-cb24828c0b92'::uuid, '8458eb5c-6d0f-40c4-af8d-554620389a81'::uuid),  -- GAT Conclave
      ('1542d164-2603-464d-afac-6f2364691146'::uuid, '7739b78d-4dbc-45a6-8171-7c341e78f88f'::uuid),  -- GET CANCLAVE
      ('25a27f5a-14f7-493d-8656-1d2808b82489'::uuid, '7c780a06-3f7f-482a-b806-91ef0c11bd3e'::uuid),  -- Kawad Yatra
      ('af6e8f0f-105a-4fcd-82b5-f7da86ec4221'::uuid, 'aafe4f50-6fd0-4a71-83c4-a12da49341a3'::uuid),  -- 1st Zone Advisory Meeting
      ('55acbc3d-cdad-47d3-ace9-0f92d14efaa2'::uuid, 'cdeee5b7-b7b6-4be9-b11f-7621f621e42c'::uuid),  -- REGION STAFF MEETING REGION -6
      ('e2e90ced-1a75-4150-bb6d-8588171111f0'::uuid, 'c63f2c0a-f336-4011-89be-4f24d1472077'::uuid),  -- First Cabinet meeting
      ('54582e98-4dff-4e34-b9c0-4bec89ed5838'::uuid, '0e993c04-053b-418d-924c-40f22440cbf6'::uuid)  -- T B KIT DISTRIBUTION
    ) as v(empty_id, filled_id)
  loop
    select to_jsonb(a) into e from public.activities a where a.id = p.empty_id;
    select to_jsonb(a) into f from public.activities a where a.id = p.filled_id;

    if e is null or f is null then
      raise notice 'skip %: record missing', p.empty_id;
      continue;
    end if;

    has_media := false;
    foreach k in array array['photos','before_photos','after_photos','videos'] loop
      if jsonb_typeof(e -> k) = 'array' and jsonb_array_length(e -> k) > 0 then
        has_media := true;
      end if;
    end loop;

    if coalesce(btrim(e ->> 'description'), '') <> ''
       or coalesce(btrim(f ->> 'description'), '') = ''
       or lower(btrim(e ->> 'title')) <> lower(btrim(f ->> 'title'))
       or (e ->> 'date') is distinct from (f ->> 'date')
       or coalesce((e ->> 'beneficiaries')::numeric, 0) <> 0
       or coalesce((e ->> 'lion_members_count')::numeric, 0) <> 0
       or coalesce((e ->> 'service_hours')::numeric, 0) <> 0
       or coalesce((e ->> 'amount_raised')::numeric, 0) <> 0
       or has_media
    then
      raise notice 'skip %: checks failed', p.empty_id;
      continue;
    end if;

    update public.activities
       set category = e ->> 'category'
     where id = p.filled_id
       and coalesce(category, 'other') = 'other'
       and coalesce(e ->> 'category', 'other') <> 'other';

    for fk in
      select c.conrelid::regclass::text as tbl, a.attname as col
      from pg_constraint c
      join pg_attribute a on a.attrelid = c.conrelid and a.attnum = c.conkey[1]
      where c.contype = 'f'
        and c.confrelid = 'public.activities'::regclass
        and array_length(c.conkey, 1) = 1
    loop
      execute format('update %s set %I = $1 where %I = $2', fk.tbl, fk.col, fk.col)
        using p.filled_id, p.empty_id;
    end loop;

    delete from public.activities where id = p.empty_id;
  end loop;

  update public.activities
     set description = $lcbdesc$Lions Club of Baroda Rising Star held its Doctors Day Celebration on 12 July 2026 at IMA Vadodara, the Vadodara branch of the Indian Medical Association.

The programme marked Doctors' Day, observed in India on 1 July, and recognised the service that the city's doctors give to the community.

22 Lion members of the club took part, contributing 88 service hours.$lcbdesc$
   where id = 'd9cb9a5e-3f20-4081-941f-1ac712f60577'
     and date = date '2026-07-12'
     and btrim(description) = 'Doctors Day Celebration';
end
$lcbmerge$;

select
  (select count(*) from public.activities) as total_activities,
  (select count(*) from public.activities a
    where coalesce(btrim(a.description), '') = ''
      and exists (select 1 from public.activities s
                   where s.id <> a.id
                     and lower(btrim(s.title)) = lower(btrim(a.title))
                     and s.date = a.date))  as empty_duplicates_left,
  (select count(*) from public.activities
    where description is null or length(btrim(description)) < 60) as short_or_missing_descriptions,
  (select length(description) from public.activities
    where id = 'd9cb9a5e-3f20-4081-941f-1ac712f60577') as doctors_day_description_length;
