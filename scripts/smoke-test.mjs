#!/usr/bin/env node
/**
 * Production smoke test for the LCBRising CRM.
 *
 * Runs a battery of HTTP assertions against the deployed site. Designed
 * to catch deploy regressions instantly without depending on the DB or
 * an authenticated session.
 *
 * Usage:
 *   node scripts/smoke-test.mjs
 *   BASE_URL=https://barodarisingstar.com node scripts/smoke-test.mjs
 *   BASE_URL=http://localhost:3000 node scripts/smoke-test.mjs
 *
 * Exit codes:
 *   0  - all checks passed
 *   1  - one or more checks failed
 */

const BASE_URL = (process.env.BASE_URL || 'https://barodarisingstar.com').replace(/\/$/, '');
const TIMEOUT_MS = 15_000;

/** @type {{name: string, ok: boolean, detail: string}[]} */
const results = [];

function record(name, ok, detail = '') {
  results.push({ name, ok, detail });
  const tag = ok ? '[32m✓[0m' : '[31m✗[0m';
  const suffix = detail ? `  — ${detail}` : '';
  process.stdout.write(`${tag} ${name}${suffix}\n`);
}

async function fetchWithTimeout(url, init = {}) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
      // Default: follow redirects (Vercel often serves the canonical domain
      // via a 308 from the .vercel.app URL). Callers that need to *see*
      // the 302/303 (e.g. the OIDC login route) pass redirect:'manual'.
      redirect: init.redirect ?? 'follow',
      headers: { 'user-agent': 'lcbrising-smoke/1.0', ...(init.headers || {}) },
    });
  } finally {
    clearTimeout(id);
  }
}

async function describeResponse(res) {
  const ct = res.headers.get('content-type') || '?';
  let snippet = '';
  try {
    const text = await res.clone().text();
    snippet = text.replace(/\s+/g, ' ').slice(0, 200);
  } catch { /* binary or unreadable */ }
  return `[${res.status} ${ct}] ${snippet}`;
}

