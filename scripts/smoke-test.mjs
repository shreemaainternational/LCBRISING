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
 *   BASE_URL=https://lcbrising.vercel.app node scripts/smoke-test.mjs
 *   BASE_URL=http://localhost:3000 node scripts/smoke-test.mjs
 *
 * Exit codes:
 *   0  - all checks passed
 *   1  - one or more checks failed
 */

const BASE_URL = (process.env.BASE_URL || 'https://lcbrising.vercel.app').replace(/\/$/, '');
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
      redirect: 'manual',
      headers: { 'user-agent': 'lcbrising-smoke/1.0', ...(init.headers || {}) },
    });
  } finally {
    clearTimeout(id);
  }
}

async function check(name, fn) {
  try {
    const detail = await fn();
    record(name, true, detail || '');
  } catch (err) {
    record(name, false, err instanceof Error ? err.message : String(err));
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
  assert(res.status === 200, `status=${res.status}`);
  const body = await res.text();
  assert(body.length > 1000, `body suspiciously small (${body.length} bytes)`);
  return `${(body.length / 1024).toFixed(1)} KB`;
});

await check('GET /login renders OIDC button state correctly', async () => {
  const res = await fetchWithTimeout(`${BASE_URL}/login`);
  assert(res.status === 200, `status=${res.status}`);
  const body = await res.text();
  assert(body.includes('Member Portal') || body.toLowerCase().includes('sign in'),
    'login page missing expected copy');
  // When OIDC is configured the "Login with Lions" button is server-rendered.
  const hasOidcButton = body.includes('/api/auth/oidc/login');
  return hasOidcButton ? 'OIDC button present' : 'OIDC button hidden (env not set yet)';
});

await check('GET /robots.txt', async () => {
  const res = await fetchWithTimeout(`${BASE_URL}/robots.txt`);
  assert(res.status === 200, `status=${res.status}`);
});

await check('GET /sitemap.xml', async () => {
  const res = await fetchWithTimeout(`${BASE_URL}/sitemap.xml`);
  assert(res.status === 200, `status=${res.status}`);
});

await check('GET /manifest.webmanifest is valid PWA manifest', async () => {
  const res = await fetchWithTimeout(`${BASE_URL}/manifest.webmanifest`);
  assert(res.status === 200, `status=${res.status}`);
  const json = await res.json();
  assert(json.name && json.start_url && Array.isArray(json.icons),
    'manifest missing required keys');
  return `name="${json.name}", ${json.icons.length} icons`;
});

// ---------------------------------------------------------------------
// Health + integration matrix
// ---------------------------------------------------------------------

await check('GET /api/health -> ok:true', async () => {
  const res = await fetchWithTimeout(`${BASE_URL}/api/health`);
  assert(res.status === 200, `status=${res.status}`);
  const json = await res.json();
  assert(json.ok === true, 'ok != true');
  const ints = json.integrations || {};
  const live = Object.entries(ints).filter(([, v]) => v).map(([k]) => k);
  return `integrations=[${live.join(',') || 'none'}]`;
});

// ---------------------------------------------------------------------
// OIDC: should 503 cleanly when env not yet set, 302 when set
// ---------------------------------------------------------------------

await check('GET /api/auth/oidc/login (503 or 302)', async () => {
  const res = await fetchWithTimeout(`${BASE_URL}/api/auth/oidc/login`);
  if (res.status === 503) {
    const json = await res.json();
    assert(json.error === 'oidc_not_configured', 'unexpected 503 body');
    return 'oidc_not_configured (expected pre-IdP)';
  }
  assert(res.status === 302 || res.status === 307,
    `expected 503 or redirect, got ${res.status}`);
  const loc = res.headers.get('location') || '';
  assert(/login|auth|sso/i.test(loc), `unexpected redirect target: ${loc}`);
  return `redirects to IdP: ${new URL(loc).host}`;
});

// ---------------------------------------------------------------------
// RBAC guards: all CRM endpoints must reject unauthenticated callers
// ---------------------------------------------------------------------

const guardedReadEndpoints = [
  '/api/crm/permissions',
  '/api/crm/members',
  '/api/crm/clubs',
  '/api/crm/districts',
  '/api/crm/officers/00000000-0000-0000-0000-000000000000',
  '/api/crm/attendance',
  '/api/crm/audit',
  '/api/crm/analytics',
  '/api/crm/integrations',
  '/api/sync/logs',
];

for (const path of guardedReadEndpoints) {
  await check(`GET ${path} rejects unauthenticated`, async () => {
    const res = await fetchWithTimeout(`${BASE_URL}${path}`);
    assert([401, 403, 404].includes(res.status), `expected 401/403/404, got ${res.status}`);
    return `${res.status}`;
  });
}

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
    assert([401, 403, 400].includes(res.status), `expected 401/403/400, got ${res.status}`);
    return `${res.status}`;
  });
}

// ---------------------------------------------------------------------
// Security headers
// ---------------------------------------------------------------------

await check('Security headers on /', async () => {
  const res = await fetchWithTimeout(`${BASE_URL}/`);
  const required = ['x-frame-options', 'x-content-type-options', 'referrer-policy'];
  const missing = required.filter((h) => !res.headers.get(h));
  assert(missing.length === 0, `missing: ${missing.join(', ')}`);
});

await check('No-store on /api/crm/permissions', async () => {
  const res = await fetchWithTimeout(`${BASE_URL}/api/crm/permissions`);
  const cc = res.headers.get('cache-control') || '';
  assert(/no-store/i.test(cc), `cache-control="${cc}" (expected no-store)`);
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

if (failed > 0) {
  console.log('\nFailures:');
  for (const r of results.filter((x) => !x.ok)) {
    console.log(`  ✗ ${r.name} — ${r.detail}`);
  }
  process.exit(1);
}
process.exit(0);
