import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { requirePermission, isGuardFailure } from '@/lib/rbac';
import { runSyncJob, type SyncEntity } from '@/lib/sync';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const ALLOWED: SyncEntity[] = [
  'members',
  'clubs',
  'officers',
  'attendance',
  'donations',
  'activities',
  'events',
];

/** Postgres text/jsonb cannot store NUL (U+0000); strip it (plus other
 *  non-tab/newline control chars) so a stray byte never surfaces as
 *  "unsupported Unicode escape sequence". */
function sanitize(text: string): string {
  return text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
}

/** True when the workbook is a Lions International "Member Contact Information"
 *  export (banner sheet or a "Contact Member ID" header). */
function isLionsMemberExport(wb: XLSX.WorkBook): boolean {
  if (wb.SheetNames.some((n) => /member contact information/i.test(n))) return true;
  const ws = wb.Sheets[wb.SheetNames[0]];
  if (!ws) return false;
  const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, blankrows: false, raw: true });
  for (let i = 0; i < Math.min(rows.length, 25); i++) {
    for (const c of rows[i] ?? []) {
      if (String(c ?? '').toLowerCase().replace(/[^a-z0-9]/g, '') === 'contactmemberid') return true;
    }
  }
  return false;
}

/**
 * multipart/form-data upload:
 *   field `entity` — 'members' | 'clubs' | …
 *   field `file`   — a CSV (or a generic Excel sheet, which is converted to CSV)
 *
 * RBAC: requires `sync.trigger`.
 */
export async function POST(req: NextRequest) {
  const actor = await requirePermission('sync.trigger');
  if (isGuardFailure(actor)) return actor;

  const form = await req.formData();
  const entity = String(form.get('entity') ?? '') as SyncEntity;
  const file = form.get('file');

  if (!ALLOWED.includes(entity)) {
    return NextResponse.json({ error: 'invalid_entity', allowed: ALLOWED }, { status: 400 });
  }
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'missing_file' }, { status: 400 });
  }
  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: 'file_too_large' }, { status: 413 });
  }

  const buf = Buffer.from(await file.arrayBuffer());
  // Detect an Excel workbook by extension or magic bytes (ZIP "PK" for .xlsx,
  // OLE "D0 CF" for legacy .xls) — reading it as text is what produced the
  // "unsupported Unicode escape sequence" crash.
  const looksExcel =
    /\.(xlsx|xlsm|xlsb|xls)$/i.test(file.name) ||
    (buf[0] === 0x50 && buf[1] === 0x4b) ||
    (buf[0] === 0xd0 && buf[1] === 0xcf);

  let csv: string;
  if (looksExcel) {
    let wb: XLSX.WorkBook;
    try {
      wb = XLSX.read(buf, { type: 'buffer', cellDates: true });
    } catch {
      return NextResponse.json(
        { error: 'unreadable_excel', message: 'Could not read this Excel file. Re-save it as .xlsx or export a plain .csv and try again.' },
        { status: 400 },
      );
    }
    // A Lions "Member Contact Information" export has a banner + grouped layout
    // and Lions-specific columns this generic CSV importer cannot map. Point the
    // admin at the purpose-built importer that reads it directly.
    if (isLionsMemberExport(wb)) {
      return NextResponse.json(
        {
          error: 'lions_export_detected',
          message:
            'This is a Lions International "Member Contact Information" export. Import it under ' +
            'Members → "Bulk upload (Excel)" instead — it reads this format directly, creates the club ' +
            'from the Account Name, links every member, and can place the club under a Region/Zone.',
        },
        { status: 400 },
      );
    }
    // Generic Excel → convert the first sheet to CSV and continue.
    const ws = wb.Sheets[wb.SheetNames[0]];
    if (!ws) return NextResponse.json({ error: 'empty_workbook', message: 'The Excel file has no sheets.' }, { status: 400 });
    csv = XLSX.utils.sheet_to_csv(ws);
  } else {
    csv = buf.toString('utf8');
  }

  csv = sanitize(csv);

  try {
    const { logId, result } = await runSyncJob({
      source: 'csv',
      entity,
      payload: { csv, filename: file.name },
      triggered_by: actor.member_id ?? null,
    });
    return NextResponse.json({ ok: true, log_id: logId, result });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'csv_sync_failed';
    return NextResponse.json({ error: 'csv_sync_failed', message }, { status: 500 });
  }
}
