# cPanel auto-deploy

End-to-end auto-deploy from GitHub `main` to a cPanel host running the
Lions Club Baroda Rising Star Next.js app.

```
GitHub push  ──webhook──►  https://barodarisingstar.com/deploy.php
                                    │
                                    ▼
                       /home/barodari/lcbrising/scripts/cpanel/deploy.sh
                                    │
                              git pull → npm ci → next build
                                    │
                       rsync static  →  ~/public_html
                       touch tmp/restart.txt  →  Passenger reload
```

## Files in this folder

| File         | Where it lives on the server               |
| ------------ | ------------------------------------------ |
| `deploy.sh`  | `~/lcbrising/scripts/cpanel/deploy.sh`     |
| `deploy.php` | `~/public_html/deploy.php`                 |

`deploy.sh` is checked in and executed in place after each `git pull`.
`deploy.php` is checked in for reference but **must be copied** into
`public_html` because that is the only path Apache will serve.

## One-time setup

### 1. SSH in and clone

```bash
ssh barodari@barodarisingstar.com
cd ~
git clone https://github.com/shreemaainternational/LCBRISING.git lcbrising
cd lcbrising
git checkout main
```

### 2. Register the Node app in cPanel

cPanel → **Setup Node.js App** → *Create Application*:

- Node.js version: **20.x** (or the highest LTS available)
- Application mode: **Production**
- Application root: `lcbrising`
- Application URL: `barodarisingstar.com`
- Application startup file: `node_modules/next/dist/bin/next` with args `start`
  *(or use a tiny `server.js` that calls `next().prepare().listen(...)`)*

cPanel creates `~/lcbrising/tmp/restart.txt`. Touching that file triggers a
Passenger reload — `deploy.sh` does this automatically.

### 3. Environment variables

In **Setup Node.js App → your app → Environment variables**, paste the same
values you use on Vercel (`NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, Razorpay,
Resend, Twilio, etc.). See `DEPLOYMENT.md` for the full list.

Also set:

| Variable          | Value                                                  |
| ----------------- | ------------------------------------------------------ |
| `CPANEL_USER`     | your cPanel username                                   |
| `PROJECT_PATH`    | `/home/barodari/lcbrising`                               |
| `PUBLIC_PATH`     | `/home/barodari/public_html`                             |
| `BRANCH`          | `main`                                                 |
| `WEBHOOK_TOKEN`   | a long random string (used by `deploy.php`)            |
| `WEBHOOK_SECRET`  | optional — GitHub webhook secret for HMAC verification |

### 4. First build

```bash
chmod +x ~/lcbrising/scripts/cpanel/deploy.sh
~/lcbrising/scripts/cpanel/deploy.sh
```

Tail `~/lcbrising/deploy.log` for output.

### 5. Install the webhook receiver

```bash
cp ~/lcbrising/scripts/cpanel/deploy.php ~/public_html/deploy.php
chmod 644 ~/public_html/deploy.php
```

Edit the `DEPLOY_SCRIPT` path at the top of the file (or set the
`DEPLOY_SCRIPT` env var in `.htaccess` / cPanel).

### 6. Configure the GitHub webhook

GitHub repo → **Settings → Webhooks → Add webhook**:

- Payload URL: `https://barodarisingstar.com/deploy.php?token=<WEBHOOK_TOKEN>`
- Content type: `application/json`
- Secret: same as `WEBHOOK_SECRET` (recommended)
- Events: **Just the push event**

### 7. Cron fallback (optional)

cPanel → **Cron Jobs**:

```
*/5 * * * * /home/barodari/lcbrising/scripts/cpanel/deploy.sh
```

Pulls the latest `main` every 5 minutes in case a webhook is missed.

### 8. DNS

| Type  | Host | Value           |
| ----- | ---- | --------------- |
| A     | @    | `<server IP>`   |
| CNAME | www  | barodarisingstar.com |

## Verifying

```bash
# from anywhere
curl "https://barodarisingstar.com/deploy.php?token=<WEBHOOK_TOKEN>"
# → "Deploy triggered"

# on the server
tail -f ~/lcbrising/deploy.log
```

A push to `main` should land in production in ~60–90 s.
