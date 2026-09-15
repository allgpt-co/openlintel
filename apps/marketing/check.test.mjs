import process from 'node:process';
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  readFile,
  access,
  mkdtemp,
  mkdir,
  writeFile,
  rm,
  readdir,
  symlink,
} from 'node:fs/promises';
import { join, resolve, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync, spawn } from 'node:child_process';
import { fileURLToPath, URL } from 'node:url';
import { gzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { setTimeout, clearTimeout } from 'node:timers';
import ExcelJS from 'exceljs';
import JSZip from 'jszip';
import { createRegistry, publishedPages, validateRegistry } from './registry.mjs';
import { calculateBudgetRow, generateDownloads, displayRows } from './documents.mjs';
import { shell } from './components.mjs';
import { loadSiteConfig } from './config.mjs';
import {
  digest,
  validateOwnershipManifest,
  pruneObsoleteOutput,
  assertSafeOutputPath,
} from './owned-output.mjs';

const source = dirname(fileURLToPath(import.meta.url));
const { fetch } = globalThis;
const fixture = JSON.parse(await readFile(join(source, 'data/project.json'), 'utf8'));
const registry = publishedPages(createRegistry(fixture));
const cleanEnv = Object.fromEntries(
  Object.entries(process.env).filter(([name]) => !name.startsWith('MARKETING_')),
);
async function allFiles(root, relative = '') {
  const result = [];
  for (const entry of await readdir(join(root, relative), { withFileTypes: true })) {
    const path = join(relative, entry.name);
    if (entry.isDirectory()) result.push(...(await allFiles(root, path)));
    else result.push(path);
  }
  return result;
}
for (const base of ['/', '/openlintel/']) {
  test(`Build preserves unrelated files and resolves links at ${base}`, async () => {
    const output = await mkdtemp(join(tmpdir(), 'openlintel-marketing-'));
    try {
      await mkdir(output, { recursive: true });
      await writeFile(join(output, 'CNAME'), 'preserve.example');
      await writeFile(join(output, 'architecture.md'), '# Preserve this documentation');
      execFileSync(process.execPath, [join(source, 'build.mjs')], {
        env: { ...cleanEnv, MARKETING_OUT_DIR: output, MARKETING_BASE_PATH: base },
        stdio: 'pipe',
      });
      assert.equal(await readFile(join(output, 'CNAME'), 'utf8'), 'preserve.example');
      assert.equal(
        await readFile(join(output, 'architecture.md'), 'utf8'),
        '# Preserve this documentation',
      );
      const htmlFiles = (await allFiles(output)).filter((path) => path.endsWith('.html'));
      assert.equal(htmlFiles.length, registry.length + 1, 'Public routes plus a real 404 document');
      const manifest = JSON.parse(await readFile(join(output, 'marketing-manifest.json'), 'utf8'));
      assert.equal(manifest.pages.length, registry.length);
      assert.equal(manifest.origin, 'https://openlintel.com');
      assert.equal(manifest.basePath, base);
      assert.ok(validateOwnershipManifest(manifest));
      for (const file of manifest.files)
        assert.equal(digest(await readFile(join(output, file))), manifest.fileHashes[file], file);
      const sitemap = await readFile(join(output, 'sitemap.xml'), 'utf8');
      const descriptions = new Set();
      const incoming = new Map(registry.map((p) => [p.path, new Set()]));
      const titles = new Set();
      for (const path of htmlFiles) {
        const html = await readFile(join(output, path), 'utf8');
        assert.equal((html.match(/<h1[ >]/g) || []).length, 1, `${path} has one h1`);
        const title = html.match(/<title>(.*?)<\/title>/)?.[1];
        assert.ok(title);
        titles.add(title);
        assert.match(html, /<meta name="description" content="[^"]+"/);
        const description = html.match(/<meta name="description" content="([^"]+)"/)?.[1];
        descriptions.add(description);
        const route = path.replace(/index\.html$/, '');
        const record =
          path === '404.html'
            ? { path: '404.html', kind: 'utility', indexable: false }
            : registry.find((p) => p.path === route);
        assert.ok(record, `Registered route ${route}`);
        const canonical = `https://openlintel.com${base}${route}`;
        assert.ok(html.includes(`<link rel="canonical" href="${canonical}">`));
        assert.equal(sitemap.includes(`<loc>${canonical}</loc>`), record.indexable, canonical);
        assert.equal(
          html.includes('<meta name="robots" content="noindex,follow">'),
          !record.indexable,
        );
        if (record.modified && record.indexable)
          assert.ok(sitemap.includes(`<lastmod>${record.modified}</lastmod>`));
        assert.doesNotMatch(
          html,
          /<script[^>]+src="https?:\/\/(?:www\.)?(?:googletagmanager|google-analytics)/,
        );
        const schemas = JSON.parse(
          html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1],
        );
        const organization = schemas.find((s) => s['@type'] === 'Organization');
        const website = schemas.find((s) => s['@type'] === 'WebSite');
        assert.equal(organization['@id'], `https://openlintel.com${base}#organization`);
        assert.equal(website.publisher['@id'], organization['@id']);
        assert.equal(
          organization.publishingPrinciples,
          `https://openlintel.com${base}editorial-policy/`,
        );
        if (['guide', 'template', 'hub'].includes(record.kind)) {
          const breadcrumb = schemas.find((s) => s['@type'] === 'BreadcrumbList');
          assert.equal(breadcrumb.itemListElement.at(-1).item, canonical);
          assert.match(html, /aria-label="Breadcrumb"/);
        }
        if (record.kind === 'guide') {
          const article = schemas.find((s) => s['@type'] === 'Article');
          assert.equal(article.author.name, 'OpenLintel');
          assert.equal(article.author.url, `https://openlintel.com${base}about/`);
          assert.equal(article.dateModified, record.modified);
          assert.equal(
            article.datePublished,
            record.published,
            'Only use an explicitly recorded production publication date',
          );
        }
        if (['guide', 'template'].includes(record.kind) && record.modified) {
          const visibleDate = new Date(`${record.modified}T00:00:00Z`).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            timeZone: 'UTC',
          });
          assert.ok(
            html.includes(`<time datetime="${record.modified}">${visibleDate}</time>`),
            `${path}: visible editorial date matches metadata (${visibleDate})`,
          );
        }
        const pageUrl = new URL(path.replace(/index\.html$/, ''), `https://openlintel.com${base}`);
        for (const [, raw] of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
          const link = new URL(raw.replaceAll('&amp;', '&'), pageUrl);
          if (link.origin !== pageUrl.origin) continue;
          const linkedRoute = link.pathname.slice(base.length);
          if (incoming.has(linkedRoute) && route !== linkedRoute)
            incoming.get(linkedRoute).add(route);
          assert.ok(link.pathname.startsWith(base), `${path}: ${raw} includes base path`);
          const target = resolve(output, link.pathname.slice(base.length) || '.');
          const destination = link.pathname.endsWith('/') ? join(target, 'index.html') : target;
          await access(destination);
          if (link.hash && destination.endsWith('.html')) {
            const destHtml = await readFile(destination, 'utf8');
            assert.ok(
              [...destHtml.matchAll(/\sid="([^"]+)"/g)].some(
                (match) => match[1] === decodeURIComponent(link.hash.slice(1)),
              ),
              `${path}: ${raw} fragment exists`,
            );
          }
        }
        const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
        assert.equal(new Set(ids).size, ids.length, `${path} has unique IDs`);
        const css = await readFile(join(output, 'assets/site.css'));
        const js = await readFile(join(output, 'assets/site.js'));
        const growthCss = await readFile(join(output, 'assets/growth.css'));
        const growthJs = await readFile(join(output, 'assets/growth.js'));
        assert.ok(
          [html, css, js, growthCss, growthJs].reduce(
            (total, body) => total + gzipSync(body).length,
            0,
          ) < 200_000,
        );
      }
      assert.equal(titles.size, registry.length + 1);
      assert.equal(descriptions.size, registry.length + 1);
      assert.equal(
        (sitemap.match(/<loc>/g) || []).length,
        registry.filter((p) => p.indexable).length,
      );
      for (const record of registry.filter((p) => ['guide', 'template'].includes(p.kind))) {
        const links = incoming.get(record.path);
        assert.ok(
          links.has(record.kind === 'template' ? 'templates/' : 'resources/'),
          'Linked from parent hub',
        );
        assert.ok(
          [...links].some((route) => route !== 'resources/' && route !== 'templates/'),
          `${record.path} linked from another page`,
        );
      }
      for (const record of manifest.pages.filter((p) => p.kind === 'template')) {
        for (const download of record.downloads) {
          const buffer = await readFile(join(output, download.path));
          assert.equal(buffer.length, download.size);
          assert.equal(buffer.subarray(0, 2).toString(), 'PK');
          assert.ok(manifest.files.includes(download.path));
        }
      }
      const csv = await readFile(
        join(output, 'assets/downloads/window-room-materials.csv'),
        'utf8',
      );
      const fixture = JSON.parse(await readFile(join(source, 'data/project.json'), 'utf8'));
      assert.ok(
        !csv.includes('\r'),
        'Generated CSV matches Git LF normalization and deployed hashes',
      );
      for (const item of fixture.materials) assert.ok(csv.includes(`"${item.id}"`));
      assert.match(csv, /Illustrative sample project; pending review/);
      for (const drawing of fixture.drawings) {
        const svg = await readFile(join(output, 'assets/downloads', drawing.filename), 'utf8');
        assert.ok(svg.includes(drawing.reference));
        assert.match(svg, /PENDING REVIEW/);
      }
      const home = await readFile(join(output, 'index.html'), 'utf8');
      for (const [, srcset] of home.matchAll(/srcset="([^"]+)"/g)) {
        for (const candidate of srcset.split(','))
          await access(join(output, candidate.trim().split(' ')[0].slice(base.length)));
      }
    } finally {
      await rm(output, { recursive: true, force: true });
    }
  });
}

