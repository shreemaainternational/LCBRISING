# Go-Live Checklist — Integrations & Environment

This is the copy-paste setup guide for every external service the platform
talks to. It mirrors the **canonical registry** in
`src/lib/integrations-registry.ts`.

> **Live source of truth:** sign in and open **`/admin/integrations`**. Each
> service shows one of three states:
> - 🟢 **Live** — configured with real credentials.
> - 🟠 **Sandbox / Auto** — switched on but running in a non-production mode
>   (synthetic data, or a self-provisioned secret). Still *pending* real activation.
> - ⚪ **Off** — not configured (the platform degrades gracefully).
>
> The **"Pending activation"** band at the top of that page is your live
> to-do list. A machine-readable version is at `GET /api/integrations/status`
> (admin-only).

All variables go into **Vercel → Project → Settings → Environment Variables**
for both **Production** and **Preview**, and into `.env.local` for local dev.
After changing env vars in Vercel you must **redeploy** for them to take effect.
`opt` = optional, `req` = required for that integration to go live.

---

## 0. Secrets you generate yourself

These are not obtained from a vendor — generate them once and keep them safe.
**Never commit the values to git.**

```bash
# SECRET_ENCRYPTION_KEY — AES-256-GCM key that wraps stored OAuth tokens,
# OIDC client secrets and Lions API credentials at rest. (32 bytes, base64)
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# PORTAL_SESSION_SECRET — signs member-portal session cookies.
# (Optional — falls back to SUPABASE_SERVICE_ROLE_KEY if unset.)
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# CRON_SECRET — Bearer token the Vercel scheduler presents to /api/cron/*.
# (Optional — auto-provisioned in the DB if unset, but pin it for production.)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

```ini
SECRET_ENCRYPTION_KEY=<paste generated base64>
PORTAL_SESSION_SECRET=<paste generated base64>   # optional
CRON_SECRET=<paste generated hex>                # optional but recommended
```

> ⚠️ **Rotating `SECRET_ENCRYPTION_KEY`:** keep the old key around to decrypt
> legacy rows, re-save the affected settings, then remove the old key.

---

## 1. Core — required for the app to function

### Supabase (database + auth)
- **Powers:** sign-in, member portal, every CRM page, cron, sync, webhooks.
- **Where:** https://supabase.com/dashboard → Project → **Settings → API**.

```ini
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co   # req, public
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon public key>              # req, public
SUPABASE_SERVICE_ROLE_KEY=<service_role key>                 # req for cron/sync/webhooks/OIDC provisioning — keep secret
```

Apply the migrations in `supabase/migrations/` (SQL Editor) before first use —
see `DEPLOYMENT.md`.

---

## 2. Payments

### Razorpay (cards / netbanking / UPI hosted checkout)
- **Where:** https://dashboard.razorpay.com → **Settings → API Keys**; webhooks
  under **Settings → Webhooks** (`https://YOUR_DOMAIN/api/webhooks/razorpay`,
  events `payment.captured` / `payment.authorized` / `payment.failed`).

```ini
RAZORPAY_KEY_ID=rzp_live_xxx          # req  (rzp_test_* for testing)
RAZORPAY_SECRET=xxx                   # req
RAZORPAY_WEBHOOK_SECRET=xxx           # opt  (enables signature-verified reconciliation)
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_live_xxx  # opt, public
```

### PhonePe (UPI-first hosted checkout)
- **Where:** https://business.phonepe.com → Developer settings (Merchant ID + Salt).

```ini
PHONEPE_MERCHANT_ID=xxx               # req
PHONEPE_SALT_KEY=xxx                  # req
PHONEPE_SALT_INDEX=1                  # opt
PHONEPE_WEBHOOK_USERNAME=xxx          # opt (auto-verification)
PHONEPE_WEBHOOK_PASSWORD=xxx          # opt
```

### UPI deep-links + dynamic QR (`/pay/[id]`)
- **Where:** your own merchant VPA (no signup). Defaults are baked in, so this
  is already 🟢 unless you want to change the payee.

