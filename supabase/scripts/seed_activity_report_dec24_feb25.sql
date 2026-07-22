-- =====================================================================
-- Activity & Event report seed — Dec 2024 to Feb 2025 (Lions Club of
-- Baroda Rising Star). Source: club ACTIVITY REPORT.docx.
--   * Events (Installation, Board Meetings) -> public.events
--   * Service activities -> public.activities, categorised per Lions cause
--     (healthcare/hunger/education/diabetes -> Humanitarian/Hunger/Youth/Diabetes)
--   * Every photo is wired into public.photos so it also shows in the Gallery.
-- Photos are served from /public (committed with this change).
-- Idempotent: UPDATE existing rows (keyed on title+date) then INSERT any
-- missing; gallery rows guarded on url. Safe to re-run.
-- =====================================================================

-- Ensure every column this seed writes exists, regardless of how far the
-- target database's migrations have advanced (all idempotent no-ops if
-- already present).
alter table public.events
  add column if not exists photos text[] not null default '{}'::text[];
alter table public.activities
  add column if not exists volunteer_hours_total numeric(10,2) not null default 0,
  add column if not exists lion_members_count    int           not null default 0,
  add column if not exists budget                numeric(12,2) not null default 0,
  add column if not exists expenses              numeric(12,2) not null default 0,
  add column if not exists is_medical_camp       boolean       not null default false,
  add column if not exists status                text          not null default 'completed',
  add column if not exists start_at              timestamptz,
  add column if not exists end_at                timestamptz;
do $$ begin
  create type public.activity_approval_status as enum ('pending','approved','rejected','changes_requested');
exception when duplicate_object then null; end $$;
alter table public.activities
  add column if not exists approval_status public.activity_approval_status not null default 'approved';

-- Event 1: Installation Ceremony (2024-12-11)
update public.events set
  description='Installation Ceremony held on 2024-12-11 at Krishna Garden Restaurant, Party Lawns & Banquet Hall, Vadodara. 98 Lions volunteers contributed 588 Lion hours. Expenditure ₹50,000.', location='Krishna Garden Restaurant, Party Lawns & Banquet Hall, Vadodara', is_public=true,
  cover_url='/uploads/activity-report-2024-25/image2.jpeg', photos=ARRAY['/uploads/activity-report-2024-25/image2.jpeg','/uploads/activity-report-2024-25/image3.jpeg','/uploads/activity-report-2024-25/image4.jpeg','/uploads/activity-report-2024-25/image5.jpeg','/uploads/activity-report-2024-25/image6.jpeg']::text[],
  date='2024-12-11T17:00:00+05:30', end_date='2024-12-11T23:00:00+05:30'
where title='Installation Ceremony' and date::date='2024-12-11';
insert into public.events (club_id, title, description, date, end_date, location, is_public, cover_url, photos)
select (select id from public.clubs where name = 'Lions Club of Baroda Rising Star' limit 1), 'Installation Ceremony', 'Installation Ceremony held on 2024-12-11 at Krishna Garden Restaurant, Party Lawns & Banquet Hall, Vadodara. 98 Lions volunteers contributed 588 Lion hours. Expenditure ₹50,000.', '2024-12-11T17:00:00+05:30', '2024-12-11T23:00:00+05:30', 'Krishna Garden Restaurant, Party Lawns & Banquet Hall, Vadodara', true, '/uploads/activity-report-2024-25/image2.jpeg', ARRAY['/uploads/activity-report-2024-25/image2.jpeg','/uploads/activity-report-2024-25/image3.jpeg','/uploads/activity-report-2024-25/image4.jpeg','/uploads/activity-report-2024-25/image5.jpeg','/uploads/activity-report-2024-25/image6.jpeg']::text[]
where not exists (select 1 from public.events where title='Installation Ceremony' and date::date='2024-12-11');

-- Activity 2: TB Kit Distribution (2024-12-26) -> healthcare
update public.activities set
  category='healthcare', beneficiaries=620, service_hours=2,
  volunteer_hours_total=32, lion_members_count=16,
  budget=5500, expenses=5500, is_medical_camp=false,
  status='completed', approval_status='approved', reported_to_district=true,
  location='Urban Health Center, Warasiya, Vadodara', description='TB Kit Distribution held on 2024-12-26 at Urban Health Center, Warasiya, Vadodara. 16 Lions volunteers contributed 32 Lion hours; 620 beneficiaries reached. Expenditure ₹5,500.', photos=ARRAY['/uploads/activity-report-2024-25/image7.jpeg','/uploads/activity-report-2024-25/image8.jpeg','/uploads/activity-report-2024-25/image9.jpeg','/uploads/activity-report-2024-25/image10.jpeg']::text[],
  date='2024-12-26', start_at='2024-12-26T09:30:00+05:30', end_at='2024-12-26T11:30:00+05:30'
where title='TB Kit Distribution' and date='2024-12-26';
insert into public.activities (club_id, title, description, category, beneficiaries, service_hours,
  amount_raised, date, location, photos, reported_to_district, volunteer_hours_total,
  lion_members_count, budget, expenses, is_medical_camp, status, approval_status, start_at, end_at)
select (select id from public.clubs where name = 'Lions Club of Baroda Rising Star' limit 1), 'TB Kit Distribution', 'TB Kit Distribution held on 2024-12-26 at Urban Health Center, Warasiya, Vadodara. 16 Lions volunteers contributed 32 Lion hours; 620 beneficiaries reached. Expenditure ₹5,500.', 'healthcare', 620, 2, 0,
  '2024-12-26', 'Urban Health Center, Warasiya, Vadodara', ARRAY['/uploads/activity-report-2024-25/image7.jpeg','/uploads/activity-report-2024-25/image8.jpeg','/uploads/activity-report-2024-25/image9.jpeg','/uploads/activity-report-2024-25/image10.jpeg']::text[], true, 32, 16,
  5500, 5500, false, 'completed', 'approved', '2024-12-26T09:30:00+05:30', '2024-12-26T11:30:00+05:30'
