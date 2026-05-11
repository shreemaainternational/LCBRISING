import { getOidcConfig } from './config';
import { discover } from './discovery';
import { generateNonce, generatePkce, generateState } from './pkce';

export type AuthorizationRequest = {
  url: string;
  state: string;
  nonce: string;
  codeVerifier: string;
};

export type TokenResponse = {
  access_token: string;
  token_type: string;
  expires_in?: number;
  refresh_token?: string;
  refresh_expires_in?: number;
  id_token?: string;
  scope?: string;
};

export type UserInfo = {
  sub: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
  // Lions-specific claims (configurable on the IdP side)
  lions_member_id?: string;
  district_code?: string;
  club_id?: string;
  roles?: string[];
  [key: string]: unknown;
};

export async function buildAuthorizationRequest(
  extra: Record<string, string> = {},
): Promise<AuthorizationRequest> {
  const cfg = getOidcConfig();
  const doc = await discover();
  const { verifier, challenge, method } = generatePkce();
  const state = generateState();
  const nonce = generateNonce();

  const params = new URLSearchParams({
    client_id: cfg.clientId,
    redirect_uri: cfg.redirectUri,
    response_type: 'code',
    scope: cfg.scopes.join(' '),
    state,
    nonce,
    code_challenge: challenge,
    code_challenge_method: method,
    ...extra,
  });
  if (cfg.audience) params.set('audience', cfg.audience);

  return {
    url: `${doc.authorization_endpoint}?${params.toString()}`,
    state,
    nonce,
    codeVerifier: verifier,
  };
}

export async function exchangeCode(
  code: string,
  codeVerifier: string,
): Promise<TokenResponse> {
  const cfg = getOidcConfig();
  const doc = await discover();
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: cfg.redirectUri,
    client_id: cfg.clientId,
    code_verifier: codeVerifier,
  });
  if (cfg.clientSecret) body.set('client_secret', cfg.clientSecret);

  const res = await fetch(doc.token_endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: body.toString(),
    cache: 'no-store',
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token exchange failed (${res.status}): ${text.slice(0, 500)}`);
  }
  return (await res.json()) as TokenResponse;
}

export async function refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
  const cfg = getOidcConfig();
  const doc = await discover();
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: cfg.clientId,
  });
  if (cfg.clientSecret) body.set('client_secret', cfg.clientSecret);

  const res = await fetch(doc.token_endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: body.toString(),
    cache: 'no-store',
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Refresh failed (${res.status}): ${text.slice(0, 500)}`);
  }
  return (await res.json()) as TokenResponse;
}

export async function fetchUserInfo(accessToken: string): Promise<UserInfo> {
  const doc = await discover();
  if (!doc.userinfo_endpoint) {
    throw new Error('Provider does not expose a userinfo_endpoint');
  }
  const res = await fetch(doc.userinfo_endpoint, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
    cache: 'no-store',
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`userinfo failed (${res.status}): ${text.slice(0, 500)}`);
  }
  return (await res.json()) as UserInfo;
}

/**
 * Parse the unverified JWT payload of an id_token. The signature is NOT
 * verified here — production deployments should additionally verify via
 * the provider's JWKS. We rely on TLS + the state/PKCE/nonce binding for
 * the auth-code flow itself.
 */
export function decodeIdToken(idToken: string): Record<string, unknown> | null {
  const parts = idToken.split('.');
  if (parts.length !== 3) return null;
  try {
    const json = Buffer.from(
      parts[1].replace(/-/g, '+').replace(/_/g, '/'),
      'base64',
    ).toString('utf8');
    return JSON.parse(json);
  } catch {
    return null;
  }
}
