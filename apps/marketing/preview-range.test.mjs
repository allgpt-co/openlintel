import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { once } from 'node:events';

test('Preview MP4 byte ranges support native seeking without changing normal HEAD or noindex behavior', async () => {
  const output = await mkdtemp(join(tmpdir(), 'openlintel-range-'));
  await writeFile(join(output, 'clip.mp4'), '0123456789');
  const server = spawn(process.execPath, ['apps/marketing/preview.mjs'], {
    env: { ...process.env, PORT: '0', MARKETING_OUT_DIR: output, MARKETING_BASE_PATH: '/' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  try {
    const [data] = await once(server.stdout, 'data');
    const url = `${data.toString().match(/http:\/\/localhost:\d+\//)[0]}clip.mp4`;
    for (const [range, body, contentRange] of [
      ['bytes=3-5', '345', 'bytes 3-5/10'],
      ['bytes=7-', '789', 'bytes 7-9/10'],
      ['bytes=-3', '789', 'bytes 7-9/10'],
      ['bytes=8-999', '89', 'bytes 8-9/10'],
      ['bytes=-999', '0123456789', 'bytes 0-9/10'],
    ]) {
      const response = await fetch(url, { headers: { Range: range } });
      assert.equal(response.status, 206);
      assert.equal(response.headers.get('content-range'), contentRange);
      assert.equal(response.headers.get('content-length'), String(body.length));
      assert.equal(response.headers.get('content-type'), 'video/mp4');
      assert.equal(response.headers.get('accept-ranges'), 'bytes');
      assert.match(response.headers.get('x-robots-tag'), /noindex/);
      assert.equal(await response.text(), body);
    }
    for (const range of [
      'bytes=10-',
      'bytes=7-3',
      'bytes=-0',
      'bytes=-',
      'bytes=1-2,4-5',
      'bytes=9007199254740992-',
      'bytes=-9007199254740992',
    ]) {
      const response = await fetch(url, { headers: { Range: range } });
      assert.equal(response.status, 416);
      assert.equal(response.headers.get('content-range'), 'bytes */10');
      assert.equal(await response.text(), '');
    }
    const head = await fetch(url, { method: 'HEAD', headers: { Range: 'bytes=3-5' } });
    assert.equal(head.status, 200);
    assert.equal(head.headers.get('content-length'), '10');
    assert.equal(head.headers.get('content-range'), null);
    assert.equal(await head.text(), '');
    const conditional = await fetch(url, {
      headers: { Range: 'bytes=3-5', 'If-Range': '"unmatched-validator"' },
    });
    assert.equal(conditional.status, 200);
    assert.equal(await conditional.text(), '0123456789');
  } finally {
    const exited = once(server, 'exit');
    server.kill();
    await exited;
    await rm(output, { recursive: true, force: true });
  }
});
