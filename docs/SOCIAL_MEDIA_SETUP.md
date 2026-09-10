# Social & Media integrations — setup

How to turn the **Social** and **Media** cards on the
`/admin/integrations` health dashboard from grey (off) to green (live).

All of these are configured with environment variables in Vercel
(**Project → Settings → Environment Variables**). Add each var to the
**Production** environment, then **redeploy** — env changes do not apply to
an already-running deployment. The dashboard is `force-dynamic`, so the
cards flip green on the next page load with no further action.

---

## Social — two ways to connect

You can either post through **Ayrshare** (one key, all networks —
recommended) **or** wire up each network's own Meta / LinkedIn credentials.
If both are present, **Ayrshare wins** for Facebook / Instagram / LinkedIn.

### Option A — Ayrshare (recommended)

One API key posts to every connected network, so you never touch a Meta app
or LinkedIn OAuth flow. Accounts are connected once in the Ayrshare
dashboard.

1. Sign up at <https://www.ayrshare.com> and connect your Facebook Page,
   Instagram Business account, and LinkedIn organization page in their
   dashboard.
2. Copy the API key from **Ayrshare → Settings → API Key**.
3. Set the env vars:

   | Var | Required | Notes |
   |---|---|---|
   | `AYRSHARE_API_KEY` | ✅ | The dashboard API key |
   | `AYRSHARE_PROFILE_KEY` | optional | **Business plan only** — for posting on behalf of a specific profile |

Once set, the Facebook / Instagram / LinkedIn cards show **live · via
Ayrshare**, and `/admin/social` routes all posts through it. WhatsApp is a
member broadcast (Twilio / WhatsApp Business), not an Ayrshare network, so it
is unaffected.

> Posting still requires the target network to be **connected inside
> Ayrshare** — the key alone authenticates the API, the dashboard holds the
> account links.

### Option B — direct per-platform credentials

Use these if you are not using Ayrshare.

**Meta — Facebook Pages**

| Var | Required | What it is |
|---|---|---|
| `META_ACCESS_TOKEN` | ✅ | A **long-lived Page access token** (starts `EAA…`) |
| `FACEBOOK_PAGE_ID` | ✅ | Numeric ID of the club Page |
| `META_APP_ID` / `META_APP_SECRET` | optional | Meta app creds (token refresh) |

Get them at <https://developers.facebook.com>: create an app with the
*Pages* + *Instagram* products, mint a token with `pages_manage_posts` and
`pages_read_engagement` in the Graph API Explorer, then exchange it for a
**long-lived** token.

> ⚠️ The most common mistake is using a **short-lived** token — Facebook /
> Instagram will post briefly, then start failing within the hour. Always
> use the long-lived Page token.

**Meta — Instagram Business** (reuses the same Meta token)

| Var | Required | What it is |
|---|---|---|
| `META_ACCESS_TOKEN` | ✅ | Same token; needs `instagram_basic` + `instagram_content_publish` |
| `INSTAGRAM_BUSINESS_ID` | ✅ | IG **Business** account ID, linked to the FB Page |

**LinkedIn Organization**

| Var | Required | What it is |
|---|---|---|
| `LINKEDIN_ACCESS_TOKEN` | ✅ | OAuth token with `w_organization_social` |
| `LINKEDIN_ORGANIZATION_URN` | ✅ | Format `urn:li:organization:1234567` |
| `LINKEDIN_CLIENT_ID` / `LINKEDIN_CLIENT_SECRET` | optional | App creds |

Get them at <https://www.linkedin.com/developers>: create an app tied to the
org Page, request the *Community Management API*, then generate the token.

---

## Media

### Canva

Two ways — pick one:

- **Quick:** set `CANVA_API_KEY` (a static token) → live immediately.
- **Recommended:** set `CANVA_CLIENT_ID`, `CANVA_CLIENT_SECRET`, and
  `CANVA_REDIRECT_URI` (`https://YOUR_DOMAIN/api/canva/oauth/callback`), then
  click **Connect** at `/admin/integrations/canva`. The token is then stored
  and **auto-refreshed** in the database.

> `CANVA_CLIENT_ID` / `CANVA_CLIENT_SECRET` **alone will not turn the card
> green** — a token still has to be minted via the Connect button (or via
> `CANVA_API_KEY`).

### Cloudinary

All three are required:

| Var | Required |
|---|---|
| `CLOUDINARY_CLOUD_NAME` | ✅ |
| `CLOUDINARY_API_KEY` | ✅ |
| `CLOUDINARY_API_SECRET` | ✅ |

Get them from the <https://cloudinary.com> dashboard → *Account Details* /
*API Keys*. Without it, uploaded photos fall back to Supabase Storage —
nothing breaks.

---

## Quick reference

| Card | Turns green when… |
|---|---|
| Meta — Facebook Pages | `AYRSHARE_API_KEY` **or** (`META_ACCESS_TOKEN` + `FACEBOOK_PAGE_ID`) |
| Meta — Instagram Business | `AYRSHARE_API_KEY` **or** (`META_ACCESS_TOKEN` + `INSTAGRAM_BUSINESS_ID`) |
| LinkedIn Organization | `AYRSHARE_API_KEY` **or** (`LINKEDIN_ACCESS_TOKEN` + `LINKEDIN_ORGANIZATION_URN`) |
| Ayrshare (Social gateway) | `AYRSHARE_API_KEY` |
| Canva | `CANVA_API_KEY`, or OAuth connect at `/admin/integrations/canva` |
| Cloudinary | `CLOUDINARY_CLOUD_NAME` + `CLOUDINARY_API_KEY` + `CLOUDINARY_API_SECRET` |

After setting any of these, **redeploy** for the change to take effect.
