import { createHmac } from 'node:crypto';

/** Separate, short-lived service credentials. Auth.js session cookies stay encrypted. */
export function serviceToken(userId: string, audience = 'openlintel-services', projectId?: string) {
  const secret = process.env.JWT_SECRET;
  if (!secret || Buffer.byteLength(secret) < 32 || secret === process.env.AUTH_SECRET) {
    throw new Error('A distinct JWT_SECRET of at least 32 bytes is required');
  }
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({ sub: userId, iss: 'openlintel-web', aud: audience,
    iat: now, exp: now + 300, ...(projectId ? { projectId } : {}) })).toString('base64url');
  const message = `${header}.${payload}`;
  return `${message}.${createHmac('sha256', secret).update(message).digest('base64url')}`;
}
