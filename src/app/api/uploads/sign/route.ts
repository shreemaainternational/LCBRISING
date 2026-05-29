import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { createAdminClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Per-file ceiling. Direct-to-storage uploads bypass the platform's
// serverless request-body limit, so this can comfortably fit phone photos.
const MAX_BYTES = 25 * 1024 * 1024; // 25 MB per file
const MAX_FILES_PER_REQUEST = 20;
const ALLOWED_MIME = new Set([
  'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif',
  'video/mp4', 'video/quicktime', 'video/webm',
  'application/pdf',
]);

interface SignRequest {
  folder?: string;
  files?: { name?: string; type?: string; size?: number }[];
}

interface SignedItem {
  ok: boolean;
  filename?: string;
  path?: string;
  token?: string;
  url?: string;
  type?: string;
  size?: number;
  error?: string;
}

/**
 * POST /api/uploads/sign
 * Issues short-lived signed upload URLs for the public `media` bucket so the
 * browser can stream each file straight to Supabase Storage — keeping the
 * request that hits this function tiny (just file metadata as JSON) and
 * avoiding the platform's ~4.5 MB serverless request-body cap (HTTP 413).
 */
export async function POST(req: Request) {
  try { await requireAdmin(); } catch (err) { if (err instanceof Response) return err; }

  const body = (await req.json().catch(() => null)) as SignRequest | null;
  const files = body?.files ?? [];
  if (!files.length) return NextResponse.json({ error: 'no_files' }, { status: 400 });
  if (files.length > MAX_FILES_PER_REQUEST) {
    return NextResponse.json({ error: 'too_many_files', limit: MAX_FILES_PER_REQUEST }, { status: 400 });
  }

  const folder = String(body?.folder ?? 'activities').replace(/[^a-z0-9/_-]/gi, '').slice(0, 64) || 'activities';
  const db = createAdminClient();

  const results: SignedItem[] = await Promise.all(files.map(async (f) => {
    const filename = f.name;
    const type = String(f.type ?? '');
    const size = Number(f.size ?? 0);
    if (!ALLOWED_MIME.has(type)) return { ok: false, filename, error: `unsupported_type:${type}` };
    if (size > MAX_BYTES)        return { ok: false, filename, error: `too_large:${size}` };

    const ext = (filename?.split('.').pop() ?? guessExt(type)).toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 6) || guessExt(type);
    const path = `${folder}/${Date.now()}-${randomUUID().slice(0, 12)}.${ext}`;

    const { data, error } = await db.storage.from('media').createSignedUploadUrl(path);
    if (error || !data) return { ok: false, filename, error: error?.message ?? 'sign_failed' };

    const { data: pub } = db.storage.from('media').getPublicUrl(data.path);
    return { ok: true, filename, path: data.path, token: data.token, url: pub.publicUrl, type, size };
  }));

  return NextResponse.json({ ok: results.every((r) => r.ok), files: results });
}

function guessExt(mime: string): string {
  if (mime === 'image/jpeg') return 'jpg';
  if (mime === 'application/pdf') return 'pdf';
  return (mime.split('/')[1] ?? 'bin').slice(0, 6);
}