async function check(name, fn) {
  try {
    const detail = await fn();
    record(name, true, detail || '');
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    record(name, false, detail);
  }
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

// ---------------------------------------------------------------------
// Public surface
// ---------------------------------------------------------------------

await check('GET / (200)', async () => {
  const res = await fetchWithTimeout(`${BASE_URL}/`);
  assert(res.status === 200, await describeResponse(res));
  const body = await res.text();
  assert(body.length > 500, `body suspiciously small (${body.length} bytes)`);
  const host = new URL(res.url).host;
  return `${(body.length / 1024).toFixed(1)} KB from ${host}`;
});

await check('GET /login renders OIDC button state correctly', async () => {
  const res = await fetchWithTimeout(`${BASE_URL}/login`);
  assert(res.status === 200, await describeResponse(res));
  const body = await res.text();
  const looksLikeLogin =
    body.includes('Member Portal') ||
    body.toLowerCase().includes('sign in') ||
    body.toLowerCase().includes('log in') ||
    /<form[^>]*>/i.test(body);
  assert(looksLikeLogin, 'login page missing recognisable login form');
  const hasOidcButton = body.includes('/api/auth/oidc/login');
  return hasOidcButton ? 'OIDC button present' : 'OIDC button hidden (env not set yet)';
});

await check('GET /robots.txt', async () => {
  const res = await fetchWithTimeout(`${BASE_URL}/robots.txt`);
  assert(res.status === 200, await describeResponse(res));
});

await check('GET /sitemap.xml', async () => {
  const res = await fetchWithTimeout(`${BASE_URL}/sitemap.xml`);
  assert(res.status === 200, await describeResponse(res));
});

await check('GET PWA manifest is valid', async () => {
  // Next 16 serves manifest.ts as /manifest.webmanifest, but some installs
  // also expose it at /site.webmanifest. Try both.
  const candidates = ['/manifest.webmanifest', '/site.webmanifest', '/manifest.json'];
  let res, path;
  for (const p of candidates) {
    res = await fetchWithTimeout(`${BASE_URL}${p}`);
    if (res.status === 200) { path = p; break; }
  }
  assert(res && res.status === 200, `no manifest at ${candidates.join(', ')}`);
  const json = await res.json();
  assert(json.name && json.start_url && Array.isArray(json.icons),
    'manifest missing required keys');
  return `${path} → name="${json.name}", ${json.icons.length} icons`;
});

// ---------------------------------------------------------------------
// Health + integration matrix
// ---------------------------------------------------------------------

await check('GET /api/health -> ok:true', async () => {
  const res = await fetchWithTimeout(`${BASE_URL}/api/health`);
  assert(res.status === 200, await describeResponse(res));
  const json = await res.json();
  assert(json.ok === true, 'ok != true');
  const ints = json.integrations || {};
  const live = Object.entries(ints).filter(([, v]) => v).map(([k]) => k);
  return `integrations=[${live.join(',') || 'none'}]`;
});

// ---------------------------------------------------------------------
// Deployment freshness probe.
// /api/crm/permissions is the simplest "is the new build live?" canary
// because it's a GET that always returns JSON (401 unauth, 200 auth).
// If it returns 404 HTML, the deployment is stale and every later
// CRM/sync check below will cascade into false-pass-as-404.
// Fail loudly here so the operator immediately knows to redeploy.
// ---------------------------------------------------------------------
await check('Deployment carries Phase 1-17 routes (canary)', async () => {
  const res = await fetchWithTimeout(`${BASE_URL}/api/crm/permissions`);
  const ct = res.headers.get('content-type') || '';
  if (res.status === 404 && /html/i.test(ct)) {
    throw new Error(
      'production deployment is STALE — /api/crm/* routes missing. ' +
      'Run the "Sync Vercel env vars and redeploy" workflow on main to fix.',
    );
  }
  assert([401, 403, 200].includes(res.status), await describeResponse(res));
  return `${res.status} (canary route mounted)`;
});

// ---------------------------------------------------------------------
// OIDC: should 503 cleanly when env not yet set, 302 when set.
// This is the only check that needs to see the raw redirect, hence
// redirect:'manual'.
// ---------------------------------------------------------------------

await check('GET /api/auth/oidc/login (503 or 302)', async () => {
  const res = await fetchWithTimeout(`${BASE_URL}/api/auth/oidc/login`, {
    redirect: 'manual',
  });
  if (res.status === 503) {
    const json = await res.json();
    assert(json.error === 'oidc_not_configured', 'unexpected 503 body');
    return 'oidc_not_configured (expected pre-IdP)';
  }
  if ([301, 302, 303, 307, 308].includes(res.status)) {
    const loc = res.headers.get('location') || '';
    assert(loc, 'redirect with no Location header');
    return `redirects to: ${loc.slice(0, 80)}`;
  }
  throw new Error(await describeResponse(res));
});

// ---------------------------------------------------------------------
// RBAC guards: all CRM endpoints must reject unauthenticated callers
// ---------------------------------------------------------------------

const guardedReadEndpoints = [
  '/api/crm/permissions',
  '/api/crm/members',
  '/api/crm/clubs',
  '/api/crm/districts',
  '/api/crm/attendance',
  '/api/crm/audit',
  '/api/crm/analytics',
  '/api/crm/integrations',
  '/api/sync/logs',
];

for (const path of guardedReadEndpoints) {
  await check(`GET ${path} rejects unauthenticated`, async () => {
    const res = await fetchWithTimeout(`${BASE_URL}${path}`);
    // 401/403 = auth guard fired (ideal). 405 = method exists but not GET.
    // 404 is NOT accepted here — the canary above ensures the routes
    // are deployed, so a 404 means a real regression.
    assert([401, 403, 405].includes(res.status), await describeResponse(res));
    return `${res.status}`;
  });
}

// /api/crm/officers/[id] only exports DELETE — verify it rejects DELETE
// without auth (405 if GET, 401/403 if DELETE).
await check('DELETE /api/crm/officers/<uuid> rejects unauthenticated', async () => {
  const res = await fetchWithTimeout(
    `${BASE_URL}/api/crm/officers/00000000-0000-0000-0000-000000000000`,
    { method: 'DELETE' },
  );
  assert([401, 403, 404].includes(res.status), await describeResponse(res));
  return `${res.status}`;
});

const guardedWriteEndpoints = [
  { method: 'POST', path: '/api/crm/members' },
  { method: 'POST', path: '/api/crm/clubs' },
  { method: 'POST', path: '/api/crm/districts' },
  { method: 'POST', path: '/api/sync/run' },
];

for (const { method, path } of guardedWriteEndpoints) {
  await check(`${method} ${path} rejects unauthenticated`, async () => {
    const res = await fetchWithTimeout(`${BASE_URL}${path}`, {
      method,
      headers: { 'content-type': 'application/json' },
      body: '{}',
    });
    // 400 = body validation runs before auth; 401/403 = auth guard fired.
    // 404 means the route isn't deployed (caught earlier by the canary,
    // but reject it here too so a partial deploy can't slip past).
    assert([400, 401, 403].includes(res.status), await describeResponse(res));
    return `${res.status}`;
  });
}

// ---------------------------------------------------------------------
// Security headers (best-effort — Vercel may strip some on certain edges)
// ---------------------------------------------------------------------

await check('Security headers on /', async () => {
  const res = await fetchWithTimeout(`${BASE_URL}/`);
  const required = ['x-frame-options', 'x-content-type-options', 'referrer-policy'];
  const missing = required.filter((h) => !res.headers.get(h));
  assert(missing.length === 0, `missing headers: ${missing.join(', ')}`);
});

await check('No-store on /api/crm/permissions', async () => {
  const res = await fetchWithTimeout(`${BASE_URL}/api/crm/permissions`);
  const cc = res.headers.get('cache-control') || '';
  // Either `no-store` (set by vercel.json) or Next default `private, no-cache`
  // is acceptable — both prevent CDN caching of authenticated responses.
  assert(/no-store|no-cache/i.test(cc), `cache-control="${cc}" lacks no-store/no-cache`);
  return cc;
});

// ---------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------

const passed = results.filter((r) => r.ok).length;
const failed = results.length - passed;

console.log('\n────────────────────────────────────────────');
console.log(`Target:  ${BASE_URL}`);
console.log(`Passed:  ${passed}/${results.length}`);
console.log(`Failed:  ${failed}/${results.length}`);
console.log('────────────────────────────────────────────');

// Machine-readable summary block — easy to copy from a failed CI run
// back to a maintainer / chat for debugging.
console.log('\n========== SMOKE TEST REPORT ==========');
console.log(`target: ${BASE_URL}`);
for (const r of results) {
  console.log(`${r.ok ? 'PASS' : 'FAIL'}\t${r.name}\t${r.detail}`);
}
console.log('========== END REPORT ==========');

if (failed > 0) process.exit(1);
process.exit(0);
