#!/usr/bin/env node
/**
 * Tracked Supabase migration runner for supabase/migrations/NNNN_name.sql.
 *
 *   node scripts/migrations.mjs check [--base <git-ref>]
 *   node scripts/migrations.mjs status
 *   node scripts/migrations.mjs baseline --through <NNNN>
 *   node scripts/migrations.mjs apply [--if-baselined]
 *
 * `check` is offline. The other commands talk to the Supabase Management API
 * and need SUPABASE_ACCESS_TOKEN (+ optional SUPABASE_PROJECT_REF).
 *
 * Production migrations were historically pasted into the SQL editor, so the
 * database has no record of what ran. `apply` therefore refuses to run until
 * `baseline` has recorded the already-applied files; otherwise it would
 * replay every migration since 0001 against live data.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

const DIR = 'supabase/migrations';
const FILE_RE = /^(\d{4})_([a-z0-9_]+)\.sql$/;
const DESTRUCTIVE_RE =
  /\b(drop\s+table|drop\s+schema|drop\s+column|truncate|delete\s+from)\b/i;
const PROJECT_REF = process.env.SUPABASE_PROJECT_REF || 'mvtqqlfzawyhntnsavbx';

function fail(msg) {
  console.error(`::error::${msg}`);
  process.exit(1);
}

function loadFiles() {
  return readdirSync(DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort()
    .map((file) => {
      const m = FILE_RE.exec(file);
      const sql = readFileSync(path.join(DIR, file), 'utf8');
      return {
        file,
        valid: !!m,
        version: m?.[1] ?? null,
        name: m?.[2] ?? null,
        sql,
        checksum: createHash('sha256').update(sql).digest('hex'),
      };
    });
}

function stripComments(sql) {
  return sql.replace(/\/\*[\s\S]*?\*\//g, '').replace(/--.*$/gm, '');
}

function git(args) {
  return execFileSync('git', args, { encoding: 'utf8' }).trim();
}

function cmdCheck(args) {
  const files = loadFiles();
  const errors = [];

  for (const f of files) {
    if (!f.valid) errors.push(`${f.file}: name must match NNNN_lowercase_name.sql`);
  }
  const byVersion = new Map();
  for (const f of files.filter((x) => x.valid)) {
    byVersion.set(f.version, [...(byVersion.get(f.version) ?? []), f.file]);
  }
  for (const [v, list] of byVersion) {
    if (list.length > 1) errors.push(`duplicate version ${v}: ${list.join(', ')}`);
  }

  const baseIdx = args.indexOf('--base');
  if (baseIdx !== -1) {
    const base = args[baseIdx + 1];
    const mergeBase = git(['merge-base', base, 'HEAD']);
    const baseFiles = git(['ls-tree', '--name-only', `${mergeBase}`, `${DIR}/`])
      .split('\n')
      .map((p) => path.basename(p))
      .filter((f) => FILE_RE.test(f));
    const baseMax = baseFiles.map((f) => f.slice(0, 4)).sort().at(-1) ?? '0000';

    const added = git(['diff', '--name-only', '--diff-filter=A', mergeBase, 'HEAD', '--', DIR])
      .split('\n').filter(Boolean).map((p) => path.basename(p));
    const modified = git(['diff', '--name-only', '--diff-filter=M', mergeBase, 'HEAD', '--', DIR])
      .split('\n').filter(Boolean).map((p) => path.basename(p));

    for (const file of added) {
      const f = files.find((x) => x.file === file);
      if (!f?.valid) continue;
      if (f.version <= baseMax) {
        errors.push(`${file}: version ${f.version} is not above the base's latest (${baseMax})`);
      }
    }
    for (const file of modified) {
      console.log(`::warning::${file} edits an already-shipped migration; production will not re-run it.`);
    }

    const allowDestructive = process.env.ALLOW_DESTRUCTIVE === '1';
    for (const file of [...added, ...modified]) {
      const f = files.find((x) => x.file === file);
      if (!f) continue;
      const hit = stripComments(f.sql).match(DESTRUCTIVE_RE);
      if (!hit) continue;
      const msg = `${file}: destructive SQL ("${hit[0]}")`;
      if (allowDestructive) console.log(`::warning::${msg} — allowed by label`);
      else errors.push(`${msg} needs the "migration:destructive-approved" label`);
    }
  }

  if (errors.length) {
    for (const e of errors) console.error(`::error::${e}`);
    process.exit(1);
  }
  console.log(`Migrations OK: ${files.length} files, latest ${files.at(-1)?.version ?? 'none'}.`);
}

async function query(sql) {
  const token = process.env.SUPABASE_ACCESS_TOKEN;
  if (!token) fail('SUPABASE_ACCESS_TOKEN is not set');
  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sql }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Supabase query failed (HTTP ${res.status}): ${text}`);
  return text ? JSON.parse(text) : [];
}

const lit = (s) => `'${String(s).replace(/'/g, "''")}'`;

async function ensureTable() {
  await query(`
    create schema if not exists lcb_ops;
    revoke all on schema lcb_ops from anon, authenticated;
    create table if not exists lcb_ops.schema_migrations (
      version    text primary key,
      name       text not null,
      checksum   text not null,
      applied_at timestamptz not null default now(),
      method     text not null
    );`);
}

async function appliedRows() {
  await ensureTable();
  return query('select version, name, checksum, method from lcb_ops.schema_migrations order by version;');
}

async function cmdStatus() {
  const rows = await appliedRows();
  const applied = new Map(rows.map((r) => [r.version, r]));
  const files = loadFiles().filter((f) => f.valid);
  for (const f of files) {
    const r = applied.get(f.version);
    const state = !r ? 'PENDING' : r.checksum === f.checksum ? r.method : `${r.method} (file changed since)`;
    console.log(`${f.version}  ${state.padEnd(28)} ${f.file}`);
  }
  if (!rows.length) console.log('\nNot baselined yet — run the baseline action before apply.');
}

async function cmdBaseline(args) {
  const idx = args.indexOf('--through');
  const through = idx !== -1 ? args[idx + 1] : null;
  if (!through || !/^\d{4}$/.test(through)) fail('baseline needs --through NNNN');
  await ensureTable();
  const files = loadFiles().filter((f) => f.valid && f.version <= through);
  if (!files.length) fail(`no migrations at or below ${through}`);
  const values = files
    .map((f) => `(${lit(f.version)}, ${lit(f.name)}, ${lit(f.checksum)}, 'baseline')`)
    .join(',\n');
  await query(`insert into lcb_ops.schema_migrations (version, name, checksum, method)
    values ${values} on conflict (version) do nothing;`);
  console.log(`Recorded ${files.length} migrations (<= ${through}) as already applied. Nothing was executed.`);
}

async function cmdApply(args) {
  const rows = await appliedRows();
  if (!rows.length) {
    const msg = 'lcb_ops.schema_migrations is empty. Run the "Migrations admin" workflow with action=baseline first; applying now would replay every migration.';
    if (args.includes('--if-baselined')) {
      console.log(`::warning::${msg} Skipping (this push changes no migrations).`);
      return;
    }
    fail(msg);
  }
  const byVersion = new Map(rows.map((r) => [r.version, r]));
  const byChecksum = new Map(rows.map((r) => [r.checksum, r]));
  const pending = loadFiles().filter((f) => f.valid && !byVersion.has(f.version));

  if (!pending.length) {
    console.log('No pending migrations.');
    return;
  }
  for (const f of pending) {
    const renamedFrom = byChecksum.get(f.checksum);
    if (renamedFrom) {
      // Identical SQL already ran under another number (a renumbered file).
      await query(`insert into lcb_ops.schema_migrations (version, name, checksum, method)
        values (${lit(f.version)}, ${lit(f.name)}, ${lit(f.checksum)}, ${lit(`renamed:${renamedFrom.version}`)});`);
      console.log(`↷ ${f.file} — same SQL as applied ${renamedFrom.version}, recorded without re-running`);
      continue;
    }
    console.log(`→ applying ${f.file}`);
    await query(`begin;
${f.sql}
;
insert into lcb_ops.schema_migrations (version, name, checksum, method)
  values (${lit(f.version)}, ${lit(f.name)}, ${lit(f.checksum)}, 'applied');
commit;`);
    console.log(`✓ ${f.file}`);
  }
}

const [cmd, ...args] = process.argv.slice(2);
try {
  if (cmd === 'check') cmdCheck(args);
  else if (cmd === 'status') await cmdStatus();
  else if (cmd === 'baseline') await cmdBaseline(args);
  else if (cmd === 'apply') await cmdApply(args);
  else fail('usage: migrations.mjs check [--base ref] | status | baseline --through NNNN | apply [--if-baselined]');
} catch (err) {
  fail(err instanceof Error ? err.message : String(err));
}
