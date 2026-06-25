export const FLOOR_PLAN_PREVIEW_RETRY_MS = 3_000;

export function shouldRetryFloorPlanPreview(
  failedAt: number | null,
  now: number,
  retryDelayMs = FLOOR_PLAN_PREVIEW_RETRY_MS,
): boolean {
  return failedAt !== null && now - failedAt >= retryDelayMs;
}
