import { describe, expect, it } from 'vitest';
import { FLOOR_PLAN_PREVIEW_RETRY_MS, shouldRetryFloorPlanPreview } from './floor-plan-preview';

describe('shouldRetryFloorPlanPreview', () => {
  it('waits for the retry delay after a preview image fails', () => {
    const failedAt = 1_000;

    expect(shouldRetryFloorPlanPreview(failedAt, failedAt + FLOOR_PLAN_PREVIEW_RETRY_MS - 1)).toBe(false);
    expect(shouldRetryFloorPlanPreview(failedAt, failedAt + FLOOR_PLAN_PREVIEW_RETRY_MS)).toBe(true);
  });

  it('does not retry when the preview has not failed', () => {
    expect(shouldRetryFloorPlanPreview(null, 5_000)).toBe(false);
  });
});
