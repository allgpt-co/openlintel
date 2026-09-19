import { describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  adapter: vi.fn(() => ({ marker: 'adapter' })),
  nextAuth: vi.fn(() => ({ handlers: {}, auth: {}, signIn: {}, signOut: {} })),
  db: {},
  users: {},
  accounts: {},
  sessions: {},
  verificationTokens: {},
}));
vi.mock('next-auth', () => ({ default: mocks.nextAuth }));
vi.mock('@auth/drizzle-adapter', () => ({ DrizzleAdapter: mocks.adapter }));
vi.mock('@openlintel/db', () => mocks);

import './auth';
import { authConfig } from './auth.config';

describe('Node authentication wiring', () => {
  it('binds the adapter to the actual application tables instead of singular defaults', () => {
    expect(mocks.adapter).toHaveBeenCalledWith(mocks.db, {
      usersTable: mocks.users,
      accountsTable: mocks.accounts,
      sessionsTable: mocks.sessions,
      verificationTokensTable: mocks.verificationTokens,
    });
  });
  it('shares the revocation/identity callbacks and decode gate with middleware', () => {
    const call = mocks.nextAuth.mock.calls[0] as unknown as [{ callbacks: unknown; jwt: unknown }];
    expect(call[0].callbacks).toBe(authConfig.callbacks);
    expect(call[0].jwt).toBe(authConfig.jwt);
  });
});