where not exists (select 1 from public.activities where title='TB Kit Distribution' and date='2024-12-26');

-- Event 3: Board Meeting (2024-12-31)
update public.events set
  description='Board Meeting held on 2024-12-31 at RBG Complex, Natraj Enclave, Karelibaug, Vadodara. 11 Lions volunteers contributed 33 Lion hours. Expenditure ₹3,000.', location='RBG Complex, Natraj Enclave, Karelibaug, Vadodara', is_public=true,
  cover_url='/uploads/activity-report-2024-25/image11.jpeg', photos=ARRAY['/uploads/activity-report-2024-25/image11.jpeg','/uploads/activity-report-2024-25/image12.jpeg','/uploads/activity-report-2024-25/image13.jpeg','/uploads/activity-report-2024-25/image14.jpeg']::text[],
  date='2024-12-31T19:00:00+05:30', end_date='2024-12-31T22:00:00+05:30'
where title='Board Meeting' and date::date='2024-12-31';
insert into public.events (club_id, title, description, date, end_date, location, is_public, cover_url, photos)
select (select id from public.clubs where name = 'Lions Club of Baroda Rising Star' limit 1), 'Board Meeting', 'Board Meeting held on 2024-12-31 at RBG Complex, Natraj Enclave, Karelibaug, Vadodara. 11 Lions volunteers contributed 33 Lion hours. Expenditure ₹3,000.', '2024-12-31T19:00:00+05:30', '2024-12-31T22:00:00+05:30', 'RBG Complex, Natraj Enclave, Karelibaug, Vadodara', true, '/uploads/activity-report-2024-25/image11.jpeg', ARRAY['/uploads/activity-report-2024-25/image11.jpeg','/uploads/activity-report-2024-25/image12.jpeg','/uploads/activity-report-2024-25/image13.jpeg','/uploads/activity-report-2024-25/image14.jpeg']::text[]
where not exists (select 1 from public.events where title='Board Meeting' and date::date='2024-12-31');

-- Activity 4: Food for Hunger (2025-01-14) -> hunger
update public.activities set
  category='hunger', beneficiaries=350, service_hours=8,
  volunteer_hours_total=224, lion_members_count=28,
  budget=21000, expenses=21000, is_medical_camp=false,
  status='completed', approval_status='approved', reported_to_district=true,
  location='Govardhan Nathji Ni Haveli, Karelibaug, Vadodara', description='Food for Hunger held on 2025-01-14 at Govardhan Nathji Ni Haveli, Karelibaug, Vadodara. 28 Lions volunteers contributed 224 Lion hours; 350 beneficiaries reached. Expenditure ₹21,000.', photos=ARRAY['/uploads/activity-report-2024-25/image15.jpeg','/uploads/activity-report-2024-25/image16.jpeg','/uploads/activity-report-2024-25/image17.jpeg','/uploads/activity-report-2024-25/image18.jpeg']::text[],
  date='2025-01-14', start_at='2025-01-14T07:00:00+05:30', end_at='2025-01-14T15:00:00+05:30'
where title='Food for Hunger' and date='2025-01-14';
insert into public.activities (club_id, title, description, category, beneficiaries, service_hours,
  amount_raised, date, location, photos, reported_to_district, volunteer_hours_total,
  lion_members_count, budget, expenses, is_medical_camp, status, approval_status, start_at, end_at)
select (select id from public.clubs where name = 'Lions Club of Baroda Rising Star' limit 1), 'Food for Hunger', 'Food for Hunger held on 2025-01-14 at Govardhan Nathji Ni Haveli, Karelibaug, Vadodara. 28 Lions volunteers contributed 224 Lion hours; 350 beneficiaries reached. Expenditure ₹21,000.', 'hunger', 350, 8, 0,
  '2025-01-14', 'Govardhan Nathji Ni Haveli, Karelibaug, Vadodara', ARRAY['/uploads/activity-report-2024-25/image15.jpeg','/uploads/activity-report-2024-25/image16.jpeg','/uploads/activity-report-2024-25/image17.jpeg','/uploads/activity-report-2024-25/image18.jpeg']::text[], true, 224, 28,
  21000, 21000, false, 'completed', 'approved', '2025-01-14T07:00:00+05:30', '2025-01-14T15:00:00+05:30'
where not exists (select 1 from public.activities where title='Food for Hunger' and date='2025-01-14');

-- Activity 5: Mega Medical Camp (2025-01-19) -> healthcare
update public.activities set
  category='healthcare', beneficiaries=200, service_hours=5,
  volunteer_hours_total=190, lion_members_count=38,
  budget=8500, expenses=8500, is_medical_camp=true,
  status='completed', approval_status='approved', reported_to_district=true,
  location='Shree Vadil Vihar Vatika, Karelibaug, Vadodara', description='Mega Medical Camp held on 2025-01-19 at Shree Vadil Vihar Vatika, Karelibaug, Vadodara. 38 Lions volunteers contributed 190 Lion hours; 200 beneficiaries reached. Expenditure ₹8,500.', photos=ARRAY['/uploads/activity-report-2024-25/image19.jpeg','/uploads/activity-report-2024-25/image20.jpeg','/uploads/activity-report-2024-25/image21.jpeg','/uploads/activity-report-2024-25/image22.jpeg','/uploads/activity-report-2024-25/image23.jpeg','/uploads/activity-report-2024-25/image24.jpeg']::text[],
  date='2025-01-19', start_at='2025-01-19T09:00:00+05:30', end_at='2025-01-19T14:00:00+05:30'
where title='Mega Medical Camp' and date='2025-01-19';
insert into public.activities (club_id, title, description, category, beneficiaries, service_hours,
  amount_raised, date, location, photos, reported_to_district, volunteer_hours_total,
  lion_members_count, budget, expenses, is_medical_camp, status, approval_status, start_at, end_at)
