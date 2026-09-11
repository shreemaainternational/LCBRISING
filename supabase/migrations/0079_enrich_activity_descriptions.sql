-- =====================================================================
-- 0079_enrich_activity_descriptions.sql
-- Description-enrichment pass over Lions Club of Baroda Rising Star's
-- seeded service activities (see 0061_seed_baroda_rising_star_activities.sql).
--
-- Scope: public.activities.description ONLY. No other column is touched
-- (title, date, category, beneficiaries, lion_members_count, service_hours,
-- amount_raised, photos, approval fields, etc. are all left exactly as-is).
--
-- Every UPDATE is guarded by an exact match on the CURRENT description text
-- (or IS NULL) as originally seeded. This makes the migration idempotent and
-- non-destructive: if an admin has since edited a description by hand through
-- the app, the guard will not match and that row is left untouched, per the
-- 'do not overwrite a good/edited description' rule. Rows are disambiguated by
-- (club_id, title, date, category), the same natural key 0061 used for its own
-- idempotent insert.
--
-- One row (TB Kit Distribution / 2025-02-08 / hunger) already had an adequate,
-- activity-specific description and is intentionally left out of this migration.
-- =====================================================================

do $$
declare
  v_club_id uuid;
  v_updated int := 0;
begin
  select id into v_club_id from public.clubs
   where name = 'Lions Club of Baroda Rising Star' limit 1;

  if v_club_id is null then
    raise notice 'Lions Club of Baroda Rising Star not found; skipping description enrichment.';
    return;
  end if;

  update public.activities set description = $lcbdesc$Lions Club of Baroda Rising Star, sponsored by Lions Club of Baroda Vishwamitri, organized a TB Nutrition Kit Distribution on 26th December 2024 at the VMC Warsiya Urban Health Centre. The initiative supported 10 tuberculosis patients enrolled in the adoption program by distributing nutrition kits to strengthen their recovery. This activity reflects the club's ongoing commitment to the Lions cause of health and community wellbeing, working alongside local health authorities to support vulnerable patients. A total of 620 beneficiaries were reached through the programme, with 16 Lions members contributing 32 Lion Hours of service. The distribution was carried out in the presence of club leadership and volunteers dedicated to improving healthcare access for TB patients in Vadodara.$lcbdesc$
   where club_id = v_club_id
     and title = $lcbdesc$TB Kit Distribution$lcbdesc$
     and date = date $lcbdesc$2024-12-26$lcbdesc$
     and coalesce(category,'') = $lcbdesc$healthcare$lcbdesc$
     and replace(description, chr(13) || chr(10), chr(10)) = $lcbdesc$Lions Club of Baroda Raising Star, sponsored by Lions Club of Baroda Vishwamitri! Supporting 10 TB patients through the adoption program and distributing nutrition kits at VMC Warsiya UHC is a commendable effort.

The Distribution started in presence of$lcbdesc$;
  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    raise notice 'Skipped (already edited or not found): % / %', $lcbdesc$TB Kit Distribution$lcbdesc$, date $lcbdesc$2024-12-26$lcbdesc$;
  end if;

  update public.activities set description = $lcbdesc$Lions Club of Baroda Rising Star proudly held its New Club Installation Ceremony on 11th December 2024 at Krishna Garden Restaurant, Party Lawns & Banquet Hall, Neelkamal Farm, Vadodara. The ceremony formally inducted the newly chartered club into Lions Clubs International, marking the beginning of its service journey in District 3232 F1. A total of 100 guests attended the celebration, including 45 Lions members who came together to witness the installation. Members contributed 270 Lion Hours towards organizing and hosting the event. The occasion reflected the enthusiasm and commitment of the founding members as they embarked on their mission of community service under the Lions banner.$lcbdesc$
   where club_id = v_club_id
     and title = $lcbdesc$Installation Ceremony$lcbdesc$
     and date = date $lcbdesc$2024-12-11$lcbdesc$
     and coalesce(category,'') = $lcbdesc$other$lcbdesc$
     and replace(description, chr(13) || chr(10), chr(10)) = $lcbdesc$**Report on the Installation Ceremony of Lions Club of Baroda Rising Star**  

The *Lions Club of Baroda Rising Star* proudly held its **New Club Installation Ceremony** at *Krishna Garden Restaurant, Party Lawns & Banquet Hall, Neelkamal Farm, Vasna-Bh$lcbdesc$;
  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    raise notice 'Skipped (already edited or not found): % / %', $lcbdesc$Installation Ceremony$lcbdesc$, date $lcbdesc$2024-12-11$lcbdesc$;
  end if;

  update public.activities set description = $lcbdesc$The Lions Club of Baroda Rising Star successfully organized a Food for Hunger initiative on 14th January 2025 at Goverdhan Nathji Haveli, Karelibaug, Vadodara. The programme focused on hunger relief, providing wholesome meals to underprivileged members of the community. A total of 350 beneficiaries were served during the activity, supported by 28 Lions members who contributed 224 Lion Hours of service. The club also raised ₹2,000 towards the initiative. This activity was a testament to the club's ongoing commitment to fighting hunger and extending humanitarian support to those in need within Vadodara.$lcbdesc$
   where club_id = v_club_id
     and title = $lcbdesc$FOOD FOR HUNGER$lcbdesc$
     and date = date $lcbdesc$2025-01-14$lcbdesc$
     and coalesce(category,'') = $lcbdesc$hunger$lcbdesc$
     and replace(description, chr(13) || chr(10), chr(10)) = $lcbdesc$The Lions Club of Baroda Rising Star successfully organized a Food for Hunger initiative on 14th January 2025 at Goverdhan Nathji Haveli, Karelibaug, where 350 beneficiaries were served wholesome meals. This initiative was a testament to the club’s ongoin$lcbdesc$;
  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    raise notice 'Skipped (already edited or not found): % / %', $lcbdesc$FOOD FOR HUNGER$lcbdesc$, date $lcbdesc$2025-01-14$lcbdesc$;
  end if;

  update public.activities set description = $lcbdesc$Lions Club of Baroda Rising Star successfully organized a Mega Medical Camp on 19th January 2025 at Vadil Vihar Vatika, Opposite Buddhdev Colony, Karelibaug, Vadodara. The camp offered a range of free health services, including diabetes screening, eye check-ups, blood donation, and homeopathy consultations, reflecting the club's focus on diabetes awareness and preventive healthcare. A total of 200 beneficiaries availed of the medical services on offer, supported by 38 Lions members who together contributed 190 Lion Hours of service. The camp reflects the club's continued commitment to early detection of diabetes and improving access to essential health screening within the community.$lcbdesc$
   where club_id = v_club_id
     and title = $lcbdesc$MEGA MEDICAL CAMP$lcbdesc$
     and date = date $lcbdesc$2025-01-19$lcbdesc$
     and coalesce(category,'') = $lcbdesc$diabetes$lcbdesc$
     and replace(description, chr(13) || chr(10), chr(10)) = $lcbdesc$The Lions Club Baroda Rising Star successfully organized a Mega Medical Camp on 19th January 2025 at Vadil Vihar Vatika, Opp. Buddhdev Colony, Karelibaug. The camp offered Diabetes screening, Eye check-ups, Blood donation, Homeopathy consultation, and Blo$lcbdesc$;
  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    raise notice 'Skipped (already edited or not found): % / %', $lcbdesc$MEGA MEDICAL CAMP$lcbdesc$, date $lcbdesc$2025-01-19$lcbdesc$;
  end if;

  update public.activities set description = $lcbdesc$Lions Club of Baroda Rising Star convened its 2nd General Board Meeting on 29th January 2025 at the residence of Lion Deepak Mistry, 82 Kalakunj Society-1, Next to Avakar Hall, Water Tank Road, Karelibaug, Vadodara. The meeting brought together club officers and members to review ongoing service activities, discuss club administration, and plan upcoming programmes for the Lionistic year. A total of 30 Lions members were part of the proceedings, contributing 150 Lion Hours towards club governance and coordination. Meetings such as this remain central to the club's leadership structure, ensuring smooth planning and continuity of its community service initiatives.$lcbdesc$
   where club_id = v_club_id
     and title = $lcbdesc$Board & General Board Meeting$lcbdesc$
     and date = date $lcbdesc$2025-01-29$lcbdesc$
     and coalesce(category,'') = $lcbdesc$other$lcbdesc$
     and replace(description, chr(13) || chr(10), chr(10)) = $lcbdesc$Lions Club of Baroda Rising Star 2nd General Board Meeting Date: 29th January 2025 Venue: Deepak Mistry's Residence, 82, Kalakunj Society-1, Next to Avakar Hall, Water Tank Road, Karelibaug, Vadodara-390018
