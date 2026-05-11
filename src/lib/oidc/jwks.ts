import { createPublicKey, createVerify, type JsonWebKey, type KeyObject } from 'crypto';
import { discover } from './discovery';

type Jwk = {
  kty: string;
  kid?: string;
  alg?: string;
  use?: string;
  n?: string; e?: string;          // RSA
  crv?: string; x?: string; y?: string; // EC (not currently supported here)
};

type JwksResponse = { keys: Jwk[] };

let cache: { keys: Map<string, KeyObject>; expiresAt: number; alg: Map<string, string> } | null = null;
const TTL_MS = 10 * 60 * 1000;

async function loadKeys(): Promise<{ keys: Map<string, KeyObject>; alg: Map<string, string> }> {
  const now = Date.now();
  if (cache && cache.expiresAt > now) return cache;

  const doc = await discover();
  if (!doc.jwks_uri) throw new Error('OIDC provider has no jwks_uri');
  const res = await fetch(doc.jwks_uri, {
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`JWKS fetch failed: ${res.status}`);
  const body = (await res.json()) as JwksResponse;

  const keys = new Map<string, KeyObject>();
  const alg = new Map<string, string>();
  for (const jwk of body.keys ?? []) {
    if (jwk.kty !== 'RSA' || !jwk.kid) continue;
    const key = createPublicKey({ key: jwk as unknown as JsonWebKey, format: 'jwk' });
    keys.set(jwk.kid, key);
    alg.set(jwk.kid, jwk.alg ?? 'RS256');
  }
  cache = { keys, alg, expiresAt: now + TTL_MS };
  return cache;
}

function base64urlDecode(input: string): Buffer {
  return Buffer.from(input.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
}

const ALG_TO_DIGEST: Record<string, string> = {
  RS256: 'sha256',
  RS384: 'sha384',
  RS512: 'sha512',
};

export type VerifiedIdToken = {
  header: Record<string, unknown>;
  payload: Record<string, unknown>;
};

/**
 * Verify an OIDC ID token signature against the provider's JWKS, plus
 * the standard issuer/audience/expiry claims. Throws on failure.
 *
 * Caveat: only RSA signing algorithms (RS256/384/512) are supported.
 * Most major IdPs default to RS256.
 */
export async function verifyIdToken(
  idToken: string,
  opts: { clientId: string; issuer: string; nonce?: string },
): Promise<VerifiedIdToken> {
  const parts = idToken.split('.');
  if (parts.length !== 3) throw new Error('id_token: not a JWT');

  const header = JSON.parse(base64urlDecode(parts[0]).toString('utf8')) as Record<string, unknown>;
  const payload = JSON.parse(base64urlDecode(parts[1]).toString('utf8')) as Record<string, unknown>;
  const signature = base64urlDecode(parts[2]);

  const kid = typeof header.kid === 'string' ? header.kid : undefined;
  const alg = typeof header.alg === 'string' ? header.alg : '';
  const digest = ALG_TO_DIGEST[alg];
  if (!digest) throw new Error(`id_token: unsupported alg ${alg}`);
  if (!kid) throw new Error('id_token: header missing kid');

  const { keys } = await loadKeys();
  const key = keys.get(kid);
  if (!key) throw new Error(`id_token: no JWKS key matches kid=${kid}`);

  const verifier = createVerify(digest);
  verifier.update(`${parts[0]}.${parts[1]}`);
  verifier.end();
  const ok = verifier.verify(key, signature);
  if (!ok) throw new Error('id_token: signature invalid');

  // Standard claim checks
  const now = Math.floor(Date.now() / 1000);
  if (typeof payload.exp !== 'number' || payload.exp < now) {
    throw new Error('id_token: expired');
  }
  if (typeof payload.iss !== 'string' || payload.iss.replace(/\/$/, '') !== opts.issuer.replace(/\/$/, '')) {
    throw new Error(`id_token: issuer mismatch (got ${String(payload.iss)})`);
  }
  const aud = payload.aud;
  const audMatches = Array.isArray(aud) ? aud.includes(opts.clientId) : aud === opts.clientId;
  if (!audMatches) throw new Error('id_token: audience mismatch');
  if (opts.nonce && payload.nonce !== opts.nonce) {
    throw new Error('id_token: nonce mismatch');
  }
  return { header, payload };
}
