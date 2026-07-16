-- =====================================================================
-- 0061_seed_baroda_rising_star_activities.sql
-- Lions Club of Baroda Rising Star — bulk import of reported
-- Service Activities exported from the Lions International portal
-- ("Service Activities Information", generated 2026-07-16).
--
-- Source: 54 reported service activities, all sponsored by
--         "Lions Club of Baroda Rising Star" (Sponsor Account
--         Id 001Ns00000SUwo1IAD, District 3232 F1).
--
-- Column mapping (portal export -> public.activities):
--   Title                 -> title
--   Description           -> description
--   Cause / Project Type  -> category   (mapped to app service categories)
--   People Served         -> beneficiaries
--   Total Volunteers      -> lion_members_count
--   Total Volunteer Hours -> service_hours
--   Total Funds Raised    -> amount_raised
--   End Date              -> date
--
-- Idempotent: keyed on (club_id, title, date, category). Re-running the
-- migration will not create duplicate rows. Every row is linked to the
-- Baroda Rising Star club (club_id resolved by name below).
-- =====================================================================

do $$
declare
  v_club_id uuid;
begin
  select id into v_club_id from public.clubs
   where name = 'Lions Club of Baroda Rising Star' limit 1;

  -- Bootstrap the club if it does not exist yet (fresh database).
  if v_club_id is null then
    insert into public.clubs (name, district, city, state, country)
    values ('Lions Club of Baroda Rising Star', '3232 F1', 'Vadodara', 'Gujarat', 'India')
    returning id into v_club_id;
  end if;

  insert into public.activities
    (club_id, title, description, category, beneficiaries,
     lion_members_count, service_hours, amount_raised, date, reported_to_district)
  select v_club_id, v.title, v.description, v.category, v.beneficiaries,
         v.lion_members_count, v.service_hours, v.amount_raised, v.date, true
  from (values
    ('TB Kit Distribution', 'Lions Club of Baroda Raising Star, sponsored by Lions Club of Baroda Vishwamitri! Supporting 10 TB patients through the adoption program and distributing nutrition kits at VMC Warsiya UHC is a commendable effort.

The Distribution started in presence of', 'healthcare', 620, 16, 32.0, 0, date '2024-12-26'),
    ('Installation Ceremony', '**Report on the Installation Ceremony of Lions Club of Baroda Rising Star**  

The *Lions Club of Baroda Rising Star* proudly held its **New Club Installation Ceremony** at *Krishna Garden Restaurant, Party Lawns & Banquet Hall, Neelkamal Farm, Vasna-Bh', 'other', 100, 45, 270.0, 0, date '2024-12-11'),
    ('FOOD FOR HUNGER', 'The Lions Club of Baroda Rising Star successfully organized a Food for Hunger initiative on 14th January 2025 at Goverdhan Nathji Haveli, Karelibaug, where 350 beneficiaries were served wholesome meals. This initiative was a testament to the club’s ongoin', 'hunger', 350, 28, 224.0, 2000.0, date '2025-01-14'),
    ('MEGA MEDICAL CAMP', 'The Lions Club Baroda Rising Star successfully organized a Mega Medical Camp on 19th January 2025 at Vadil Vihar Vatika, Opp. Buddhdev Colony, Karelibaug. The camp offered Diabetes screening, Eye check-ups, Blood donation, Homeopathy consultation, and Blo', 'diabetes', 200, 38, 190.0, 0, date '2025-01-19'),
    ('Board & General Board Meeting', 'Lions Club of Baroda Rising Star 2nd General Board Meeting Date: 29th January 2025 Venue: Deepak Mistry''s Residence, 82, Kalakunj Society-1, Next to Avakar Hall, Water Tank Road, Karelibaug, Vadodara-390018
Attendance:
Total Members Present: 15
Total M', 'other', 30, 30, 150.0, 0, date '2025-01-29'),
    ('Board Meeting', 'Lions Club of Baroda Rising Start of the 1st Board MeetingDate: 30th December 2025Time: 7:00 PM – 10:00 PMVenue: [Meeting Venue]

Attendees:

Lion Hiren Rathod (Club President)

Lion Deepak Mistry (Club Secretary)

Lion Tarun Bhatt (Club Treasurer', 'other', 0, 11, 33.0, 0, date '2024-12-31'),
    ('Sweater Distribution to School Children', '**Sweater Distribution**

**Event Details:**  
- **Date:** 28th January 2025  
- **Venue:** Government School, Nani Umarvan, Halol, Panch Mahals, Gujarat  
- **PIN Code:** 389360 (INDIA)  

**Attendees:**  
- **Lion Members:**  
  1) ZC Lion Chir', 'humanitarian', 250, 7, 28.0, 0, date '2025-01-28'),
    ('TB Kit Distribution', 'Lions Club of Baroda Rising Star successfully organized a Tuberculosis (TB) Nutrition Kit Distribution Drive on 31st January 2025 at Kishanwadi Urban Center. A total of 15 nutrition kits were distributed to support TB patients in their recovery. The event', 'healthcare', 900, 16, 32.0, 0, date '2025-01-31'),
    ('TB Kit Distribution', 'Today we distribute 10 Nutrition kit to the TB Patient in presence of lionHarsad shah, President
Hiren ratod,lion deepak mistr, tarun bhatt. Falguni bhatt,Vaishali mistry, Tejal rathod,and other 2 non lion members.', 'hunger', 600, 8, 16.0, 5500.0, date '2025-02-08'),
    ('MEGA DIABITES CHAKEUP CAMP', 'we conduced the activity Diabetes  checkup camp on Dt: 9/2/2005. Sunday  total 20 participate Member Lion and Non lion members,  Hiren Rathod, Deepak mistry, Tarun Bhatt, Lata shah, Vaishali Mistry, Tejal Rathod, Falguni Bhatt, ZC Chirayu Gandhi , Paresh', 'diabetes', 108, 19, 95.0, 3700.0, date '2025-02-09'),
    ('Free Diabetes checkup camp', 'We have conducted Free Diabetes check up camp at 5 Different Shrinathji Haveli Temples in vadodara. 1)  karelibaug2) Alkapuri 3) Gotri Nadalaya 4) Manjalpur, 5) Waghodia, participate lion DG Manoj Parmar Inaugurated International Lion Service Week, Free d', 'diabetes', 887, 39, 234.0, 0.0, date '2025-02-16'),
    ('Food and Education Game Distribution', 'We conducted Food and Education Game  distributed , at the Asha Deep ADMS Centre , Vadodara, Gujarat , India. 
we served  Food and  Education Games, Total  Beneficiary 190, and participate Lion members and Non Lion Members,
Total 19. Lion Hiren Rathod,', 'hunger', 190, 19, 38.0, 0, date '2025-02-18'),
    ('TB NUTRITION KIT DISTRIBUTION', 'District Service Week , We Conducted a TB Nutrition Kit at sawad   Urban Health Centre Harni Road Vadodara, Gujarat, INDIA. Participate Lion Members and Non -Lion Members,
Ln Hiren Rathod, Ln Deepak Mistry, Ln Lata Shah, Ln Paresh Shah, Ln Falguni Bhatt,', 'hunger', 1200, 12, 24.0, 0.0, date '2025-02-20'),
    ('Drawing Competition and Education Game Distribution', 'We conducted Drawing Competition and Educational Game Distribution at Rameshwar Primary School, Taluka Halol, Dist; Panchamhal. Gujarat, India. Total Beneficiary 954.Paricipet Lion Members and Non lion Members,ZC Chirayu Gandhi Hiern Rathod, Deepak Mistry', 'youth', 954, 29, 116.0, 0.0, date '2025-02-21'),
    ('Tree Plantation, Environment Program', 'We Conducted Tree Plantation, Environment Program, at Ful pari School,  and Rameshwar School, at Halol Taluka, Dist; Panchamhal . 100       tree Plantation . Participate Lion Members and Non Lion Members , Hiren Rathod, Deepak Mistry, Lata shah, Paresh Sh', 'environment', 600, 20, 116.0, 0, date '2025-02-21'),
    ('Free Diabetes checkup camp', 'We conducted Diabetes cheek up camp at SUKH DHAM HAWALI WAGHODIYA ROAD, GUJARAT, INDIA, Total beneficiary  151. and Total Hours Spent 84 Hours. Lion and Non Lion Members , Hiren Rathod, Deepak Mistry, Vaishali Mistry, Tarun Bhatt, Falguni bhatt, Joseph, M', 'diabetes', 151, 14, 84.0, 0, date '2025-02-22'),
    ('GB-4', 'We merged in samarpan  Regional conference GB-4 At NAKSHATRA PARTY PLOT Nr. GADA CERVICAL, HARNI ROAD,VADODARA.. total 16 members of baroda rising star merged and attended the GB-4.', 'other', 0, 16, 96.0, 0, date '2025-02-25'),
    ('TB Kit Distribution', 'TB Kit Distribution', 'hunger', 1800, 10, 20.0, 0, date '2025-03-24'),
    ('FOOD FOR HUNGER', 'The Lions Club carried out a noble Food for Hunger initiative at 12-Kirtikunj Society, near Buddhadev Char Rasta, Karelibaug, with the aim of serving the underprivileged and spreading compassion.

Key Highlights:

Fund Donated: ₹10,000

Total Member', 'hunger', 600, 10, 10.0, 10000.0, date '2025-07-07'),
    ('Region -5 Samrprpan Region Confrance.', 'Region -5 Samrpan Conference .Place, Nakshtra party plot, Near Gasda Cricle,Harni Vadodra', 'other', 0, 16, 80.0, 0, date '2025-02-25'),
    ('DISTRICT SERVICE WEEK CELEBRATION 2024/2025', 'GRAND VALEDICTORY FUNCTION AND AWARD DISTRIBUTION CEREMONEY OF DISTRICT CELEBRATION2024/25 & TEACHER FELICITATIION.', 'other', 0, 3, 9.0, 0.0, date '2025-02-23'),
    ('Food and Education Game Distribution', 'FOOD FOR HUNGER ACTIVITY FOR TWO NEDED FAMILY GROSERY KIT', 'hunger', 5, 6, 6.0, 5000.0, date '2025-04-30'),
    ('TB NUTRITION KIT DISTRIBUTION', 'TB NUTRITION KIT DISTRIBUTION AT WARASIYA URBEN HELTH CNTRE VADODARA.', 'hunger', 15, 23, 30.0, 23000.0, date '2025-06-24'),
    ('THE RANKAR DISTRICT CONFERENCE', 'THE RANKAR DISTRICT CONFERANCE , THE HHONORABLE ROLE OF DISTRICT GOVERNOR PREPARING TO LEAD THIS ESTEEMED ORGANIZATION', 'other', 0, 2, 16.0, 0.0, date '2025-04-06'),
    ('FOOD FOR HUNGER', 'FOOD FOR HUNGER NEEDED PEOPLE GROSERY KIT DISTRIBUTION', 'hunger', 5, 8, 8.0, 5000.0, date '2025-04-08'),
    ('BM-5& GB-5', 'BM-5& GB-5. 12- KIRTI KUNJ SOCIETY, KARELIBAUG VADODARA.', 'other', 0, 20, 80.0, 0, date '2025-04-23'),
    ('BM-6 & GB-6', 'BM-5 & GB-6 AT LION KAMLESH PUTAMBAKER HOME,', 'other', 0, 13, 39.0, 0, date '2025-05-25'),
    ('DISTRICT SCHOOLING MEETING FOR PST & VP-1', 'SCHOOLING MEETING FOR PST & VP-1, AT GRAND MARQUIS SURAY PALACE, SAYJIGUNJ, VADODARA.', 'other', 0, 5, 30.0, 0, date '2025-05-25'),
    ('YOGA DAY CELEBRATION', null, 'youth', 10, 10, 20.0, 0, date '2025-06-21'),
    ('yoga day yoga program', 'YOGA DAY , WOMENS YOGA PROGRAM AT LION MINESHA BEN PATEL PWNT HOUSE , AMA SAVALI ROAD, VAMALI, VADODARA.', 'youth', 7, 7, 7.0, 0, date '2025-06-21'),
    ('PRELIMINARY CABINET MEETING', 'PRELIMINARY CABINET MEETING AT REVA GRAND BANQUET AND GARDEN SAVASI VADODARA.', 'other', 2, 2, 12.0, 0, date '2025-06-22'),
    ('Zone social at Vakal seva kandra sayjigunj', 'ZC ZONE SOCIAL AT VAKAL SEVA KENDRA SAYJIGUNJ VADODARA.LIONS CLUB OF BARODA RISING STAR MEMBERS ATTN ENDING ZONE SOCIAL', 'other', 0, 20, 80.0, 0, date '2024-11-23'),
    ('ZC/RC AND DG VISIT IN LIONS CLUB OF BARODA RISING STAR', 'ZC/RC AND DG VISIT IN LIONS CLUB OF BARODA RISING STAR .with Dinner At Vrajdham Mandir Rd Manjalpur, Vadodara, Gujarat 390011', 'other', 0, 45, 225.0, 13500.0, date '2025-06-26'),
    ('WALKETHLON', 'The Lions Club of Rising Star actively participated in the Walkethlon organized at Bahilal Amin Hospital. A total of 11 Lions members attended the event, joining hands to spread awareness against cancer and to encourage healthy living practices within the', 'youth', 6, 6, 30.0, 0, date '2025-07-01'),
    ('BLOOD DONATION CAMP', '25 LIONS & NON LIONS MEMBERS ARE PRESENT IN BLOOD DONATION CAMP. 25 UNIT COLLECT IN CAMP.

.', 'childhood_cancer', 25, 15, 75.0, 0, date '2025-07-04'),
    ('YOGA DAY CELEBRATION', null, 'other', 10, 10, 20.0, 0, date '2025-06-21'),
    ('MEGA INSTALLATION', 'The Mega Club Installation Ceremony was successfully conducted on 5th July 2025 at Hotel Mar Curry, located in the Sayajigunj area of Vadodara.', 'other', 12, 12, 48.0, 0, date '2025-07-05'),
    ('NAND MAHOTSAV', 'LORD KRISHNA BIRTHDAY CELEBRATION COMBIND IN 20 CLUB MEMBERS.ALL PEOPLE ENJOY THE GARBA & BHAJAN SANDHYA.', 'other', 0, 7, 28.0, 0, date '2025-08-17'),
    ('REGION STAFF MEETING REGION -6', 'BARODA RISING STAR ATTEND 1st Region Staff Meeting. Total 14 Member of club attend the meeting. RC Ln Nitin Shah and Himanshu Parmar guide all members.', 'other', 0, 14, 48.0, 0, date '2025-08-20'),
    ('1st Zone Advisory Meeting', 'ZC Ln Jitendra Soni ORGANIsed 1st Zone Advisory Meeting at Vakal Seva Kendra. Baroda Rising star 14 Members are present.', 'other', 0, 14, 48.0, 0, date '2025-08-20'),
    ('Kawad Yatra', 'On the auspicious occasion of the Kawad Yatra, the Lions Club of Rising Star proudly organized a special Felicitation Ceremony to honor and appreciate the spirit of devotion and service.

During the program, the club felicitated 50 Army Soldiers, acknow', 'other', 50, 6, 18.0, 0, date '2025-08-18'),
    ('Cloth Distribution', 'The Lions Club organized a compassionate Cloth Distribution Donation Activity at Kashiba Children Hospital, Karelibaug, extending warmth and care to children undergoing treatment.

As part of this initiative, 50 children battling cancer were gifted swea', 'humanitarian', 50, 10, 20.0, 5000.0, date '2025-07-04'),
    ('Doctors day Celebration', 'The Doctors’ Day Celebration was held at the Indian Medical Association, honoring the invaluable contributions of doctors to society. During the event, more than 20 distinguished doctors were felicitated for their long-standing dedication and remarkable s', 'other', 20, 10, 30.0, 0, date '2025-07-02'),
    ('Blood Donation Camp', 'On the auspicious occasion of Deep Prarambh, marking the beginning of the New Lionistic Year 2025–26, the Lions Clubs International, Dist. 3232 F1 – Vadodara, organized a community-focused service initiative at Bhaily Village, Vadodara (Opp. Sardar Patel', 'healthcare', 100, 4, 8.0, 0, date '2025-07-01'),
    ('GAT Conclave', 'GAT Conclave – 18th August

The Lions Clubs International, District 3232 F1, successfully organized the GAT (Global Action Team) Conclave on 18th August at Hotel Sunday.

The event witnessed the gracious presence and active participation of:

Distri', 'other', 0, 10, 2.0, 0, date '2025-08-18'),
    ('GET CANCLAVE', 'schooling', 'other', 125, 125, 625.0, 0, date '2025-08-18'),
    ('First Cabinet meeting', '⸻

First Cabinet Meeting

📅 Date: Saturday, 23rd August 2025
🕕 Time: 6:00 pm to 8:30 pm
📍 Venue: Taste of Carnival, Opp. Hotel Hyatt, Nilamber Circle, Gotri, Vadodara

⸻

Programme Schedule
	•	Registration, Fellowship & Hi-Tea → 5:00 pm to 5', 'other', 0, 2, 8.0, 0, date '2025-08-23'),
    ('Free diabetes Check up Camp', 'Fre diabetes camp successfully completed today.', 'diabetes', 175, 14, 42.0, 0, date '2025-11-30'),
    ('FOOD FOR HUNGERS', 'Lions Club of Baroda Rising Star
🌟 Hunger Relief Activity – Activity Report 🌟

The Lions Club of Baroda Rising Star successfully organized and completed a Hunger Relief Activity with the objective of serving the needy and spreading compassion within', 'hunger', 35, 7, 7.0, 1000.0, date '2026-01-04'),
    ('FOOD FOR HUNGER', 'Hunger Relief Activity Report

As part of Hunger Activity Week, Lions Club of Baroda Rising Star and Lions Club of Baroda Trinetri jointly conducted a Food for Hunger Activity to serve the needy.

Date: 09-01-2026
Time: 12:30 PM onwards
Venue: Old A', 'hunger', 30, 8, 16.0, 0, date '2026-01-09'),
    ('FOOD FOR HUNGER', '🌟 Hunger Relief Activity – Today 🌟

🤝 Joint Activity – Food For Hunger
Lions Club of Baroda Rising Star &
Lions Club of Baroda Trinetri

📍 Venue: Geeta Mandir, Pratap Nagar Road
⏰ Time: 12:00 PM to 03:00 PM

👥 Total Lion Members: 6
⏱ Total', 'hunger', 500, 6, 18.0, 0, date '2026-01-10'),
    ('T B KIT DISTRIBUTION', '24 JAN 2026 DID T B KIT DISTRIBUTION PLACE OF MANAJALPUR ARABAN CENTER FOR 10 KIT. OUR CLUB MEMBER 10 PEOPLE PRESENTED THERE WITH REGIONAL CHAIR PERSON ALSO AVAILABLE .', 'healthcare', 900, 11, 20.0, 5500.0, date '2026-01-24'),
    ('FOOD FOR HUNGERS', '21 blind sister for full lunch organise in siyabug in r v desai road.', 'hunger', 5, 4, 15.0, 5450.0, date '2026-03-02'),
    ('T B KIT DISTRIBUTION', 'T B kit Distribution at Warasia Health Urban Center.', 'hunger', 20, 10, 5.0, 11000.0, date '2026-03-22')
  ) as v(title, description, category, beneficiaries,
         lion_members_count, service_hours, amount_raised, date)
  where not exists (
    select 1 from public.activities a
     where a.club_id = v_club_id
       and a.title   = v.title
       and a.date    = v.date
       and coalesce(a.category,'') = v.category
  );

  raise notice 'Baroda Rising Star activities seeded (club_id=%).', v_club_id;
end $$;