```ini
UPI_VPA=lcbarodarisingstar@hdfcbank   # req (payee VPA)
UPI_PAYEE_NAME=Lions Club of Baroda Rising Star  # opt
UPI_MERCHANT_CODE=                    # opt (MCC)
NEXT_PUBLIC_UPI_VPA=lcbarodarisingstar@hdfcbank  # public mirror
NEXT_PUBLIC_UPI_PAYEE_NAME=Lions Club of Baroda Rising Star
NEXT_PUBLIC_STATIC_QR_URL=            # opt (static PhonePe QR image fallback)
```

---

## 3. Messaging

### Resend (transactional email)
- **Powers:** receipts, payment confirmations, OTP, portal links.
- **Where:** https://resend.com → verify a sending domain → **API Keys**.

```ini
RESEND_API_KEY=re_xxx                                         # req
RESEND_FROM_EMAIL="Lions Club Baroda Rising Star <noreply@barodarisingstar.com>"  # opt
```

### Twilio (SMS / WhatsApp)
- **Where:** https://console.twilio.com → Account SID + Auth Token; WhatsApp
  sender under **Messaging → Senders** (or the WhatsApp sandbox).

```ini
TWILIO_ACCOUNT_SID=ACxxx              # req
TWILIO_AUTH_TOKEN=xxx                 # req
TWILIO_WHATSAPP_FROM=whatsapp:+1415xxxxxxx  # opt
```

### WhatsApp Business Cloud (Meta — preferred over Twilio for WhatsApp)
- **Where:** https://developers.facebook.com → your app → **WhatsApp → API Setup**.
- If unset, outbound WhatsApp falls back to Twilio (if configured).

```ini
WHATSAPP_BUSINESS_TOKEN=EAAxxx        # req
WHATSAPP_BUSINESS_PHONE_ID=xxx        # req
```

### Web Push (VAPID / PWA notifications)
- **Self-provisioning:** a keypair is auto-generated and stored in the DB on
  first install, so this shows 🟠 **auto** until you pin keys. To pin (so the
  keypair survives DB resets), generate and set:

```bash
npx web-push generate-vapid-keys
```
```ini
VAPID_PUBLIC_KEY=xxx                  # opt (pins the keypair)
VAPID_PRIVATE_KEY=xxx                 # opt
VAPID_SUBJECT=mailto:admin@barodarisingstar.com  # opt
NEXT_PUBLIC_VAPID_PUBLIC_KEY=xxx      # opt, public (served dynamically if unset)
```

---

## 4. AI

### OpenAI (narrative writer, greetings, creative, insights, OCR)
- **Where:** https://platform.openai.com → **API keys**.
- **In-app alternative:** paste the key at **`/admin/integrations/openai`** (stored
  encrypted in the DB) instead of using env. Until set, AI features fall back to
  hand-written templates (still usable).

```ini
OPENAI_API_KEY=sk-xxx                 # opt (env overrides the in-app DB key)
OPENAI_MODEL=gpt-4o-mini              # opt
```

---

## 5. Social (auto-posting from `/admin/social`)

### Meta — Facebook Pages
- **Where:** https://developers.facebook.com → app → Graph API → Page access token.

```ini
META_APP_ID=xxx                       # opt
META_APP_SECRET=xxx                   # opt
META_ACCESS_TOKEN=EAAxxx              # req
FACEBOOK_PAGE_ID=xxx                  # req
```

### Meta — Instagram Business
```ini
META_ACCESS_TOKEN=EAAxxx              # req (shared with Facebook above)
INSTAGRAM_BUSINESS_ID=xxx             # req
```

### LinkedIn Organization
- **Where:** https://www.linkedin.com/developers → app with `w_organization_social`.

```ini
LINKEDIN_CLIENT_ID=xxx                # opt
LINKEDIN_ACCESS_TOKEN=xxx             # req
LINKEDIN_ORGANIZATION_URN=urn:li:organization:1234567  # req
```

---

## 6. Media

