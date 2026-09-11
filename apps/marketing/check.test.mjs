import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access, mkdtemp, mkdir, writeFile, rm, readdir } from 'node:fs/promises';
import { join, resolve, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const source = dirname(fileURLToPath(import.meta.url));
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
      assert.equal(htmlFiles.length, 7);
      const titles = new Set();
      for (const path of htmlFiles) {
        const html = await readFile(join(output, path), 'utf8');
        assert.equal((html.match(/<h1[ >]/g) || []).length, 1, `${path} has one h1`);
        const title = html.match(/<title>(.*?)<\/title>/)?.[1];
        assert.ok(title);
        titles.add(title);
        assert.match(html, /<meta name="description" content="[^"]+"/);
        const pageUrl = new URL(path.replace(/index\.html$/, ''), `https://openlintel.com${base}`);
        for (const [, raw] of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
          const link = new URL(raw.replaceAll('&amp;', '&'), pageUrl);
          if (link.origin !== pageUrl.origin) continue;
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
      assert.equal(titles.size, 7);
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