select (select id from public.clubs where name = 'Lions Club of Baroda Rising Star' limit 1), 'Mega Medical Camp', 'Mega Medical Camp held on 2025-01-19 at Shree Vadil Vihar Vatika, Karelibaug, Vadodara. 38 Lions volunteers contributed 190 Lion hours; 200 beneficiaries reached. Expenditure ₹8,500.', 'healthcare', 200, 5, 0,
  '2025-01-19', 'Shree Vadil Vihar Vatika, Karelibaug, Vadodara', ARRAY['/uploads/activity-report-2024-25/image19.jpeg','/uploads/activity-report-2024-25/image20.jpeg','/uploads/activity-report-2024-25/image21.jpeg','/uploads/activity-report-2024-25/image22.jpeg','/uploads/activity-report-2024-25/image23.jpeg','/uploads/activity-report-2024-25/image24.jpeg']::text[], true, 190, 38,
  8500, 8500, true, 'completed', 'approved', '2025-01-19T09:00:00+05:30', '2025-01-19T14:00:00+05:30'
where not exists (select 1 from public.activities where title='Mega Medical Camp' and date='2025-01-19');

-- Activity 6: Sweater Distribution to School Children (2025-01-28) -> education
update public.activities set
  category='education', beneficiaries=250, service_hours=4,
  volunteer_hours_total=28, lion_members_count=7,
  budget=25000, expenses=25000, is_medical_camp=false,
  status='completed', approval_status='approved', reported_to_district=true,
  location='Government School, Nani Umarvan, Halol, Panch Mahals, Gujarat', description='Sweater Distribution to School Children held on 2025-01-28 at Government School, Nani Umarvan, Halol, Panch Mahals, Gujarat. 7 Lions volunteers contributed 28 Lion hours; 250 beneficiaries reached. Expenditure ₹25,000.', photos=ARRAY['/uploads/activity-report-2024-25/image25.jpeg','/uploads/activity-report-2024-25/image26.jpeg','/uploads/activity-report-2024-25/image27.jpeg','/uploads/activity-report-2024-25/image28.jpeg']::text[],
  date='2025-01-28', start_at='2025-01-28T14:00:00+05:30', end_at='2025-01-28T18:00:00+05:30'
where title='Sweater Distribution to School Children' and date='2025-01-28';
insert into public.activities (club_id, title, description, category, beneficiaries, service_hours,
  amount_raised, date, location, photos, reported_to_district, volunteer_hours_total,
  lion_members_count, budget, expenses, is_medical_camp, status, approval_status, start_at, end_at)
select (select id from public.clubs where name = 'Lions Club of Baroda Rising Star' limit 1), 'Sweater Distribution to School Children', 'Sweater Distribution to School Children held on 2025-01-28 at Government School, Nani Umarvan, Halol, Panch Mahals, Gujarat. 7 Lions volunteers contributed 28 Lion hours; 250 beneficiaries reached. Expenditure ₹25,000.', 'education', 250, 4, 0,
  '2025-01-28', 'Government School, Nani Umarvan, Halol, Panch Mahals, Gujarat', ARRAY['/uploads/activity-report-2024-25/image25.jpeg','/uploads/activity-report-2024-25/image26.jpeg','/uploads/activity-report-2024-25/image27.jpeg','/uploads/activity-report-2024-25/image28.jpeg']::text[], true, 28, 7,
  25000, 25000, false, 'completed', 'approved', '2025-01-28T14:00:00+05:30', '2025-01-28T18:00:00+05:30'
where not exists (select 1 from public.activities where title='Sweater Distribution to School Children' and date='2025-01-28');

-- Event 7: Board Meeting (2025-01-29)
update public.events set
  description='Board Meeting held on 2025-01-29 at Kalakunj Society-1, Next to Avkar Hall, Water Tank Road, Karelibaug, Vadodara. 30 Lions volunteers contributed 150 Lion hours. Expenditure ₹3,000.', location='Kalakunj Society-1, Next to Avkar Hall, Water Tank Road, Karelibaug, Vadodara', is_public=true,
  cover_url='/uploads/activity-report-2024-25/image29.jpeg', photos=ARRAY['/uploads/activity-report-2024-25/image29.jpeg','/uploads/activity-report-2024-25/image30.jpeg','/uploads/activity-report-2024-25/image31.jpeg','/uploads/activity-report-2024-25/image32.jpeg']::text[],
  date='2025-01-29T18:00:00+05:30', end_date='2025-01-29T23:00:00+05:30'
where title='Board Meeting' and date::date='2025-01-29';
insert into public.events (club_id, title, description, date, end_date, location, is_public, cover_url, photos)
select (select id from public.clubs where name = 'Lions Club of Baroda Rising Star' limit 1), 'Board Meeting', 'Board Meeting held on 2025-01-29 at Kalakunj Society-1, Next to Avkar Hall, Water Tank Road, Karelibaug, Vadodara. 30 Lions volunteers contributed 150 Lion hours. Expenditure ₹3,000.', '2025-01-29T18:00:00+05:30', '2025-01-29T23:00:00+05:30', 'Kalakunj Society-1, Next to Avkar Hall, Water Tank Road, Karelibaug, Vadodara', true, '/uploads/activity-report-2024-25/image29.jpeg', ARRAY['/uploads/activity-report-2024-25/image29.jpeg','/uploads/activity-report-2024-25/image30.jpeg','/uploads/activity-report-2024-25/image31.jpeg','/uploads/activity-report-2024-25/image32.jpeg']::text[]
where not exists (select 1 from public.events where title='Board Meeting' and date::date='2025-01-29');

