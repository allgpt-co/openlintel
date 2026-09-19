import { describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { encode } from 'next-auth/jwt';
import { AUTH_SESSION_VERSION, createAuthConfig } from './auth.config';

const secret = 'local-auth-regression-secret-never-use-in-production';
const options = {
  ...createAuthConfig({ GITHUB_CLIENT_ID: 'local-id', GITHUB_CLIENT_SECRET: 'local-secret' }),
  secret,
  logger: { error() {}, warn() {}, debug() {} },
};
// Exercise the installed Auth.js handler without relying on Next.js's bundler
// to resolve next/server in this Node test process. No additional dependency.
const require = createRequire(import.meta.url);
const corePath = require.resolve('@auth/core', { paths: [require.resolve('next-auth')] });
const { Auth } = await import(corePath);
const handle = (request: Request): Promise<Response> =>
  Auth(request, { ...options, basePath: '/api/auth' });
const base = 'http://localhost:3000/api/auth';

describe('Auth.js route regression checks (no remote login or database)', () => {
  it('lists only the configured OAuth provider', async () => {
    const response = await handle(new Request(`${base}/providers`));
    expect(response.status).toBe(200);
    expect(Object.keys(await response.json())).toEqual(['github']);
  });

  it('does not mint a session for the former email-only credentials endpoint', async () => {
    const csrfResponse = await handle(new Request(`${base}/csrf`));
    const { csrfToken } = await csrfResponse.json();
    const cookies = csrfResponse.headers
      .getSetCookie()
      .map((cookie) => cookie.split(';')[0])
      .join('; ');
    const response = await handle(
      new Request(`${base}/callback/credentials`, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded', cookie: cookies },
        body: new URLSearchParams({ csrfToken, email: 'victim@example.test', name: 'Attacker' }),
      }),
    );
    expect(response.headers.getSetCookie().join(';')).not.toMatch(/authjs\.session-token=[^;]/);
    expect(response.headers.get('location')).not.toContain('/dashboard');
  });

  it('clears a validly encrypted pre-remediation cookie instead of authenticating it', async () => {
    const token = await encode({
      secret,
      salt: 'authjs.session-token',
      token: { id: 'victim', sub: 'victim@example.test' },
    });
    const response = await handle(
      new Request(`${base}/session`, {
        headers: { cookie: `authjs.session-token=${token}` },
      }),
    );
    expect(await response.json()).toBeNull();
    expect(response.headers.getSetCookie().join(';')).toMatch(/authjs\.session-token=;/);
  });

  it('accepts a post-remediation identity', async () => {
    const token = await encode({
      secret,
      salt: 'authjs.session-token',
      token: {
        id: 'verified-user',
        sub: 'verified-user',
        authProvider: 'github',
        authVersion: AUTH_SESSION_VERSION,
      },
    });
    const response = await handle(
      new Request(`${base}/session`, {
        headers: { cookie: `authjs.session-token=${token}` },
      }),
    );
    expect((await response.json()).user.id).toBe('verified-user');
  });
});
