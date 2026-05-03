import { NextResponse } from 'next/server';
import { rsvpSchema } from '@/lib/validation/schemas';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const parsed = rsvpSchema.safeParse({ ...body, event_id: id });
  if (!parsed.success) return NextResponse.json({ error: 'invalid' }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let memberId: string | null = null;
  if (user) {
    const { data: m } = await supabase.from('members').select('id').eq('user_id', user.id).maybeSingle();
    memberId = m?.id ?? null;
  }

  const { data, error } = await supabase
    .from('event_rsvps')
    .upsert({
      event_id: id,
      member_id: memberId,
      guest_name: parsed.data.guest_name ?? null,
      guest_email: parsed.data.guest_email ?? null,
      status: parsed.data.status,
    }, { onConflict: memberId ? 'event_id,member_id' : 'event_id,guest_email' })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ rsvp: data });
}