Attendance:
Total Members Present: 15
Total M$lcbdesc$;
  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    raise notice 'Skipped (already edited or not found): % / %', $lcbdesc$Board & General Board Meeting$lcbdesc$, date $lcbdesc$2025-01-29$lcbdesc$;
  end if;

  update public.activities set description = $lcbdesc$Lions Club of Baroda Rising Star held its 1st Board Meeting on 31st December 2024, bringing together the club's newly formed leadership team. The meeting was attended by Club President Lion Hiren Rathod, Club Secretary Lion Deepak Mistry, and Club Treasurer Lion Tarun Bhatt, along with fellow board members, to discuss the club's administration and early priorities for the Lionistic year. A total of 11 Lions members participated, contributing 33 Lion Hours towards planning and coordination. The meeting reflects the club's structured approach to governance as it began its journey of community service in District 3232 F1.$lcbdesc$
   where club_id = v_club_id
     and title = $lcbdesc$Board Meeting$lcbdesc$
     and date = date $lcbdesc$2024-12-31$lcbdesc$
     and coalesce(category,'') = $lcbdesc$other$lcbdesc$
     and replace(description, chr(13) || chr(10), chr(10)) = $lcbdesc$Lions Club of Baroda Rising Start of the 1st Board MeetingDate: 30th December 2025Time: 7:00 PM – 10:00 PMVenue: [Meeting Venue]

Attendees:

Lion Hiren Rathod (Club President)

Lion Deepak Mistry (Club Secretary)

Lion Tarun Bhatt (Club Treasurer$lcbdesc$;
  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    raise notice 'Skipped (already edited or not found): % / %', $lcbdesc$Board Meeting$lcbdesc$, date $lcbdesc$2024-12-31$lcbdesc$;
  end if;

  update public.activities set description = $lcbdesc$Lions Club of Baroda Rising Star organized a Sweater Distribution drive on 28th January 2025 at the Government School in Nani Umarvan, Halol, Panchmahal district, Gujarat. The humanitarian initiative focused on providing warm clothing to school children ahead of the winter season, helping protect their health and wellbeing. A total of 250 children benefited from the distribution, supported by 7 Lions members who contributed 28 Lion Hours of service. The activity reflects the club's commitment to humanitarian service and its continued efforts to support underprivileged school children in rural Gujarat.$lcbdesc$
   where club_id = v_club_id
     and title = $lcbdesc$Sweater Distribution to School Children$lcbdesc$
     and date = date $lcbdesc$2025-01-28$lcbdesc$
     and coalesce(category,'') = $lcbdesc$humanitarian$lcbdesc$
     and replace(description, chr(13) || chr(10), chr(10)) = $lcbdesc$**Sweater Distribution**

**Event Details:**  
- **Date:** 28th January 2025  
- **Venue:** Government School, Nani Umarvan, Halol, Panch Mahals, Gujarat  
- **PIN Code:** 389360 (INDIA)  

**Attendees:**  
- **Lion Members:**  
  1) ZC Lion Chir$lcbdesc$;
  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    raise notice 'Skipped (already edited or not found): % / %', $lcbdesc$Sweater Distribution to School Children$lcbdesc$, date $lcbdesc$2025-01-28$lcbdesc$;
  end if;

  update public.activities set description = $lcbdesc$Lions Club of Baroda Rising Star successfully organized a Tuberculosis (TB) Nutrition Kit Distribution Drive on 31st January 2025 at Kishanwadi Urban Health Center, Vadodara. A total of 15 nutrition kits were distributed to support TB patients in their recovery, reinforcing the club's commitment to the Lions cause of health and disease support. The activity reached 900 beneficiaries in the surrounding community, with 16 Lions members contributing 32 Lion Hours of service. The event reflects the club's ongoing partnership with local health authorities to improve nutritional support for tuberculosis patients in Vadodara.$lcbdesc$
   where club_id = v_club_id
     and title = $lcbdesc$TB Kit Distribution$lcbdesc$
     and date = date $lcbdesc$2025-01-31$lcbdesc$
     and coalesce(category,'') = $lcbdesc$healthcare$lcbdesc$
     and replace(description, chr(13) || chr(10), chr(10)) = $lcbdesc$Lions Club of Baroda Rising Star successfully organized a Tuberculosis (TB) Nutrition Kit Distribution Drive on 31st January 2025 at Kishanwadi Urban Center. A total of 15 nutrition kits were distributed to support TB patients in their recovery. The event$lcbdesc$;
  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    raise notice 'Skipped (already edited or not found): % / %', $lcbdesc$TB Kit Distribution$lcbdesc$, date $lcbdesc$2025-01-31$lcbdesc$;
  end if;

  update public.activities set description = $lcbdesc$Lions Club of Baroda Rising Star organized a Mega Diabetes Checkup Camp on 9th February 2025, focusing on diabetes screening and health awareness within the community. The camp saw active participation from Lions and non-Lion members, including Lion Hiren Rathod, Lion Deepak Mistry, Lion Tarun Bhatt, Lion Lata Shah, Lion Vaishali Mistry, Lion Tejal Rathod, Lion Falguni Bhatt, and ZC Lion Chirayu Gandhi. A total of 108 beneficiaries were screened, with 19 Lions members contributing 95 Lion Hours of service, and ₹3,700 raised in support of the camp. The activity reflects the club's continued focus on early detection of diabetes and promoting healthier lifestyles in Vadodara.$lcbdesc$
   where club_id = v_club_id
     and title = $lcbdesc$MEGA DIABITES CHAKEUP CAMP$lcbdesc$
     and date = date $lcbdesc$2025-02-09$lcbdesc$
     and coalesce(category,'') = $lcbdesc$diabetes$lcbdesc$
     and replace(description, chr(13) || chr(10), chr(10)) = $lcbdesc$we conduced the activity Diabetes  checkup camp on Dt: 9/2/2005. Sunday  total 20 participate Member Lion and Non lion members,  Hiren Rathod, Deepak mistry, Tarun Bhatt, Lata shah, Vaishali Mistry, Tejal Rathod, Falguni Bhatt, ZC Chirayu Gandhi , Paresh$lcbdesc$;
  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    raise notice 'Skipped (already edited or not found): % / %', $lcbdesc$MEGA DIABITES CHAKEUP CAMP$lcbdesc$, date $lcbdesc$2025-02-09$lcbdesc$;
  end if;

  update public.activities set description = $lcbdesc$Lions Club of Baroda Rising Star conducted a Free Diabetes Checkup Camp on 16th February 2025 across five Shrinathji Haveli temple locations in Vadodara — Karelibaug, Alkapuri, Gotri Nadalaya, Manjalpur, and Waghodia. The camp was inaugurated by District Governor Lion Manoj Parmar as part of International Lion Service Week, underscoring the club's focus on diabetes awareness and early detection. A total of 887 beneficiaries were screened across the five venues, with 39 Lions members contributing 234 Lion Hours of service. The multi-location camp reflects the club's commitment to making diabetes screening accessible to a wide cross-section of the community.$lcbdesc$
   where club_id = v_club_id
     and title = $lcbdesc$Free Diabetes checkup camp$lcbdesc$
     and date = date $lcbdesc$2025-02-16$lcbdesc$
     and coalesce(category,'') = $lcbdesc$diabetes$lcbdesc$
     and replace(description, chr(13) || chr(10), chr(10)) = $lcbdesc$We have conducted Free Diabetes check up camp at 5 Different Shrinathji Haveli Temples in vadodara. 1)  karelibaug2) Alkapuri 3) Gotri Nadalaya 4) Manjalpur, 5) Waghodia, participate lion DG Manoj Parmar Inaugurated International Lion Service Week, Free d$lcbdesc$;
  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    raise notice 'Skipped (already edited or not found): % / %', $lcbdesc$Free Diabetes checkup camp$lcbdesc$, date $lcbdesc$2025-02-16$lcbdesc$;
  end if;

  update public.activities set description = $lcbdesc$Lions Club of Baroda Rising Star conducted a Food and Education Game Distribution activity at the Asha Deep ADMS Centre, Vadodara, on 18th February 2025. The activity combined hunger relief with educational engagement, providing food along with educational games to the centre's residents. A total of 190 beneficiaries were served, with participation from 19 Lions and non-Lion members, including Lion Hiren Rathod and fellow volunteers, who together contributed 38 Lion Hours of service. The initiative reflects the club's dual focus on humanitarian support and educational enrichment for vulnerable communities.$lcbdesc$
   where club_id = v_club_id
     and title = $lcbdesc$Food and Education Game Distribution$lcbdesc$
     and date = date $lcbdesc$2025-02-18$lcbdesc$
     and coalesce(category,'') = $lcbdesc$hunger$lcbdesc$
     and replace(description, chr(13) || chr(10), chr(10)) = $lcbdesc$We conducted Food and Education Game  distributed , at the Asha Deep ADMS Centre , Vadodara, Gujarat , India. 
