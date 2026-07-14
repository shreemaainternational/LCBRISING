import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { extractBill } from '@/lib/ai/bill-ocr';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * POST /api/ai/ocr/bill — multipart/form-data with `file` field, OR
 * application/json with { base64, mimeType }.
 */
export async function POST(req: Request) {
  try { await requireAdmin(); } catch (err) { if (err instanceof Response) return err; throw err; }

  const ct = req.headers.get('content-type') ?? '';
  let bytes: Uint8Array | null = null;
  let mime = 'image/jpeg';

  if (ct.includes('multipart/form-data')) {
    const form = await req.formData();
    const file = form.get('file');
    if (!(file instanceof File)) return NextResponse.json({ error: 'no_file' }, { status: 400 });
    bytes = new Uint8Array(await file.arrayBuffer());
    mime = file.type || 'image/jpeg';
  } else if (ct.includes('application/json')) {
    const body = await req.json().catch(() => null) as { base64?: string; mimeType?: string } | null;
    if (!body?.base64) return NextResponse.json({ error: 'no_base64' }, { status: 400 });
    bytes = Uint8Array.from(Buffer.from(body.base64.replace(/^data:[^;]+;base64,/, ''), 'base64'));
    mime = body.mimeType ?? 'image/jpeg';
  } else {
    return NextResponse.json({ error: 'unsupported_content_type' }, { status: 415 });
  }

  if (!bytes?.length) return NextResponse.json({ error: 'empty_payload' }, { status: 400 });
  if (bytes.length > 10 * 1024 * 1024) {
    return NextResponse.json({ error: 'file_too_large', limit: 10485760 }, { status: 413 });
  }

  const result = await extractBill(bytes, mime);
  if (!result) return NextResponse.json({ error: 'ocr_failed_or_not_configured' }, { status: 503 });
  return NextResponse.json({ ok: true, result });
}
