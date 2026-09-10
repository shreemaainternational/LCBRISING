-- =====================================================================
-- Seed: sample cause-wise service activities (with photos)
-- ---------------------------------------------------------------------
-- Populates public.activities with one approved, photo-rich sample
-- activity per Lions global cause so the public cause pages
-- (/activities/<cause>) render real content immediately.
--
-- SAFE TO RE-RUN: fixed UUIDs + ON CONFLICT DO NOTHING make this
-- idempotent. Every row is clearly marked "Sample activity" in its
-- description and uses the recognisable id prefix 5eed0000-... so it
-- can be found and removed at any time.
--
-- ROLLBACK (remove all sample rows):
--   delete from public.activities
--   where id::text like '5eed0000-%';
-- =====================================================================

insert into public.activities
  (id, title, description, category, beneficiaries, service_hours,
   amount_raised, date, location, photos, photo_captions, approval_status)
values
  (
    '5eed0000-0000-4000-a000-000000000001',
    'Tree Plantation Drive at Sayaji Baug',
    'Sample activity. Volunteers planted 500 native saplings to expand the green cover along the riverfront and educate visitors on urban reforestation.',
    'environment', 500, 120, 0,
    date '2026-06-05', 'Sayaji Baug, Vadodara',
    array[
      'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1200&q=80&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1466692476868-aef1dfb1e735?w=1200&q=80&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1502082553048-f009c37129b9?w=1200&q=80&auto=format&fit=crop'
    ],
    '{"https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1200&q=80&auto=format&fit=crop":"Volunteers planting saplings","https://images.unsplash.com/photo-1466692476868-aef1dfb1e735?w=1200&q=80&auto=format&fit=crop":"Fresh green cover along the riverfront"}'::jsonb,
    'approved'
  ),
  (
    '5eed0000-0000-4000-a000-000000000002',
    'Free Eye Screening & Spectacle Camp',
    'Sample activity. A day-long vision camp screened community members and distributed free spectacles, with cataract cases referred for surgery.',
    'vision', 320, 80, 0,
    date '2026-05-18', 'SSG Hospital, Vadodara',
    array[
      'https://images.unsplash.com/photo-1512069772995-ec65ed45afd6?w=1200&q=80&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1583912267550-d6c2ac3196c0?w=1200&q=80&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=1200&q=80&auto=format&fit=crop'
    ],
    '{"https://images.unsplash.com/photo-1512069772995-ec65ed45afd6?w=1200&q=80&auto=format&fit=crop":"Vision screening in progress"}'::jsonb,
    'approved'
  ),
  (
    '5eed0000-0000-4000-a000-000000000003',
    'Community Kitchen Meal Distribution',
    'Sample activity. Hot, nutritious meals were served through the community kitchen to families facing food insecurity across three neighbourhoods.',
    'hunger', 800, 60, 0,
    date '2026-06-20', 'Fatehgunj, Vadodara',
    array[
      'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=1200&q=80&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1509099836639-18ba1795216d?w=1200&q=80&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1593113630400-ea4288922497?w=1200&q=80&auto=format&fit=crop'
    ],
    '{}'::jsonb,
    'approved'
  ),
  (
    '5eed0000-0000-4000-a000-000000000004',
    'Monsoon Flood Relief Material Distribution',
    'Sample activity. Emergency kits with food, clean water, and essentials were distributed to families displaced by seasonal flooding.',
    'relief', 240, 96, 0,
    date '2026-07-02', 'Vishwamitri low-lying areas, Vadodara',
    array[
      'https://images.unsplash.com/photo-1547683905-f686c993aae5?w=1200&q=80&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?w=1200&q=80&auto=format&fit=crop'
    ],
    '{}'::jsonb,
    'approved'
  ),
  (
    '5eed0000-0000-4000-a000-000000000005',
    'Childhood Cancer Awareness & Support Camp',
    'Sample activity. An awareness and early-detection camp supported affected families with counselling and guidance on treatment assistance.',
    'childhood_cancer', 150, 72, 0,
    date '2026-04-28', 'Vadodara',
    array[
      'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=1200&q=80&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1579154204601-01588f351e67?w=1200&q=80&auto=format&fit=crop'
    ],
    '{}'::jsonb,
    'approved'
  ),
  (
    '5eed0000-0000-4000-a000-000000000006',
    'Free Diabetes Screening Camp',
    'Sample activity. Free blood-sugar screening, diet counselling, and lifestyle guidance were provided to help the community prevent and manage diabetes.',
    'diabetes', 410, 64, 0,
    date '2026-05-30', 'Alkapuri, Vadodara',
    array[
      'https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=1200&q=80&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=1200&q=80&auto=format&fit=crop'
    ],
    '{}'::jsonb,
    'approved'
  ),
  (
    '5eed0000-0000-4000-a000-000000000007',
    'Youth Leadership & Skills Workshop',
    'Sample activity. A leadership and career-guidance workshop mentored young participants through the Leo Club development program.',
    'youth', 180, 48, 0,
    date '2026-06-12', 'Vadodara',
    array[
      'https://images.unsplash.com/photo-1515168833906-d2a3b82b302a?w=1200&q=80&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1544027993-37dbfe43562a?w=1200&q=80&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=1200&q=80&auto=format&fit=crop'
    ],
    '{}'::jsonb,
    'approved'
  ),
  (
    '5eed0000-0000-4000-a000-000000000008',
    'Community Blood Donation Camp',
    'Sample activity. A voluntary blood donation drive collected units for local hospitals and raised awareness about regular donation.',
    'humanitarian', 260, 88, 0,
    date '2026-07-08', 'Vadodara',
    array[
      'https://images.unsplash.com/photo-1615461066841-6116e61058f4?w=1200&q=80&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1579154204601-01588f351e67?w=1200&q=80&auto=format&fit=crop'
    ],
    '{}'::jsonb,
    'approved'
  )
on conflict (id) do nothing;
