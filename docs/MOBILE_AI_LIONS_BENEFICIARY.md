# Mobile App · AI Narrative · Lions Adapter · Beneficiary CRM

Four enterprise systems built on top of the reporting engine.

## 1. Mobile App (PWA)

Mobile-first route group at `/m` with a tab-bar navigation shell,
service-worker registration, and stable offline shell caching.

### Routes

| Path                       | Purpose                                                          |
|----------------------------|------------------------------------------------------------------|
| `/m`                       | Home — KPIs, quick actions, recent activities, upcoming events   |
| `/m/activities`            | Activity feed                                                    |
| `/m/activities/[id]`       | Activity detail with photos, GPS, stats                          |
| `/m/activities/new`        | Mobile-optimized activity logger with GPS capture                |
| `/m/checkin`               | QR scanner (BarcodeDetector API) + per-event QR cards            |
| `/m/beneficiaries`         | Beneficiary list (links into desktop profile)                    |
| `/m/beneficiaries/new`     | Add beneficiary (reuses `BeneficiaryForm`)                       |
| `/m/reports`               | Generated reports, one-tap download                              |
| `/m/profile`               | Member profile + sign-out + desktop CRM link                     |

### Key files

```
src/app/m/
├── layout.tsx                 # mobile shell, header, safe-area paddings
├── MobileTabBar.tsx           # bottom tab navigation (5 tabs)
├── MobileServiceWorker.tsx    # registers /sw.js
├── page.tsx                   # home dashboard
├── activities/                # list, detail, new (with GPS)
├── checkin/                   # QR scanner via Web BarcodeDetector
├── beneficiaries/             # list, add
├── reports/                   # list + download
└── profile/                   # account info, logout, CRM portal links
```

### PWA

* `src/app/manifest.ts` — `start_url: '/m'`, four shortcuts (Log activity,
  Check-in, Add beneficiary, Reports), theme color `#0B1F4D`.
* `public/sw.js` — bumped to `lcbrs-pwa-v2`, app shell now includes
  `/m/*` routes for offline navigation.

Installable as a native-feeling app from Chrome/Safari "Add to Home Screen".

## 2. AI Narrative Writer (English + Gujarati)

`src/lib/ai/narrative.ts` adds an OpenAI-backed narrative generator for
reports. Eight tones, three languages.

### Capabilities

* **Languages**: English, Gujarati (ગુજરાતી), bilingual (EN + GU per section)
* **Tones**: `executive`, `board`, `donor`, `press_release`, `social_media`,
  `lions_district`, `volunteer_thanks`, `sponsor_pitch`
* **Outputs**: structured sections (Executive Summary, Flagship Project,
  Service Impact, Outlook) + social caption + executive one-liner
* **Heading translation**: 20-entry EN→GU map (`gujaratiHeading`)

### API

```
POST /api/ai/narrative
{
  "title": "Monthly Report — April 2026",
  "periodLabel": "April 2026",
  "lionsYear": "2025-26",
  "totals": { "activities": 24, "beneficiaries": 3420, "funds": 420000 },
  "highlights": [{ "title": "Eye Camp", "beneficiaries": 820 }],
  "language": "bilingual",
  "tone": "lions_district"
}

GET /api/ai/narrative/translate?text=...   // quick GU translation helper
```

### Wired into reports

The `/api/reports/generate` payload now accepts:

```
{ "aiNarrative": true, "language": "gu", "tone": "donor" }
```

When true, the report's narrative section is replaced with AI-written
prose. The deterministic auto-draft is preserved under "Appendix" so
reviewers can compare.

UI: `/admin/reports/new` shows an "AI Narrative Writer" toggle that
reveals language + tone pickers.

### Graceful degradation

Both APIs return `503 openai_not_configured` when `OPENAI_API_KEY` is
unset; report generation falls back to deterministic narrative so the
pipeline never blocks.

## 3. Lions International Adapter

Built on top of the existing OIDC stack (`src/lib/oidc/*`).

### OIDC SSO

Already supported by the existing pipeline — Lions claims are
auto-mapped to:
* `members.lions_member_id`
* `members.lions_role` (international_admin → guest_viewer)
* `members.district_id` (resolved from `district_code` claim)
* `members.club_id` (from `club_id` claim)