we served  Food and  Education Games, Total  Beneficiary 190, and participate Lion members and Non Lion Members,
Total 19. Lion Hiren Rathod,$lcbdesc$;
  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    raise notice 'Skipped (already edited or not found): % / %', $lcbdesc$Food and Education Game Distribution$lcbdesc$, date $lcbdesc$2025-02-18$lcbdesc$;
  end if;

  update public.activities set description = $lcbdesc$As part of District Service Week, Lions Club of Baroda Rising Star conducted a TB Nutrition Kit Distribution on 20th February 2025 at Sawad Urban Health Centre, Harni Road, Vadodara. The drive supported tuberculosis patients by providing nutrition kits to aid their recovery. Lions and non-Lion members participated in the activity, including Lion Hiren Rathod, Lion Deepak Mistry, Lion Lata Shah, Lion Paresh Shah, and Lion Falguni Bhatt. The activity reached 1,200 beneficiaries, with 12 Lions members contributing 24 Lion Hours of service. This initiative reflects the club's continued commitment to supporting TB patients as part of the district's coordinated service week.$lcbdesc$
   where club_id = v_club_id
     and title = $lcbdesc$TB NUTRITION KIT DISTRIBUTION$lcbdesc$
     and date = date $lcbdesc$2025-02-20$lcbdesc$
     and coalesce(category,'') = $lcbdesc$hunger$lcbdesc$
     and replace(description, chr(13) || chr(10), chr(10)) = $lcbdesc$District Service Week , We Conducted a TB Nutrition Kit at sawad   Urban Health Centre Harni Road Vadodara, Gujarat, INDIA. Participate Lion Members and Non -Lion Members,
Ln Hiren Rathod, Ln Deepak Mistry, Ln Lata Shah, Ln Paresh Shah, Ln Falguni Bhatt,$lcbdesc$;
  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    raise notice 'Skipped (already edited or not found): % / %', $lcbdesc$TB NUTRITION KIT DISTRIBUTION$lcbdesc$, date $lcbdesc$2025-02-20$lcbdesc$;
  end if;

  update public.activities set description = $lcbdesc$Lions Club of Baroda Rising Star organized a Drawing Competition and Education Game Distribution activity on 21st February 2025 at Rameshwar Primary School, Taluka Halol, Panchmahal district, Gujarat. The youth-focused programme encouraged creativity among school children through a drawing competition, alongside the distribution of educational games. Lions and non-Lion members took part in the activity, including ZC Lion Chirayu Gandhi, Lion Hiren Rathod, and Lion Deepak Mistry. The event reached 954 beneficiaries, with 29 Lions members contributing 116 Lion Hours of service. The activity reflects the club's continued investment in youth development and childhood education in rural Gujarat.$lcbdesc$
   where club_id = v_club_id
     and title = $lcbdesc$Drawing Competition and Education Game Distribution$lcbdesc$
     and date = date $lcbdesc$2025-02-21$lcbdesc$
     and coalesce(category,'') = $lcbdesc$youth$lcbdesc$
     and replace(description, chr(13) || chr(10), chr(10)) = $lcbdesc$We conducted Drawing Competition and Educational Game Distribution at Rameshwar Primary School, Taluka Halol, Dist; Panchamhal. Gujarat, India. Total Beneficiary 954.Paricipet Lion Members and Non lion Members,ZC Chirayu Gandhi Hiern Rathod, Deepak Mistry$lcbdesc$;
  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    raise notice 'Skipped (already edited or not found): % / %', $lcbdesc$Drawing Competition and Education Game Distribution$lcbdesc$, date $lcbdesc$2025-02-21$lcbdesc$;
  end if;

  update public.activities set description = $lcbdesc$Lions Club of Baroda Rising Star organized a Tree Plantation and Environment Programme on 21st February 2025 at Ful Pari School and Rameshwar School, Taluka Halol, Panchmahal district, Gujarat. The initiative focused on promoting environmental awareness and encouraging community participation in creating a greener environment, with 100 trees planted across the two school campuses. Lions and non-Lion members took part in the plantation drive, including Lion Hiren Rathod, Lion Deepak Mistry, Lion Lata Shah, and Lion Paresh Shah. The activity benefited 600 individuals, with 20 Lions members contributing 116 Lion Hours of service. The programme reflects the club's continued commitment to environmental sustainability and responsible community service in rural Gujarat.$lcbdesc$
   where club_id = v_club_id
     and title = $lcbdesc$Tree Plantation, Environment Program$lcbdesc$
     and date = date $lcbdesc$2025-02-21$lcbdesc$
     and coalesce(category,'') = $lcbdesc$environment$lcbdesc$
     and replace(description, chr(13) || chr(10), chr(10)) = $lcbdesc$We Conducted Tree Plantation, Environment Program, at Ful pari School,  and Rameshwar School, at Halol Taluka, Dist; Panchamhal . 100       tree Plantation . Participate Lion Members and Non Lion Members , Hiren Rathod, Deepak Mistry, Lata shah, Paresh Sh$lcbdesc$;
  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    raise notice 'Skipped (already edited or not found): % / %', $lcbdesc$Tree Plantation, Environment Program$lcbdesc$, date $lcbdesc$2025-02-21$lcbdesc$;
  end if;

  update public.activities set description = $lcbdesc$Lions Club of Baroda Rising Star conducted a Free Diabetes Checkup Camp on 22nd February 2025 at Sukh Dham Haveli, Waghodia Road, Vadodara, Gujarat. The camp offered diabetes screening to promote early detection and healthier lifestyles within the community. A total of 151 beneficiaries were screened, with participation from Lions and non-Lion members including Lion Hiren Rathod, Lion Deepak Mistry, Lion Vaishali Mistry, Lion Tarun Bhatt, Lion Falguni Bhatt, and Lion Joseph. The 14 participating Lions members contributed 84 Lion Hours of service to the camp. This activity reflects the club's ongoing efforts to make diabetes screening accessible to residents of Vadodara.$lcbdesc$
   where club_id = v_club_id
     and title = $lcbdesc$Free Diabetes checkup camp$lcbdesc$
     and date = date $lcbdesc$2025-02-22$lcbdesc$
     and coalesce(category,'') = $lcbdesc$diabetes$lcbdesc$
     and replace(description, chr(13) || chr(10), chr(10)) = $lcbdesc$We conducted Diabetes cheek up camp at SUKH DHAM HAWALI WAGHODIYA ROAD, GUJARAT, INDIA, Total beneficiary  151. and Total Hours Spent 84 Hours. Lion and Non Lion Members , Hiren Rathod, Deepak Mistry, Vaishali Mistry, Tarun Bhatt, Falguni bhatt, Joseph, M$lcbdesc$;
  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    raise notice 'Skipped (already edited or not found): % / %', $lcbdesc$Free Diabetes checkup camp$lcbdesc$, date $lcbdesc$2025-02-22$lcbdesc$;
  end if;

  update public.activities set description = $lcbdesc$Lions Club of Baroda Rising Star participated in the Samarpan Regional Conference (GB-4) held at Nakshatra Party Plot, near Gada Circle, Harni Road, Vadodara, on 25th February 2025. The gathering brought together Lions clubs from across the region for fellowship, coordination, and review of ongoing service initiatives. A total of 16 members of Baroda Rising Star attended the conference, contributing 96 Lion Hours towards regional participation and club coordination. Participation in such regional conferences reflects the club's continued engagement with the wider Lions network and its commitment to collaborative service planning.$lcbdesc$
   where club_id = v_club_id
     and title = $lcbdesc$GB-4$lcbdesc$
     and date = date $lcbdesc$2025-02-25$lcbdesc$
     and coalesce(category,'') = $lcbdesc$other$lcbdesc$
     and replace(description, chr(13) || chr(10), chr(10)) = $lcbdesc$We merged in samarpan  Regional conference GB-4 At NAKSHATRA PARTY PLOT Nr. GADA CERVICAL, HARNI ROAD,VADODARA.. total 16 members of baroda rising star merged and attended the GB-4.$lcbdesc$;
  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    raise notice 'Skipped (already edited or not found): % / %', $lcbdesc$GB-4$lcbdesc$, date $lcbdesc$2025-02-25$lcbdesc$;
  end if;

  update public.activities set description = $lcbdesc$Lions Club of Baroda Rising Star conducted a TB Kit Distribution activity on 24th March 2025, providing nutrition support kits to tuberculosis patients in Vadodara as part of the club's ongoing health and hunger relief efforts. The activity benefited 1,800 individuals, with 10 Lions members contributing 20 Lion Hours of service towards the distribution drive. This initiative reflects the club's continued commitment to supporting TB patients in their recovery through consistent nutritional assistance.$lcbdesc$
   where club_id = v_club_id
     and title = $lcbdesc$TB Kit Distribution$lcbdesc$
     and date = date $lcbdesc$2025-03-24$lcbdesc$
     and coalesce(category,'') = $lcbdesc$hunger$lcbdesc$
     and replace(description, chr(13) || chr(10), chr(10)) = $lcbdesc$TB Kit Distribution$lcbdesc$;
  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    raise notice 'Skipped (already edited or not found): % / %', $lcbdesc$TB Kit Distribution$lcbdesc$, date $lcbdesc$2025-03-24$lcbdesc$;
  end if;

  update public.activities set description = $lcbdesc$Lions Club of Baroda Rising Star carried out a Food for Hunger initiative on 7th July 2025 at 12-Kirtikunj Society, near Buddhadev Char Rasta, Karelibaug, Vadodara, with the aim of serving the underprivileged and spreading compassion within the community. The activity focused on hunger relief, providing food support to needy families in the locality. A total of 600 beneficiaries were served, with 10 Lions members contributing 10 Lion Hours of service, and ₹10,000 donated in support of the drive. The initiative reflects the club's continued dedication to fighting hunger and extending humanitarian aid to the underserved.$lcbdesc$
   where club_id = v_club_id
     and title = $lcbdesc$FOOD FOR HUNGER$lcbdesc$
     and date = date $lcbdesc$2025-07-07$lcbdesc$
     and coalesce(category,'') = $lcbdesc$hunger$lcbdesc$
     and replace(description, chr(13) || chr(10), chr(10)) = $lcbdesc$The Lions Club carried out a noble Food for Hunger initiative at 12-Kirtikunj Society, near Buddhadev Char Rasta, Karelibaug, with the aim of serving the underprivileged and spreading compassion.

