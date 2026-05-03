# 🦁 Lions Club of Baroda Rising Star — Enterprise Platform

Production-grade NGO platform for the **Lions Club of Baroda Rising Star**
(District 323-E, Vadodara, India). Combines a public website, member /
donor CRM, payment processing, automation engine, and reporting.

---

## ✨ Features

| Module        | Highlights |
|---------------|------------|
| Website       | SEO-optimised, server-rendered, Tailwind UI |
| Auth          | Supabase Auth (email + password), JWT, RLS-protected DB |
| Members CRM   | Roles, status, profile, club assignment |
| Dues          | Schedule, pay (Razorpay), automatic reminders |
| Donations     | Public form, Razorpay checkout, 80G-style PDF receipts |
| Activities    | Track service projects, beneficiaries, hours |
| Events        | RSVP + QR code check-in |
| Automation    | Lightweight job queue (DB-backed), Vercel Cron driven |
| Communication | Resend email + Twilio WhatsApp |
| Dashboard     | Live metrics, donation trend, recent activity |
| Security      | Zod validation, rate limiting, signed Razorpay webhooks, RLS |

---

## 🏗️ Stack

* **Next.js 16** (App Router, server components)
* **TypeScript** (strict)
* **TailwindCSS v4**
* **Supabase** — Postgres, Auth, Storage
* **Razorpay** — payments (INR)
* **Resend** — transactional email
* **Twilio** — WhatsApp messaging
* **PDFKit** — receipt generation
* **Vercel** — hosting + cron

---

## 📁 Repo Layout

```
src/
  app/
    (public)/           # marketing site (home, about, activities, events, donate, contact)
    admin/              # member portal & CRM (auth-gated)
    api/                # route handlers
      donations/        #   intent + verify + receipt
      members/          #   CRUD
      dues/             #   list + pay
      activities/
      events/           #   list + RSVP + QR check-in
      cron/automation/  #   Vercel Cron entry point
      webhooks/razorpay/
    login/              # sign-in / sign-up
  components/
    ui/                 # button, card, input, badge
    site/               # public nav + footer
    admin/              # admin chrome
  lib/
    supabase/           # client, server, types
    automation/         # job engine (handlers, processor)
    validation/         # zod schemas
    razorpay.ts
    email.ts            # Resend + templates
    whatsapp.ts         # Twilio + templates
    pdf.ts              # donation receipts
    rate-limit.ts
    auth.ts             # role guards
    env.ts
  middleware.ts         # admin route protection
supabase/
  migrations/0001_initial_schema.sql
  seed.sql
.env.example
vercel.json             # cron + security headers
```

---

## 🚀 Getting Started

### 1. Install

```bash
npm install
```

### 2. Configure environment

Copy `.env.example` → `.env.local` and fill in:

* Supabase URL + keys
* Razorpay keys + webhook secret
* Resend API key
* Twilio credentials
* `CRON_SECRET` (generate a long random string)

### 3. Provision the database

Run the migration on your Supabase project:

```bash
supabase db push
# or, in Supabase SQL editor, run supabase/migrations/0001_initial_schema.sql
```

Optionally seed:

```bash
psql $SUPABASE_DB_URL -f supabase/seed.sql
```

### 4. Start dev

```bash
npm run dev
# → http://localhost:3000
```

### 5. Bootstrap an admin

After signing up at `/login`, promote yourself in the SQL editor:

```sql
update public.members
set role = 'admin', status = 'active'
where email = 'you@example.com';
```

---

## 🔐 Security Notes

* All secrets are read from `process.env.*` via a `zod` schema (`src/lib/env.ts`).
* The Supabase **service role key** is only ever used server-side
  (`createAdminClient`) — never bundled into client code.
* Row Level Security is enabled on every table; policies are encoded in
  `supabase/migrations/0001_initial_schema.sql`.
* Razorpay webhooks are HMAC-verified (`RAZORPAY_WEBHOOK_SECRET`).
* Public POST endpoints are rate-limited (`src/lib/rate-limit.ts`).
* Security headers configured in `vercel.json`.

---

## ⚙️ Automation Engine

The `automation_jobs` table acts as a lightweight queue. Handlers
register in `src/lib/automation/engine.ts`:

| `job_type`               | Trigger                                  |
|--------------------------|------------------------------------------|
| `send_welcome_email`     | New auth user (DB trigger)              |
| `send_dues_reminder`     | Cron `?schedule=1` enqueues T-7 / T-day |
| `send_donation_receipt`  | After captured donation                  |
| `send_event_reminder`    | Manual or cron                           |

Vercel Cron runs `/api/cron/automation?schedule=1` every 10 minutes.
Authenticated via `Bearer ${CRON_SECRET}`.

---

## 💸 Payment Flows

**Donation**
1. `POST /api/donations/intent` — creates donation + payment row, returns
   Razorpay order
2. Browser opens Razorpay checkout
3. `POST /api/donations/verify` — verifies signature, marks captured,
   enqueues receipt job
4. Receipt PDF served at `GET /api/donations/{id}/receipt`

**Dues**
1. `POST /api/dues/{id}/pay` — creates Razorpay order
2. Browser opens checkout
3. `POST /api/donations/verify` (re-used) — marks payment captured and
   sets the dues row to `paid`

**Webhook** (`/api/webhooks/razorpay`) backs up the client-side flow for
captured / failed events — configure in Razorpay dashboard.

---

## 🧱 Deployment

See **[DEPLOYMENT.md](./DEPLOYMENT.md)** for full step-by-step Vercel +
Supabase deployment instructions.

---

## 🌐 Roadmap

* Multi-language (English + Gujarati) with `next-intl`
* AI donor insights (LLM-driven segmentation)
* QR check-in mobile companion
* React Native member app
* Playwright E2E suite

---

## 📄 License

Proprietary — Lions Club of Baroda Rising Star. All rights reserved.
