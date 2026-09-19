import type { Metadata } from 'next';
import { configuredOAuthProviders } from '@/lib/auth.config';
import { SignInOptions } from './sign-in-options';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Sign in | OpenLintel',
  robots: { index: false, follow: false },
};

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  // Only public provider names and IDs cross the server/client boundary.
  const providers = configuredOAuthProviders().map(({ id, name }) => ({ id, name }));
  const errorMessage =
    error === 'OAuthAccountNotLinked'
      ? 'This account is not linked. Use the provider you previously connected, or ask the deployment administrator for account recovery.'
      : error
        ? 'Sign-in could not be completed. Please try again or contact the deployment administrator.'
        : undefined;

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-10">
      <section
        aria-labelledby="signin-heading"
        className="w-full max-w-md space-y-6 rounded-xl border border-gray-200 bg-white p-6 sm:p-8"
      >
        <div>
          <p className="text-sm font-semibold text-gray-600">OpenLintel</p>
          <h1 id="signin-heading" className="mt-2 text-3xl font-bold tracking-tight text-gray-900">
            Sign in
          </h1>
          <p className="mt-3 text-sm leading-6 text-gray-600">
            {providers.length
              ? 'Use a connected account to access your workspace.'
              : 'Sign-in is not available on this deployment yet. The administrator must configure an OAuth provider.'}
          </p>
        </div>
        <SignInOptions providers={providers} initialError={errorMessage} />
        <p className="border-t border-gray-200 pt-4 text-sm leading-6 text-gray-600">
          Email-only sign-in is not available. Existing users must sign in again after the
          authentication security update.
        </p>
      </section>
    </main>
  );
}