Key Highlights:

Fund Donated: ₹10,000

Total Member$lcbdesc$;
  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    raise notice 'Skipped (already edited or not found): % / %', $lcbdesc$FOOD FOR HUNGER$lcbdesc$, date $lcbdesc$2025-07-07$lcbdesc$;
  end if;

  update public.activities set description = $lcbdesc$Lions Club of Baroda Rising Star took part in the Region-5 Samarpan Conference held on 25th February 2025 at Nakshatra Party Plot, near Gasda Circle, Harni, Vadodara. The regional gathering brought together Lions clubs of Region 5 for fellowship, coordination, and review of service activities across the zone. A total of 16 members of Baroda Rising Star attended the conference, contributing 80 Lion Hours towards regional participation. The club's presence at the conference reflects its continued engagement with the broader Lions leadership structure at the regional level.$lcbdesc$
   where club_id = v_club_id
     and title = $lcbdesc$Region -5 Samrprpan Region Confrance.$lcbdesc$
     and date = date $lcbdesc$2025-02-25$lcbdesc$
     and coalesce(category,'') = $lcbdesc$other$lcbdesc$
     and replace(description, chr(13) || chr(10), chr(10)) = $lcbdesc$Region -5 Samrpan Conference .Place, Nakshtra party plot, Near Gasda Cricle,Harni Vadodra$lcbdesc$;
  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    raise notice 'Skipped (already edited or not found): % / %', $lcbdesc$Region -5 Samrprpan Region Confrance.$lcbdesc$, date $lcbdesc$2025-02-25$lcbdesc$;
  end if;

  update public.activities set description = $lcbdesc$Lions Club of Baroda Rising Star participated in the District Service Week Celebration 2024/25 held on 23rd February 2025, which featured a Grand Valedictory Function and Award Distribution Ceremony along with a Teacher Felicitation programme. The event recognized outstanding service contributions across the district and honored teachers for their dedication to education. Three Lions members of Baroda Rising Star attended the celebration, contributing 9 Lion Hours of participation. The club's presence at the event reflects its continued engagement with district-level recognition and service programmes.$lcbdesc$
   where club_id = v_club_id
     and title = $lcbdesc$DISTRICT SERVICE WEEK CELEBRATION 2024/2025$lcbdesc$
     and date = date $lcbdesc$2025-02-23$lcbdesc$
     and coalesce(category,'') = $lcbdesc$other$lcbdesc$
     and replace(description, chr(13) || chr(10), chr(10)) = $lcbdesc$GRAND VALEDICTORY FUNCTION AND AWARD DISTRIBUTION CEREMONEY OF DISTRICT CELEBRATION2024/25 & TEACHER FELICITATIION.$lcbdesc$;
  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    raise notice 'Skipped (already edited or not found): % / %', $lcbdesc$DISTRICT SERVICE WEEK CELEBRATION 2024/2025$lcbdesc$, date $lcbdesc$2025-02-23$lcbdesc$;
  end if;

  update public.activities set description = $lcbdesc$Lions Club of Baroda Rising Star conducted a Food and Education Game Distribution activity on 30th April 2025, providing grocery kits to two needy families as part of the club's hunger relief efforts. The activity reached 5 beneficiaries, with 6 Lions members contributing 6 Lion Hours of service, and ₹5,000 raised in support of the initiative. This activity reflects the club's continued focus on addressing food insecurity among vulnerable families in Vadodara.$lcbdesc$
   where club_id = v_club_id
     and title = $lcbdesc$Food and Education Game Distribution$lcbdesc$
     and date = date $lcbdesc$2025-04-30$lcbdesc$
     and coalesce(category,'') = $lcbdesc$hunger$lcbdesc$
     and replace(description, chr(13) || chr(10), chr(10)) = $lcbdesc$FOOD FOR HUNGER ACTIVITY FOR TWO NEDED FAMILY GROSERY KIT$lcbdesc$;
  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    raise notice 'Skipped (already edited or not found): % / %', $lcbdesc$Food and Education Game Distribution$lcbdesc$, date $lcbdesc$2025-04-30$lcbdesc$;
  end if;

  update public.activities set description = $lcbdesc$Lions Club of Baroda Rising Star conducted a TB Nutrition Kit Distribution on 24th June 2025 at the Warasiya Urban Health Centre, Vadodara. The drive provided nutrition kits to support tuberculosis patients undergoing treatment, reinforcing the club's commitment to health and hunger relief. The activity reached 15 beneficiaries, with 23 Lions members contributing 30 Lion Hours of service, and ₹23,000 raised in support of the initiative. This activity reflects the club's continued partnership with local health authorities to support TB patients in Vadodara.$lcbdesc$
   where club_id = v_club_id
     and title = $lcbdesc$TB NUTRITION KIT DISTRIBUTION$lcbdesc$
     and date = date $lcbdesc$2025-06-24$lcbdesc$
     and coalesce(category,'') = $lcbdesc$hunger$lcbdesc$
     and replace(description, chr(13) || chr(10), chr(10)) = $lcbdesc$TB NUTRITION KIT DISTRIBUTION AT WARASIYA URBEN HELTH CNTRE VADODARA.$lcbdesc$;
  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    raise notice 'Skipped (already edited or not found): % / %', $lcbdesc$TB NUTRITION KIT DISTRIBUTION$lcbdesc$, date $lcbdesc$2025-06-24$lcbdesc$;
  end if;

  update public.activities set description = $lcbdesc$Lions Club of Baroda Rising Star participated in the Rankar District Conference on 6th April 2025, a district-level gathering focused on the honorable role of the District Governor in leading the organization. The conference brought together Lions leadership to discuss governance and the direction of the district for the Lionistic year. Two members of Baroda Rising Star attended the conference, contributing 16 Lion Hours towards district participation and leadership engagement.$lcbdesc$
   where club_id = v_club_id
     and title = $lcbdesc$THE RANKAR DISTRICT CONFERENCE$lcbdesc$
     and date = date $lcbdesc$2025-04-06$lcbdesc$
     and coalesce(category,'') = $lcbdesc$other$lcbdesc$
     and replace(description, chr(13) || chr(10), chr(10)) = $lcbdesc$THE RANKAR DISTRICT CONFERANCE , THE HHONORABLE ROLE OF DISTRICT GOVERNOR PREPARING TO LEAD THIS ESTEEMED ORGANIZATION$lcbdesc$;
  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    raise notice 'Skipped (already edited or not found): % / %', $lcbdesc$THE RANKAR DISTRICT CONFERENCE$lcbdesc$, date $lcbdesc$2025-04-06$lcbdesc$;
  end if;

  update public.activities set description = $lcbdesc$Lions Club of Baroda Rising Star conducted a Food for Hunger activity on 8th April 2025, distributing grocery kits to needy individuals in the community. The activity reached 5 beneficiaries, with 8 Lions members contributing 8 Lion Hours of service, and ₹5,000 raised to support the distribution. This initiative reflects the club's ongoing commitment to hunger relief and humanitarian support for underprivileged families in Vadodara.$lcbdesc$
   where club_id = v_club_id
     and title = $lcbdesc$FOOD FOR HUNGER$lcbdesc$
     and date = date $lcbdesc$2025-04-08$lcbdesc$
     and coalesce(category,'') = $lcbdesc$hunger$lcbdesc$
     and replace(description, chr(13) || chr(10), chr(10)) = $lcbdesc$FOOD FOR HUNGER NEEDED PEOPLE GROSERY KIT DISTRIBUTION$lcbdesc$;
  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    raise notice 'Skipped (already edited or not found): % / %', $lcbdesc$FOOD FOR HUNGER$lcbdesc$, date $lcbdesc$2025-04-08$lcbdesc$;
  end if;

  update public.activities set description = $lcbdesc$Lions Club of Baroda Rising Star held its 5th Board Meeting and 5th General Board Meeting (BM-5 & GB-5) on 23rd April 2025 at 12-Kirti Kunj Society, Karelibaug, Vadodara. The meeting brought together club officers and members to review ongoing service activities and plan upcoming programmes for the Lionistic year. A total of 20 Lions members participated, contributing 80 Lion Hours towards club governance and coordination.$lcbdesc$
   where club_id = v_club_id
     and title = $lcbdesc$BM-5& GB-5$lcbdesc$
     and date = date $lcbdesc$2025-04-23$lcbdesc$
     and coalesce(category,'') = $lcbdesc$other$lcbdesc$
     and replace(description, chr(13) || chr(10), chr(10)) = $lcbdesc$BM-5& GB-5. 12- KIRTI KUNJ SOCIETY, KARELIBAUG VADODARA.$lcbdesc$;
  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    raise notice 'Skipped (already edited or not found): % / %', $lcbdesc$BM-5& GB-5$lcbdesc$, date $lcbdesc$2025-04-23$lcbdesc$;
  end if;

  update public.activities set description = $lcbdesc$Lions Club of Baroda Rising Star held its 6th Board Meeting and 6th General Board Meeting (BM-6 & GB-6) on 25th May 2025 at the residence of Lion Kamlesh Putambaker. The meeting brought together club members to review service activities and discuss club administration for the ongoing Lionistic year. A total of 13 Lions members participated, contributing 39 Lion Hours towards club governance and coordination.$lcbdesc$
   where club_id = v_club_id
     and title = $lcbdesc$BM-6 & GB-6$lcbdesc$
     and date = date $lcbdesc$2025-05-25$lcbdesc$
     and coalesce(category,'') = $lcbdesc$other$lcbdesc$
     and replace(description, chr(13) || chr(10), chr(10)) = $lcbdesc$BM-5 & GB-6 AT LION KAMLESH PUTAMBAKER HOME,$lcbdesc$;
  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    raise notice 'Skipped (already edited or not found): % / %', $lcbdesc$BM-6 & GB-6$lcbdesc$, date $lcbdesc$2025-05-25$lcbdesc$;
  end if;

  update public.activities set description = $lcbdesc$Lions Club of Baroda Rising Star participated in the District Schooling Meeting for PST & VP-1 on 25th May 2025 at Grand Marquis Suraj Palace, Sayajigunj, Vadodara. The session focused on training and orientation for incoming club officers ahead of the new Lionistic year. Five members of Baroda Rising Star attended the meeting, contributing 30 Lion Hours towards leadership preparation and district coordination.$lcbdesc$
   where club_id = v_club_id
     and title = $lcbdesc$DISTRICT SCHOOLING MEETING FOR PST & VP-1$lcbdesc$
     and date = date $lcbdesc$2025-05-25$lcbdesc$
     and coalesce(category,'') = $lcbdesc$other$lcbdesc$
     and replace(description, chr(13) || chr(10), chr(10)) = $lcbdesc$SCHOOLING MEETING FOR PST & VP-1, AT GRAND MARQUIS SURAY PALACE, SAYJIGUNJ, VADODARA.$lcbdesc$;
  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    raise notice 'Skipped (already edited or not found): % / %', $lcbdesc$DISTRICT SCHOOLING MEETING FOR PST & VP-1$lcbdesc$, date $lcbdesc$2025-05-25$lcbdesc$;
  end if;

  update public.activities set description = $lcbdesc$Lions Club of Baroda Rising Star organized a Yoga Day Celebration on 21st June 2025 as part of International Yoga Day, promoting health, fitness, and wellbeing among youth in the community. The activity brought together 10 beneficiaries who took part in the yoga session, supported by 10 Lions members who contributed 20 Lion Hours of service. The celebration reflects the club's commitment to encouraging healthy lifestyles and youth engagement through wellness-focused programming.$lcbdesc$
   where club_id = v_club_id
     and title = $lcbdesc$YOGA DAY CELEBRATION$lcbdesc$
     and date = date $lcbdesc$2025-06-21$lcbdesc$
     and coalesce(category,'') = $lcbdesc$youth$lcbdesc$
     and description is null;
  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    raise notice 'Skipped (already edited or not found): % / %', $lcbdesc$YOGA DAY CELEBRATION$lcbdesc$, date $lcbdesc$2025-06-21$lcbdesc$;
  end if;

  update public.activities set description = $lcbdesc$Lions Club of Baroda Rising Star organized a Women's Yoga Programme on International Yoga Day, 21st June 2025, at the residence of Lion Minesha Ben Patel, Ama Savli Road, Vamali, Vadodara. The programme encouraged women in the community to embrace yoga for improved health and wellbeing. Seven beneficiaries took part in the session, supported by 7 Lions members who contributed 7 Lion Hours of service. This initiative reflects the club's continued focus on promoting wellness and healthy living among women in the community.$lcbdesc$
   where club_id = v_club_id
     and title = $lcbdesc$yoga day yoga program$lcbdesc$
     and date = date $lcbdesc$2025-06-21$lcbdesc$
     and coalesce(category,'') = $lcbdesc$youth$lcbdesc$
     and replace(description, chr(13) || chr(10), chr(10)) = $lcbdesc$YOGA DAY , WOMENS YOGA PROGRAM AT LION MINESHA BEN PATEL PWNT HOUSE , AMA SAVALI ROAD, VAMALI, VADODARA.$lcbdesc$;
  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    raise notice 'Skipped (already edited or not found): % / %', $lcbdesc$yoga day yoga program$lcbdesc$, date $lcbdesc$2025-06-21$lcbdesc$;
  end if;

  update public.activities set description = $lcbdesc$Lions Club of Baroda Rising Star participated in the Preliminary Cabinet Meeting held on 22nd June 2025 at Reva Grand Banquet and Garden, Sarsavi, Vadodara. The meeting brought together district cabinet officers and club representatives to plan the direction of the upcoming Lionistic year. Two members of Baroda Rising Star attended the meeting, contributing 12 Lion Hours towards district-level planning and coordination.$lcbdesc$
   where club_id = v_club_id
     and title = $lcbdesc$PRELIMINARY CABINET MEETING$lcbdesc$
     and date = date $lcbdesc$2025-06-22$lcbdesc$
     and coalesce(category,'') = $lcbdesc$other$lcbdesc$
     and replace(description, chr(13) || chr(10), chr(10)) = $lcbdesc$PRELIMINARY CABINET MEETING AT REVA GRAND BANQUET AND GARDEN SAVASI VADODARA.$lcbdesc$;
  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    raise notice 'Skipped (already edited or not found): % / %', $lcbdesc$PRELIMINARY CABINET MEETING$lcbdesc$, date $lcbdesc$2025-06-22$lcbdesc$;
  end if;

  update public.activities set description = $lcbdesc$Lions Club of Baroda Rising Star members attended the Zone Social organized by the Zone Chairperson at Vakal Seva Kendra, Sayajigunj, Vadodara, on 23rd November 2024. The gathering provided an opportunity for fellowship and networking among Lions clubs within the zone. A total of 20 members of Baroda Rising Star attended the event, contributing 80 Lion Hours towards zone-level participation and camaraderie.$lcbdesc$
   where club_id = v_club_id
     and title = $lcbdesc$Zone social at Vakal seva kandra sayjigunj$lcbdesc$
     and date = date $lcbdesc$2024-11-23$lcbdesc$
     and coalesce(category,'') = $lcbdesc$other$lcbdesc$
     and replace(description, chr(13) || chr(10), chr(10)) = $lcbdesc$ZC ZONE SOCIAL AT VAKAL SEVA KENDRA SAYJIGUNJ VADODARA.LIONS CLUB OF BARODA RISING STAR MEMBERS ATTN ENDING ZONE SOCIAL$lcbdesc$;
  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    raise notice 'Skipped (already edited or not found): % / %', $lcbdesc$Zone social at Vakal seva kandra sayjigunj$lcbdesc$, date $lcbdesc$2024-11-23$lcbdesc$;
  end if;

  update public.activities set description = $lcbdesc$Lions Club of Baroda Rising Star hosted a visit by the Zone Chairperson, Region Chairperson, and District Governor on 26th June 2025, with a dinner held at Vrajdham Mandir Road, Manjalpur, Vadodara. The visit provided an opportunity for club members to interact with district leadership, review the club's activities, and receive guidance for the year ahead. A total of 45 Lions members attended the event, contributing 225 Lion Hours of participation, with ₹13,500 raised during the occasion. The visit reflects the strong coordination between Baroda Rising Star and the district's leadership structure.$lcbdesc$
   where club_id = v_club_id
     and title = $lcbdesc$ZC/RC AND DG VISIT IN LIONS CLUB OF BARODA RISING STAR$lcbdesc$
     and date = date $lcbdesc$2025-06-26$lcbdesc$
     and coalesce(category,'') = $lcbdesc$other$lcbdesc$
     and replace(description, chr(13) || chr(10), chr(10)) = $lcbdesc$ZC/RC AND DG VISIT IN LIONS CLUB OF BARODA RISING STAR .with Dinner At Vrajdham Mandir Rd Manjalpur, Vadodara, Gujarat 390011$lcbdesc$;
  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    raise notice 'Skipped (already edited or not found): % / %', $lcbdesc$ZC/RC AND DG VISIT IN LIONS CLUB OF BARODA RISING STAR$lcbdesc$, date $lcbdesc$2025-06-26$lcbdesc$;
  end if;

  update public.activities set description = $lcbdesc$Lions Club of Baroda Rising Star actively participated in the Walkethlon organized at Bahilal Amin General Hospital on 1st July 2025. The event aimed to spread awareness against cancer and encourage healthy living practices within the community, aligning with the club's youth and health awareness initiatives. Six beneficiaries were part of the activity, with 6 Lions members contributing 30 Lion Hours of participation. The club's involvement in the Walkethlon reflects its commitment to supporting community health awareness campaigns in Vadodara.$lcbdesc$
   where club_id = v_club_id
     and title = $lcbdesc$WALKETHLON$lcbdesc$
     and date = date $lcbdesc$2025-07-01$lcbdesc$
     and coalesce(category,'') = $lcbdesc$youth$lcbdesc$
     and replace(description, chr(13) || chr(10), chr(10)) = $lcbdesc$The Lions Club of Rising Star actively participated in the Walkethlon organized at Bahilal Amin Hospital. A total of 11 Lions members attended the event, joining hands to spread awareness against cancer and to encourage healthy living practices within the$lcbdesc$;
  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    raise notice 'Skipped (already edited or not found): % / %', $lcbdesc$WALKETHLON$lcbdesc$, date $lcbdesc$2025-07-01$lcbdesc$;
  end if;

  update public.activities set description = $lcbdesc$Lions Club of Baroda Rising Star organized a Blood Donation Camp on 4th July 2025, encouraging voluntary blood donation to support patients in need across Vadodara. A total of 25 Lions and non-Lion members were present at the camp, with 25 units of blood collected during the drive. Fifteen Lions members contributed 75 Lion Hours of service towards organizing and running the camp. The activity reflects the club's continued commitment to supporting community health through voluntary blood donation.$lcbdesc$
   where club_id = v_club_id
     and title = $lcbdesc$BLOOD DONATION CAMP$lcbdesc$
     and date = date $lcbdesc$2025-07-04$lcbdesc$
     and coalesce(category,'') = $lcbdesc$childhood_cancer$lcbdesc$
     and replace(description, chr(13) || chr(10), chr(10)) = $lcbdesc$25 LIONS & NON LIONS MEMBERS ARE PRESENT IN BLOOD DONATION CAMP. 25 UNIT COLLECT IN CAMP.

