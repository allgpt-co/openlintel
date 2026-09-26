import Link from 'next/link';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-blue-50 to-white">
      <div className="mx-auto max-w-2xl text-center px-4">
        <div className="mb-8 flex items-center justify-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-white text-xl font-bold">
            OL
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-gray-900">OpenLintel</h1>
        </div>
        <p className="mb-8 text-lg text-gray-600">
          An experimental interior design workspace in active development.
        </p>
        <p className="mb-8 text-sm text-gray-600">
          Access depends on the configured account and deployment. Complete design workflows,
          exports, and a supported hosted trial have not been verified. Explore our public resources
          and product status before providing project information.
        </p>
        <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            href="/auth/signin"
            className="inline-flex h-11 items-center justify-center rounded-lg bg-primary px-8 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
          >
            Sign in to the workspace
          </Link>
          <Link
            href="https://openlintel.com/product-status/"
            className="inline-flex h-11 items-center justify-center rounded-lg border border-input bg-background px-8 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            Product status
          </Link>
        </div>
      </div>
    </main>
  );
}
