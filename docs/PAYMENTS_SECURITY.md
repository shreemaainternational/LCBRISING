# Payments module — security checklist

## What this module does and doesn't promise

- **Does**: collect UPI / PhonePe / Razorpay payments, record proofs,
  generate invoice + receipt PDFs, reconcile refunds, run customer
  reminders, and expose a customer self-service portal.
- **Does NOT**: store card data (Razorpay tokenises everything PCI),
  hold money on behalf of the customer, or replace a chartered
  accountant. UPI screenshot OCR is a best-effort assist; a human
  admin still signs off via `/admin/payments`.

## Controls

| Control                       | Where                                          |
| ----------------------------- | ---------------------------------------------- |
| Webhook HMAC verification     | `/api/webhooks/razorpay`, `/api/webhooks/phonepe` (X-VERIFY) |
| Service-role isolation        | `createAdminClient()` never imported in `'use client'` files |
| RLS on every new table        | 0003 — 0008 migrations                         |
| Rate limits                   | Proof upload, lookup, OTP request, OTP verify, PhonePe initiate |
| Duplicate detection           | screenshot SHA-256, unique UTR index, unique invoice_no |
| Replay protection             | OTP is single-use, attempts capped, 5-minute expiry |
| Session security              | HttpOnly + Secure (prod) + SameSite=Lax HMAC cookie |
| Phone enumeration             | OTP endpoint pretends to send for unknown numbers |
| File-type allowlist           | png/jpeg/webp/pdf only on proof upload         |
| File-size cap                 | 5 MB on proof upload                           |
| Refund amount cap             | server-validated ≤ payment amount              |
| Audit log                     | Every state transition writes to `payment_audit_logs` |
| Export controls               | CSV exports gated to admin role check          |
| Storage bucket                | `payment-proofs` is private; signed URL only via admin route |

## Sensitive data exposure

- VPAs (e.g. `9712299333@ybl`) are not secrets; they are printed on
  QR codes and shareable invoice cards by design.
- Phone numbers are stored as supplied. The OTP table stores only a
  last-10-digit normalised key and a sha256 hash of the code, never
  the raw code.
- Email addresses are stored as supplied.
- Payment screenshots are stored in a private Supabase Storage bucket
  with no public listing.

## Recommended ops hygiene

- Rotate `CRON_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, `PHONEPE_SALT_KEY`
  on a schedule and after any contractor offboarding.
- Set `PORTAL_SESSION_SECRET` to a long random value in production
  (the fallback to `SUPABASE_SERVICE_ROLE_KEY` works but couples key
  rotation).
- Review the `/admin/payments → Audit log CSV` export quarterly.
- Use the reconciliation CSV (date-filtered) for GST returns and
  bank-statement matching.