.$lcbdesc$;
  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    raise notice 'Skipped (already edited or not found): % / %', $lcbdesc$BLOOD DONATION CAMP$lcbdesc$, date $lcbdesc$2025-07-04$lcbdesc$;
  end if;

  update public.activities set description = $lcbdesc$Lions Club of Baroda Rising Star celebrated International Yoga Day on 21st June 2025, organizing a yoga session to promote health, fitness, and wellbeing within the community. Ten beneficiaries took part in the session, supported by 10 Lions members who together contributed 20 Lion Hours of service. The celebration reflects the club's broader commitment to community wellness programming as part of its service calendar.$lcbdesc$
   where club_id = v_club_id
     and title = $lcbdesc$YOGA DAY CELEBRATION$lcbdesc$
     and date = date $lcbdesc$2025-06-21$lcbdesc$
     and coalesce(category,'') = $lcbdesc$other$lcbdesc$
     and description is null;
  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    raise notice 'Skipped (already edited or not found): % / %', $lcbdesc$YOGA DAY CELEBRATION$lcbdesc$, date $lcbdesc$2025-06-21$lcbdesc$;
  end if;

  update public.activities set description = $lcbdesc$Lions Club of Baroda Rising Star successfully conducted a Mega Club Installation Ceremony on 5th July 2025 at Hotel Mar Curry, Sayajigunj, Vadodara. The ceremony celebrated the formal installation of club officers for the Lionistic year, bringing together members and guests to mark the occasion. Twelve beneficiaries attended the celebration, supported by 12 Lions members who together contributed 48 Lion Hours towards organizing the event. The ceremony reflects the club's continued tradition of formally recognizing its leadership and renewing its commitment to community service.$lcbdesc$
   where club_id = v_club_id
     and title = $lcbdesc$MEGA INSTALLATION$lcbdesc$
     and date = date $lcbdesc$2025-07-05$lcbdesc$
     and coalesce(category,'') = $lcbdesc$other$lcbdesc$
     and replace(description, chr(13) || chr(10), chr(10)) = $lcbdesc$The Mega Club Installation Ceremony was successfully conducted on 5th July 2025 at Hotel Mar Curry, located in the Sayajigunj area of Vadodara.$lcbdesc$;
  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    raise notice 'Skipped (already edited or not found): % / %', $lcbdesc$MEGA INSTALLATION$lcbdesc$, date $lcbdesc$2025-07-05$lcbdesc$;
  end if;

  update public.activities set description = $lcbdesc$Lions Club of Baroda Rising Star organized a Nand Mahotsav celebration on 17th August 2025, marking the birthday of Lord Krishna with a Garba and Bhajan Sandhya (devotional music and dance evening) for members and their families. The fellowship event brought together club members in a spirit of cultural and spiritual celebration. Seven Lions members participated in organizing the celebration, contributing 28 Lion Hours of service towards the event.$lcbdesc$
   where club_id = v_club_id
     and title = $lcbdesc$NAND MAHOTSAV$lcbdesc$
     and date = date $lcbdesc$2025-08-17$lcbdesc$
     and coalesce(category,'') = $lcbdesc$other$lcbdesc$
     and replace(description, chr(13) || chr(10), chr(10)) = $lcbdesc$LORD KRISHNA BIRTHDAY CELEBRATION COMBIND IN 20 CLUB MEMBERS.ALL PEOPLE ENJOY THE GARBA & BHAJAN SANDHYA.$lcbdesc$;
  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    raise notice 'Skipped (already edited or not found): % / %', $lcbdesc$NAND MAHOTSAV$lcbdesc$, date $lcbdesc$2025-08-17$lcbdesc$;
  end if;

  update public.activities set description = $lcbdesc$Lions Club of Baroda Rising Star attended the 1st Region Staff Meeting for Region 6 on 20th August 2025. The meeting was guided by Region Chairperson Lion Nitin Shah and Lion Himanshu Parmar, who provided direction to club representatives on regional priorities and coordination for the year. A total of 14 members of Baroda Rising Star attended, contributing 48 Lion Hours towards regional participation and leadership engagement.$lcbdesc$
   where club_id = v_club_id
     and title = $lcbdesc$REGION STAFF MEETING REGION -6$lcbdesc$
     and date = date $lcbdesc$2025-08-20$lcbdesc$
     and coalesce(category,'') = $lcbdesc$other$lcbdesc$
     and replace(description, chr(13) || chr(10), chr(10)) = $lcbdesc$BARODA RISING STAR ATTEND 1st Region Staff Meeting. Total 14 Member of club attend the meeting. RC Ln Nitin Shah and Himanshu Parmar guide all members.$lcbdesc$;
  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    raise notice 'Skipped (already edited or not found): % / %', $lcbdesc$REGION STAFF MEETING REGION -6$lcbdesc$, date $lcbdesc$2025-08-20$lcbdesc$;
  end if;

  update public.activities set description = $lcbdesc$Lions Club of Baroda Rising Star participated in the 1st Zone Advisory Meeting organized by Zone Chairperson Lion Jitendra Soni at Vakal Seva Kendra, Vadodara, on 20th August 2025. The meeting brought together club representatives from across the zone to discuss service priorities and coordination for the Lionistic year. Fourteen members of Baroda Rising Star were present, contributing 48 Lion Hours towards zone-level planning and collaboration.$lcbdesc$
   where club_id = v_club_id
     and title = $lcbdesc$1st Zone Advisory Meeting$lcbdesc$
     and date = date $lcbdesc$2025-08-20$lcbdesc$
     and coalesce(category,'') = $lcbdesc$other$lcbdesc$
     and replace(description, chr(13) || chr(10), chr(10)) = $lcbdesc$ZC Ln Jitendra Soni ORGANIsed 1st Zone Advisory Meeting at Vakal Seva Kendra. Baroda Rising star 14 Members are present.$lcbdesc$;
  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    raise notice 'Skipped (already edited or not found): % / %', $lcbdesc$1st Zone Advisory Meeting$lcbdesc$, date $lcbdesc$2025-08-20$lcbdesc$;
  end if;

  update public.activities set description = $lcbdesc$On the auspicious occasion of the Kawad Yatra, Lions Club of Baroda Rising Star organized a special Felicitation Ceremony on 18th August 2025 to honor and appreciate the spirit of devotion and service. During the programme, the club felicitated 50 Army soldiers, acknowledging their dedication and service to the nation. Six Lions members contributed 18 Lion Hours of service towards organizing the felicitation ceremony. This activity reflects the club's commitment to honoring those who serve the community and the country.$lcbdesc$
   where club_id = v_club_id
     and title = $lcbdesc$Kawad Yatra$lcbdesc$
     and date = date $lcbdesc$2025-08-18$lcbdesc$
     and coalesce(category,'') = $lcbdesc$other$lcbdesc$
     and replace(description, chr(13) || chr(10), chr(10)) = $lcbdesc$On the auspicious occasion of the Kawad Yatra, the Lions Club of Rising Star proudly organized a special Felicitation Ceremony to honor and appreciate the spirit of devotion and service.

