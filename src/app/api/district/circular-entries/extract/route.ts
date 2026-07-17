import { NextResponse } from 'next/server';
import { createHash } from 'node:crypto';
import { createAdminClient } from '@/lib/supabase/server';
import { requireDistrictGovernor } from '@/lib/district-portal';
import { extractCircularEntry } from '@/lib/ai/circular-extract';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const MAX_BYTES = 15 * 1024 * 1024; // 15 MB
const IMAGE_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif']);
const DOC_MIME = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-powerpoint',
]);

/**
 * POST /api/district/circular-entries/extract
 * multipart/form-data with a `file` (flyer image / PDF / presentation) and/or
 * a `text` field (pasted notice). Stores the file in the `media` bucket and
 * auto-segregates it into the circular table fields. Returns a preview entry
 * — it is NOT persisted; the client saves it via POST /circular-entries.
 */
export async function POST(req: Request) {
  await requireDistrictGovernor();

  const ct = req.headers.get('content-type') ?? '';
  if (!ct.includes('multipart/form-data')) {
    return NextResponse.json({ error: 'unsupported_content_type' }, { status: 415 });
  }

  const form = await req.formData();
  const file = form.get('file');
  const text = String(form.get('text') ?? '').trim() || undefined;
  const hasFile = file instanceof File && file.size > 0;

  if (!hasFile && !text) {
    return NextResponse.json({ error: 'no_input' }, { status: 400 });
  }

  const db = createAdminClient();
  let sourceUrl: string | null = null;
  let sourceKind: 'flyer' | 'pdf' | 'presentation' | 'image' | 'manual' = text ? 'manual' : 'image';
  let filename: string | undefined;
  let imageBytes: Uint8Array | undefined;
  let mimeType: string | undefined;

  if (hasFile) {
    const f = file as File;
    filename = f.name;
    mimeType = f.type;
    if (f.size > MAX_BYTES) return NextResponse.json({ error: 'too_large' }, { status: 400 });
    if (!IMAGE_MIME.has(f.type) && !DOC_MIME.has(f.type)) {
      return NextResponse.json({ error: `unsupported_type:${f.type}` }, { status: 400 });
    }

    const bytes = new Uint8Array(await f.arrayBuffer());
    if (IMAGE_MIME.has(f.type)) { imageBytes = bytes; sourceKind = 'flyer'; }
    else if (f.type === 'application/pdf') sourceKind = 'pdf';
    else sourceKind = 'presentation';

    // Persist the original so the entry keeps a link to its source document.
    const hash = createHash('sha256').update(bytes).digest('hex').slice(0, 16);
    const ext = (f.name.split('.').pop() ?? 'bin').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 6) || 'bin';
    const path = `circulars/${Date.now()}-${hash}.${ext}`;
    const { error: upErr } = await db.storage.from('media').upload(path, bytes, { contentType: f.type, upsert: false });
    if (!upErr) sourceUrl = db.storage.from('media').getPublicUrl(path).data.publicUrl;
  }

  const result = await extractCircularEntry({ imageBytes, mimeType, text, filename });

  return NextResponse.json({
    ok: true,
    source: result.source,
    confidence: result.confidence,
    ai_error: result.ai_error,
    // Ready to feed straight into POST /circular-entries.
    entry: {
      ...result.fields,
      source_kind: sourceKind,
      source_url: sourceUrl,
      source_filename: filename ?? null,
      extracted: result.source === 'ai',
      extraction_confidence: result.confidence,
    },
  });
}
