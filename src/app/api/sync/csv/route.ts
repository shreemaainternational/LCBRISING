import { NextRequest, NextResponse } from 'next/server';
import { requirePermission, isGuardFailure } from '@/lib/rbac';
import { runSyncJob, type SyncEntity } from '@/lib/sync';

export const dynamic = 'force-dynamic';

/** True when the upload is an Excel workbook (by extension or ZIP magic bytes). */
function isExcel(file: File, head: Uint8Array): boolean {
  const name = file.name.toLowerCase();
  if (name.endsWith('.xlsx') || name.endsWith('.xls') || name.endsWith('.xlsm')) return true;
  // .xlsx is a ZIP → starts with "PK\x03\x04"; legacy .xls (OLE2) with 0xD0CF.
  if (head[0] === 0x50 && head[1] === 0x4b) return true;
  if (head[0] === 0xd0 && head[1] === 0xcf) return true;
  return false;
}

/**
 * Convert the first worksheet of an Excel workbook to CSV text. Reading a
 * binary .xlsx with File.text() yields garbage full of NUL bytes (which then
 * breaks the downstream jsonb insert), so Excel uploads must be decoded with
 * a real parser before they reach the CSV adapters.
 */
async function excelToCsv(file: File): Promise<string> {
  const XLSX = await import('xlsx');
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array' });
  const sheetName = wb.SheetNames[0];
  const ws = sheetName ? wb.Sheets[sheetName] : undefined;
  if (!ws) return '';
  return XLSX.utils.sheet_to_csv(ws, { blankrows: false });
}

const ALLOWED: SyncEntity[] = [
  'members',
  'clubs',
  'districts',
  'officers',
  'attendance',
  'donations',
  'activities',
  'events',
];

/**
 * multipart/form-data upload:
 *   field `entity` — 'members' | 'clubs'
 *   field `file`   — the CSV file
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

  // Decode the upload: Excel workbooks are parsed to CSV, plain CSV is read
  // as text. We sniff the leading bytes so a mislabelled upload still works.
  const bytes = new Uint8Array(await file.slice(0, 8).arrayBuffer());
  let csv: string;
  try {
    csv = isExcel(file, bytes) ? await excelToCsv(file) : await file.text();
  } catch (err) {
    const message = err instanceof Error ? err.message : 'could not read file';
    return NextResponse.json({ error: 'file_unreadable', message }, { status: 400 });
  }

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
