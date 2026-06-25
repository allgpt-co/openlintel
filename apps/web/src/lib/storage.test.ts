import { describe, expect, it } from 'vitest';
import { resolveUploadsDir } from './storage';

describe('resolveUploadsDir', () => {
  it('uses UPLOADS_DIR when configured', () => {
    expect(resolveUploadsDir('/tmp/current', { UPLOADS_DIR: '/tmp/openlintel-uploads' })).toBe('/tmp/openlintel-uploads');
  });

  it('falls back to the monorepo uploads directory from the web app cwd', () => {
    expect(resolveUploadsDir('/repo/apps/web', {})).toBe('/repo/uploads');
  });
});
