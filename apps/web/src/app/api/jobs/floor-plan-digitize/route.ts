import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db, projects, jobs, uploads, eq, and } from '@openlintel/db';

import { serviceToken } from '@/server/service-token';
import { getPresignedUrl } from '@/lib/storage';

const VISION_SERVICE_URL = process.env.VISION_SERVICE_URL || 'http://localhost:8010';

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { projectId, uploadId, storageKey } = body;

  if (!projectId || !uploadId) {
    return NextResponse.json({ error: 'Missing projectId or uploadId' }, { status: 400 });
  }

  // Verify ownership
  const project = await db.query.projects.findFirst({
    where: and(eq(projects.id, projectId), eq(projects.userId, session.user.id)),
  });
  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  const upload = await db.query.uploads.findFirst({
    where: and(eq(uploads.id, uploadId), eq(uploads.userId, session.user.id), eq(uploads.projectId, projectId)),
  });
  if (!upload) {
    return NextResponse.json({ error: 'Upload not found' }, { status: 404 });
  }

  // Create job record
  const [job] = await db
    .insert(jobs)
    .values({
      userId: session.user.id,
      type: 'floor_plan_digitization',
      status: 'pending',
      inputJson: { projectId, uploadId, storageKey: upload.storageKey },
      projectId,
    })
    .returning();

  // Build image URL
  const resolvedKey = upload.storageKey;
  const fullImageUrl = await getPresignedUrl(resolvedKey, 600);

  // Fire-and-forget to vision-engine
  try {
  const result = await fetch(`${VISION_SERVICE_URL}/api/v1/vision/job`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${serviceToken(session.user.id)}` },
    signal: AbortSignal.timeout(15000),
    body: JSON.stringify({
      job_id: job!.id,
      user_id: session.user.id,
      project_id: projectId,
      image_url: fullImageUrl,
      upload_id: uploadId,
    }),
  });
  if (!result.ok || (await result.json()).status !== 'accepted') throw new Error('Vision service rejected the job');
  } catch {
    await db.update(jobs).set({ status: 'failed', error: 'Vision service unavailable' }).where(eq(jobs.id, job!.id));
    return NextResponse.json({ error: 'Vision service unavailable' }, { status: 503 });
  }

  return NextResponse.json(job, { status: 201 });
}