test('Registry includes growth and editorial resources and rejects invalid publication metadata', () => {
  assert.equal(registry.filter((p) => p.kind === 'hub').length, 2);
  assert.equal(registry.filter((p) => p.kind === 'guide').length, 18);
  assert.equal(registry.filter((p) => p.kind === 'template').length, 12);
  assert.equal(registry.filter((p) => p.kind === 'growth').length, 6);
  assert.equal(registry.find((p) => p.id === 'summary').indexable, false);
  assert.equal(registry.find((p) => p.id === 'pilot-thanks').indexable, false);
  assert.throws(() => validateRegistry([...registry, registry[0]]), /Duplicate/);
  assert.throws(() => validateRegistry([{ ...registry[0], path: '../unsafe/' }]), /Invalid/);
  const draft = {
    id: 'future',
    path: 'resources/future/',
    title: 'Future',
    description: 'Not published',
    kind: 'guide',
    status: 'draft',
    indexable: true,
  };
  assert.ok(!publishedPages([...registry, draft]).some((p) => p.id === 'future'));
  assert.throws(
    () =>
      validateRegistry([
        ...registry,
        { ...draft, status: 'published', cluster: 'discover', related: ['missing'] },
      ]),
    /Broken/,
  );
  assert.throws(() => validateRegistry([{ ...registry[0], indexable: 'false' }]), /indexable/);
  assert.throws(() => validateRegistry([{ ...registry[0], indexable: undefined }]), /indexable/);
  assert.throws(() => validateRegistry([{ ...registry[0], modified: '2026-02-30' }]), /date/);
  assert.throws(
    () => validateRegistry([{ ...registry[0], published: '2026-09-16', modified: '2026-09-15' }]),
    /Publication date/,
  );
});

