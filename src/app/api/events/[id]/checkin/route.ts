import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

/**
 * Event check-in endpoint. The QR code embeds:
 *   /api/events/{id}/checkin?token={qr_secret}&rsvp={rsvp_id}
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const url = new URL(req.url);
  const token = url.searchParams.get('token');
  const rsvpId = url.searchParams.get('rsvp');

  if (!token || !rsvpId) return NextResponse.json({ error: 'missing params' }, { status: 400 });

  const supabase = createAdminClient();
  const { data: event } = await supabase.from('events').select('qr_secret').eq('id', id).single();
  if (!event || event.qr_secret !== token) {
    return NextResponse.json({ error: 'invalid token' }, { status: 403 });
  }

  const { data, error } = await supabase
    .from('event_rsvps')
    .update({ attended_at: new Date().toISOString() })
    .eq('id', rsvpId).eq('event_id', id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, rsvp: data });
}
