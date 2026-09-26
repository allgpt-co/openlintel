import { readFile } from 'node:fs/promises';
import { extname, resolve } from 'node:path';
import { writePrivateReport } from './report-output.mjs';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';

const unescapeXml = (value) =>
  value
    .replaceAll('&amp;', '&')
    .replaceAll('&quot;', '"')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>');
const hash = (data) => createHash('sha256').update(data).digest('hex');
const isLoopback = (url) => ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);

const contentTypes = {
  '.html': ['text/html'],
  '.css': ['text/css'],
  '.js': ['text/javascript', 'application/javascript'],
  '.json': ['application/json'],
  '.xml': ['application/xml', 'text/xml'],
  '.txt': ['text/plain'],
  '.svg': ['image/svg+xml'],
  '.png': ['image/png'],
  '.webp': ['image/webp'],
  '.mp4': ['video/mp4'],
  '.vtt': ['text/vtt'],
  '.jpg': ['image/jpeg'],
  '.jpeg': ['image/jpeg'],
  '.woff2': ['font/woff2', 'application/font-woff2'],
  '.docx': ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  '.xlsx': ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
  '.pptx': ['application/vnd.openxmlformats-officedocument.presentationml.presentation'],
  '.pdf': ['application/pdf'],
};
function validContentType(file, response) {
  const expected = contentTypes[extname(file)];
  const actual = (response.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
  return !expected || expected.includes(actual);
}

export function validateAuditManifest(manifest) {
  if (
    manifest.generator !== 'OpenLintel marketing' ||
    manifest.schemaVersion !== 2 ||
    typeof manifest.indexable !== 'boolean' ||
    !Array.isArray(manifest.pages) ||
    !Array.isArray(manifest.files) ||
    !manifest.fileHashes
  )
    throw new Error('Build a schemaVersion 2 marketing manifest before auditing.');
  const origin = new URL(manifest.origin);
  if (
    origin.protocol !== 'https:' ||
    origin.origin !== manifest.origin ||
    origin.username ||
    origin.password
  )
    throw new Error('Manifest origin must be an HTTPS origin.');
  if (!/^\/(?:[a-zA-Z0-9_-]+\/)*$/.test(manifest.basePath))
    throw new Error('Invalid manifest base path.');
  for (const file of manifest.files) {
    if (
      !/^[a-zA-Z0-9_./-]+$/.test(file) ||
      file.startsWith('/') ||
      file.split('/').some((part) => part === '.' || part === '..' || !part) ||
      !/^[a-f0-9]{64}$/.test(manifest.fileHashes[file] || '')
    )
      throw new Error(`Unsafe or unhashed generated file: ${file}`);
  }
  for (const page of manifest.pages) {
    if (
      !/^(?:[a-z0-9-]+\/)*$/.test(page.path) ||
      typeof page.indexable !== 'boolean' ||
      !manifest.files.includes(`${page.path}index.html`)
    )
      throw new Error('Invalid page record in audit manifest.');
  }
  return manifest;
}

export async function auditProduction(
  manifest,
  { baseUrl, fetcher = fetch, hostVariants = true } = {},
) {
  validateAuditManifest(manifest);
  const canonicalBase = manifest.origin + manifest.basePath;
  const base = new URL(baseUrl || canonicalBase);
  if (
    base.username ||
    base.password ||
    base.search ||
    base.hash ||
    !base.pathname.endsWith('/') ||
    (base.protocol !== 'https:' && !(base.protocol === 'http:' && isLoopback(base)))
  )
    throw new Error('Audit URL must be HTTPS (HTTP only for loopback preview) and end in /.');
  const localPreview = isLoopback(base);
  const checks = [];
  const add = (name, pass, detail = '') =>
    checks.push({ name, pass: !!pass, ...(detail ? { detail } : {}) });
  const request = async (url, options = {}) =>
    fetcher(url, { signal: AbortSignal.timeout(15_000), redirect: 'follow', ...options });
  const report = () => ({
    checkedAt: new Date().toISOString(),
    target: base.href,
    canonicalBase,
    mode: localPreview ? 'local-preview-not-production' : 'production',
    status: checks.every((c) => c.pass) ? 'passed' : 'failed',
    checks,
  });
  if (!localPreview) {
    add('Production target matches canonical base', base.href === canonicalBase);
    add(
      'Production build permits search indexing',
      manifest.indexable === true && manifest.pages.some((page) => page.indexable),
    );
  }
  let home;
  try {
    home = await request(base.href);
    add('Homepage reachable', home.status === 200, `HTTP ${home.status}`);
  } catch (error) {
    add('Homepage reachable', false, error.cause?.code || error.name || 'Network failure');
    return report(); // Do not issue a hundred requests to an unresolved hostname.
  }
  if (home.status !== 200) return report();
  add(
    'Homepage stays on expected transport origin',
    new URL(home.url || base.href).origin === base.origin,
  );

  const bodies = new Map();
  let cursor = 0;
  await Promise.all(
    Array.from({ length: 4 }, async () => {
      while (cursor < manifest.files.length) {
        const file = manifest.files[cursor++];
        try {
          const target = new URL(file, base).href;
          const response = await request(target);
          const body = Buffer.from(await response.arrayBuffer());
          add(`${file}: status`, response.status === 200, `HTTP ${response.status}`);
          add(
            `${file}: content type`,
            validContentType(file, response),
            response.headers.get('content-type') || 'Missing Content-Type',
          );
          add(`${file}: transport origin`, new URL(response.url || target).origin === base.origin);
          add(
            `${file}: deployed bytes`,
            hash(body) === manifest.fileHashes[file],
            'Must match the locally reviewed build',
          );
          if (/\.(html|xml|txt)$/.test(file))
            bodies.set(file, { text: body.toString('utf8'), headers: response.headers });
          if (/\.(docx|xlsx|pptx)$/.test(file))
            add(`${file}: Office archive`, body.subarray(0, 2).toString() === 'PK');
          if (/\.pdf$/.test(file))
            add(`${file}: PDF header`, body.subarray(0, 5).toString() === '%PDF-');
        } catch (error) {
          add(`${file}: fetch`, false, error.cause?.code || error.name);
        }
      }
    }),
  );
  // Check the public directory URLs as well as physical index.html artifacts.
  // Static assets existing alone does not prove that the host routes users correctly.
  let pageCursor = 0;
  await Promise.all(
    Array.from({ length: 4 }, async () => {
      while (pageCursor < manifest.pages.length) {
        const page = manifest.pages[pageCursor++];
        const target = new URL(page.path, base).href;
        try {
          const response = await request(target);
          const body = Buffer.from(await response.arrayBuffer());
          add(
            `${page.path || '/'}: public route status`,
            response.status === 200,
            `HTTP ${response.status}`,
          );
          add(`${page.path || '/'}: final public URL`, (response.url || target) === target);
          add(
            `${page.path || '/'}: public HTML content type`,
            validContentType('index.html', response),
          );
          add(
            `${page.path || '/'}: public route bytes`,
            hash(body) === manifest.fileHashes[`${page.path}index.html`],
          );
          bodies.set(`${page.path}index.html`, {
            text: body.toString('utf8'),
            headers: response.headers,
          });
        } catch (error) {
          add(`${page.path || '/'}: public route fetch`, false, error.cause?.code || error.name);
        }
      }
    }),
  );
  const sitemap = bodies.get('sitemap.xml')?.text || '';
  const locations = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => unescapeXml(m[1]));
  const expected = manifest.pages
    .filter((p) => p.indexable)
    .map((p) => canonicalBase + p.path)
    .sort();
  add(
    'Sitemap contains exactly indexable canonical pages',
    JSON.stringify(locations.sort()) === JSON.stringify(expected),
  );
  add(
    'Robots advertises canonical sitemap',
    bodies.get('robots.txt')?.text.includes(`Sitemap: ${canonicalBase}sitemap.xml`),
  );
  for (const page of manifest.pages) {
    const resource = bodies.get(`${page.path}index.html`);
    if (!resource) continue;
    const canonical = unescapeXml(
      resource.text.match(/<link rel="canonical" href="([^"]+)"/)?.[1] || '',
    );
    add(`${page.path || '/'}: canonical`, canonical === canonicalBase + page.path);
    const noindex = /<meta name="robots" content="[^"]*noindex/.test(resource.text);
    add(`${page.path || '/'}: indexing directive`, noindex === !page.indexable);
    if (!localPreview && page.indexable)
      add(
        `${page.path || '/'}: no blocking response header`,
        !/noindex|none/i.test(resource.headers.get('x-robots-tag') || ''),
      );
  }
  try {
    const missing = await request(new URL('__openlintel-audit-missing-page__/', base).href);
    add('Unknown route returns genuine 404', missing.status === 404, `HTTP ${missing.status}`);
  } catch (error) {
    add('Unknown route returns genuine 404', false, error.name);
  }
  for (const path of ['pilot', 'sample-project']) {
    try {
      const response = await request(new URL(path, base).href, { redirect: 'manual' });
      const location = response.headers.get('location');
      add(
        `${path}: trailing slash redirect`,
        [301, 308].includes(response.status) &&
          location &&
          new URL(location, base).href === new URL(`${path}/`, base).href,
      );
    } catch (error) {
      add(`${path}: redirect`, false, error.name);
    }
  }
  if (
    hostVariants &&
    !localPreview &&
    base.origin === manifest.origin &&
    new URL(manifest.origin).hostname === 'openlintel.com'
  ) {
    for (const origin of [
      'http://openlintel.com',
      'https://www.openlintel.com',
      'http://www.openlintel.com',
      'https://allgpt-co.github.io',
    ]) {
      const prefix = origin === 'https://allgpt-co.github.io' ? '/openlintel/' : manifest.basePath;
      try {
        const response = await request(`${origin}${prefix}sample-project/`);
        add(
          `${origin}: deep-link normalization`,
          response.status === 200 && response.url === `${canonicalBase}sample-project/`,
          `${response.status} ${response.url}`,
        );
      } catch (error) {
        add(`${origin}: deep-link normalization`, false, error.cause?.code || error.name);
      }
    }
  }
  return report();
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const arg = (name, fallback) => {
      const i = process.argv.indexOf(name);
      if (i !== -1 && (!process.argv[i + 1] || process.argv[i + 1].startsWith('--')))
        throw new Error(`${name} requires a value.`);
      return i === -1 ? fallback : process.argv[i + 1];
    };
    if (process.argv.includes('--help')) {
      console.log(
        'node apps/marketing/production-check.mjs [--manifest docs/marketing-manifest.json] [--url http://localhost:4173/] [--out output/seo/production-check.json]\nGET-only audit, four concurrent requests, exact reviewed asset hashes. Nonzero exit on any failed gate.',
      );
    } else {
      const manifest = JSON.parse(
        await readFile(arg('--manifest', 'docs/marketing-manifest.json'), 'utf8'),
      );
      const result = await auditProduction(manifest, { baseUrl: arg('--url', undefined) });
      const output = resolve(arg('--out', 'output/seo/production-check.json'));
      await writePrivateReport(output, result);
      for (const entry of result.checks.filter((c) => !c.pass))
        console.error(`FAIL ${entry.name}${entry.detail ? `: ${entry.detail}` : ''}`);
      console.log(
        `${result.status.toUpperCase()}: ${result.checks.filter((c) => c.pass).length}/${result.checks.length} checks (${result.mode}). Report: ${output}`,
      );
      if (result.status !== 'passed') process.exitCode = 1;
    }
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