test('Budget calculation handles known values, blank inputs, zero and overruns', () => {
  assert.deepEqual(calculateBudgetRow(1, 1200, 100, 1500), { total: 1300, remaining: 200 });
  assert.deepEqual(calculateBudgetRow(1, 500, 50, 500), { total: 550, remaining: -50 });
  assert.deepEqual(calculateBudgetRow(null, 50, 0, 100), { total: null, remaining: null });
  assert.deepEqual(calculateBudgetRow(2, null), { total: null, remaining: null });
  assert.deepEqual(calculateBudgetRow(0, 50, 0, 0), { total: 0, remaining: 0 });
  assert.deepEqual(calculateBudgetRow(2, 1.235, null), { total: 2.47, remaining: null });
  assert.throws(() => calculateBudgetRow(-1, 1), /non-negative/);
  assert.throws(() => calculateBudgetRow(1, Infinity), /non-negative/);
});

test('All Office documents parse, match their definitions, and build reproducibly', async () => {
  for (const definition of registry.filter((p) => p.kind === 'template')) {
    const first = await generateDownloads(definition);
    const second = await generateDownloads(definition);
    for (const [index, download] of first.entries()) {
      assert.equal(
        createHash('sha256').update(download.buffer).digest('hex'),
        createHash('sha256').update(second[index].buffer).digest('hex'),
        `${download.path}: deterministic bytes`,
      );
      const zip = await JSZip.loadAsync(download.buffer);
      assert.ok(zip.file('[Content_Types].xml'));
      assert.ok(!Object.keys(zip.files).some((name) => /vbaProject|externalLinks/.test(name)));
      if (definition.format === 'docx') {
        const document = await zip.file('word/document.xml').async('string');
        for (const field of definition.fields)
          assert.ok(document.includes(field.label.replaceAll('&', '&amp;')), field.label);
        assert.match(document, /Pending professional review/);
        assert.match(await zip.file('word/styles.xml').async('string'), /Calibri/);
        if (index === 1) assert.ok(document.includes('Window Room'));
        const props = await zip.file('docProps/core.xml').async('string');
        assert.match(props, /2026-09-14T00:00:00.000Z/);
      } else {
        const book = new ExcelJS.Workbook();
        await book.xlsx.load(download.buffer);
        assert.deepEqual(
          book.worksheets.map((s) => s.name),
          ['Instructions', 'Blank Template', 'Worked Example'],
        );
        const blank = book.getWorksheet('Blank Template');
        const example = book.getWorksheet('Worked Example');
        assert.equal(blank.getCell('A6').value, null);
        assert.match(example.getCell('A2').value, /Illustrative teaching extension/);
        assert.equal(example.views[0].ySplit, 5);
        const rows = displayRows(definition);
        for (const [i, row] of rows.entries()) {
          for (const [c, value] of row.entries()) {
            const cell = example.getRow(i + 6).getCell(c + 1);
            if (cell.type === ExcelJS.ValueType.Formula)
              assert.equal(cell.result ?? null, value ?? null);
            else assert.equal(cell.value, value ?? null);
          }
        }
        if (definition.budget) {
          assert.equal(example.getCell('G6').result, 1300);
          assert.equal(example.getCell('I7').result, -50);
          assert.equal(example.getCell('G27').result, 1850);
          assert.equal(example.getCell('I27').result, 150);
          assert.match(example.getCell('G8').formula, /IF\(OR/);
          assert.equal(blank.getCell('C6').dataValidation.operator, 'greaterThanOrEqual');
          assert.equal(blank.getCell('G6').result, undefined);
        }
      }
    }
  }
});

test('Structured metadata escapes script delimiters without changing the value', () => {
  const title = 'A <script> example';
  const html = shell({ ...registry.find((p) => p.kind === 'guide'), title }, '<h1>Example</h1>');
  const raw = html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1];
  assert.ok(!raw.includes('<script>'));
  const schemas = JSON.parse(raw);
  assert.equal(schemas.find((s) => s['@type'] === 'Article').headline, title);
});

