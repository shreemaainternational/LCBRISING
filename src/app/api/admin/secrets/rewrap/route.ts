/**
 * One-shot AES-GCM rewrap for legacy plaintext secrets.
 *
 * After you set SECRET_ENCRYPTION_KEY for the first time, existing
 * rows in oauth_accounts, lions_api_settings and lions_oidc_settings
 * still contain plaintext tokens. Reads work transparently (decrypt()
 * passes plaintext through), but on disk they're unencrypted. Hit this
 * endpoint once to walk every row, wrap any value that is not already
 * "enc:v1:..."-prefixed, and write it back.
 *
 * Idempotent. Encrypted rows are skipped on subsequent runs.
 *
 * Audit: every batch logs to the audit trail with counts. Errors per
 * row are returned (capped at 50) so an operator can investigate.
 */
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { requirePermission, isGuardFailure } from '@/lib/rbac/guard';
import { encrypt, isEncryptionConfigured, isWrapped } from '@/lib/crypto/secret-box';
import { writeAudit } from '@/lib/audit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

type TableSpec = {
  table: string;
  idCol: string;
  fields: string[];
  match?: { col: string; val: unknown };
};

const SPECS: TableSpec[] = [
  { table: 'oauth_accounts',        idCol: 'id', fields: ['access_token', 'refresh_token', 'id_token'] },
  { table: 'lions_api_settings',    idCol: 'id', fields: ['api_key', 'access_token', 'webhook_secret'],
    match: { col: 'id', val: 'singleton' } },
  { table: 'lions_oidc_settings',   idCol: 'id', fields: ['client_secret'] },
];

async function rewrapTable(supa: ReturnType<typeof createAdminClient>, spec: TableSpec) {
  let query = supa.from(spec.table).select([spec.idCol, ...spec.fields].join(','));
  if (spec.match) query = query.eq(spec.match.col, spec.match.val);
  const { data, error } = await query;
  if (error) return { table: spec.table, scanned: 0, wrapped: 0, failed: 0, errors: [error.message] };

  let wrapped = 0, failed = 0;
  const errors: string[] = [];
  for (const row of (data ?? []) as unknown as Record<string, unknown>[]) {
    const update: Record<string, string | null> = {};
    let dirty = false;
    for (const field of spec.fields) {
      const v = row[field];
      if (typeof v !== 'string' || v === '' || isWrapped(v)) continue;
      const w = encrypt(v);
      if (w && w !== v) {
        update[field] = w;
        dirty = true;
      }
    }
    if (!dirty) continue;
    const id = row[spec.idCol];
    const { error: upErr } = await supa
      .from(spec.table).update(update).eq(spec.idCol, id as string | number);
    if (upErr) {
      failed++;
      if (errors.length < 50) errors.push(`${spec.table}#${id}: ${upErr.message}`);
    } else {
      wrapped++;
    }
  }
  return { table: spec.table, scanned: data?.length ?? 0, wrapped, failed, errors };
}

export async function POST(_req: Request) {
  const actor = await requirePermission('rbac.manage');
  if (isGuardFailure(actor)) return actor;
  if (!isEncryptionConfigured()) {
    return NextResponse.json({
      error: 'SECRET_ENCRYPTION_KEY not set; cannot wrap',
    }, { status: 400 });
  }

  const supa = createAdminClient();
  const results = [];
  for (const spec of SPECS) results.push(await rewrapTable(supa, spec));

  const totals = results.reduce((a, r) => ({
    scanned: a.scanned + r.scanned, wrapped: a.wrapped + r.wrapped, failed: a.failed + r.failed,
  }), { scanned: 0, wrapped: 0, failed: 0 });

  await writeAudit({
    action: 'secrets.rewrap',
    actor_user_id: actor.user_id,
    actor_member_id: actor.member_id ?? null,
    payload: { ...totals, per_table: results.map(({ errors: _e, ...r }) => r) },
  });

  return NextResponse.json({ ok: true, ...totals, results });
}
