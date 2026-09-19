# Authentication deployment and recovery

## September 2026 remediation

The previous Credentials provider accepted an email and name without verifying
control of the mailbox. It has been removed. **There is no email-only sign-in or
automatic migration from a supplied email to an existing account.**

Only Google or GitHub OAuth is available, and only when both corresponding
server-side environment variables are nonempty:

- `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`
- `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET`

With neither complete pair, the page reports that sign-in is unavailable and no
provider can authenticate a user. Partial pairs are not exposed as usable
buttons. Never put provider secrets in `NEXT_PUBLIC_*` variables. The page sends
only provider names and IDs to the browser.

Register the deployment's exact HTTPS callback URLs with the provider:
`https://<app-host>/api/auth/callback/google` and/or
`https://<app-host>/api/auth/callback/github`. Set a strong random `AUTH_SECRET`
and the deployment's canonical `AUTH_URL`. The app host is not necessarily the
static marketing domain. The reverse proxy must overwrite/sanitize forwarded
host/protocol headers because the Auth.js configuration trusts its host.

The Drizzle adapter is explicitly bound to the application's `users`,
`accounts`, `sessions`, and `verification_tokens` tables. OAuth identities are
resolved by the provider's stable account ID. JWT creation uses the adapter's
user ID and does not look up, insert, or merge users by a submitted email.
Google sign-in requires its verified-email claim. Dangerous automatic email
account linking is explicitly disabled for both providers.

## Existing sessions and account recovery

- **All pre-remediation sessions are rejected**, including otherwise correctly
  encrypted legacy JWTs. New sessions carry `authVersion: 2`, a provider, and a
  consistent adapter user ID. The gate is in both token decoding and the JWT
  callback, shared by Node handlers and Edge middleware. Decoding matters because
  Auth.js also reads a session directly before linking an OAuth account.
- Disabling a provider invalidates this version's tokens for that provider.
- Users must complete a fresh OAuth flow. Unauthenticated client session updates
  cannot upgrade legacy claims or replace the identity.
- A legacy email-only database user with no linked OAuth account is **not**
  automatically recovered based on matching email. Auth.js will refuse the
  ambiguous link. An authorized operator must verify ownership independently,
  review the user's records, and perform an audited recovery using the provider's
  verified stable account ID. Do not turn on `allowDangerousEmailAccountLinking`
  or restore Credentials to work around this protection.

## Deployment/incident actions that still require an operator

These are deployment actions, not facts claimed by the code change:

1. Deploy the patched application to **every** running instance; do not leave an
   older instance able to mint or accept the vulnerable sessions.
2. Rotate the deployed `AUTH_SECRET` through the secret manager and restart every
   instance. Do not log the new value, and do not retain the previous secret as a
   fallback. Expect everyone to sign in again.
3. Determine whether the old login was publicly reachable. Preserve relevant
   access/security logs with controlled access. Review existing users, OAuth
   links, privileged actions, API keys, and account changes for unauthorized
   access. Revoking a JWT does not undo an OAuth link or an action made earlier.
4. If exposure is confirmed, have the responsible security/privacy owner decide
   account recovery, downstream token revocation, and notification requirements.
   No customer data or account records are deleted by this remediation.
5. Test successful and cancelled OAuth with an authorized test account on the
   intended app host. Check callback URLs, cookie security, intended account
   identity, a protected route, logout, and rejected old cookies. Local mocked
   checks do not validate an external provider's real credentials.

This fix addresses the identified unverified-email bypass and legacy sessions;
it is not a claim of a complete application authorization or penetration audit.

## Regression checks

```sh
pnpm --filter @openlintel/web exec vitest run src/lib/auth
```

Tests cover configured providers, incomplete/absent provider credentials,
rejected credentials requests, verified Google email, adapter user identity,
legacy-token decoding, client update attempts, route protection, real Auth.js
session endpoint behavior, and table/callback wiring. Tests use local fake
credentials and do not log in to an external account or write a database.

For local browser checks (requires an installed Playwright Chromium):

```sh
node apps/web/scripts/auth-browser-smoke.mjs
```

Optional `AUTH_BROWSER_EXECUTABLE` selects an installed Chromium binary;
`AUTH_BROWSER_NO_SANDBOX=1` is only for a constrained local test environment.
`AUTH_SMOKE_PORT` defaults to 3187. Stop other Next.js processes for this workspace
before running, because the fixtures use its development `.next` directory. The
runner uses fake provider settings, a nonproduction secret and an unreachable
local database; it checks both configured and unavailable states. It mocks OAuth
initiation responses and blocks external browser navigation—**it does not prove
successful live OAuth**. Logs and screenshots go to ignored `output/playwright/`.