test('Site configuration rejects unsafe origins and base paths without silent truncation', () => {
  assert.equal(loadSiteConfig({}).origin, 'https://openlintel.com');
  assert.equal(
    loadSiteConfig({ MARKETING_ORIGIN: 'http://localhost:4173', MARKETING_BASE_PATH: '/preview' })
      .base,
    '/preview/',
  );
  for (const origin of [
    'javascript:alert(1)',
    'https://user:password@example.com',
    'https://example.com/path',
    'https://example.com?query=1',
    'https://example.com#hash',
    'http://example.com',
    'https:/example.com',
    'https://example.com/\n',
  ])
    assert.throws(() => loadSiteConfig({ MARKETING_ORIGIN: origin }), /MARKETING_ORIGIN/);
  for (const base of [
    '//evil.example/',
    '/a/../b/',
    '/%2e%2e/',
    '/a?b/',
    '/a#b/',
    '/a"b/',
    '/a b/',
    '/a\\b/',
  ])
    assert.throws(() => loadSiteConfig({ MARKETING_BASE_PATH: base }), /MARKETING_BASE_PATH/);
  assert.throws(() => loadSiteConfig({ MARKETING_NOINDEX: 'yes' }), /MARKETING_NOINDEX/);
  assert.equal(loadSiteConfig({ MARKETING_NOINDEX: 'true' }).indexable, false);
});

