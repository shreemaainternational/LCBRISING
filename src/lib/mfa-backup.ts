import { createHash, randomInt, timingSafeEqual } from 'node:crypto';
import { normalizeBackupCode } from '@/lib/mfa';

/** No 0/O/1/I/L — codes get read off paper and typed by hand. */
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const BACKUP_CODE_COUNT = 10;

/** One code, formatted `XXXXX-XXXXX` (~49 bits of entropy). */
function generateCode(): string {
  let s = '';
  for (let i = 0; i < 10; i++) s += ALPHABET[randomInt(ALPHABET.length)];
  return `${s.slice(0, 5)}-${s.slice(5)}`;
}

export function generateBackupCodes(n = BACKUP_CODE_COUNT): string[] {
  const set = new Set<string>();
  while (set.size < n) set.add(generateCode());
  return [...set];
}

/** Hash is bound to the user id so a leaked hash table can't be replayed across accounts. */
export function hashBackupCode(userId: string, code: string): string {
  return createHash('sha256').update(`${userId}:${normalizeBackupCode(code)}`).digest('hex');
}

export function hashesEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a, 'hex');
  const bb = Buffer.from(b, 'hex');
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}
