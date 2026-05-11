# Deployment Guide — Lions Club Baroda Rising Star

## 0. Quick reference (this project)

```
Org:           LCBRISING
Project:       BarodaRisingStar
Project URL:   https://mvtqqlfzawyhntnsavbx.supabase.co
Region:        ap-southeast-2 (Sydney)
Tier:          Free / Nano
Dashboard:     https://supabase.com/dashboard/project/mvtqqlfzawyhntnsavbx
```

> **Status note:** the dashboard currently reports the project as
> *Unhealthy*. Open the dashboard and resume / restart the project before
> running the migration below. (Free-tier projects auto-pause after a
> week of inactivity and need a manual unpause.)

## 1. Apply the schema

Run each migration in order via the **SQL Editor**
(https://supabase.com/dashboard/project/mvtqqlfzawyhntnsavbx/sql/new):

1. `supabase/migrations/0001_initial_schema.sql` — base CRM
2. `supabase/migrations/0002_social_creative.sql` — social/creative extras
3. `supabase/migrations/0003_enterprise_crm.sql` — federation hierarchy,
   OAuth accounts, audit/sync logs, integrations, attendance, committees,
   trainings, awards

All migrations are idempotent (`create table if not exists`, guarded
enum creates, additive `alter table`).

4. (Optional) paste `supabase/seed.sql` to insert the default club row
   for District 3232-F1.

## 2. Grab the keys

Open **Project Settings → API**:
https://supabase.com/dashboard/project/mvtqqlfzawyhntnsavbx/settings/api

Copy these into your local `.env.local` and into Vercel env vars:

```
NEXT_PUBLIC_SUPABASE_URL=https://mvtqqlfzawyhntnsavbx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<copy from "Project API keys" → anon public>
SUPABASE_SERVICE_ROLE_KEY=<copy from "Project API keys" → service_role>
```

## 2. Configure Razorpay

1. Sign up at https://razorpay.com and complete KYC.
2. Generate API keys (test, then live).
3. Add a webhook:
   - URL: `https://YOUR_DOMAIN/api/webhooks/razorpay`
   - Events: `payment.captured`, `payment.authorized`, `payment.failed`
   - Secret → `RAZORPAY_WEBHOOK_SECRET`

## 3. Configure Resend & Twilio (optional but recommended)

- **Resend**: verify a sending domain, generate API key.
- **Twilio**: enable WhatsApp sandbox or apply for a production sender.

## 4. Deploy to Vercel

```bash
git push origin main
```

1. Import the repo at https://vercel.com/new
2. Framework: **Next.js** (auto-detected)
3. Add **Environment Variables** from `.env.example` for both *Production*
   and *Preview*.
4. Deploy.
5. The cron entry in `vercel.json` will automatically register the
   automation worker (`/api/cron/automation?schedule=1` every 10 min).

## 5. Bootstrap an admin user

After signing up at `/login`:

```sql
update public.members
set role = 'admin', status = 'active'
where email = 'admin@lcbrising.org';
```

## 6. Smoke test

- [ ] Visit `/` — public site loads
- [ ] `/donate` → small test payment in Razorpay test mode
- [ ] `/admin` — sign in, dashboard renders, donation appears
- [ ] Receipt email is delivered with PDF attachment
- [ ] `/admin/automation` shows the welcome/receipt jobs as completed

## 7. Going to production

- Switch Razorpay keys from `rzp_test_*` to `rzp_live_*`
- Update Razorpay webhook to live URL
- Confirm DNS, SSL, and the Site URL in Supabase Auth settings
- Enable backups and PITR in Supabase
- Consider Upstash Redis to swap the in-memory rate-limiter

## Troubleshooting

**`SUPABASE_SERVICE_ROLE_KEY` errors** — service role is required for
webhooks and cron. Set it in Vercel → Production env.

**Cron 401** — `CRON_SECRET` must match the `Authorization: Bearer ...`
header. Vercel auto-injects this when configured under
**Project → Settings → Cron Jobs → Authentication**.

**RLS denials** — when calling from a route handler that uses
`createClient()`, the call runs as the authenticated user. For trusted
server flows use `createAdminClient()` (service role).

## 8. Enterprise CRM extras

### Lions OIDC / SSO

Add these to Vercel env (both Production and Preview), then the
`/api/auth/oidc/*` routes go live:

```
LIONS_OIDC_ISSUER=https://login.example.com/realms/lions
LIONS_OIDC_CLIENT_ID=lcr-crm
LIONS_OIDC_CLIENT_SECRET=...
LIONS_OIDC_REDIRECT_URI=https://YOUR_DOMAIN/api/auth/oidc/callback
LIONS_OIDC_SCOPES=openid profile email
```

Register the same `LIONS_OIDC_REDIRECT_URI` on the IdP side.

### Sync engine endpoints

| Endpoint                        | Requires permission |
|---------------------------------|---------------------|
| `POST /api/sync/run`            | `sync.trigger`      |
| `POST /api/sync/csv` (multipart)| `sync.trigger`      |
| `GET  /api/sync/logs`           | `sync.configure`    |

### Bootstrapping the federation hierarchy

```sql
insert into public.multiple_districts (code, name) values
  ('MD-3232', 'Multiple District 3232');

insert into public.districts (code, name, multiple_district_id, lions_year)
select '3232-F1', 'District 3232-F1', id, '2025-26'
from public.multiple_districts where code = 'MD-3232';

-- Promote yourself to international_admin (one-time bootstrap):
update public.members
set lions_role = 'international_admin', status = 'active'
where email = 'admin@lcbrising.org';
```

### PWA install

`/manifest.webmanifest` is served by `src/app/manifest.ts`. Drop these
into `public/` for the install prompt:
`icon-192.png`, `icon-512.png`, `icon-maskable.png`.
