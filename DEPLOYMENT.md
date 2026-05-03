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

1. Open the **SQL Editor**:
   https://supabase.com/dashboard/project/mvtqqlfzawyhntnsavbx/sql/new
2. Paste the contents of `supabase/migrations/0001_initial_schema.sql`
   and run.
3. (Optional) paste `supabase/seed.sql` to insert the default club row.

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