### Canva (branded creatives)
- **Where:** https://www.canva.com/developers/integrations/connect-api.

```ini
CANVA_API_KEY=xxx                     # req* (or the OAuth client pair below)
CANVA_CLIENT_ID=xxx                   # req* one of the two paths
CANVA_CLIENT_SECRET=xxx               # req*
CANVA_REDIRECT_URI=https://YOUR_DOMAIN/api/canva/oauth/callback  # opt
```

### Cloudinary (media CDN for photos / galleries / event covers)
- **Where:** https://console.cloudinary.com → **Dashboard** (cloud name + keys).
- If unset, uploads fall back to Supabase Storage.

```ini
CLOUDINARY_CLOUD_NAME=xxx             # req
CLOUDINARY_API_KEY=xxx                # req
CLOUDINARY_API_SECRET=xxx             # req
CLOUDINARY_UPLOAD_PRESET=lcbrs_default  # opt
```

---

## 7. Lions International (CRM hub)

> Tip: you can flip on **Sandbox mode** from `/admin/integrations` (or the setup
> wizard at `/admin/integrations/oidc`) to exercise the full SSO + MyLCI sync
> flow with synthetic data **before** you have real credentials. Sandbox shows
> as 🟠 on the dashboard.

### Lions OIDC / SSO
- **Where:** LCI Member Service Center, or your IdP (Auth0 / Keycloak / Okta).
  Register the same `LIONS_OIDC_REDIRECT_URI` on the IdP side.

```ini
LIONS_OIDC_ISSUER=https://login.example.com/realms/lions  # req
LIONS_OIDC_CLIENT_ID=lcr-crm                              # req
LIONS_OIDC_REDIRECT_URI=https://YOUR_DOMAIN/api/auth/oidc/callback  # req
LIONS_OIDC_CLIENT_SECRET=xxx                              # opt (public clients omit)
LIONS_OIDC_SCOPES=openid profile email                   # opt
LIONS_OIDC_AUDIENCE=                                      # opt
LIONS_OIDC_DISCOVERY_URL=                                 # opt (.well-known override)
LIONS_OIDC_PROVIDER_LABEL=Lions                           # opt
```

### Lions REST API (MyLCI-shape sync)
- Until set, sync runs in **dry-run** (returns zeroed counts).

```ini
LIONS_API_BASE_URL=https://api.example.org/mylci  # req
LIONS_API_KEY=xxx                                 # opt
LIONS_API_ACCESS_TOKEN=xxx                        # opt
LIONS_API_DISTRICT_CODE=3232-F1                   # opt
LIONS_API_MULTI_DISTRICT_CODE=MD-3232             # opt
```

### Lions inbound webhook
- Provider must sign every payload with HMAC-SHA256 hex in `X-Lions-Signature`.
- Falls back to `lions_api_settings.webhook_secret` (DB) when env unset.

```ini
LIONS_WEBHOOK_SECRET=<shared HMAC secret>         # req for webhook ingestion
```

---

## 8. Platform

### Vercel Cron
- **Powers:** daily automation engine + scheduled report generation.
- Auto-provisions a DB secret if `CRON_SECRET` is unset (shows 🟠). Pin it for
  production and set it under **Vercel → Settings → Cron Jobs → Authentication**.
  See §0 to generate.

### PWA shell
- Always on — baked into the build. Drop `icon-192.png`, `icon-512.png`,
  `icon-maskable.png` into `public/` for the install prompt.

---

## Go-live order (recommended)

1. **Core:** Supabase (+ migrations) and the §0 generated secrets.
2. **Money:** Razorpay / PhonePe / UPI, then run a test payment.
3. **Comms:** Resend (receipts/OTP) → Twilio or WhatsApp Business → pin Web Push.
4. **Lions:** start in Sandbox, then swap in real OIDC + REST + webhook secret.
5. **Reach:** OpenAI, Social (Meta/LinkedIn), Canva, Cloudinary.
6. Re-open **`/admin/integrations`** — the "Pending activation" band should be
   empty (or only intentional 🟠 sandbox/auto entries remain).
