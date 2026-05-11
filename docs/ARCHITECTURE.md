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
| 1 | SSO / OIDC authentication            | ✅ shipped |
| 2 | RBAC & authorization                 | ✅ shipped |
| 3 | Sync engine (REST + CSV)             | ✅ shipped |
| 4 | Database schema (federation tables)  | ✅ migration 0003 |
| 5 | OAuth token flow (JWKS, sessions)    | ✅ shipped |
| 6 | Member management CRM                | ✅ shipped |
| 7 | Club & district automation           | ✅ shipped |
| 8 | Event & attendance APIs              | ✅ shipped |
| 9 | Communication automation             | ✅ extended (meeting/officer hooks) |
| 10 | Analytics & reporting                | ✅ /api/crm/analytics |
| 11 | Mobile app (PWA manifest)            | ✅ manifest.ts; native shells TBD |
| 12 | Security & compliance                | ✅ HSTS, audit feed, RBAC denials |
| 13 | AI insights                          | ✅ /api/crm/clubs/:id/insights |
| 14 | Tech-stack alignment                 | ongoing |
| 15 | Integration registry                 | ✅ /api/crm/integrations |
| 16 | DevOps & deployment                  | ✅ DEPLOYMENT.md updated |
| 17 | Documentation & deliverables         | ✅ docs/{OIDC,RBAC,SYNC,ARCHITECTURE,USER_MANUAL,ADMIN_MANUAL,SYNC_DIAGRAMS}.md |

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
