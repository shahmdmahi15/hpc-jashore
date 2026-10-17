import { createHash } from 'node:crypto';

// SHA-256 hash of refresh JWTs for DB storage — the raw token never persists,
// so a DB leak alone cannot mint sessions.
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
