# Production Readiness Audit — Shree Maa International Automation Platform

**Date:** 1 July 2026
**Reviewed by:** Engineering audit (automated, evidence-based)
**Codebase:** `LCBRISING` — Next.js 16 (App Router) + Supabase + Vercel
**Size:** ~508 TypeScript files, ~54,000 lines, 135 API routes, 55 database migrations

> **How to read this:** every claim below was checked against the actual code and
> is cited by file. Scores are out of 10. This is written in plain language on
> purpose — where a technical term is needed, it's explained.

---

## 0. The headline you need first

**Identity confirmed:** this platform is for the **Lions Club of Baroda Rising Star**
(District 3232-F1, Vadodara). "Shree Maa International" is the operating/GitHub
organisation; the product itself is the Lions Club NGO platform. The branding, the
80G/NGO framing, the receipts, the UPI account (`9712299333@ybl`), and the
privacy/terms pages are all for the correct entity — so there is **no identity or
legal-entity mismatch**. (Verified: "Lions"/"Baroda" appears 934 times across the code.)

The one thing that dominates everything else:

**The admin area is wide open to the public.** There is a live URL — `/crm` — that
hands anyone who visits it a 30-day "you are the top administrator" pass, with **no
password**. The code even says so in a comment: *"Anyone who knows this URL can access
/admin."* Three independent reviews confirmed it. Until this is removed, all member
data, donor data, payments, and beneficiary records are effectively public.

This is not a "polish later" item. It is a go/no-go blocker.

---

## 1. Scorecard

| Area | Score | One-line verdict |
|---|---:|---|
| **Security** | **2 / 10** | A public, passwordless admin backdoor is shipped in the live code. |
| **Legal & Compliance** | **2 / 10** | Wrong legal entity, invalid tax receipts, no consent, exposed sensitive data. |
| **Stability & Reliability** | **3 / 10** | Zero automated tests, no error monitoring, jobs can silently double-send or die. |
| **DevOps / CI-CD** | **3 / 10** | No safety gate on changes; some automation scripts are dangerous. |
| **Strategy & Scope** | **4 / 10** | Identity is clear (Lions Club NGO); the risk is enormous feature sprawl vs. a hardened core. |
| **System Design (scaling)** | **4 / 10** | Heavy work crammed into 30–60 second web requests; schedule doesn't match the hosting plan. |
| **Architecture** | **5 / 10** | Good code organisation, but the job/payment engine has correctness gaps. |
| **Code Quality** | **5 / 10** | Clean, strict, tidy on the surface; the database layer is secretly untyped. |
| **Services & Integrations** | **7 / 10** | The strongest area — most integrations are genuinely built and fail gracefully. |
| **Documentation** | **7 / 10** | Unusually thorough docs and deployment guides. |
| **OVERALL — Production readiness** | **≈ 3 / 10** | **Not ready.** Impressive breadth, but blocked by critical security, legal, and reliability gaps. |

**Bottom line:** This is an ambitious, genuinely feature-rich system built quickly.
The *plumbing* (payments, email, WhatsApp, AI, notifications) is more real than most
projects at this stage. But it is **not safe to put in front of the public yet** —
mainly because of one security hole, a set of legal problems, and the complete
absence of a testing/monitoring safety net.

---

## 2. What's genuinely good (so this is balanced)

- **The integrations are real, not fake.** Email (Resend), both WhatsApp channels
  (Twilio + Meta Cloud), Razorpay + PhonePe + UPI QR payments, OpenAI (9 features),
  push notifications, Facebook/Instagram posting, and the Lions single-sign-on stack
  are all actually implemented with proper API calls. When a service isn't configured,
  the app mostly turns that feature off cleanly instead of crashing. This is the
  best-engineered part of the system.
- **It compiles cleanly.** Type-checking and linting both pass with **0 errors and 0
  warnings**, and error-suppression is *not* switched on. That's better than many
  production apps.
- **Payment maths is correct.** Rupee/paise conversion, commissions, dues, and late
  fees are all rounded and stored correctly. No money-math bugs were found.
- **The signature checks that exist are done properly.** Razorpay and the Lions
  webhook use timing-safe comparison and verify the raw payload — textbook correct.
- **Secrets are encrypted at rest** (AES-256-GCM) for stored OAuth/login credentials.
- **No real secrets are committed** to the repository.
- **Documentation is thorough** — deployment guides, go-live checklists, manuals.

