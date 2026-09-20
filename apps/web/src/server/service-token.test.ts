import { afterEach, describe, expect, it, vi } from 'vitest';
import { createHmac } from 'node:crypto';
import { serviceToken } from './service-token';

afterEach(() => vi.unstubAllEnvs());
describe('service credentials', () => {
  it('separates session secrets and rejects missing or weak configuration', () => {
    vi.stubEnv('JWT_SECRET', 'short');
    expect(() => serviceToken('user')).toThrow();
    vi.stubEnv('JWT_SECRET', 's'.repeat(32));
    vi.stubEnv('AUTH_SECRET', 's'.repeat(32));
    expect(() => serviceToken('user')).toThrow();
  });
  it('signs a five-minute identity with explicit issuer, audience and project scope', () => {
    const secret = 'service-test-secret-'.repeat(3);
    vi.stubEnv('JWT_SECRET', secret);
    vi.stubEnv('AUTH_SECRET', 'different-session-secret'.repeat(2));
    const token = serviceToken('owner', 'openlintel-collaboration', 'project-one');
    const parts = token.split('.');
    const claims = JSON.parse(Buffer.from(parts[1]!, 'base64url').toString());
    expect(claims).toMatchObject({ sub: 'owner', iss: 'openlintel-web', aud: 'openlintel-collaboration', projectId: 'project-one' });
    expect(claims.exp - claims.iat).toBe(300);
    expect(parts[2]).toBe(createHmac('sha256', secret).update(`${parts[0]}.${parts[1]}`).digest('base64url'));
  });
});
