export const dynamic = 'force-dynamic';
export async function GET() { return Response.json({ revision: process.env.BUILD_SHA || 'unknown', billingEnabled: false }); }
