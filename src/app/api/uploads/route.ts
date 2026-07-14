import { NextResponse } from 'next/server';
import { createHash } from 'node:crypto';
import { createAdminClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB per file
const MAX_FILES_PER_REQUEST = 20;
const ALLOWED_MIME = new Set([
  'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif',
  'video/mp4', 'video/quicktime', 'video/webm',
  'application/pdf',
]);

interface UploadedItem {
  ok: boolean;
  url?: string;
  path?: string;
  size?: number;
  type?: string;
  filename?: string;
  hash?: string;
  error?: string;
}

/**
 * POST /api/uploads
 * Multi-file upload to the public `media` Supabase Storage bucket.
 * multipart/form-data with one or more `file` fields and an optional
 * `folder` field (default "activities"). Returns per-file results.
 */
export async function POST(req: Request) {
  try { await requireAdmin(); } catch (err) { if (err instanceof Response) return err; throw err; }

  const ct = req.headers.get('content-type') ?? '';
  if (!ct.includes('multipart/form-data')) {
    return NextResponse.json({ error: 'unsupported_content_type' }, { status: 415 });
  }

  const form = await req.formData();
  const folder = String(form.get('folder') ?? 'activities').replace(/[^a-z0-9/_-]/gi, '').slice(0, 64) || 'activities';
  const files = form.getAll('file').filter((f): f is File => f instanceof File && f.size > 0);

  if (!files.length) return NextResponse.json({ error: 'no_files' }, { status: 400 });
  if (files.length > MAX_FILES_PER_REQUEST) {
    return NextResponse.json({ error: 'too_many_files', limit: MAX_FILES_PER_REQUEST }, { status: 400 });
  }

  const db = createAdminClient();
  const results: UploadedItem[] = await Promise.all(files.map(async (file) => {
    try {
      if (!ALLOWED_MIME.has(file.type)) {
        return { ok: false, filename: file.name, error: `unsupported_type:${file.type}` };
      }
      if (file.size > MAX_BYTES) {
        return { ok: false, filename: file.name, error: `too_large:${file.size}` };
      }
      const bytes = new Uint8Array(await file.arrayBuffer());
      const hash = createHash('sha256').update(bytes).digest('hex').slice(0, 16);
      const ext = (file.name.split('.').pop() ?? guessExt(file.type)).toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 6) || guessExt(file.type);
      const path = `${folder}/${Date.now()}-${hash}.${ext}`;

      const { error } = await db.storage.from('media').upload(path, bytes, {
        contentType: file.type, upsert: false,
      });
      if (error) return { ok: false, filename: file.name, error: error.message };

      const { data: pub } = db.storage.from('media').getPublicUrl(path);
      return {
        ok: true,
        url: pub.publicUrl,
        path,
        size: file.size,
        type: file.type,
        filename: file.name,
        hash,
      };
    } catch (e) {
      return { ok: false, filename: file.name, error: String(e) };
    }
  }));

  return NextResponse.json({
    ok: results.every((r) => r.ok),
    count: results.filter((r) => r.ok).length,
    failed: results.filter((r) => !r.ok).length,
    files: results,
  });
}

function guessExt(mime: string): string {
  if (mime === 'image/jpeg') return 'jpg';
  if (mime === 'application/pdf') return 'pdf';
  return (mime.split('/')[1] ?? 'bin').slice(0, 6);
}
