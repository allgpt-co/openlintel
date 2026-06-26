import { z } from 'zod';
import { rooms, uploads, designVariants, jobs, eq, and } from '@openlintel/db';
import { router, protectedProcedure } from '../init';
import { getFile } from '@/lib/storage';
import { converseWithBedrock } from '../../bedrock';

export const roomRedesignRouter = router({
  /** Analyze a room photo using Bedrock Converse */
  analyzeRoom: protectedProcedure
    .input(z.object({ uploadId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const upload = await ctx.db.query.uploads.findFirst({
        where: and(eq(uploads.id, input.uploadId), eq(uploads.userId, ctx.userId)),
      });
      if (!upload) throw new Error('Upload not found');

      const imageBuffer = await getFile(upload.storageKey);
      if (!imageBuffer) throw new Error('Image file not found in storage');

      const base64 = imageBuffer.toString('base64');
      const dataUrl = `data:${upload.mimeType};base64,${base64}`;

      const { text } = await converseWithBedrock({
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Analyze this room photo for an interior redesign project. Describe in detail:
1. Room structure: wall positions, floor area shape, ceiling type
2. Windows: number, size, placement
3. Doors: number, placement
4. Existing furniture and their positions
5. Camera angle and perspective
6. Current lighting direction and quality
7. Floor type and wall finishes
8. Room dimensions estimate (small/medium/large)

Be specific and concise. This analysis will guide AI image generation to preserve room structure during redesign.`,
              },
              { type: 'image_url', image_url: { url: dataUrl } },
            ],
          },
        ],
        maxTokens: 1000,
        temperature: 0.3,
      });

      return {
        analysis: text || 'Unable to analyze room',
      };
    }),

  /** Generate multiple redesigned room images */
  generateRedesigns: protectedProcedure
    .input(
      z.object({
        roomId: z.string(),
        uploadId: z.string(),
        designVariantId: z.string().optional(),
        roomType: z.string(),
        designStyle: z.string(),
        colorPalette: z.string(),
        furnitureDensity: z.string(),
        materialPreference: z.string(),
        lightingMood: z.string(),
        budgetLevel: z.string(),
        numVariations: z.number().min(1).max(5).default(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Verify room ownership
      const room = await ctx.db.query.rooms.findFirst({
        where: eq(rooms.id, input.roomId),
        with: { project: true },
      });
      if (!room || room.project.userId !== ctx.userId) throw new Error('Room not found');

      // Get source image
      const upload = await ctx.db.query.uploads.findFirst({
        where: and(eq(uploads.id, input.uploadId), eq(uploads.userId, ctx.userId)),
      });
      if (!upload) throw new Error('Upload not found');

      // Create job record
      const [job] = await ctx.db
        .insert(jobs)
        .values({
          userId: ctx.userId,
          type: 'room_redesign',
          status: 'running',
          startedAt: new Date(),
          progress: 5,
          inputJson: {
            uploadId: input.uploadId,
            roomType: input.roomType,
            designStyle: input.designStyle,
            colorPalette: input.colorPalette,
            furnitureDensity: input.furnitureDensity,
            materialPreference: input.materialPreference,
            lightingMood: input.lightingMood,
            budgetLevel: input.budgetLevel,
            numVariations: input.numVariations,
          },
          projectId: room.project.id,
          roomId: input.roomId,
        })
        .returning();
      if (!job) throw new Error('Failed to create job');

      try {
        await ctx.db.update(jobs).set({ progress: 10 }).where(eq(jobs.id, job.id));
        throw new Error(
          'Room redesign image editing is not supported by Bedrock Converse/Kimi K2.5. Use a Bedrock image model integration for this workflow.',
        );
      } catch (error) {
        console.error('[Room Redesign Error]', error);
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error during room redesign';
        await ctx.db
          .update(jobs)
          .set({ status: 'failed', error: errorMessage, completedAt: new Date() })
          .where(eq(jobs.id, job.id));
        throw new Error(errorMessage);
      }
    }),

  /** Get a redesign job status and results */
  getJob: protectedProcedure
    .input(z.object({ jobId: z.string() }))
    .query(async ({ ctx, input }) => {
      const job = await ctx.db.query.jobs.findFirst({
        where: and(eq(jobs.id, input.jobId), eq(jobs.userId, ctx.userId)),
      });
      if (!job) throw new Error('Job not found');

      let variant = null;
      if (job.designVariantId) {
        variant = await ctx.db.query.designVariants.findFirst({
          where: eq(designVariants.id, job.designVariantId),
        });
      }

      return { job, variant };
    }),

  /** List all redesign results for a room */
  listByRoom: protectedProcedure
    .input(z.object({ roomId: z.string() }))
    .query(async ({ ctx, input }) => {
      const room = await ctx.db.query.rooms.findFirst({
        where: eq(rooms.id, input.roomId),
        with: { project: true },
      });
      if (!room || room.project.userId !== ctx.userId) throw new Error('Room not found');

      const variants = await ctx.db.query.designVariants.findMany({
        where: eq(designVariants.roomId, input.roomId),
        orderBy: (dv, { desc }) => [desc(dv.createdAt)],
      });

      // Filter to only redesign variants (have metadata.type === 'room_redesign')
      return variants.filter(
        (v) => v.metadata && typeof v.metadata === 'object' && (v.metadata as any).type === 'room_redesign',
      );
    }),
});
