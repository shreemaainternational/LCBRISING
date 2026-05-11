# Enterprise CRM Integration Platform — Architecture

> Lions Club of Baroda Rising Star · **District 3232-F1** · Vadodara, India
>
> Federation-scale Lions International CRM, built on top of the existing
> single-club platform.

## High-level flow

```
                     ┌────────────────────────────┐
   ┌─Lions Member────►   Lions IdP (OIDC/OAuth)   │
   │  (browser)      └──────────────┬─────────────┘
   │                                │ authorization code (PKCE)
   ▼                                ▼
┌──────────────┐    code + state    ┌──────────────────────────────┐
│ /api/auth/   │ ◄──────────────────┤ /api/auth/oidc/callback       │
│  oidc/login  │                    │  → token exchange             │
└──────┬───────┘                    │  → userinfo                   │
       │ 302                         │  → upsert oauth_accounts      │
       ▼                             │  → audit_logs                 │
   Lions login                       └───────────────┬──────────────┘
                                                     │
                                                     ▼
                                      ┌─────────────────────────────┐
                                      │       CRM (Supabase)        │
                                      │  members · clubs · districts│
                                      │  officers · attendance ·    │
                                      │  awards · trainings ·       │
                                      │  sync_logs · audit_logs     │
                                      └─────────────┬───────────────┘
                                                    │
                       ┌────────────────────────────┼────────────────────────────┐
                       ▼                            ▼                            ▼
              Sync engine (CSV /            Automation engine            Analytics & Reports
               REST / webhook)            (WhatsApp · email · SMS)       (dashboards · exports)
```

## Phased delivery plan

| # | Phase                                | Status |
|---|--------------------------------------|--------|
| 1 | SSO / OIDC authentication            | ✅ (this commit) |
| 2 | RBAC & authorization                 | next   |
| 3 | Sync engine (REST + CSV + Excel)     | next   |
| 4 | Database schema (federation tables)  | ✅ (migration 0003) |
| 5 | OAuth token flow                     | ✅ (this commit) |
| 6 | Member management CRM                | next   |
| 7 | Club & district automation           | next   |
| 8 | Event & attendance                   | next   |
| 9 | Communication automation             | partly (existing) |
| 10 | Analytics & reporting                | partly (existing) |
| 11 | Mobile app (PWA / Flutter / RN)      | next   |
| 12 | Security & compliance                | ongoing |
| 13 | AI & automation                      | partly (existing) |
| 14 | Tech-stack alignment                 | ongoing |
| 15 | Integration layer                    | next   |
| 16 | DevOps & deployment                  | partly (existing) |
| 17 | Documentation & deliverables         | ongoing |

## Layering

```
src/
  app/api/auth/oidc/        — Phase 1: SSO routes
  lib/oidc/                 — provider-agnostic OIDC client
  lib/rbac/                 — Phase 2: permission matrix (next)
  lib/sync/                 — Phase 3: sync engine (next)
  lib/audit/                — append-only audit logging
  lib/supabase/             — Postgres / RLS data access
supabase/migrations/
  0001_initial_schema.sql   — single-club CRM
  0002_social_creative.sql  — social/creative extras
  0003_enterprise_crm.sql   — federation hierarchy + auth + audit + sync
```

## Compliance posture

- **No scraping.** All Lions data ingestion is via OIDC userinfo, official
  REST APIs, or human-uploaded CSV/Excel exports.
- **Tokens & secrets** are stored server-side only (`oauth_accounts`,
  read-protected by RLS).
- **Audit trail** captures every privileged action (`audit_logs`).
- **Token verification.** State + PKCE + nonce binding protects the code
  flow. ID-token signature verification via JWKS is a Phase 12 hardening
  task (currently decoded but not signature-checked).