---

## 3. Critical problems (must fix before any public launch)

### 3.1 Security — the passwordless admin backdoor
`src/app/crm/route.ts`, `src/lib/auth.ts:44`, `src/lib/rbac/guard.ts:28`

Visiting `/crm` sets a cookie (`lcbr_crm=1`) that the app treats as "this person is the
highest-level administrator" — skipping the login check entirely, for 30 days. The same
effect is available through a `?as=governor` sandbox URL and an `ADMIN_AUTH_BYPASS`
switch. **Anyone on the internet can become admin.** Everything else in the security
review sits behind this, so this is the single most important fix.

### 3.2 Security — payment amounts are trusted from the browser
`src/app/api/donations/verify/route.ts`, `src/app/api/webhooks/razorpay/route.ts`

When a payment completes, the app confirms the signature but **never asks the payment
company "how much was actually paid?"** It trusts the amount the browser sent earlier.
In plain terms: a user could pay ₹1, tamper the number, and receive a receipt for the
full amount. The fix is standard — re-fetch the captured amount from Razorpay/PhonePe
and compare before marking anything paid.

### 3.3 Security — public "I paid, here's a screenshot" endpoint
`src/app/api/payments/proof/route.ts` (no login required) +
`supabase/migrations/0010` (anyone can insert payment-proof rows)

Payment "proof" can be submitted anonymously, and combined with 3.1 the same attacker
could also approve it. This is a fraud path.

### 3.4 Legal — the tax receipts are not valid 80G certificates
`src/lib/pdf.ts`, `src/lib/donor-pack.ts`

