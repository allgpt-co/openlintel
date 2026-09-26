import type { Metadata } from 'next';
import { SessionProvider } from 'next-auth/react';
import { TRPCProvider } from '@/lib/trpc/provider';
import { Toaster } from '@openlintel/ui';
import './globals.css';

export const metadata: Metadata = {
  title: 'OpenLintel',
  description: 'Experimental AI-assisted interior design workspace in active development.',
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <SessionProvider>
          <TRPCProvider>
            {children}
            <Toaster />
          </TRPCProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
