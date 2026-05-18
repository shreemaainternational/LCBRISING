import { NextResponse } from 'next/server';
import { integrations, env } from '@/lib/env';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Intentionally public: returns booleans only, never values. Lets an
// admin verify "is the OpenAI key bound to the running process?"
// without logging in to /admin.
export async function GET() {
  return NextResponse.json({
    ok: integrations.openai,
    openai_key_set: integrations.openai,
    model: env.OPENAI_MODEL ?? 'gpt-4o-mini',
    service_role_set: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
  });
}
