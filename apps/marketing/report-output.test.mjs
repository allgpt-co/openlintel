import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, symlink, writeFile, readFile, stat, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { writePrivateReport } from './report-output.mjs';

test('Private report writer rejects public/traversal/symlink destinations and repairs permissive modes', async () => {
  const root = await mkdtemp(join(tmpdir(), 'openlintel-report-'));
  try {
    await assert.rejects(writePrivateReport('docs/report.json', {}, root), /ignored/);
    await assert.rejects(
      writePrivateReport('output/seo/../../docs/report.json', {}, root),
      /ignored/,
    );
    await mkdir(join(root, 'output/seo'), { recursive: true });
    await mkdir(join(root, 'docs'));
    await symlink(join(root, 'docs'), join(root, 'output/seo/public'));
    await assert.rejects(writePrivateReport('output/seo/public/leads.json', {}, root), /symbolic/);
    await writeFile(join(root, 'docs/public.json'), 'untouched');
    await symlink(join(root, 'docs/public.json'), join(root, 'output/seo/leads.json'));
    await assert.rejects(writePrivateReport('output/seo/leads.json', {}, root), /symbolic/);
    assert.equal(await readFile(join(root, 'docs/public.json'), 'utf8'), 'untouched');
    await writeFile(join(root, 'output/seo/valid.json'), 'old', { mode: 0o644 });
    await writePrivateReport('output/seo/valid.json', { status: 'private' }, root);
    assert.equal((await stat(join(root, 'output/seo/valid.json'))).mode & 0o777, 0o600);
    assert.deepEqual(JSON.parse(await readFile(join(root, 'output/seo/valid.json'), 'utf8')), {
      status: 'private',
    });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
