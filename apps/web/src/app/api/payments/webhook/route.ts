import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Do not consume payment events until verified, reconciled billing is released.
export async function POST() {
  return NextResponse.json({ error: 'Billing is disabled for this release' }, { status: 503 });
}
