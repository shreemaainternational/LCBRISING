# Deployment Guide — Lions Club Baroda Rising Star

## 1. Provision Supabase

1. Create a project at https://supabase.com (Mumbai region recommended).
2. Open **SQL Editor** → paste `supabase/migrations/0001_initial_schema.sql` → run.
3. Optionally seed: paste `supabase/seed.sql`.
4. From **Project Settings → API** copy:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` → `SUPABASE_SERVICE_ROLE_KEY`
5. **Auth → Providers** → enable Email/Password.
6. **Auth → URL Configuration** → set Site URL to your Vercel domain.

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