-- Activity 8: TB Kit Distribution (2025-01-31) -> healthcare
update public.activities set
  category='healthcare', beneficiaries=900, service_hours=2,
  volunteer_hours_total=32, lion_members_count=16,
  budget=5500, expenses=5500, is_medical_camp=false,
  status='completed', approval_status='approved', reported_to_district=true,
  location='Kishanwadi Urban Center, Vadodara', description='TB Kit Distribution held on 2025-01-31 at Kishanwadi Urban Center, Vadodara. 16 Lions volunteers contributed 32 Lion hours; 900 beneficiaries reached. Expenditure ₹5,500.', photos=ARRAY['/uploads/activity-report-2024-25/image33.jpeg','/uploads/activity-report-2024-25/image34.jpeg','/uploads/activity-report-2024-25/image35.jpeg','/uploads/activity-report-2024-25/image36.jpeg']::text[],
  date='2025-01-31', start_at='2025-01-31T10:00:00+05:30', end_at='2025-01-31T12:00:00+05:30'
where title='TB Kit Distribution' and date='2025-01-31';
insert into public.activities (club_id, title, description, category, beneficiaries, service_hours,
  amount_raised, date, location, photos, reported_to_district, volunteer_hours_total,
  lion_members_count, budget, expenses, is_medical_camp, status, approval_status, start_at, end_at)
select (select id from public.clubs where name = 'Lions Club of Baroda Rising Star' limit 1), 'TB Kit Distribution', 'TB Kit Distribution held on 2025-01-31 at Kishanwadi Urban Center, Vadodara. 16 Lions volunteers contributed 32 Lion hours; 900 beneficiaries reached. Expenditure ₹5,500.', 'healthcare', 900, 2, 0,
  '2025-01-31', 'Kishanwadi Urban Center, Vadodara', ARRAY['/uploads/activity-report-2024-25/image33.jpeg','/uploads/activity-report-2024-25/image34.jpeg','/uploads/activity-report-2024-25/image35.jpeg','/uploads/activity-report-2024-25/image36.jpeg']::text[], true, 32, 16,
  5500, 5500, false, 'completed', 'approved', '2025-01-31T10:00:00+05:30', '2025-01-31T12:00:00+05:30'
where not exists (select 1 from public.activities where title='TB Kit Distribution' and date='2025-01-31');

-- Activity 9: TB Kit Distribution (2025-02-08) -> healthcare
update public.activities set
  category='healthcare', beneficiaries=600, service_hours=2,
  volunteer_hours_total=32, lion_members_count=16,
  budget=5500, expenses=5500, is_medical_camp=false,
  status='completed', approval_status='approved', reported_to_district=true,
  location='Warasiya Urban Center, Vadodara', description='TB Kit Distribution held on 2025-02-08 at Warasiya Urban Center, Vadodara. 16 Lions volunteers contributed 32 Lion hours; 600 beneficiaries reached. Expenditure ₹5,500.', photos=ARRAY['/uploads/activity-report-2024-25/image33.jpeg','/uploads/activity-report-2024-25/image34.jpeg','/uploads/activity-report-2024-25/image35.jpeg','/uploads/activity-report-2024-25/image36.jpeg']::text[],
  date='2025-02-08', start_at='2025-02-08T10:00:00+05:30', end_at='2025-02-08T12:00:00+05:30'
where title='TB Kit Distribution' and date='2025-02-08';
insert into public.activities (club_id, title, description, category, beneficiaries, service_hours,
  amount_raised, date, location, photos, reported_to_district, volunteer_hours_total,
  lion_members_count, budget, expenses, is_medical_camp, status, approval_status, start_at, end_at)
select (select id from public.clubs where name = 'Lions Club of Baroda Rising Star' limit 1), 'TB Kit Distribution', 'TB Kit Distribution held on 2025-02-08 at Warasiya Urban Center, Vadodara. 16 Lions volunteers contributed 32 Lion hours; 600 beneficiaries reached. Expenditure ₹5,500.', 'healthcare', 600, 2, 0,
  '2025-02-08', 'Warasiya Urban Center, Vadodara', ARRAY['/uploads/activity-report-2024-25/image33.jpeg','/uploads/activity-report-2024-25/image34.jpeg','/uploads/activity-report-2024-25/image35.jpeg','/uploads/activity-report-2024-25/image36.jpeg']::text[], true, 32, 16,
  5500, 5500, false, 'completed', 'approved', '2025-02-08T10:00:00+05:30', '2025-02-08T12:00:00+05:30'
where not exists (select 1 from public.activities where title='TB Kit Distribution' and date='2025-02-08');

-- Activity 10: MEGA DIABETES CAMP (2025-02-09) -> diabetes
update public.activities set
  category='diabetes', beneficiaries=0, service_hours=4,
  volunteer_hours_total=0, lion_members_count=0,
  budget=10000, expenses=10000, is_medical_camp=true,
  status='completed', approval_status='approved', reported_to_district=true,
  location='Vadodara', description='MEGA DIABETES CAMP held on 2025-02-09 at Vadodara. 0 Lions volunteers contributed 0 Lion hours. Expenditure ₹10,000.', photos=ARRAY['/uploads/activity-report-2024-25/image33.jpeg','/uploads/activity-report-2024-25/image34.jpeg','/uploads/activity-report-2024-25/image35.jpeg','/uploads/activity-report-2024-25/image36.jpeg']::text[],
  date='2025-02-09', start_at='2025-02-09T10:00:00+05:30', end_at='2025-02-09T14:00:00+05:30'
where title='MEGA DIABETES CAMP' and date='2025-02-09';
insert into public.activities (club_id, title, description, category, beneficiaries, service_hours,
  amount_raised, date, location, photos, reported_to_district, volunteer_hours_total,
  lion_members_count, budget, expenses, is_medical_camp, status, approval_status, start_at, end_at)
select (select id from public.clubs where name = 'Lions Club of Baroda Rising Star' limit 1), 'MEGA DIABETES CAMP', 'MEGA DIABETES CAMP held on 2025-02-09 at Vadodara. 0 Lions volunteers contributed 0 Lion hours. Expenditure ₹10,000.', 'diabetes', 0, 4, 0,
  '2025-02-09', 'Vadodara', ARRAY['/uploads/activity-report-2024-25/image33.jpeg','/uploads/activity-report-2024-25/image34.jpeg','/uploads/activity-report-2024-25/image35.jpeg','/uploads/activity-report-2024-25/image36.jpeg']::text[], true, 0, 0,
  10000, 10000, true, 'completed', 'approved', '2025-02-09T10:00:00+05:30', '2025-02-09T14:00:00+05:30'
