#!/bin/bash
# cPanel auto-deploy script for Lions Club Baroda Rising Star (Next.js).
#
# Triggered by:
#   1. GitHub push  -> public_html/deploy.php  -> this script
#   2. Cron fallback (every 5 min)
#
# Edit the variables in the CONFIG block to match your cPanel layout, then
# place this file at $PROJECT_PATH/scripts/cpanel/deploy.sh and chmod +x.

set -euo pipefail

# ---------- CONFIG ----------
CPANEL_USER="${CPANEL_USER:-yourcpanelusername}"
PROJECT_PATH="${PROJECT_PATH:-/home/${CPANEL_USER}/lcbrising}"
PUBLIC_PATH="${PUBLIC_PATH:-/home/${CPANEL_USER}/public_html}"
BRANCH="${BRANCH:-main}"
NODE_APP_RESTART_FILE="${PROJECT_PATH}/tmp/restart.txt"
LOG_FILE="${PROJECT_PATH}/deploy.log"
# ----------------------------

mkdir -p "$(dirname "$LOG_FILE")"
exec >> "$LOG_FILE" 2>&1
echo
echo "===== Deploy started: $(date -u +'%Y-%m-%dT%H:%M:%SZ') ====="

cd "$PROJECT_PATH"

echo "[1/5] Fetching ${BRANCH}..."
git fetch --prune origin "$BRANCH"
git reset --hard "origin/${BRANCH}"

# Use the cPanel-managed Node binary if present (NodeJS Selector / EA-Node).
if command -v node >/dev/null 2>&1; then
  echo "Using node: $(node -v)"
else
  echo "ERROR: node not found in PATH. Enable a Node version under cPanel > Setup Node.js App." >&2
  exit 1
fi

echo "[2/5] Installing dependencies (npm ci)..."
if [ -f package-lock.json ]; then
  npm ci --no-audit --no-fund
else
  npm install --no-audit --no-fund
fi

echo "[3/5] Building Next.js app..."
npm run build

# Static assets exposed by cPanel must live under public_html. Sync Next's
# static output, then also wipe any legacy SPA build that may still be
# squatting in public_html from a previous deploy (e.g. the old Vite build's
# `index.html` + `assets/` that hard-coded demo credentials on the login page).
echo "[4/5] Syncing static assets to ${PUBLIC_PATH}..."
mkdir -p "${PUBLIC_PATH}/_next"
rsync -a --delete "${PROJECT_PATH}/.next/static/" "${PUBLIC_PATH}/_next/static/"

if [ -d "${PROJECT_PATH}/public" ]; then
  rsync -a \
    --exclude '_next' \
    --exclude 'deploy.php' \
    --exclude '.htaccess' \
    "${PROJECT_PATH}/public/" "${PUBLIC_PATH}/"
fi

# Purge known legacy SPA leftovers so Apache stops serving the old login page
# (which displayed hard-coded demo credentials) ahead of the Next.js app.
LEGACY_ARTIFACTS=(
  "${PUBLIC_PATH}/index.html"
  "${PUBLIC_PATH}/assets"
  "${PUBLIC_PATH}/app"
  "${PUBLIC_PATH}/dist"
  "${PUBLIC_PATH}/static"
  "${PUBLIC_PATH}/vite.svg"
)
for path in "${LEGACY_ARTIFACTS[@]}"; do
  if [ -e "$path" ]; then
    echo "  removing legacy artifact: $path"
    rm -rf -- "$path"
  fi
done

# Tell cPanel's Phusion Passenger / Node App Manager to reload the app.
echo "[5/5] Restarting Node application..."
mkdir -p "$(dirname "$NODE_APP_RESTART_FILE")"
touch "$NODE_APP_RESTART_FILE"

echo "===== Deploy finished OK: $(date -u +'%Y-%m-%dT%H:%M:%SZ') ====="
