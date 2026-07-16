# Bulk activity upload — Lions Club of Baroda Rising Star

This bundles the **54 reported service activities** exported from the Lions
International portal (*Service Activities Information*, generated 2026‑07‑16)
so they can be loaded into the app in bulk, all linked to the
**Lions Club of Baroda Rising Star** club.

## What's included

| File | Purpose |
| --- | --- |
| `docs/baroda-rising-star-activities.csv` | Ready-to-import CSV for the in-app bulk uploader. |
| `supabase/migrations/0061_seed_baroda_rising_star_activities.sql` | Idempotent seed migration that inserts the same 54 activities directly, linked to the club. |

## Column mapping (portal export → `public.activities`)

| Portal column | App column |
| --- | --- |
| Title | `title` |
| Description | `description` |
| Cause / Project Type | `category` (mapped to app service categories) |
| People Served | `beneficiaries` |
| Total Volunteers | `lion_members_count` |
| Total Volunteer Hours | `service_hours` |
| Total Funds Raised | `amount_raised` |
| End Date | `date` |

Categories are mapped to the app's service categories:
`hunger`, `diabetes`, `environment`, `youth`, `childhood_cancer`,
`healthcare`, `humanitarian`, `other`.

## Totals (54 activities)

- Beneficiaries: **11,647**
- Volunteer hours: **3,581**
- Funds raised: **₹95,650**

## How to upload

### Option A — In-app bulk uploader (recommended)

1. Sign in as an admin and go to **Admin → Sync**.
2. Choose entity **activities** and upload `baroda-rising-star-activities.csv`.
3. The importer is idempotent on `(title, date)`, so re-running is safe —
   existing rows (e.g. the already-present *TB Kit Distribution*, 26 Dec 2024)
   are updated in place rather than duplicated.

> The CSV leaves `club_id` blank. To attach every row to the club during
> import, fill the `club_id` column with the Baroda Rising Star club's UUID
> first, or use Option B which resolves the club by name automatically.

### Option B — Seed migration

Apply `supabase/migrations/0061_seed_baroda_rising_star_activities.sql` with
your normal migration flow. It:

- resolves the **Lions Club of Baroda Rising Star** `club_id` by name
  (and bootstraps the club if the database is empty),
- inserts all 54 activities linked to that club, and
- is idempotent on `(club_id, title, date, category)` so re-running never
  creates duplicates.