where not exists (select 1 from public.activities where title='MEGA DIABETES CAMP' and date='2025-02-09');

-- ---------------------------------------------------------------------
-- Gallery: one public.photos row per image (guarded on url).
-- ---------------------------------------------------------------------
insert into public.photos (url, title, caption, alt, category, activity_id, is_featured, display_order, taken_on)
select '/uploads/activity-report-2024-25/image2.jpeg', 'Installation Ceremony', 'Installation Ceremony — Krishna Garden Restaurant, Party Lawns & Banquet Hall, Vadodara', 'Installation Ceremony', 'installation', null, false, 0, '2024-12-11'
where not exists (select 1 from public.photos where url='/uploads/activity-report-2024-25/image2.jpeg');
insert into public.photos (url, title, caption, alt, category, activity_id, is_featured, display_order, taken_on)
select '/uploads/activity-report-2024-25/image3.jpeg', 'Installation Ceremony', 'Installation Ceremony — Krishna Garden Restaurant, Party Lawns & Banquet Hall, Vadodara', 'Installation Ceremony', 'installation', null, false, 1, '2024-12-11'
where not exists (select 1 from public.photos where url='/uploads/activity-report-2024-25/image3.jpeg');
insert into public.photos (url, title, caption, alt, category, activity_id, is_featured, display_order, taken_on)
select '/uploads/activity-report-2024-25/image4.jpeg', 'Installation Ceremony', 'Installation Ceremony — Krishna Garden Restaurant, Party Lawns & Banquet Hall, Vadodara', 'Installation Ceremony', 'installation', null, false, 2, '2024-12-11'
where not exists (select 1 from public.photos where url='/uploads/activity-report-2024-25/image4.jpeg');
insert into public.photos (url, title, caption, alt, category, activity_id, is_featured, display_order, taken_on)
select '/uploads/activity-report-2024-25/image5.jpeg', 'Installation Ceremony', 'Installation Ceremony — Krishna Garden Restaurant, Party Lawns & Banquet Hall, Vadodara', 'Installation Ceremony', 'installation', null, false, 3, '2024-12-11'
where not exists (select 1 from public.photos where url='/uploads/activity-report-2024-25/image5.jpeg');
insert into public.photos (url, title, caption, alt, category, activity_id, is_featured, display_order, taken_on)
select '/uploads/activity-report-2024-25/image6.jpeg', 'Installation Ceremony', 'Installation Ceremony — Krishna Garden Restaurant, Party Lawns & Banquet Hall, Vadodara', 'Installation Ceremony', 'installation', null, false, 4, '2024-12-11'
where not exists (select 1 from public.photos where url='/uploads/activity-report-2024-25/image6.jpeg');
insert into public.photos (url, title, caption, alt, category, activity_id, is_featured, display_order, taken_on)
select '/uploads/activity-report-2024-25/image7.jpeg', 'TB Kit Distribution', 'TB Kit Distribution — Urban Health Center, Warasiya, Vadodara', 'TB Kit Distribution', 'healthcare', (select id from public.activities where title='TB Kit Distribution' and date='2024-12-26' limit 1), false, 0, '2024-12-26'
where not exists (select 1 from public.photos where url='/uploads/activity-report-2024-25/image7.jpeg');
insert into public.photos (url, title, caption, alt, category, activity_id, is_featured, display_order, taken_on)
select '/uploads/activity-report-2024-25/image8.jpeg', 'TB Kit Distribution', 'TB Kit Distribution — Urban Health Center, Warasiya, Vadodara', 'TB Kit Distribution', 'healthcare', (select id from public.activities where title='TB Kit Distribution' and date='2024-12-26' limit 1), false, 1, '2024-12-26'
where not exists (select 1 from public.photos where url='/uploads/activity-report-2024-25/image8.jpeg');
insert into public.photos (url, title, caption, alt, category, activity_id, is_featured, display_order, taken_on)
select '/uploads/activity-report-2024-25/image9.jpeg', 'TB Kit Distribution', 'TB Kit Distribution — Urban Health Center, Warasiya, Vadodara', 'TB Kit Distribution', 'healthcare', (select id from public.activities where title='TB Kit Distribution' and date='2024-12-26' limit 1), false, 2, '2024-12-26'
where not exists (select 1 from public.photos where url='/uploads/activity-report-2024-25/image9.jpeg');
insert into public.photos (url, title, caption, alt, category, activity_id, is_featured, display_order, taken_on)
select '/uploads/activity-report-2024-25/image10.jpeg', 'TB Kit Distribution', 'TB Kit Distribution — Urban Health Center, Warasiya, Vadodara', 'TB Kit Distribution', 'healthcare', (select id from public.activities where title='TB Kit Distribution' and date='2024-12-26' limit 1), false, 3, '2024-12-26'
where not exists (select 1 from public.photos where url='/uploads/activity-report-2024-25/image10.jpeg');
insert into public.photos (url, title, caption, alt, category, activity_id, is_featured, display_order, taken_on)
select '/uploads/activity-report-2024-25/image11.jpeg', 'Board Meeting', 'Board Meeting — RBG Complex, Natraj Enclave, Karelibaug, Vadodara', 'Board Meeting', 'board_meeting', null, false, 0, '2024-12-31'
where not exists (select 1 from public.photos where url='/uploads/activity-report-2024-25/image11.jpeg');
insert into public.photos (url, title, caption, alt, category, activity_id, is_featured, display_order, taken_on)
select '/uploads/activity-report-2024-25/image12.jpeg', 'Board Meeting', 'Board Meeting — RBG Complex, Natraj Enclave, Karelibaug, Vadodara', 'Board Meeting', 'board_meeting', null, false, 1, '2024-12-31'
where not exists (select 1 from public.photos where url='/uploads/activity-report-2024-25/image12.jpeg');
insert into public.photos (url, title, caption, alt, category, activity_id, is_featured, display_order, taken_on)
select '/uploads/activity-report-2024-25/image13.jpeg', 'Board Meeting', 'Board Meeting — RBG Complex, Natraj Enclave, Karelibaug, Vadodara', 'Board Meeting', 'board_meeting', null, false, 2, '2024-12-31'
where not exists (select 1 from public.photos where url='/uploads/activity-report-2024-25/image13.jpeg');
insert into public.photos (url, title, caption, alt, category, activity_id, is_featured, display_order, taken_on)
select '/uploads/activity-report-2024-25/image14.jpeg', 'Board Meeting', 'Board Meeting — RBG Complex, Natraj Enclave, Karelibaug, Vadodara', 'Board Meeting', 'board_meeting', null, false, 3, '2024-12-31'
where not exists (select 1 from public.photos where url='/uploads/activity-report-2024-25/image14.jpeg');
insert into public.photos (url, title, caption, alt, category, activity_id, is_featured, display_order, taken_on)
select '/uploads/activity-report-2024-25/image15.jpeg', 'Food for Hunger', 'Food for Hunger — Govardhan Nathji Ni Haveli, Karelibaug, Vadodara', 'Food for Hunger', 'hunger', (select id from public.activities where title='Food for Hunger' and date='2025-01-14' limit 1), false, 0, '2025-01-14'
where not exists (select 1 from public.photos where url='/uploads/activity-report-2024-25/image15.jpeg');
insert into public.photos (url, title, caption, alt, category, activity_id, is_featured, display_order, taken_on)
select '/uploads/activity-report-2024-25/image16.jpeg', 'Food for Hunger', 'Food for Hunger — Govardhan Nathji Ni Haveli, Karelibaug, Vadodara', 'Food for Hunger', 'hunger', (select id from public.activities where title='Food for Hunger' and date='2025-01-14' limit 1), false, 1, '2025-01-14'
where not exists (select 1 from public.photos where url='/uploads/activity-report-2024-25/image16.jpeg');
insert into public.photos (url, title, caption, alt, category, activity_id, is_featured, display_order, taken_on)
select '/uploads/activity-report-2024-25/image17.jpeg', 'Food for Hunger', 'Food for Hunger — Govardhan Nathji Ni Haveli, Karelibaug, Vadodara', 'Food for Hunger', 'hunger', (select id from public.activities where title='Food for Hunger' and date='2025-01-14' limit 1), false, 2, '2025-01-14'
where not exists (select 1 from public.photos where url='/uploads/activity-report-2024-25/image17.jpeg');
insert into public.photos (url, title, caption, alt, category, activity_id, is_featured, display_order, taken_on)
select '/uploads/activity-report-2024-25/image18.jpeg', 'Food for Hunger', 'Food for Hunger — Govardhan Nathji Ni Haveli, Karelibaug, Vadodara', 'Food for Hunger', 'hunger', (select id from public.activities where title='Food for Hunger' and date='2025-01-14' limit 1), false, 3, '2025-01-14'
where not exists (select 1 from public.photos where url='/uploads/activity-report-2024-25/image18.jpeg');
insert into public.photos (url, title, caption, alt, category, activity_id, is_featured, display_order, taken_on)
select '/uploads/activity-report-2024-25/image19.jpeg', 'Mega Medical Camp', 'Mega Medical Camp — Shree Vadil Vihar Vatika, Karelibaug, Vadodara', 'Mega Medical Camp', 'healthcare', (select id from public.activities where title='Mega Medical Camp' and date='2025-01-19' limit 1), false, 0, '2025-01-19'
where not exists (select 1 from public.photos where url='/uploads/activity-report-2024-25/image19.jpeg');
insert into public.photos (url, title, caption, alt, category, activity_id, is_featured, display_order, taken_on)
select '/uploads/activity-report-2024-25/image20.jpeg', 'Mega Medical Camp', 'Mega Medical Camp — Shree Vadil Vihar Vatika, Karelibaug, Vadodara', 'Mega Medical Camp', 'healthcare', (select id from public.activities where title='Mega Medical Camp' and date='2025-01-19' limit 1), false, 1, '2025-01-19'
where not exists (select 1 from public.photos where url='/uploads/activity-report-2024-25/image20.jpeg');
insert into public.photos (url, title, caption, alt, category, activity_id, is_featured, display_order, taken_on)
select '/uploads/activity-report-2024-25/image21.jpeg', 'Mega Medical Camp', 'Mega Medical Camp — Shree Vadil Vihar Vatika, Karelibaug, Vadodara', 'Mega Medical Camp', 'healthcare', (select id from public.activities where title='Mega Medical Camp' and date='2025-01-19' limit 1), false, 2, '2025-01-19'
where not exists (select 1 from public.photos where url='/uploads/activity-report-2024-25/image21.jpeg');
insert into public.photos (url, title, caption, alt, category, activity_id, is_featured, display_order, taken_on)
select '/uploads/activity-report-2024-25/image22.jpeg', 'Mega Medical Camp', 'Mega Medical Camp — Shree Vadil Vihar Vatika, Karelibaug, Vadodara', 'Mega Medical Camp', 'healthcare', (select id from public.activities where title='Mega Medical Camp' and date='2025-01-19' limit 1), false, 3, '2025-01-19'
where not exists (select 1 from public.photos where url='/uploads/activity-report-2024-25/image22.jpeg');
insert into public.photos (url, title, caption, alt, category, activity_id, is_featured, display_order, taken_on)
select '/uploads/activity-report-2024-25/image23.jpeg', 'Mega Medical Camp', 'Mega Medical Camp — Shree Vadil Vihar Vatika, Karelibaug, Vadodara', 'Mega Medical Camp', 'healthcare', (select id from public.activities where title='Mega Medical Camp' and date='2025-01-19' limit 1), false, 4, '2025-01-19'
where not exists (select 1 from public.photos where url='/uploads/activity-report-2024-25/image23.jpeg');
insert into public.photos (url, title, caption, alt, category, activity_id, is_featured, display_order, taken_on)
select '/uploads/activity-report-2024-25/image24.jpeg', 'Mega Medical Camp', 'Mega Medical Camp — Shree Vadil Vihar Vatika, Karelibaug, Vadodara', 'Mega Medical Camp', 'healthcare', (select id from public.activities where title='Mega Medical Camp' and date='2025-01-19' limit 1), false, 5, '2025-01-19'
where not exists (select 1 from public.photos where url='/uploads/activity-report-2024-25/image24.jpeg');
insert into public.photos (url, title, caption, alt, category, activity_id, is_featured, display_order, taken_on)
select '/uploads/activity-report-2024-25/image25.jpeg', 'Sweater Distribution to School Children', 'Sweater Distribution to School Children — Government School, Nani Umarvan, Halol, Panch Mahals, Gujarat', 'Sweater Distribution to School Children', 'education', (select id from public.activities where title='Sweater Distribution to School Children' and date='2025-01-28' limit 1), false, 0, '2025-01-28'
where not exists (select 1 from public.photos where url='/uploads/activity-report-2024-25/image25.jpeg');
insert into public.photos (url, title, caption, alt, category, activity_id, is_featured, display_order, taken_on)
select '/uploads/activity-report-2024-25/image26.jpeg', 'Sweater Distribution to School Children', 'Sweater Distribution to School Children — Government School, Nani Umarvan, Halol, Panch Mahals, Gujarat', 'Sweater Distribution to School Children', 'education', (select id from public.activities where title='Sweater Distribution to School Children' and date='2025-01-28' limit 1), false, 1, '2025-01-28'
where not exists (select 1 from public.photos where url='/uploads/activity-report-2024-25/image26.jpeg');
insert into public.photos (url, title, caption, alt, category, activity_id, is_featured, display_order, taken_on)
select '/uploads/activity-report-2024-25/image27.jpeg', 'Sweater Distribution to School Children', 'Sweater Distribution to School Children — Government School, Nani Umarvan, Halol, Panch Mahals, Gujarat', 'Sweater Distribution to School Children', 'education', (select id from public.activities where title='Sweater Distribution to School Children' and date='2025-01-28' limit 1), false, 2, '2025-01-28'
where not exists (select 1 from public.photos where url='/uploads/activity-report-2024-25/image27.jpeg');
insert into public.photos (url, title, caption, alt, category, activity_id, is_featured, display_order, taken_on)
select '/uploads/activity-report-2024-25/image28.jpeg', 'Sweater Distribution to School Children', 'Sweater Distribution to School Children — Government School, Nani Umarvan, Halol, Panch Mahals, Gujarat', 'Sweater Distribution to School Children', 'education', (select id from public.activities where title='Sweater Distribution to School Children' and date='2025-01-28' limit 1), false, 3, '2025-01-28'
where not exists (select 1 from public.photos where url='/uploads/activity-report-2024-25/image28.jpeg');
insert into public.photos (url, title, caption, alt, category, activity_id, is_featured, display_order, taken_on)
select '/uploads/activity-report-2024-25/image29.jpeg', 'Board Meeting', 'Board Meeting — Kalakunj Society-1, Next to Avkar Hall, Water Tank Road, Karelibaug, Vadodara', 'Board Meeting', 'board_meeting', null, false, 0, '2025-01-29'
where not exists (select 1 from public.photos where url='/uploads/activity-report-2024-25/image29.jpeg');
insert into public.photos (url, title, caption, alt, category, activity_id, is_featured, display_order, taken_on)
select '/uploads/activity-report-2024-25/image30.jpeg', 'Board Meeting', 'Board Meeting — Kalakunj Society-1, Next to Avkar Hall, Water Tank Road, Karelibaug, Vadodara', 'Board Meeting', 'board_meeting', null, false, 1, '2025-01-29'
where not exists (select 1 from public.photos where url='/uploads/activity-report-2024-25/image30.jpeg');
insert into public.photos (url, title, caption, alt, category, activity_id, is_featured, display_order, taken_on)
select '/uploads/activity-report-2024-25/image31.jpeg', 'Board Meeting', 'Board Meeting — Kalakunj Society-1, Next to Avkar Hall, Water Tank Road, Karelibaug, Vadodara', 'Board Meeting', 'board_meeting', null, false, 2, '2025-01-29'
where not exists (select 1 from public.photos where url='/uploads/activity-report-2024-25/image31.jpeg');
insert into public.photos (url, title, caption, alt, category, activity_id, is_featured, display_order, taken_on)
select '/uploads/activity-report-2024-25/image32.jpeg', 'Board Meeting', 'Board Meeting — Kalakunj Society-1, Next to Avkar Hall, Water Tank Road, Karelibaug, Vadodara', 'Board Meeting', 'board_meeting', null, false, 3, '2025-01-29'
where not exists (select 1 from public.photos where url='/uploads/activity-report-2024-25/image32.jpeg');
insert into public.photos (url, title, caption, alt, category, activity_id, is_featured, display_order, taken_on)
select '/uploads/activity-report-2024-25/image33.jpeg', 'TB Kit Distribution', 'TB Kit Distribution — Kishanwadi Urban Center, Vadodara', 'TB Kit Distribution', 'healthcare', (select id from public.activities where title='TB Kit Distribution' and date='2025-01-31' limit 1), false, 0, '2025-01-31'
where not exists (select 1 from public.photos where url='/uploads/activity-report-2024-25/image33.jpeg');
insert into public.photos (url, title, caption, alt, category, activity_id, is_featured, display_order, taken_on)
select '/uploads/activity-report-2024-25/image34.jpeg', 'TB Kit Distribution', 'TB Kit Distribution — Kishanwadi Urban Center, Vadodara', 'TB Kit Distribution', 'healthcare', (select id from public.activities where title='TB Kit Distribution' and date='2025-01-31' limit 1), false, 1, '2025-01-31'
where not exists (select 1 from public.photos where url='/uploads/activity-report-2024-25/image34.jpeg');
insert into public.photos (url, title, caption, alt, category, activity_id, is_featured, display_order, taken_on)
select '/uploads/activity-report-2024-25/image35.jpeg', 'TB Kit Distribution', 'TB Kit Distribution — Kishanwadi Urban Center, Vadodara', 'TB Kit Distribution', 'healthcare', (select id from public.activities where title='TB Kit Distribution' and date='2025-01-31' limit 1), false, 2, '2025-01-31'
where not exists (select 1 from public.photos where url='/uploads/activity-report-2024-25/image35.jpeg');
insert into public.photos (url, title, caption, alt, category, activity_id, is_featured, display_order, taken_on)
select '/uploads/activity-report-2024-25/image36.jpeg', 'TB Kit Distribution', 'TB Kit Distribution — Kishanwadi Urban Center, Vadodara', 'TB Kit Distribution', 'healthcare', (select id from public.activities where title='TB Kit Distribution' and date='2025-01-31' limit 1), false, 3, '2025-01-31'
where not exists (select 1 from public.photos where url='/uploads/activity-report-2024-25/image36.jpeg');
insert into public.photos (url, title, caption, alt, category, activity_id, is_featured, display_order, taken_on)
select '/uploads/activity-report-2024-25/image33.jpeg', 'TB Kit Distribution', 'TB Kit Distribution — Warasiya Urban Center, Vadodara', 'TB Kit Distribution', 'healthcare', (select id from public.activities where title='TB Kit Distribution' and date='2025-02-08' limit 1), false, 0, '2025-02-08'
where not exists (select 1 from public.photos where url='/uploads/activity-report-2024-25/image33.jpeg');
insert into public.photos (url, title, caption, alt, category, activity_id, is_featured, display_order, taken_on)
select '/uploads/activity-report-2024-25/image34.jpeg', 'TB Kit Distribution', 'TB Kit Distribution — Warasiya Urban Center, Vadodara', 'TB Kit Distribution', 'healthcare', (select id from public.activities where title='TB Kit Distribution' and date='2025-02-08' limit 1), false, 1, '2025-02-08'
where not exists (select 1 from public.photos where url='/uploads/activity-report-2024-25/image34.jpeg');
insert into public.photos (url, title, caption, alt, category, activity_id, is_featured, display_order, taken_on)
select '/uploads/activity-report-2024-25/image35.jpeg', 'TB Kit Distribution', 'TB Kit Distribution — Warasiya Urban Center, Vadodara', 'TB Kit Distribution', 'healthcare', (select id from public.activities where title='TB Kit Distribution' and date='2025-02-08' limit 1), false, 2, '2025-02-08'
where not exists (select 1 from public.photos where url='/uploads/activity-report-2024-25/image35.jpeg');
insert into public.photos (url, title, caption, alt, category, activity_id, is_featured, display_order, taken_on)
select '/uploads/activity-report-2024-25/image36.jpeg', 'TB Kit Distribution', 'TB Kit Distribution — Warasiya Urban Center, Vadodara', 'TB Kit Distribution', 'healthcare', (select id from public.activities where title='TB Kit Distribution' and date='2025-02-08' limit 1), false, 3, '2025-02-08'
where not exists (select 1 from public.photos where url='/uploads/activity-report-2024-25/image36.jpeg');
insert into public.photos (url, title, caption, alt, category, activity_id, is_featured, display_order, taken_on)
select '/uploads/activity-report-2024-25/image33.jpeg', 'MEGA DIABETES CAMP', 'MEGA DIABETES CAMP — Vadodara', 'MEGA DIABETES CAMP', 'diabetes', (select id from public.activities where title='MEGA DIABETES CAMP' and date='2025-02-09' limit 1), false, 0, '2025-02-09'
where not exists (select 1 from public.photos where url='/uploads/activity-report-2024-25/image33.jpeg');
insert into public.photos (url, title, caption, alt, category, activity_id, is_featured, display_order, taken_on)
select '/uploads/activity-report-2024-25/image34.jpeg', 'MEGA DIABETES CAMP', 'MEGA DIABETES CAMP — Vadodara', 'MEGA DIABETES CAMP', 'diabetes', (select id from public.activities where title='MEGA DIABETES CAMP' and date='2025-02-09' limit 1), false, 1, '2025-02-09'
where not exists (select 1 from public.photos where url='/uploads/activity-report-2024-25/image34.jpeg');
insert into public.photos (url, title, caption, alt, category, activity_id, is_featured, display_order, taken_on)
select '/uploads/activity-report-2024-25/image35.jpeg', 'MEGA DIABETES CAMP', 'MEGA DIABETES CAMP — Vadodara', 'MEGA DIABETES CAMP', 'diabetes', (select id from public.activities where title='MEGA DIABETES CAMP' and date='2025-02-09' limit 1), false, 2, '2025-02-09'
where not exists (select 1 from public.photos where url='/uploads/activity-report-2024-25/image35.jpeg');
insert into public.photos (url, title, caption, alt, category, activity_id, is_featured, display_order, taken_on)
select '/uploads/activity-report-2024-25/image36.jpeg', 'MEGA DIABETES CAMP', 'MEGA DIABETES CAMP — Vadodara', 'MEGA DIABETES CAMP', 'diabetes', (select id from public.activities where title='MEGA DIABETES CAMP' and date='2025-02-09' limit 1), false, 3, '2025-02-09'
where not exists (select 1 from public.photos where url='/uploads/activity-report-2024-25/image36.jpeg');
