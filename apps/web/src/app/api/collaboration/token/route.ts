import { auth } from '@/lib/auth';
import { db, projects, eq, and } from '@openlintel/db';
import { serviceToken } from '@/server/service-token';

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (request.headers.get('origin') !== new URL(process.env.AUTH_URL || request.url).origin) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }
  const body = await request.json().catch(() => null);
  if (!body || (body.projectId !== undefined && typeof body.projectId !== 'string')) {
    return Response.json({ error: 'Invalid project' }, { status: 400 });
  }
  if (body.projectId) {
    const project = await db.query.projects.findFirst({ where: and(eq(projects.id, body.projectId), eq(projects.userId, session.user.id)) });
    if (!project) return Response.json({ error: 'Project not found' }, { status: 404 });
  }
  return Response.json({ token: serviceToken(session.user.id, 'openlintel-collaboration', body.projectId) }, { headers: { 'Cache-Control': 'no-store' } });
}
