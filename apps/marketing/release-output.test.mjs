import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm, symlink, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { digest, validateOwnershipManifest } from './owned-output.mjs';
import { validateAuditManifest } from './production-check.mjs';
import { promoteGeneratedOutput, validateGeneratedOutput } from './release-output.mjs';

function fixture({ version = 3, base = '/', programmatic = false } = {}) {
  const canonical = (path) => `https://openlintel.com${base}${path}`;
  const html = (path, content, noindex = false) =>
    `<link rel="canonical" href="${canonical(path)}">${noindex ? '<meta name="robots" content="noindex,follow">' : ''}<h1>Resource</h1>${content}`;
  const files = {
    'index.html': html('', `<a href="${base}templates/record/">Example record</a>`),
    'templates/index.html': html(
      'templates/',
      `<a href="${base}templates/record/">Example record</a>`,
    ),
    'templates/record/index.html': html(
      'templates/record/',
      `<p id="example">A complete record</p><a href="#example">Example</a><a href="${base}assets/example.pdf">PDF</a>`,
    ),
    '404.html': html('404.html', '', true),
    'assets/example.pdf': '%PDF-fixture',
    'sitemap.xml': `<urlset>${['', 'templates/', 'templates/record/'].map((path) => `<url><loc>${canonical(path)}</loc></url>`).join('')}</urlset>`,
  };
  const pages = ['', 'templates/', 'templates/record/'].map((path, index) => ({
    id: ['home', 'templates', 'record'][index],
    path,
    indexable: true,
    familyId: 'legacy',
    cohortId: 'legacy',
    intentKey: ['home', 'templates', 'record'][index],
    ...(index === 2
      ? { downloads: [{ path: 'assets/example.pdf', size: files['assets/example.pdf'].length }] }
      : {}),
    ...(index === 2 && programmatic
      ? {
          programmatic: true,
          familyId: 'selection-procurement',
          cohortId: 'selection-procurement-01',
          approvedBundleHash: `sha256:${'a'.repeat(64)}`,
        }
      : {}),
  }));
  const manifest = {
    generator: 'OpenLintel marketing',
    schemaVersion: version,
    origin: 'https://openlintel.com',
    basePath: base,
    indexable: true,
    pages,
    files: Object.keys(files).sort(),
    fileHashes: Object.fromEntries(
      Object.entries(files).map(([path, body]) => [path, digest(body)]),
    ),
  };
  return { files, manifest };
}
async function stage(path, { files, manifest }) {
  for (const [name, body] of Object.entries(files)) {
    await mkdir(join(path, name, '..'), { recursive: true });
    await writeFile(join(path, name), body);
  }
  await writeFile(join(path, 'marketing-manifest.json'), JSON.stringify(manifest));
}
async function withDirectories(run) {
  const root = await mkdtemp(join(tmpdir(), 'openlintel-staging-test-'));
  const staging = join(root, 'staged');
  const output = join(root, 'public');
  await mkdir(staging);
  await mkdir(output);
  try {
    await run({ root, staging, output });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

test('Manifest v2 migration and v3 release remain compatible with ownership and production audit', async () => {
  for (const version of [2, 3]) {
    const { manifest } = fixture({ version });
    assert.ok(validateOwnershipManifest(manifest));
    assert.equal(validateAuditManifest(manifest), manifest);
  }
  const { manifest } = fixture({ version: 4 });
  assert.equal(validateOwnershipManifest(manifest), false);
  assert.throws(() => validateAuditManifest(manifest), /manifest/);
  const missing = fixture().manifest;
  delete missing.pages[0].cohortId;
  assert.equal(validateOwnershipManifest(missing), false);
  assert.throws(() => validateAuditManifest(missing), /Invalid page/);
  const unapproved = fixture({ programmatic: true }).manifest;
  delete unapproved.pages[2].approvedBundleHash;
  assert.equal(validateOwnershipManifest(unapproved), false);
  assert.throws(() => validateAuditManifest(unapproved), /Invalid page/);
});

test('Validated root and subpath promotion preserves unrelated files and safely retires v2 output', async () => {
  for (const base of ['/', '/openlintel/'])
    await withDirectories(async ({ staging, output }) => {
      const current = fixture({ base, programmatic: true });
      await stage(staging, current);
      await writeFile(join(output, 'CNAME'), 'preserve.example');
      await writeFile(join(output, 'architecture.md'), '# Preserve');
      await mkdir(join(output, 'assets'));
      await writeFile(join(output, 'assets/old.pdf'), '%PDF-old');
      const previous = {
        ...fixture({ version: 2, base }).manifest,
        files: ['assets/old.pdf'],
        fileHashes: { 'assets/old.pdf': digest('%PDF-old') },
      };
      const result = await promoteGeneratedOutput(staging, output, current.manifest, previous);
      assert.deepEqual(result.removed, ['assets/old.pdf']);
      assert.equal(await readFile(join(output, 'CNAME'), 'utf8'), 'preserve.example');
      assert.equal(await readFile(join(output, 'architecture.md'), 'utf8'), '# Preserve');
      await assert.rejects(access(join(output, 'assets/old.pdf')));
      for (const [path, body] of Object.entries(current.files))
        assert.equal(await readFile(join(output, path), 'utf8'), body);
    });
});

test('Broken generation cannot change the existing public output', async () => {
  await withDirectories(async ({ staging, output }) => {
    const current = fixture();
    await stage(staging, current);
    await writeFile(join(output, 'index.html'), 'previous release');
    await writeFile(join(output, 'marketing-manifest.json'), 'previous manifest');
    await writeFile(join(staging, 'assets/example.pdf'), 'corrupted');
    await assert.rejects(
      promoteGeneratedOutput(staging, output, current.manifest),
      /hash mismatch/,
    );
    assert.equal(await readFile(join(output, 'index.html'), 'utf8'), 'previous release');
    assert.equal(
      await readFile(join(output, 'marketing-manifest.json'), 'utf8'),
      'previous manifest',
    );
  });
});

test('Release validation catches broken links, incorrect sitemap and orphaned programmatic resources', async () => {
  for (const issue of ['link', 'sitemap', 'orphan'])
    await withDirectories(async ({ staging }) => {
      const current = fixture({ programmatic: true });
      if (issue === 'link') current.files['index.html'] += '<a href="/missing/">Missing</a>';
      if (issue === 'sitemap') current.files['sitemap.xml'] = '<urlset></urlset>';
      if (issue === 'orphan')
        current.files['index.html'] = current.files['index.html'].replace(/<a[^>]+>.*?<\/a>/, '');
      current.manifest.fileHashes = Object.fromEntries(
        Object.entries(current.files).map(([path, body]) => [path, digest(body)]),
      );
      await stage(staging, current);
      await assert.rejects(
        validateGeneratedOutput(staging, current.manifest),
        /Broken generated link|sitemap|contextual discovery/,
      );
    });
});

test('Unsafe publication targets are rejected before any files are overwritten', async () => {
  await withDirectories(async ({ staging, output, root }) => {
    const current = fixture();
    await stage(staging, current);
    await writeFile(join(output, 'index.html'), 'previous release');
    const outside = join(root, 'outside');
    await mkdir(outside);
    await symlink(outside, join(output, 'assets'));
    await assert.rejects(
      promoteGeneratedOutput(staging, output, current.manifest),
      /symbolic link/,
    );
    assert.equal(await readFile(join(output, 'index.html'), 'utf8'), 'previous release');
    await assert.rejects(access(join(outside, 'example.pdf')));
  });
});

test('Staged HTML and registered routes must agree even when their hashes are internally consistent', async () => {
  for (const issue of ['missing', 'extra'])
    await withDirectories(async ({ staging }) => {
      const current = fixture();
      if (issue === 'missing') delete current.files['templates/record/index.html'];
      else current.files['unexpected/index.html'] = current.files['index.html'];
      current.manifest.files = Object.keys(current.files).sort();
      current.manifest.fileHashes = Object.fromEntries(
        Object.entries(current.files).map(([path, body]) => [path, digest(body)]),
      );
      await stage(staging, current);
      await assert.rejects(
        validateGeneratedOutput(staging, current.manifest),
        /Missing generated route|Unregistered generated HTML|Untrusted generated release manifest/,
      );
    });
});
