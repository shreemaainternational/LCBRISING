import { NextResponse } from 'next/server';
import { videoGenerateSchema } from '@/lib/validation/schemas';
import { generateVideo } from '@/lib/video';
import { createAdminClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: Request) {
  try { await requireAdmin(); } catch (err) { if (err instanceof Response) return err; }

  const body = await req.json().catch(() => null);
  const parsed = videoGenerateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid', details: parsed.error.flatten() }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data: video, error } = await supabase
    .from('videos').insert({
      title: parsed.data.title,
      script: parsed.data.script,
      scenes: parsed.data.scenes,
      aspect_ratio: parsed.data.aspect_ratio,
      audio_url: parsed.data.audio_url ?? null,
      status: 'rendering',
    })
    .select('id').single();
  if (error || !video) return NextResponse.json({ error: error?.message }, { status: 500 });

  try {
    const result = await generateVideo(parsed.data);
    await supabase.from('videos').update({
      status: result.status === 'ready' ? 'ready' : 'pending',
      video_url: result.video_url,
      thumbnail_url: result.thumbnail_url,
      external_id: result.external_id,
    }).eq('id', video.id);
    return NextResponse.json({ video_id: video.id, ...result });
  } catch (err) {
    await supabase.from('videos').update({
      status: 'failed',
    }).eq('id', video.id);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Video error' },
      { status: 500 },
    );
  }
}
