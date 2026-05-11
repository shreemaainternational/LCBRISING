import { randomBytes, createHash } from 'crypto';

function base64url(input: Buffer): string {
  return input.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function generatePkce(): { verifier: string; challenge: string; method: 'S256' } {
  const verifier = base64url(randomBytes(32));
  const challenge = base64url(createHash('sha256').update(verifier).digest());
  return { verifier, challenge, method: 'S256' };
}

export function generateState(): string {
  return base64url(randomBytes(24));
}

export function generateNonce(): string {
  return base64url(randomBytes(24));
}
