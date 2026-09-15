import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { auditProduction, validateAuditManifest } from './production-check.mjs';

function fixture() {
  const files = {
    'index.html': '<link rel="canonical" href="https://openlintel.com/">',
    'pilot/thanks/index.html':
      '<link rel="canonical" href="https://openlintel.com/pilot/thanks/"><meta name="robots" content="noindex,follow">',
    'sitemap.xml': '<urlset><url><loc>https://openlintel.com/</loc></url></urlset>',
    'robots.txt': 'Sitemap: https://openlintel.com/sitemap.xml',
  };
  const manifest = {
    schemaVersion: 2,
    generator: 'OpenLintel marketing',
    origin: 'https://openlintel.com',
    basePath: '/',
    indexable: true,
    pages: [
      { id: 'home', path: '', indexable: true },
      { id: 'thanks', path: 'pilot/thanks/', indexable: false },
    ],
    files: Object.keys(files),
    fileHashes: Object.fromEntries(
      Object.entries(files).map(([path, body]) => [
        path,
        createHash('sha256').update(body).digest('hex'),
      ]),
    ),
  };
  const fetcher = async (raw, options) => {
    const url = new URL(raw);
    const path = url.pathname.slice(1);
    if (['pilot', 'sample-project'].includes(path) && options.redirect === 'manual')
      return new Response('', { status: 301, headers: { location: `/${path}/` } });
    const key = path.endsWith('/') || !path ? path + 'index.html' : path;
    return new Response(files[key] || 'Not found', {
      status: files[key] ? 200 : 404,
      headers: {
        'content-type': key.endsWith('.html')
          ? 'text/html; charset=utf-8'
          : key.endsWith('.xml')
            ? 'application/xml'
            : 'text/plain',
      },
    });
  };
  return { manifest, fetcher, files };
}
test('Production audit checks hashes, canonical directives, utility exclusion and real404', async () => {
  const { manifest, fetcher } = fixture();
  const result = await auditProduction(manifest, { fetcher, hostVariants: false });
  assert.equal(result.status, 'passed', JSON.stringify(result.checks.filter((c) => !c.pass)));
});
test('A stale deployed asset fails the release gate', async () => {
  const { manifest, fetcher, files } = fixture();
  files['index.html'] += '<p>Unreviewed changed deployment</p>';
  const result = await auditProduction(manifest, { fetcher, hostVariants: false });
  assert.equal(result.status, 'failed');
  assert.ok(result.checks.some((c) => c.name === 'index.html: deployed bytes' && !c.pass));
});
test('DNS failure stops further network work and is not zero traffic', async () => {
  const { manifest } = fixture();
  let calls = 0;
  const result = await auditProduction(manifest, {
    fetcher: async () => {
      calls++;
      throw new Error('DNS', { cause: { code: 'ENOTFOUND' } });
    },
  });
  assert.equal(calls, 1);
  assert.equal(result.status, 'failed');
  assert.equal(result.checks.find((c) => c.name === 'Homepage reachable').detail, 'ENOTFOUND');
});
test('Existing physical artifacts cannot conceal broken public directory routing', async () => {
  const { manifest, fetcher } = fixture();
  const broken = (url, options) =>
    new URL(url).pathname === '/pilot/thanks/'
      ? new Response('Missing route', { status: 404 })
      : fetcher(url, options);
  const result = await auditProduction(manifest, { fetcher: broken, hostVariants: false });
  assert.equal(result.status, 'failed');
  assert.ok(result.checks.some((c) => c.name === 'pilot/thanks/: public route status' && !c.pass));
});
test('A globally noindex build cannot receive production signoff', async () => {
  const { manifest, fetcher } = fixture();
  manifest.indexable = false;
  const result = await auditProduction(manifest, { fetcher, hostVariants: false });
  assert.equal(result.status, 'failed');
  assert.ok(
    result.checks.some((c) => c.name === 'Production build permits search indexing' && !c.pass),
  );
});
test('Audit refuses unsafe/unhashed manifest paths and insecure remote transport', async () => {
  const { manifest } = fixture();
  assert.throws(() => validateAuditManifest({ ...manifest, files: ['../secrets'] }), /Unsafe/);
  await assert.rejects(auditProduction(manifest, { baseUrl: 'http://example.com/' }), /HTTPS/);
});

test('Correct bytes with an incorrect MIME type cannot pass production checks', async () => {
  const { manifest, fetcher } = fixture();
  const broken = async (url, options) => {
    const response = await fetcher(url, options);
    response.headers.set('content-type', 'text/plain');
    return response;
  };
  const result = await auditProduction(manifest, { fetcher: broken, hostVariants: false });
  assert.equal(result.status, 'failed');
  assert.ok(result.checks.some((c) => c.name === 'index.html: content type' && !c.pass));
});
