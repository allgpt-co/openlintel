import type { NextAuthConfig } from 'next-auth';
import { decode } from 'next-auth/jwt';
import type { JWT } from 'next-auth/jwt';
import Google from 'next-auth/providers/google';
import GitHub from 'next-auth/providers/github';

// Tokens minted before the OAuth-only remediation are deliberately invalid.
// Keep this gate in decode as well as jwt: Auth.js decodes the existing session
// directly when deciding whether an OAuth account may be linked to a user.
export const AUTH_SESSION_VERSION = 2;
export type OAuthProviderId = 'google' | 'github';
type AuthEnvironment = Record<string, string | undefined>;

export function configuredOAuthProviders(env: AuthEnvironment = process.env) {
  const providers: { id: OAuthProviderId; name: string; clientId: string; clientSecret: string }[] =
    [];
  if (env.GOOGLE_CLIENT_ID?.trim() && env.GOOGLE_CLIENT_SECRET?.trim()) {
    providers.push({
      id: 'google',
      name: 'Google',
      clientId: env.GOOGLE_CLIENT_ID.trim(),
      clientSecret: env.GOOGLE_CLIENT_SECRET.trim(),
    });
  }
  if (env.GITHUB_CLIENT_ID?.trim() && env.GITHUB_CLIENT_SECRET?.trim()) {
    providers.push({
      id: 'github',
      name: 'GitHub',
      clientId: env.GITHUB_CLIENT_ID.trim(),
      clientSecret: env.GITHUB_CLIENT_SECRET.trim(),
    });
  }
  return providers;
}

/** Edge-safe config shared by middleware and the Node.js adapter. */
export function createAuthConfig(env: AuthEnvironment = process.env): NextAuthConfig {
  const settings = configuredOAuthProviders(env);
  const allowedProviders = new Set<string>(settings.map(({ id }) => id));
  const validSession = (token: JWT | null) =>
    token?.authVersion === AUTH_SESSION_VERSION &&
    typeof token.id === 'string' &&
    token.id.length > 0 &&
    token.sub === token.id &&
    typeof token.authProvider === 'string' &&
    allowedProviders.has(token.authProvider);

  return {
    providers: settings.map(({ id, clientId, clientSecret }) => {
      const options = { clientId, clientSecret, allowDangerousEmailAccountLinking: false };
      return id === 'google' ? Google(options) : GitHub(options);
    }),
    pages: { signIn: '/auth/signin', error: '/auth/signin' },
    jwt: {
      async decode(params) {
        const token = await decode(params);
        return validSession(token) ? token : null;
      },
    },
    callbacks: {
      signIn({ user, account, profile }) {
        if (
          !account ||
          !allowedProviders.has(account.provider) ||
          !['oauth', 'oidc'].includes(account.type) ||
          !account.providerAccountId ||
          !user.email
        )
          return false;
        // Never accept an unverified Google email. GitHub identity is its stable
        // provider account ID, not its email; email-based linking stays disabled.
        return account.provider !== 'google' || profile?.email_verified === true;
      },
      jwt({ token, user, account }) {
        if (user || account) {
          if (
            !user?.id ||
            !account ||
            !allowedProviders.has(account.provider) ||
            !['oauth', 'oidc'].includes(account.type) ||
            !account.providerAccountId
          )
            return null;
          // user.id is the adapter-resolved identity, never an email lookup.
          token.id = user.id;
          token.sub = user.id;
          token.authVersion = AUTH_SESSION_VERSION;
          token.authProvider = account.provider;
        }
        // Client session updates cannot supply or upgrade these claims.
        return validSession(token) ? token : null;
      },
      session({ session, token }) {
        if (!validSession(token)) throw new Error('Invalid authentication session');
        session.user.id = token.id as string;
        return session;
      },
      authorized({ auth, request: { nextUrl } }) {
        const isLoggedIn = Boolean(auth?.user?.id);
        const protectedPrefixes = [
          '/dashboard',
          '/project',
          '/analytics',
          '/portfolios',
          '/marketplace',
          '/developer',
          '/notifications',
          '/admin',
        ];
        const isProtected = protectedPrefixes.some(
          (prefix) => nextUrl.pathname === prefix || nextUrl.pathname.startsWith(`${prefix}/`),
        );
        if (isProtected && !isLoggedIn) return false;
        if (nextUrl.pathname.startsWith('/auth/') && isLoggedIn) {
          return Response.redirect(new URL('/dashboard', nextUrl));
        }
        return true;
      },
    },
    session: { strategy: 'jwt' },
    trustHost: true,
  };
}

export const authConfig = createAuthConfig();