During the program, the club felicitated 50 Army Soldiers, acknow$lcbdesc$;
  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    raise notice 'Skipped (already edited or not found): % / %', $lcbdesc$Kawad Yatra$lcbdesc$, date $lcbdesc$2025-08-18$lcbdesc$;
  end if;

  update public.activities set description = $lcbdesc$Lions Club of Baroda Rising Star organized a compassionate Cloth Distribution activity on 4th July 2025 at Kashiba Children's Hospital, Karelibaug, Vadodara, extending warmth and care to children undergoing treatment. As part of the initiative, 50 children battling cancer were gifted sweaters to help keep them warm during their treatment. Ten Lions members contributed 20 Lion Hours of service towards the distribution, with ₹5,000 raised in support of the initiative. This humanitarian activity reflects the club's commitment to supporting vulnerable children facing serious illness.$lcbdesc$
   where club_id = v_club_id
     and title = $lcbdesc$Cloth Distribution$lcbdesc$
     and date = date $lcbdesc$2025-07-04$lcbdesc$
     and coalesce(category,'') = $lcbdesc$humanitarian$lcbdesc$
     and replace(description, chr(13) || chr(10), chr(10)) = $lcbdesc$The Lions Club organized a compassionate Cloth Distribution Donation Activity at Kashiba Children Hospital, Karelibaug, extending warmth and care to children undergoing treatment.