The receipts are labelled "80G" (India's tax-deduction rule for donations) but are
**missing every legally required field**: the organisation's PAN, the 80G registration
number and its validity, the amount in words, the payment mode, and the Form 10BE
reference. There's also no sign of the mandatory Form 10BD filing. A donor **cannot
legally claim a tax deduction** with these — even though the organisation name on them
is correct.

### 3.5 Legal/Privacy — sensitive people's data is exposed and consent isn't recorded
`supabase/migrations/0020`, `src/app/api/beneficiaries/*`

The system stores **health reports, Aadhaar digits, dates of birth (including
children), photos, and locations** of aid beneficiaries — in plain text, reachable
through the 3.1 backdoor, with a consent field that exists but is never enforced. Under
India's DPDP Act 2023 this is high-risk sensitive data that needs consent, encryption,
and access control. None of the three is reliably in place.

---

## 4. High-priority problems (fix before scaling / to stay compliant)

**Reliability**
- **No automated tests at all.** Zero. The "smoke tests" are manual scripts that hit a
  live site or render sample PDFs for a human to eyeball. Nothing verifies payments,
  permissions, or invoices automatically. (`scripts/`)
- **No error monitoring.** No Sentry/logging service. If something breaks in production,
  **you won't know** unless a user complains. For a payments app this is serious.
- **Jobs can double-send or silently die.** The automation queue has no "lock," so two
  overlapping runs can send the same receipt/WhatsApp/email twice; and a failed job
  after 5 tries just disappears with no alert. (`src/lib/automation/engine.ts`)
- **Razorpay webhook isn't duplicate-proof.** Payment gateways routinely deliver the
  same "payment done" message twice; here that can re-trigger receipts and
  double-credit agent commissions. (`src/app/api/webhooks/razorpay/route.ts`)

**Compliance / marketing**
- **WhatsApp/SMS/email marketing has no opt-in, no opt-out, and no unsubscribe link.**
  This breaks India's TRAI/DLT rules and Meta's WhatsApp policy, and risks your sender
  accounts being banned. (`src/lib/whatsapp.ts`, `src/lib/email.ts`,
  `src/app/api/admin/broadcast/route.ts`)
- **No standalone refund/cancellation policy page.** Razorpay *requires* one to keep a
  merchant account active — this alone can get the account frozen. (`src/app/(public)/`)
- **No data-retention or "delete my data" process.** Required under DPDP.

**Operations / DevOps**
- **No safety gate on code changes** — nothing runs tests/type-checks before a change
  goes live, so a broken change can ship unnoticed.
- **A committed workflow resets the admin password to a hardcoded value**
  (`Lions3232F1@2026`) and can mint a top-level admin. This should not be in the repo.
  (`.github/workflows/reset-admin-password.yml`)
- **Known-vulnerable dependencies** shipped (`ws` high-severity, plus `postcss`, `qs`).

---

## 5. Medium-priority problems (address before real growth)

- **The hosting plan doesn't match the design.** The scheduled jobs assume Vercel's
  **paid** plan (8 jobs, 5-minute cadence, 300-second runtime), but the docs target the
  **free** plan (2 jobs, once-daily, 60-second limit). Result: **receipts and reminders
  can be delayed up to ~24 hours**, and long jobs (reports, big imports) can time out
  half-way. (`vercel.json`, `src/app/api/cron/*`)
- **Heavy work runs inside web requests.** Report generation, CSV imports, and bulk
  invoicing all run live inside a 30–60 second request. The database was designed for
  background processing ("queued/generating/ready" statuses exist) but the code doesn't
  use it. This will time out as data grows.
- **The rate-limiter doesn't actually work in production.** It counts requests in one
  server's memory, but Vercel runs many servers — so the limit is easily bypassed.
  Needs a shared store (e.g. Upstash Redis). (`src/lib/rate-limit.ts`)
- **The database layer is secretly untyped.** Generated Supabase types exist but aren't
  connected, so every database query returns "anything." The strict type-checking is
  passing partly because the riskiest layer is invisible to it. (`src/lib/supabase/*`)
- **Error messages leak internals** — 79 routes send raw database/error text back to the
  browser, which helps attackers and confuses users.
- **The database schema shows heavy churn** — the district code was changed back and
  forth 3–4 times across migrations, and several "ensure/fix" migrations exist to repair
  earlier ones. It works, but it signals the schema grew without a plan.

---

## 6. Strategy observations (the honest, zoomed-out view)

- **Scope is enormous for one organisation.** This one app tries to be: a public website,
  a member CRM, a donor system, three payment methods, an invoicing suite, a WhatsApp +
  email + push marketing platform, an AI content studio, a social-media auto-poster, a
  video generator, a multi-level "federation" governance system, single-sign-on, and a
  20-format reporting engine. That's 8–10 products' worth of surface area. **Breadth was
  prioritised over depth**, which is exactly why the testing, security-hardening, and
  compliance layers are thin.
- **It was built fast and largely by AI.** 115 commits, ~140 pull requests, most
  auto-generated, with recent history dominated by "re-run … apply" retries against the
  live database. This explains both the impressive breadth *and* the shaky foundations.
- **Product identity is clear** (Lions Club of Baroda Rising Star) — this is *not* a
  concern. The strategy risk is purely the scope sprawl above: too many half-deep
  features rather than a focused, fully-hardened core.

---

## 7. A realistic path to production

**Phase 1 — Stop the bleeding (days, not weeks):**
1. Delete the `/crm` backdoor and the bypass cookie/switch (3.1).
2. Re-fetch and verify payment amounts from the gateway before issuing receipts (3.2).
3. Lock down the beneficiary and payment-proof routes; remove the public-insert rule (3.3).
4. Remove the `reset-admin-password` workflow and rotate any exposed credentials (§4).

**Phase 2 — Make it safe & legal to launch (2–4 weeks):**
5. Fix the 80G receipts (or drop the 80G claim) and add consent capture (3.4, 3.5).
6. Add opt-out/unsubscribe everywhere; use approved WhatsApp templates; add a refund
   policy page (§4).
7. Add error monitoring (Sentry) and a basic CI gate that runs type-check + lint on
   every change.
8. Add duplicate-protection to the Razorpay webhook and a lock to the job queue (§4).

**Phase 3 — Make it reliable at scale (ongoing):**
9. Move reports, imports, and bulk sends to real background jobs; align the cron design
   with your actual Vercel plan (§5).
10. Swap the in-memory rate-limiter for a shared one; wire up the database types; upgrade
    vulnerable dependencies; write automated tests for the payment and permission paths.

---

## 8. In one paragraph

You've built something with real ambition and a lot of *working* machinery — the
payment, messaging, and AI integrations are genuinely impressive for how quickly this
came together. But it is **not production-ready**: a public passwordless admin backdoor,
payment amounts trusted from the browser, tax receipts that aren't legally valid, exposed
sensitive personal data, and a total absence of automated tests or error monitoring are
each, on their own, launch-blockers. Fix the handful of critical items first (they're
concentrated and fixable in days), then add
the testing and compliance safety nets. The foundation is salvageable and much of the
hard integration work is already done — the gap is in safety, correctness, and focus,
not in raw capability.
