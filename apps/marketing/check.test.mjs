import process from 'node:process';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access, mkdtemp, mkdir, writeFile, rm, readdir } from 'node:fs/promises';
import { join, resolve, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, URL } from 'node:url';
import { gzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import ExcelJS from 'exceljs';
import JSZip from 'jszip';
import { createRegistry, publishedPages, validateRegistry } from './registry.mjs';
import { calculateBudgetRow, generateDownloads, displayRows } from './documents.mjs';
import { shell } from './components.mjs';

const source = dirname(fileURLToPath(import.meta.url));
const fixture = JSON.parse(await readFile(join(source, 'data/project.json'), 'utf8'));
const registry = publishedPages(createRegistry(fixture));
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
        env: { ...process.env, MARKETING_OUT_DIR: output, MARKETING_BASE_PATH: base },
        stdio: 'pipe',
      });
      assert.equal(await readFile(join(output, 'CNAME'), 'utf8'), 'preserve.example');
      assert.equal(
        await readFile(join(output, 'architecture.md'), 'utf8'),
        '# Preserve this documentation',
      );
      const htmlFiles = (await allFiles(output)).filter((path) => path.endsWith('.html'));
      assert.equal(htmlFiles.length, registry.length);
      const manifest = JSON.parse(await readFile(join(output, 'marketing-manifest.json'), 'utf8'));
      assert.equal(manifest.pages.length, registry.length);
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
        const record = registry.find((p) => p.path === route);
        assert.ok(record, `Registered route ${route}`);
        const canonical = `https://openlintel.com${base}${route}`;
        assert.ok(html.includes(`<link rel="canonical" href="${canonical}">`));
        assert.ok(sitemap.includes(`<loc>${canonical}</loc>`));
        if (record.modified) assert.ok(sitemap.includes(`<lastmod>${record.modified}</lastmod>`));
        assert.doesNotMatch(html, /googletagmanager|google-analytics|gtag\(/);
        const schemas = JSON.parse(
          html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1],
        );
        if (['guide', 'template', 'hub'].includes(record.kind)) {
          const breadcrumb = schemas.find((s) => s['@type'] === 'BreadcrumbList');
          assert.equal(breadcrumb.itemListElement.at(-1).item, canonical);
          assert.match(html, /aria-label="Breadcrumb"/);
        }
        if (record.kind === 'guide') {
          const article = schemas.find((s) => s['@type'] === 'Article');
          assert.equal(article.author.name, 'OpenLintel');
          assert.equal(article.dateModified, record.modified);
          assert.ok(!article.datePublished, 'Do not invent a production publication date');
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
              destHtml.includes(`id="${decodeURIComponent(link.hash.slice(1))}"`),
              `${path}: ${raw} fragment exists`,
            );
          }
        }
        const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
        assert.equal(new Set(ids).size, ids.length, `${path} has unique IDs`);
        const css = await readFile(join(output, 'assets/site.css'));
        const js = await readFile(join(output, 'assets/site.js'));
        assert.ok(gzipSync(html).length + gzipSync(css).length + gzipSync(js).length < 200_000);
      }
      assert.equal(titles.size, registry.length);
      assert.equal(descriptions.size, registry.length);
      assert.equal((sitemap.match(/<loc>/g) || []).length, registry.length);
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

test('Registry has 26 new pages and rejects duplicate, unsafe, and unpublished links', () => {
  assert.equal(registry.filter((p) => p.kind === 'hub').length, 2);
  assert.equal(registry.filter((p) => p.kind === 'guide').length, 12);
  assert.equal(registry.filter((p) => p.kind === 'template').length, 12);
  assert.throws(() => validateRegistry([...registry, registry[0]]), /Duplicate/);
  assert.throws(() => validateRegistry([{ ...registry[0], path: '../unsafe/' }]), /Invalid/);
  const draft = {
    id: 'future',
    path: 'resources/future/',
    title: 'Future',
    description: 'Not published',
    kind: 'guide',
    status: 'draft',
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
