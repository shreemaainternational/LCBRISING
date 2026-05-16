import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try { const supa = await createClient(); await supa.auth.signOut(); } catch { /* ignore */ }
  const res = NextResponse.redirect(new URL('/region/login', req.url));
  res.cookies.set('lcbr_crm', '', { path: '/', maxAge: 0 });
  return res;
}
