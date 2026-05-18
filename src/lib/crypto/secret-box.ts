/**
 * AES-256-GCM symmetric encryption for secrets stored in Postgres
 * (OAuth tokens, OIDC client_secret, Lions API keys, webhook secrets).
 *
 * Keyed off SECRET_ENCRYPTION_KEY: a base64- or hex-encoded 32-byte key.
 * If unset, encrypt() returns the plaintext as-is (back-compat with
 * existing rows). decrypt() transparently handles both wrapped and
 * legacy plaintext values, so callers don't branch.
 *
 * Format of an encrypted value: "enc:v1:<base64(iv)>:<base64(ciphertext+tag)>"
 * The "enc:v1:" prefix lets us detect wrapped vs. legacy plaintext at
 * read time and rotate the version later without a forced re-encrypt.
 */
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const VERSION = 'enc:v1:';
const ALGO = 'aes-256-gcm';

let cachedKey: Buffer | null | undefined;

function loadKey(): Buffer | null {
  if (cachedKey !== undefined) return cachedKey;
  const raw = process.env.SECRET_ENCRYPTION_KEY?.trim();
  if (!raw) {
    cachedKey = null;
    return null;
  }
  // Accept base64 (44 chars), hex (64 chars), or raw 32-byte utf8.
  let buf: Buffer;
  if (/^[A-Za-z0-9+/=]+$/.test(raw) && raw.length >= 43) {
    buf = Buffer.from(raw, 'base64');
  } else if (/^[0-9a-fA-F]{64}$/.test(raw)) {
    buf = Buffer.from(raw, 'hex');
  } else {
    buf = Buffer.from(raw, 'utf8');
  }
  if (buf.length !== 32) {
    throw new Error(
      `SECRET_ENCRYPTION_KEY must decode to 32 bytes (got ${buf.length}). ` +
      'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'base64\'))"',
    );
  }
  cachedKey = buf;
  return buf;
}

export function isEncryptionConfigured(): boolean {
  return loadKey() !== null;
}

export function isWrapped(value: string | null | undefined): boolean {
  return typeof value === 'string' && value.startsWith(VERSION);
}

export function encrypt(plaintext: string | null | undefined): string | null {
  if (plaintext == null || plaintext === '') return plaintext ?? null;
  if (isWrapped(plaintext)) return plaintext;
  const key = loadKey();
  if (!key) return plaintext;
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, key, iv);
  const ct = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return VERSION + iv.toString('base64') + ':' + Buffer.concat([ct, tag]).toString('base64');
}

export function decrypt(value: string | null | undefined): string | null {
  if (value == null || value === '') return value ?? null;
  if (!isWrapped(value)) return value;
  const key = loadKey();
  if (!key) {
    throw new Error(
      'Encrypted value found but SECRET_ENCRYPTION_KEY is not set. ' +
      'Restore the key or rotate the affected row.',
    );
  }
  const rest = value.slice(VERSION.length);
  const colon = rest.indexOf(':');
  if (colon < 0) throw new Error('malformed encrypted value');
  const iv = Buffer.from(rest.slice(0, colon), 'base64');
  const blob = Buffer.from(rest.slice(colon + 1), 'base64');
  const tag = blob.subarray(blob.length - 16);
  const ct = blob.subarray(0, blob.length - 16);
  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ct), decipher.final()]).toString('utf8');
}

/** Map helper: encrypt every value in a string→string record. */
export function encryptFields<T extends Record<string, string | null | undefined>>(
  obj: T,
): { [K in keyof T]: string | null } {
  const out = {} as { [K in keyof T]: string | null };
  for (const k of Object.keys(obj) as (keyof T)[]) {
    out[k] = encrypt(obj[k]) ?? null;
  }
  return out;
}