As part of this initiative, 50 children battling cancer were gifted swea$lcbdesc$;
  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    raise notice 'Skipped (already edited or not found): % / %', $lcbdesc$Cloth Distribution$lcbdesc$, date $lcbdesc$2025-07-04$lcbdesc$;
  end if;

  update public.activities set description = $lcbdesc$Lions Club of Baroda Rising Star organized a Doctors' Day Celebration on 2nd July 2025 at the Indian Medical Association, Vadodara, honoring the invaluable contributions of doctors to society. During the event, more than 20 distinguished doctors were felicitated for their long-standing dedication and remarkable service to the medical profession. Ten Lions members contributed 30 Lion Hours of service towards organizing the celebration. This activity reflects the club's appreciation for the medical community and its role in advancing public health.$lcbdesc$
   where club_id = v_club_id
     and title = $lcbdesc$Doctors day Celebration$lcbdesc$
     and date = date $lcbdesc$2025-07-02$lcbdesc$
     and coalesce(category,'') = $lcbdesc$other$lcbdesc$
     and replace(description, chr(13) || chr(10), chr(10)) = $lcbdesc$The Doctors’ Day Celebration was held at the Indian Medical Association, honoring the invaluable contributions of doctors to society. During the event, more than 20 distinguished doctors were felicitated for their long-standing dedication and remarkable s$lcbdesc$;
  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    raise notice 'Skipped (already edited or not found): % / %', $lcbdesc$Doctors day Celebration$lcbdesc$, date $lcbdesc$2025-07-02$lcbdesc$;
  end if;

  update public.activities set description = $lcbdesc$On the auspicious occasion of Deep Prarambh, marking the beginning of the New Lionistic Year 2025–26, Lions Club of Baroda Rising Star, under Lions Clubs International District 3232 F1, organized a Blood Donation Camp on 1st July 2025 at Bhaily Village, Vadodara. The community-focused initiative encouraged voluntary blood donation to support patients in need. A total of 100 beneficiaries were reached through the camp, with 4 Lions members contributing 8 Lion Hours of service. The activity reflects the club's commitment to marking the new Lionistic year with meaningful community health service.$lcbdesc$
   where club_id = v_club_id
     and title = $lcbdesc$Blood Donation Camp$lcbdesc$
     and date = date $lcbdesc$2025-07-01$lcbdesc$
     and coalesce(category,'') = $lcbdesc$healthcare$lcbdesc$
     and replace(description, chr(13) || chr(10), chr(10)) = $lcbdesc$On the auspicious occasion of Deep Prarambh, marking the beginning of the New Lionistic Year 2025–26, the Lions Clubs International, Dist. 3232 F1 – Vadodara, organized a community-focused service initiative at Bhaily Village, Vadodara (Opp. Sardar Patel$lcbdesc$;
  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    raise notice 'Skipped (already edited or not found): % / %', $lcbdesc$Blood Donation Camp$lcbdesc$, date $lcbdesc$2025-07-01$lcbdesc$;
  end if;

  update public.activities set description = $lcbdesc$Lions Club of Baroda Rising Star participated in the GAT (Global Action Team) Conclave organized by Lions Clubs International District 3232 F1 on 18th August 2025 at Hotel Sunday, Vadodara. The conclave brought together district leadership and Global Action Team coordinators to align on service, membership, and leadership priorities for the district. Ten members of Baroda Rising Star attended the event, contributing 2 Lion Hours towards district-level engagement and coordination.$lcbdesc$
   where club_id = v_club_id
     and title = $lcbdesc$GAT Conclave$lcbdesc$
     and date = date $lcbdesc$2025-08-18$lcbdesc$
     and coalesce(category,'') = $lcbdesc$other$lcbdesc$
     and replace(description, chr(13) || chr(10), chr(10)) = $lcbdesc$GAT Conclave – 18th August

The Lions Clubs International, District 3232 F1, successfully organized the GAT (Global Action Team) Conclave on 18th August at Hotel Sunday.

The event witnessed the gracious presence and active participation of:

Distri$lcbdesc$;
  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    raise notice 'Skipped (already edited or not found): % / %', $lcbdesc$GAT Conclave$lcbdesc$, date $lcbdesc$2025-08-18$lcbdesc$;
  end if;

  update public.activities set description = $lcbdesc$Lions Club of Baroda Rising Star recorded participation in the GET (Global Extension Team) Conclave held on 18th August 2025, part of the district's coordinated Global Action Team programming under Lions Clubs International District 3232 F1. The conclave focused on membership growth, extension strategy, and leadership coordination across the district. A total of 125 beneficiaries were associated with the activity, with 125 Lions members contributing 625 Lion Hours of participation. This reflects the scale of the club's engagement with district-level leadership and extension initiatives.$lcbdesc$
   where club_id = v_club_id
     and title = $lcbdesc$GET CANCLAVE$lcbdesc$
     and date = date $lcbdesc$2025-08-18$lcbdesc$
     and coalesce(category,'') = $lcbdesc$other$lcbdesc$
     and replace(description, chr(13) || chr(10), chr(10)) = $lcbdesc$schooling$lcbdesc$;
  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    raise notice 'Skipped (already edited or not found): % / %', $lcbdesc$GET CANCLAVE$lcbdesc$, date $lcbdesc$2025-08-18$lcbdesc$;
  end if;

  update public.activities set description = $lcbdesc$Lions Club of Baroda Rising Star participated in the First Cabinet Meeting held on Saturday, 23rd August 2025, at Taste of Carnival, Opposite Hotel Hyatt, Nilamber Circle, Gotri, Vadodara. The meeting brought together district cabinet officers for registration, fellowship, and discussion of priorities for the Lionistic year. Two members of Baroda Rising Star attended the meeting, contributing 8 Lion Hours towards district-level coordination and planning.$lcbdesc$
   where club_id = v_club_id
     and title = $lcbdesc$First Cabinet meeting$lcbdesc$
     and date = date $lcbdesc$2025-08-23$lcbdesc$
     and coalesce(category,'') = $lcbdesc$other$lcbdesc$
     and replace(description, chr(13) || chr(10), chr(10)) = $lcbdesc$⸻

First Cabinet Meeting

📅 Date: Saturday, 23rd August 2025
🕕 Time: 6:00 pm to 8:30 pm
📍 Venue: Taste of Carnival, Opp. Hotel Hyatt, Nilamber Circle, Gotri, Vadodara

⸻

Programme Schedule
	•	Registration, Fellowship & Hi-Tea → 5:00 pm to 5$lcbdesc$;
  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    raise notice 'Skipped (already edited or not found): % / %', $lcbdesc$First Cabinet meeting$lcbdesc$, date $lcbdesc$2025-08-23$lcbdesc$;
  end if;

  update public.activities set description = $lcbdesc$Lions Club of Baroda Rising Star successfully conducted a Free Diabetes Checkup Camp on 30th November 2025, offering diabetes screening to promote early detection and healthier living within the community. The camp reached 175 beneficiaries, with 14 Lions members contributing 42 Lion Hours of service. This activity reflects the club's continued focus on diabetes awareness and preventive healthcare in Vadodara.$lcbdesc$
   where club_id = v_club_id
     and title = $lcbdesc$Free diabetes Check up Camp$lcbdesc$
     and date = date $lcbdesc$2025-11-30$lcbdesc$
     and coalesce(category,'') = $lcbdesc$diabetes$lcbdesc$
     and replace(description, chr(13) || chr(10), chr(10)) = $lcbdesc$Fre diabetes camp successfully completed today.$lcbdesc$;
  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    raise notice 'Skipped (already edited or not found): % / %', $lcbdesc$Free diabetes Check up Camp$lcbdesc$, date $lcbdesc$2025-11-30$lcbdesc$;
  end if;

  update public.activities set description = $lcbdesc$Lions Club of Baroda Rising Star successfully organized a Hunger Relief Activity on 4th January 2026, with the objective of serving the needy and spreading compassion within the community. The activity focused on providing food support to underprivileged families in Vadodara. A total of 35 beneficiaries were served, with 7 Lions members contributing 7 Lion Hours of service, and ₹1,000 raised in support of the drive. This activity reflects the club's continued commitment to hunger relief and humanitarian service.$lcbdesc$
   where club_id = v_club_id
     and title = $lcbdesc$FOOD FOR HUNGERS$lcbdesc$
     and date = date $lcbdesc$2026-01-04$lcbdesc$
     and coalesce(category,'') = $lcbdesc$hunger$lcbdesc$
     and replace(description, chr(13) || chr(10), chr(10)) = $lcbdesc$Lions Club of Baroda Rising Star
🌟 Hunger Relief Activity – Activity Report 🌟

The Lions Club of Baroda Rising Star successfully organized and completed a Hunger Relief Activity with the objective of serving the needy and spreading compassion within$lcbdesc$;
  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    raise notice 'Skipped (already edited or not found): % / %', $lcbdesc$FOOD FOR HUNGERS$lcbdesc$, date $lcbdesc$2026-01-04$lcbdesc$;
  end if;

  update public.activities set description = $lcbdesc$As part of Hunger Activity Week, Lions Club of Baroda Rising Star jointly conducted a Food for Hunger Activity with Lions Club of Baroda Trinetri on 9th January 2026, serving the needy in the community. The joint initiative reflects strong collaboration between the two clubs in addressing food insecurity. A total of 30 beneficiaries were served, with 8 Lions members contributing 16 Lion Hours of service. This activity reflects the clubs' shared commitment to hunger relief during the district's coordinated activity week.$lcbdesc$
   where club_id = v_club_id
     and title = $lcbdesc$FOOD FOR HUNGER$lcbdesc$
     and date = date $lcbdesc$2026-01-09$lcbdesc$
     and coalesce(category,'') = $lcbdesc$hunger$lcbdesc$
     and replace(description, chr(13) || chr(10), chr(10)) = $lcbdesc$Hunger Relief Activity Report

As part of Hunger Activity Week, Lions Club of Baroda Rising Star and Lions Club of Baroda Trinetri jointly conducted a Food for Hunger Activity to serve the needy.

Date: 09-01-2026
Time: 12:30 PM onwards
Venue: Old A$lcbdesc$;
  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    raise notice 'Skipped (already edited or not found): % / %', $lcbdesc$FOOD FOR HUNGER$lcbdesc$, date $lcbdesc$2026-01-09$lcbdesc$;
  end if;

  update public.activities set description = $lcbdesc$Lions Club of Baroda Rising Star, jointly with Lions Club of Baroda Trinetri, conducted a Food for Hunger Activity on 10th January 2026 at Geeta Mandir, Pratap Nagar Road, Vadodara. The joint hunger relief initiative served food to those in need within the local community. A total of 500 beneficiaries were reached, with 6 Lions members from Baroda Rising Star contributing 18 Lion Hours of service. This activity reflects the strength of collaborative service between the two clubs in tackling hunger.$lcbdesc$
   where club_id = v_club_id
     and title = $lcbdesc$FOOD FOR HUNGER$lcbdesc$
     and date = date $lcbdesc$2026-01-10$lcbdesc$
     and coalesce(category,'') = $lcbdesc$hunger$lcbdesc$
     and replace(description, chr(13) || chr(10), chr(10)) = $lcbdesc$🌟 Hunger Relief Activity – Today 🌟

🤝 Joint Activity – Food For Hunger
Lions Club of Baroda Rising Star &
Lions Club of Baroda Trinetri

📍 Venue: Geeta Mandir, Pratap Nagar Road
⏰ Time: 12:00 PM to 03:00 PM

👥 Total Lion Members: 6
⏱ Total$lcbdesc$;
  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    raise notice 'Skipped (already edited or not found): % / %', $lcbdesc$FOOD FOR HUNGER$lcbdesc$, date $lcbdesc$2026-01-10$lcbdesc$;
  end if;

  update public.activities set description = $lcbdesc$Lions Club of Baroda Rising Star conducted a TB Kit Distribution on 24th January 2026 at the Manjalpur Urban Health Center, Vadodara, distributing 10 nutrition kits to support tuberculosis patients. The activity was attended by 10 club members, along with the Regional Chairperson, who was present to support the initiative. The activity reached 900 beneficiaries in the surrounding community, with 11 Lions members contributing 20 Lion Hours of service, and ₹5,500 raised in support of the drive. This activity reflects the club's sustained commitment to supporting TB patients across Vadodara.$lcbdesc$
   where club_id = v_club_id
     and title = $lcbdesc$T B KIT DISTRIBUTION$lcbdesc$
     and date = date $lcbdesc$2026-01-24$lcbdesc$
     and coalesce(category,'') = $lcbdesc$healthcare$lcbdesc$
     and replace(description, chr(13) || chr(10), chr(10)) = $lcbdesc$24 JAN 2026 DID T B KIT DISTRIBUTION PLACE OF MANAJALPUR ARABAN CENTER FOR 10 KIT. OUR CLUB MEMBER 10 PEOPLE PRESENTED THERE WITH REGIONAL CHAIR PERSON ALSO AVAILABLE .$lcbdesc$;
  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    raise notice 'Skipped (already edited or not found): % / %', $lcbdesc$T B KIT DISTRIBUTION$lcbdesc$, date $lcbdesc$2026-01-24$lcbdesc$;
  end if;

  update public.activities set description = $lcbdesc$Lions Club of Baroda Rising Star organized a Food for Hunger activity on 2nd March 2026, providing a full lunch to 21 visually impaired women at Siyabaug, near R.V. Desai Road, Vadodara. The initiative focused on extending care and hunger relief to a vulnerable section of the community. Four Lions members contributed 15 Lion Hours of service towards organizing the meal, with ₹5,450 raised in support of the activity. This activity reflects the club's compassionate approach to hunger relief and inclusive community service.$lcbdesc$
   where club_id = v_club_id
     and title = $lcbdesc$FOOD FOR HUNGERS$lcbdesc$
     and date = date $lcbdesc$2026-03-02$lcbdesc$
     and coalesce(category,'') = $lcbdesc$hunger$lcbdesc$
     and replace(description, chr(13) || chr(10), chr(10)) = $lcbdesc$21 blind sister for full lunch organise in siyabug in r v desai road.$lcbdesc$;
  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    raise notice 'Skipped (already edited or not found): % / %', $lcbdesc$FOOD FOR HUNGERS$lcbdesc$, date $lcbdesc$2026-03-02$lcbdesc$;
  end if;

  update public.activities set description = $lcbdesc$Lions Club of Baroda Rising Star conducted a TB Kit Distribution on 22nd March 2026 at the Warasiya Urban Health Center, Vadodara, providing nutrition support kits to tuberculosis patients as part of the club's ongoing health initiatives. The activity reached 20 beneficiaries, with 10 Lions members contributing 5 Lion Hours of service, and ₹11,000 raised in support of the drive. This activity reflects the club's continued commitment to supporting TB patients in their recovery.$lcbdesc$
   where club_id = v_club_id
     and title = $lcbdesc$T B KIT DISTRIBUTION$lcbdesc$
     and date = date $lcbdesc$2026-03-22$lcbdesc$
     and coalesce(category,'') = $lcbdesc$hunger$lcbdesc$
     and replace(description, chr(13) || chr(10), chr(10)) = $lcbdesc$T B kit Distribution at Warasia Health Urban Center.$lcbdesc$;
  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    raise notice 'Skipped (already edited or not found): % / %', $lcbdesc$T B KIT DISTRIBUTION$lcbdesc$, date $lcbdesc$2026-03-22$lcbdesc$;
  end if;

  raise notice 'Activity description enrichment pass complete.';
end $$;
