import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 15;

const schema = z.object({
  issuer: z.string().url(),
  discovery_url: z.string().url().optional().or(z.literal('')),
});

/**
 * POST /api/integrations/oidc/test
 * Probes the discovery document without saving, so the wizard can
 * give the admin live feedback before committing.
 */
export async function POST(req: Request) {
  try { await requireAdmin(); } catch (err) { if (err instanceof Response) return err; }
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'invalid' }, { status: 400 });

  const url = parsed.data.discovery_url
    || `${parsed.data.issuer.replace(/\/$/, '')}/.well-known/openid-configuration`;

  try {
    const res = await fetch(url, { headers: { Accept: 'application/json' }, cache: 'no-store' });
    if (!res.ok) {
      return NextResponse.json({ ok: false, status: res.status, error: `discovery_failed:${res.status}` });
    }
    const doc = await res.json() as {
      issuer?: string;
      authorization_endpoint?: string;
      token_endpoint?: string;
      jwks_uri?: string;
      userinfo_endpoint?: string;
      scopes_supported?: string[];
    };
    if (!doc.authorization_endpoint || !doc.token_endpoint) {
      return NextResponse.json({ ok: false, error: 'missing_endpoints', doc });
    }
    return NextResponse.json({
      ok: true,
      doc: {
        issuer: doc.issuer,
        authorization_endpoint: doc.authorization_endpoint,
        token_endpoint: doc.token_endpoint,
        userinfo_endpoint: doc.userinfo_endpoint,
        jwks_uri: doc.jwks_uri,
        scopes_supported: doc.scopes_supported,
      },
    });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) });
  }
}
