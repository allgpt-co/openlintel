import { db, sql } from '@openlintel/db';
export const dynamic = 'force-dynamic';
export async function GET() { try { await db.execute(sql`select 1`); return Response.json({ status: 'ok' }); } catch { return Response.json({ status: 'unavailable' }, { status: 503 }); } }