test('An explicitly recorded publication date is included without inventing a reviewer', () => {
  const page = {
    ...registry.find((p) => p.kind === 'guide'),
    published: '2026-09-14',
    modified: '2026-09-15',
  };
  const schemas = JSON.parse(
    shell(page, '<h1>Example</h1>').match(
      /<script type="application\/ld\+json">(.*?)<\/script>/s,
    )[1],
  );
  const article = schemas.find((schema) => schema['@type'] === 'Article');
  assert.equal(article.datePublished, '2026-09-14');
  assert.equal(article.dateModified, '2026-09-15');
  assert.ok(!article.reviewedBy);
});

test('Global preview noindex keeps pages crawlable but excludes every URL from the sitemap', async () => {
  const output = await mkdtemp(join(tmpdir(), 'openlintel-noindex-'));
  try {
    execFileSync(process.execPath, [join(source, 'build.mjs')], {
      env: { ...cleanEnv, MARKETING_OUT_DIR: output, MARKETING_NOINDEX: 'true' },
      stdio: 'pipe',
    });
    const manifest = JSON.parse(await readFile(join(output, 'marketing-manifest.json'), 'utf8'));
    assert.equal(manifest.indexable, false);
    assert.ok(manifest.pages.every((page) => page.indexable === false));
    assert.doesNotMatch(await readFile(join(output, 'sitemap.xml'), 'utf8'), /<loc>/);
    assert.match(await readFile(join(output, 'robots.txt'), 'utf8'), /Allow: \//);
    for (const page of manifest.pages)
      assert.match(
        await readFile(join(output, page.path, 'index.html'), 'utf8'),
        /name="robots" content="noindex,follow"/,
      );
  } finally {
    await rm(output, { recursive: true, force: true });
  }
});

test('Retirement prunes only unchanged hash-owned generated files and never traverses symlinks', async () => {
  const output = await mkdtemp(join(tmpdir(), 'openlintel-ownership-'));
  const outside = await mkdtemp(join(tmpdir(), 'openlintel-outside-'));
  const files = [
    'resources/retired/index.html',
    'assets/retired.svg',
    'assets/changed.svg',
    'assets/linked.svg',
    'assets/linked-dir/secret.svg',
  ];
  const previous = {
    generator: 'OpenLintel marketing',
    schemaVersion: 2,
    origin: 'https://openlintel.com',
    basePath: '/',
    indexable: true,
    pages: [{ path: 'resources/retired/', indexable: true }],
    files,
    fileHashes: Object.fromEntries(files.map((path) => [path, digest('generated')])),
  };
  try {
    await mkdir(join(output, 'resources/retired'), { recursive: true });
    await mkdir(join(output, 'assets'), { recursive: true });
    await writeFile(join(output, files[0]), 'generated');
    await writeFile(join(output, files[1]), 'generated');
    await writeFile(join(output, files[2]), 'hand-maintained change');
    await writeFile(join(outside, 'secret.svg'), 'generated');
    await symlink(join(outside, 'secret.svg'), join(output, files[3]));
    await symlink(outside, join(output, 'assets/linked-dir'));
    await writeFile(join(output, 'architecture.md'), '# Keep');
    assert.ok(validateOwnershipManifest(previous));
    assert.equal(validateOwnershipManifest({ ...previous, schemaVersion: undefined }), false);
    assert.equal(validateOwnershipManifest({ ...previous, origin: 'javascript:alert(1)' }), false);
    for (const path of [
      '../secret.svg',
      '/secret.svg',
      'architecture.md',
      'CNAME',
      'assets/../../secret.svg',
    ])
      assert.equal(
        validateOwnershipManifest({
          ...previous,
          files: [path],
          fileHashes: { [path]: digest('generated') },
        }),
        false,
      );
    const result = await pruneObsoleteOutput(output, previous, []);
    assert.deepEqual(result.removed, files.slice(0, 2));
    assert.deepEqual(result.preserved, files.slice(2));
    assert.equal(await readFile(join(outside, 'secret.svg'), 'utf8'), 'generated');
    assert.equal(await readFile(join(output, 'architecture.md'), 'utf8'), '# Keep');
    await assert.rejects(access(join(output, files[0])), { code: 'ENOENT' });
    await assert.rejects(
      assertSafeOutputPath(output, 'assets/linked-dir/new.svg'),
      /symbolic link/,
    );
    await assert.rejects(assertSafeOutputPath(output, '../new.svg'), /Unsafe/);
    assert.deepEqual(
      (await pruneObsoleteOutput(output, { generator: 'OpenLintel marketing', files }, [])).removed,
      [],
    );
  } finally {
    await rm(output, { recursive: true, force: true });
    await rm(outside, { recursive: true, force: true });
  }
});

test('Preview serves real 404s, canonical path redirects, and noindex headers', async () => {
  const output = await mkdtemp(join(tmpdir(), 'openlintel-preview-'));
  let child;
  try {
    await mkdir(join(output, 'resources'), { recursive: true });
    await writeFile(join(output, 'resources/index.html'), '<!doctype html><h1>Resources</h1>');
    await writeFile(join(output, '404.html'), '<!doctype html><h1>Page not found</h1>');
    child = spawn(process.execPath, [join(source, 'preview.mjs')], {
      env: {
        ...cleanEnv,
        MARKETING_OUT_DIR: output,
        MARKETING_BASE_PATH: '/openlintel/',
        PORT: '0',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const address = await new Promise((resolveAddress, reject) => {
      const timer = setTimeout(() => reject(new Error('Preview startup timed out')), 10000);
      child.once('error', (error) => {
        clearTimeout(timer);
        reject(error);
      });
      child.once('exit', (code) => {
        clearTimeout(timer);
        reject(new Error(`Preview exited before startup (code ${code})`));
      });
      child.stdout.on('data', (chunk) => {
        const match = chunk.toString().match(/http:\/\/localhost:\d+\/openlintel\//);
        if (match) {
          clearTimeout(timer);
          resolveAddress(match[0]);
        }
      });
    });
    for (const path of ['resources', 'resources/index.html']) {
      const response = await fetch(`${address}${path}?source=test`, { redirect: 'manual' });
      assert.equal(response.status, 301);
      assert.equal(response.headers.get('location'), '/openlintel/resources/?source=test');
    }
    const response = await fetch(`${address}missing/`);
    assert.equal(response.status, 404);
    assert.match(response.headers.get('x-robots-tag'), /noindex/);
    assert.match(await response.text(), /Page not found/);
    const head = await fetch(`${address}missing/`, { method: 'HEAD' });
    assert.equal(head.status, 404);
    assert.equal(await head.text(), '');
    assert.equal((await fetch(`${address}resources/`)).status, 200);
    assert.equal((await fetch(`${address}resources/`, { method: 'POST' })).status, 405);
  } finally {
    if (child && child.exitCode === null && child.signalCode === null) {
      const exited = new Promise((resolveExit) => child.once('exit', resolveExit));
      child.kill();
      await exited;
    }
    await rm(output, { recursive: true, force: true });
  }
});
