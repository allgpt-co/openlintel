import jwt from 'jsonwebtoken';

export interface TokenPayload { id: string; projectId?: string; name?: string; exp: number }
export function verifyToken(token: string): TokenPayload {
  const secret = process.env.JWT_SECRET;
  if (!secret || Buffer.byteLength(secret) < 32) throw new Error('JWT_SECRET must be configured');
  const decoded = jwt.verify(token, secret, { algorithms: ['HS256'], issuer: 'openlintel-web', audience: 'openlintel-collaboration' });
  if (typeof decoded === 'string' || typeof decoded.sub !== 'string' || typeof decoded.exp !== 'number' || typeof decoded.iat !== 'number') throw new Error('Invalid claims');
  if (decoded.exp - decoded.iat > 300) throw new Error('Invalid token lifetime');
  return { id: decoded.sub, projectId: typeof decoded.projectId === 'string' ? decoded.projectId : undefined, exp: decoded.exp };
}
