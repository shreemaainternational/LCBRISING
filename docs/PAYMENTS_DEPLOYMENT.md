# Payments module — deployment & operations guide

This document covers everything needed to run the payment-collection
module on top of LCBRISING (Next.js 16 + Supabase) end to end.

## 1. Database migrations

Run in order against your Supabase project (SQL editor or CLI):

```
supabase/migrations/0003_payment_invoices.sql
supabase/migrations/0004_refunds.sql
supabase/migrations/0005_portal_otp.sql
supabase/migrations/0006_recurring_invoices.sql
supabase/migrations/0007_customer_prefs.sql
supabase/migrations/0008_agent_commissions.sql
```

Each file is idempotent — safe to re-run.

## 2. Required environment variables

| Variable                       | Purpose                                                |
| ------------------------------ | ------------------------------------------------------ |
| `NEXT_PUBLIC_SITE_URL`         | Used to mint pay/receipt links                         |
| `NEXT_PUBLIC_SUPABASE_URL`     | Supabase project URL                                   |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`| Supabase anon key                                      |
| `SUPABASE_SERVICE_ROLE_KEY`    | Admin/cron writes                                      |
| `UPI_VPA`                      | Defaults to `9712299333@ybl`                           |
| `NEXT_PUBLIC_UPI_VPA`          | Client mirror                                          |
| `UPI_PAYEE_NAME`               | Defaults to `Lions Club of Baroda Rising Star`         |
| `CRON_SECRET`                  | Vercel cron auth (Bearer token)                        |
| `RESEND_API_KEY`               | Customer email                                         |
| `TWILIO_ACCOUNT_SID`           | WhatsApp send (OTP + receipts)                         |
| `TWILIO_AUTH_TOKEN`            | -                                                      |
| `TWILIO_WHATSAPP_FROM`         | e.g. `whatsapp:+14155238886`                           |

Optional (enable additional capability):

| Variable                       | Enables                                                |
| ------------------------------ | ------------------------------------------------------ |
| `PHONEPE_MERCHANT_ID`          | PhonePe PG auto-capture button on /pay                 |
| `PHONEPE_SALT_KEY`             | -                                                      |
| `PHONEPE_SALT_INDEX`           | Default `1`                                            |
| `PHONEPE_WEBHOOK_USERNAME`     | Basic-auth callback flavor                             |
| `PHONEPE_WEBHOOK_PASSWORD`     | -                                                      |
| `RAZORPAY_KEY_ID`              | Razorpay card/netbanking button                        |
| `RAZORPAY_SECRET`              | -                                                      |
| `RAZORPAY_WEBHOOK_SECRET`      | -                                                      |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID`  | Client checkout                                        |
| `OPENAI_API_KEY`               | AI OCR for screenshot UTR extraction                   |
| `OPENAI_MODEL`                 | Default `gpt-4o-mini`                                  |
| `NEXT_PUBLIC_STATIC_QR_URL`    | Fallback static PhonePe QR image when VPA is missing   |
| `PORTAL_SESSION_SECRET`        | Portal HMAC cookie signing                             |

## 3. Vercel deployment

The repo is wired for the Vercel Hobby plan: a single daily cron at
`0 3 * * *` hits `/api/cron/automation?schedule=1`, which:

- expires stale invoices
- queues reminder jobs (1/3/7/14/21-day cadence)
- queues dues reminders
- generates recurring invoices that are due
- drains the automation queue (50 jobs / run)

Vercel auto-redeploys the `main` branch — make sure the branch
contains this work before announcing.

## 4. Webhook URLs to register

- PhonePe Business → `https://<site>/api/webhooks/phonepe`
- Razorpay → `https://<site>/api/webhooks/razorpay`

## 5. Public surfaces

| URL                              | Description                                         |
| -------------------------------- | --------------------------------------------------- |
| `/pay/<invoice-id>`              | The customer-facing payment page                    |
| `/invoices/lookup`               | Phone + invoice-no self-service                     |
| `/portal/login`                  | WhatsApp-OTP sign-in                                |
| `/portal`                        | "My invoices" for the signed-in phone               |
| `/portal/preferences`            | Notification opt-ins                                |

## 6. Admin surfaces

| URL                          | Description                                          |
| ---------------------------- | ---------------------------------------------------- |
| `/admin/payments`            | Dashboard, pending proofs, captured, refunds, charts |
| `/admin/commissions`         | Agent payout tracking                                |

## 7. API surface (full list)

- POST `/api/invoices`              — create single
- POST `/api/invoices/bulk`         — CSV bulk create
- GET  `/api/invoices/[id]`         — public, basic
- GET  `/api/invoices/[id]/pdf`     — GST tax invoice PDF
- POST `/api/invoices/[id]/send`    — admin WhatsApp + email blast
- POST `/api/invoices/[id]/phonepe` — initiate PhonePe PG
- POST `/api/invoices/[id]/razorpay` — initiate Razorpay
- PUT  `/api/invoices/[id]/razorpay` — verify Razorpay handler
- POST `/api/invoices/lookup`       — phone + invoice_no lookup
- GET  `/api/qr/[id]`               — UPI QR (svg/png)
- GET  `/api/qr/[id]/card`          — branded share card (svg/pdf)
- POST `/api/payments/proof`        — multipart proof upload (OCR-enabled)
- POST `/api/payments/review`       — admin verify/reject
- GET  `/api/payments/status/[id]`  — polling
- GET  `/api/payments/proof-image/[id]` — admin signed-URL redirect
- GET  `/api/payments/[id]/receipt` — payment receipt PDF
- POST `/api/payments/[id]/refund`  — admin refund
- GET  `/api/payments/reconciliation` — admin CSV export
- GET  `/api/payments/audit-log`    — admin CSV export
- GET  `/api/refunds/[id]/receipt`  — refund receipt PDF
- POST `/api/portal/otp/request`    — WhatsApp OTP
- POST `/api/portal/otp/verify`     — set session
- POST `/api/portal/logout`         — clear session
- GET/PATCH `/api/portal/preferences` — notification prefs
- GET/POST `/api/recurring-invoices` — admin CRUD
- PATCH/DELETE `/api/recurring-invoices/[id]` — admin
- PATCH `/api/commissions/[id]`     — admin mark paid/cancelled
- POST `/api/webhooks/phonepe`      — X-VERIFY or basic-auth
- POST `/api/webhooks/razorpay`     — HMAC

## 8. Manual smoke test

1. Create a test invoice via `/admin/payments` for ₹1.
2. Open the pay URL on your phone and scan the QR with PhonePe.
3. Complete the payment.
4. Either submit the screenshot/UTR via the form, or rely on the
   PhonePe webhook to auto-mark paid (if PG creds are set).
5. Verify the customer receives WhatsApp + email confirmation with
   a receipt PDF link.
6. Verify `/portal` shows the invoice as paid.

## 9. Backups

Run a Supabase `pg_dump` snapshot before applying each migration in
production. Refunds, OTP codes, and audit logs all retain history; no
data is destructively rewritten by the application code.
