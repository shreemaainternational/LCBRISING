# Reports & Analytics Engine

Enterprise report-generation pipeline for Lions Club of Baroda Rising Star.
Produces branded **PDF** and **PPTX** artifacts with colorful native charts on
demand or on a schedule.

## Report Catalog (20 types)

| Group    | Type                    | What it covers |
|----------|-------------------------|----------------|
| Period   | `monthly`               | Calendar-month rollup with month-on-month deltas |
| Period   | `quarterly`             | 3-month rollup, comparative growth |
| Period   | `half_yearly`           | 6-month dashboard vs goals |
| Period   | `yearly`                | Lions-year annual report |
| Activity | `activity`              | Per-project performance, top projects |
| Activity | `event_performance`     | RSVPs / confirmations per event |
| Activity | `service_category`      | Lions service framework breakdown |
| Activity | `medical_camp`          | Screenings, surgeries, blood units |
| People   | `beneficiary`           | Demographics, geography, repeat reach |
| People   | `volunteer`             | Lion-hours leaderboard |
| People   | `membership`            | Status & tenure |
| People   | `award_qualification`   | MJF / PMJF / Club Excellence |
| People   | `club_growth`           | Net joins, role mix |
| Finance  | `financial`             | Inflows, expenses, monthly cash flow |
| Finance  | `donor`                 | Top donors, retention, campaigns |
| Finance  | `csr`                   | CSR partner ledger |
| Org      | `district`              | Club-by-club matrix in the district |
| Org      | `multi_district`        | Federation roll-up |
| Org      | `lions_international`   | MyLCI-compatible Global Causes |
| Impact   | `sdg_impact`            | UN SDG alignment |

## Architecture

```
src/lib/reports/
├── types.ts           # ReportDoc, KPI, ChartSpec, TableSpec
├── period.ts          # monthly/quarterly/half/yearly period math (Lions fiscal year)
├── brand.ts           # Lions navy + gold palette, 12-colour chart palette, SDG colors
├── aggregations.ts    # Supabase queries shared by all builders
├── chart-pdf.ts       # pdfkit chart primitives (bar/donut/pie/line/area/h-bar/stacked)
├── render-pdf.ts      # PDF document renderer (cover, KPI grid, charts, tables, narrative)
├── render-pptx.ts     # PPTX renderer using native Office charts
├── index.ts           # Catalog + dispatcher
└── builders/
    ├── common.ts
    ├── period-reports.ts
    ├── activity-reports.ts
    ├── finance-reports.ts
    ├── people-reports.ts
    └── org-reports.ts
```

## API

### `POST /api/reports/generate`

```json
{
  "type": "monthly",
  "formats": ["pdf", "pptx"],
  "scope": "month",
  "year": 2026,
  "index": 3,
  "filters": { "clubId": "..." }
}
```

Builds the report doc from live data, renders requested formats, uploads to
the `reports` Supabase Storage bucket (if available) and persists metadata in
`public.reports`. Returns the new `reports.id` values.

`scope` may be `month` | `quarter` | `half` | `year` | `custom`.
`index` semantics: month=0..11, quarter=1..4, half=1|2; ignored for year.

### `GET /api/reports`

List recent reports + the catalog. Optional `?type=` filter.

### `GET /api/reports/[id]`

Single report metadata.

### `GET /api/reports/[id]/download`

Streams the artifact. If the artifact was uploaded to Storage it returns a 302
to the public URL; otherwise the engine **regenerates on-the-fly** from
persisted period + filters and streams the buffer back.

### `DELETE /api/reports/[id]`

Removes the row (and tries to remove the storage object).

### `GET /api/cron/reports?type=<type>`

Scheduled generator. Authenticated by `CRON_SECRET` (query or
`x-cron-secret` header). Vercel cron is configured to call this for:

| Type          | Cron (UTC)      |
|---------------|-----------------|
| `monthly`     | `0 4 1 * *`     |
| `quarterly`   | `0 5 1 1,4,7,10 *` |
| `half_yearly` | `0 6 1 1,7 *`   |
| `yearly`      | `0 7 1 7 *`     |

## Admin UI

* `/admin/reports` — catalog browser + recent generations list
* `/admin/reports/new` — generator form (type, scope, year/period, formats)
* `/admin/reports/[id]` — metadata view + KPI summary + download button

## Storage

The engine uploads artifacts to the `reports` Supabase Storage bucket if it
exists. Provision the bucket once:

```sql
insert into storage.buckets (id, name, public) values ('reports', 'reports', true)
on conflict (id) do nothing;
```

Without the bucket the engine falls back to on-the-fly regeneration — the
download endpoint will still work, it just won't be cached as a static asset.

## Migration

`supabase/migrations/0020_reporting_engine.sql` adds:

* `reports`, `report_schedules`
* `beneficiaries`, `beneficiary_services`
* `csr_partners`
* `service_categories` (seeded with Lions framework)
* `sdg_goals` (seeded with all 17 UN SDGs)
* `volunteer_logs`
* `award_qualifications`
* `medical_camp_records`
* Activity columns: `service_category_id`, `csr_partner_id`, `event_id`,
  `lion_members_count`, `leo_members_count`, `volunteer_hours_total`, `budget`,
  `expenses`, `sponsorship_amount`, `sdg_codes`, GPS, before/after photos,
  doctor details, medical-camp flags, impact_score.
* RLS policies scoped to club admins/officers.

## Charts

Every report ships with colorful native charts. PDF charts are drawn with
pdfkit primitives using a 12-color palette; PPTX charts use the native Office
chart engine (fully editable in PowerPoint / Keynote). Supported kinds:

* `bar` (grouped)
* `stacked_bar`
* `horizontal_bar`
* `pie`
* `donut`
* `line`
* `area`

## Local smoke test

```
npx tsx scripts/smoke-reports.ts
```

Renders `/tmp/smoke-report.pdf` and `/tmp/smoke-report.pptx` against
hard-coded sample data so the renderers can be checked without a database.
