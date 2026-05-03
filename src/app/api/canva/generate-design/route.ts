import { NextResponse } from 'next/server';
import { canvaDesignSchema } from '@/lib/validation/schemas';
import { createAutofillJob } from '@/lib/canva/client';
import { createAdminClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth';
import { enqueueJob } from '@/lib/automation/engine';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try { await requireAdmin(); } catch (err) { if (err instanceof Response) return err; }

  const body = await req.json().catch(() => null);
  const parsed = canvaDesignSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid', details: parsed.error.flatten() }, { status: 400 });
  }

  const supabase = createAdminClient();

  // Persist a placeholder creative row first so we can update it as the
  // Canva job progresses
  const { data: creative, error: cErr } = await supabase
    .from('creatives')
    .insert({
      template_type: parsed.data.template_type,
      template_id: parsed.data.template_id,
      data: parsed.data.data,
      activity_id: parsed.data.activity_id ?? null,
      event_id: parsed.data.event_id ?? null,
      member_id: parsed.data.member_id ?? null,
      status: 'rendering',
    })
    .select('id').single();
  if (cErr || !creative) return NextResponse.json({ error: cErr?.message }, { status: 500 });

  try {
    const job = await createAutofillJob({
      templateKey: parsed.data.template_type,
      data: parsed.data.data,
      title: `${parsed.data.template_type}-${creative.id}`,
    });

    await supabase.from('creatives').update({
      external_id: job.designId ?? job.jobId,
      template_id: job.templateId,
    }).eq('id', creative.id);

    // Schedule a follow-up to poll Canva and persist the export URL
    await enqueueJob('poll_canva_design', {
      creative_id: creative.id,
      job_id: job.jobId,
      design_id: job.designId,
      format: parsed.data.format,
    }, new Date(Date.now() + 5_000));

    return NextResponse.json({ creative_id: creative.id, job_id: job.jobId });
  } catch (err) {
    await supabase.from('creatives').update({
      status: 'failed',
      data: { ...parsed.data.data, error: err instanceof Error ? err.message : String(err) },
    }).eq('id', creative.id);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Canva error' },
      { status: 500 },
    );
  }
}
