import { describe, expect, it } from 'vitest';
import { encode } from 'next-auth/jwt';
import type { NextAuthConfig } from 'next-auth';
import { AUTH_SESSION_VERSION, configuredOAuthProviders, createAuthConfig } from './auth.config';

const env = {
  GOOGLE_CLIENT_ID: 'local-google-id',
  GOOGLE_CLIENT_SECRET: 'local-google-secret',
  GITHUB_CLIENT_ID: 'local-github-id',
  GITHUB_CLIENT_SECRET: 'local-github-secret',
};
const config = createAuthConfig(env);
const jwt = config.callbacks!.jwt!;
const signIn = config.callbacks!.signIn!;
const authorized = config.callbacks!.authorized!;
type JwtArgs = Parameters<typeof jwt>[0];
type SignInArgs = Parameters<typeof signIn>[0];
type AuthorizedArgs = Parameters<typeof authorized>[0];
const account = { provider: 'github', type: 'oauth', providerAccountId: 'verified-provider-id' };
const user = { id: 'adapter-user-id', email: 'person@example.test' };
const current = {
  id: user.id,
  sub: user.id,
  authVersion: AUTH_SESSION_VERSION,
  authProvider: 'github',
};

function providerOptions(configuration: NextAuthConfig) {
  return configuration.providers.map((provider) =>
    typeof provider === 'function' ? provider() : provider,
  );
}

describe('OAuth-only authentication', () => {
  it('registers only complete OAuth pairs and no Credentials provider', () => {
    expect(configuredOAuthProviders({})).toEqual([]);
    expect(
      configuredOAuthProviders({ GOOGLE_CLIENT_ID: 'id', GITHUB_CLIENT_SECRET: 'secret' }),
    ).toEqual([]);
    expect(
      configuredOAuthProviders({ GOOGLE_CLIENT_ID: '  ', GOOGLE_CLIENT_SECRET: 'secret' }),
    ).toEqual([]);
    expect(providerOptions(config).map(({ id }) => id)).toEqual(['google', 'github']);
    for (const provider of providerOptions(config)) {
      expect(provider.options?.allowDangerousEmailAccountLinking).toBe(false);
    }
  });

  it('rejects arbitrary email, unknown providers and missing OAuth account identities', async () => {
    for (const invalidAccount of [
      null,
      { ...account, provider: 'credentials', type: 'credentials' },
      { ...account, provider: 'unknown' },
      { ...account, providerAccountId: '' },
    ]) {
      expect(await signIn({ user, account: invalidAccount } as SignInArgs)).toBe(false);
      expect(
        await jwt({ token: {}, user, account: invalidAccount } as unknown as JwtArgs),
      ).toBeNull();
    }
    const closed = createAuthConfig({});
    expect(await closed.callbacks!.signIn!({ user, account } as SignInArgs)).toBe(false);
    expect(await closed.callbacks!.jwt!({ token: current } as unknown as JwtArgs)).toBeNull();
  });

  it('requires Google email verification and a nonempty provider email', async () => {
    const google = { ...account, provider: 'google', type: 'oidc' };
    expect(
      await signIn({ user, account: google, profile: { email_verified: false } } as SignInArgs),
    ).toBe(false);
    expect(await signIn({ user, account: google } as SignInArgs)).toBe(false);
    expect(
      await signIn({ user, account: google, profile: { email_verified: true } } as SignInArgs),
    ).toBe(true);
    expect(await signIn({ user: { ...user, email: null }, account } as SignInArgs)).toBe(false);
    expect(await signIn({ user, account } as SignInArgs)).toBe(true);
  });

  it('uses the adapter identity rather than email to mint a versioned session', async () => {
    const token = await jwt({
      token: { sub: 'untrusted-email@example.test' },
      user,
      account,
    } as unknown as JwtArgs);
    expect(token).toMatchObject(current);
    expect(token?.id).not.toBe(user.email);
    const session = await config.callbacks!.session!({
      session: { user: { email: user.email }, expires: '2030-01-01' },
      token,
    } as Parameters<NonNullable<NonNullable<NextAuthConfig['callbacks']>['session']>>[0]);
    expect(session.user?.id).toBe(user.id);
  });

  it('rejects legacy/malformed sessions and cannot upgrade them through client updates', async () => {
    const legacy = { id: user.id, sub: user.email, email: user.email };
    expect(await jwt({ token: legacy } as unknown as JwtArgs)).toBeNull();
    expect(
      await jwt({ token: legacy, trigger: 'update', session: current } as unknown as JwtArgs),
    ).toBeNull();
    expect(
      await jwt({ token: { ...current, sub: 'another-user' } } as unknown as JwtArgs),
    ).toBeNull();
    expect(await jwt({ token: { ...current, authVersion: 1 } } as unknown as JwtArgs)).toBeNull();
    expect(
      await jwt({
        token: current,
        trigger: 'update',
        session: { id: 'attacker' },
      } as unknown as JwtArgs),
    ).toEqual(current);
  });

  it('invalidates cryptographically valid old tokens at decode, before OAuth linking', async () => {
    const parameters = {
      secret: 'local-test-secret-at-least-thirty-two-characters',
      salt: 'authjs.session-token',
    };
    const legacy = await encode({
      ...parameters,
      token: { id: user.id, sub: user.id, email: user.email },
    });
    expect(await config.jwt!.decode!({ ...parameters, token: legacy })).toBeNull();
    const valid = await encode({ ...parameters, token: current });
    expect(await config.jwt!.decode!({ ...parameters, token: valid })).toMatchObject(current);
    expect(await createAuthConfig({}).jwt!.decode!({ ...parameters, token: valid })).toBeNull();
  });

  it('protects every configured private route when no valid user ID is present', async () => {
    for (const path of [
      '/dashboard',
      '/project/example',
      '/analytics',
      '/portfolios',
      '/marketplace',
      '/developer',
      '/notifications',
      '/admin',
    ]) {
      const request = { nextUrl: new URL(`http://localhost${path}`) };
      expect(await authorized({ auth: null, request } as AuthorizedArgs)).toBe(false);
      expect(
        await authorized({ auth: { user: { email: user.email } }, request } as AuthorizedArgs),
      ).toBe(false);
      expect(await authorized({ auth: { user }, request } as AuthorizedArgs)).toBe(true);
    }
  });
});
