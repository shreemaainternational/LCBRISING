import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';

export const runtime = 'nodejs';

export async function GET() {
  if (!isSupabaseConfigured()) return NextResponse.json({ posts: [] });
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('social_posts').select('*').order('created_at', { ascending: false }).limit(200);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ posts: data });
}
