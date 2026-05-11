import { getOidcConfig } from './config';

export type OidcDiscoveryDocument = {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  userinfo_endpoint?: string;
  end_session_endpoint?: string;
  jwks_uri?: string;
  code_challenge_methods_supported?: string[];
  scopes_supported?: string[];
  response_types_supported?: string[];
};

let cache: { doc: OidcDiscoveryDocument; expiresAt: number } | null = null;
const TTL_MS = 5 * 60 * 1000;

export async function discover(force = false): Promise<OidcDiscoveryDocument> {
  const now = Date.now();
  if (!force && cache && cache.expiresAt > now) return cache.doc;

  const cfg = getOidcConfig();
  const url =
    cfg.discoveryUrl ??
    `${cfg.issuer.replace(/\/$/, '')}/.well-known/openid-configuration`;

  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
    // OIDC discovery is short-lived; we cache in-process.
    cache: 'no-store',
  });
  if (!res.ok) {
    throw new Error(`OIDC discovery failed (${res.status}) at ${url}`);
  }
  const doc = (await res.json()) as OidcDiscoveryDocument;
  if (!doc.authorization_endpoint || !doc.token_endpoint) {
    throw new Error('OIDC discovery document missing required endpoints');
  }
  cache = { doc, expiresAt: now + TTL_MS };
  return doc;
}

export function clearDiscoveryCache() {
  cache = null;
}