`src/lib/oidc/lions.ts` adds `normalizeLionsProfile()` with a richer
13-entry role map covering both LCI namespace claims
(`lci.role.club_president`) and friendly aliases (`president`).

### REST sync adapter

```
src/lib/oidc/lions.ts
├── isLionsApiConfigured()
├── getLionsApiConfig()
├── normalizeLionsProfile()         // OIDC profile → CRM payload
├── syncLionsDistricts()            // GET /districts or /multiple-districts/.../districts
├── syncLionsClubs(districtCode?)   // GET /districts/<code>/clubs or /clubs
├── syncLionsMembers(clubId?)       // GET /clubs/<id>/members or /members
└── syncLionsAll()                  // run all three in order
```

Returns `LionsSyncReport[]` with `{ fetched, inserted, updated, skipped, errors, durationMs, dryRun }`.

### Env

| Var                                | Required | Purpose                                       |
|------------------------------------|----------|-----------------------------------------------|
| `LIONS_OIDC_ISSUER`                | optional | Existing OIDC issuer                          |
| `LIONS_OIDC_CLIENT_ID/SECRET`      | optional | Existing OIDC client creds                    |
| `LIONS_API_BASE_URL`               | optional | Lions REST API root (e.g. partner gateway)    |
| `LIONS_API_KEY`                    | optional | API key (sent as `X-API-Key`)                 |
| `LIONS_API_ACCESS_TOKEN`           | optional | Bearer token (sent as `Authorization`)        |
| `LIONS_API_DISTRICT_CODE`          | optional | Default district scope                        |
| `LIONS_API_MULTI_DISTRICT_CODE`    | optional | Default multi-district scope                  |

Without `LIONS_API_BASE_URL` the sync helpers run in **dry-run mode** —
they return zeroed counts, so the admin UI is functional in development.

### API + UI

* `GET /api/sync/lions` → adapter status
* `POST /api/sync/lions` body `{ entity: 'all' | 'district' | 'club' | 'member' }`
* `/admin/sync/lions` — status cards, sync runner with per-entity buttons,
  expected REST shapes, and a deep-link from `/admin/sync` landing page.
* `/login` already shows the "Sign in with Lions" button when OIDC is configured.

## 4. Beneficiary CRM

First-class CRM module on top of the `beneficiaries` and
`beneficiary_services` tables shipped in migration 0020.

### Routes

| Path                                 | Purpose                                                         |
|--------------------------------------|-----------------------------------------------------------------|
| `/admin/beneficiaries`               | Searchable list with filters (q, city, gender), demo KPIs       |
| `/admin/beneficiaries/new`           | Create profile                                                  |
| `/admin/beneficiaries/[id]`          | Profile detail: KPIs, service history, log new service, edit    |
| `/m/beneficiaries`                   | Mobile list                                                     |
| `/m/beneficiaries/new`               | Mobile creator (shares the desktop form)                        |

### API

```
GET    /api/beneficiaries?q=&city=&gender=&limit=
POST   /api/beneficiaries
GET    /api/beneficiaries/[id]
PATCH  /api/beneficiaries/[id]
DELETE /api/beneficiaries/[id]            # soft delete (sets deleted_at)
POST   /api/beneficiaries/[id]/services   # log a service event
DELETE /api/beneficiaries/[id]/services?serviceId=
```

### Roll-up automation

When a service is logged, the API recomputes and stores
`total_services_received`, `total_value_received` and `last_service_date`
on the beneficiary row so list views + the beneficiary report stay
accurate without a heavy aggregation query.

### Form fields

| Section       | Fields                                                                |
|---------------|-----------------------------------------------------------------------|
| Identity      | full_name, phone, email, aadhaar_last4                                |
| Demographics  | gender, age, dob, income_category, household_size, family_head        |
| Address       | address, city, state (default Gujarat), pincode, emergency_contact    |
| Notes         | free-text internal notes                                              |
| Service log   | service_type, date, value, follow-up flag + date, description          |

### Reporting integration

The Beneficiary report (built earlier) already pulls from these tables
— so any beneficiaries you add and services you log immediately power
the next report run.
