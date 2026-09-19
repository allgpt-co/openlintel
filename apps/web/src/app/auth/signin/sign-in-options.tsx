'use client';

import { signIn } from 'next-auth/react';
import { useState } from 'react';
import type { OAuthProviderId } from '@/lib/auth.config';

export function SignInOptions({
  providers,
  initialError,
}: {
  providers: { id: OAuthProviderId; name: string }[];
  initialError?: string;
}) {
  const [pending, setPending] = useState<OAuthProviderId | null>(null);
  const [error, setError] = useState(initialError);

  async function startSignIn(provider: OAuthProviderId) {
    setPending(provider);
    setError(undefined);
    try {
      await signIn(provider, { redirectTo: '/dashboard' });
    } catch {
      setError('Sign-in could not be started. Please try again.');
      setPending(null);
    }
  }

  return (
    <div className="space-y-3">
      {providers.map(({ id, name }) => (
        <button
          key={id}
          type="button"
          disabled={pending !== null}
          aria-busy={pending === id}
          onClick={() => startSignIn(id)}
          className="flex min-h-12 w-full items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-900 transition-colors hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 disabled:cursor-wait disabled:opacity-60 motion-reduce:transition-none"
        >
          {pending === id ? `Connecting to ${name}…` : `Sign in with ${name}`}
        </button>
      ))}
      {error && (
        <p role="alert" className="text-sm leading-6 text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
