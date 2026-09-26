import { readFile, mkdir, writeFile, rename, unlink, lstat } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { randomUUID } from 'node:crypto';
import {
  assertSafeOutputPath,
  digest,
  pruneObsoleteOutput,
  validateOwnershipManifest,
} from './owned-output.mjs';

const decode = (value) =>
  value
    .replaceAll('&amp;', '&')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>');

/** Validate a complete disposable build before touching the current public output. */
export async function validateGeneratedOutput(staging, manifest) {
  if (!validateOwnershipManifest(manifest))
    throw new Error('Untrusted generated release manifest.');
  const files = new Set(manifest.files);
  for (const page of manifest.pages) {
    if (!files.has(`${page.path}index.html`))
      throw new Error(`Missing generated route: ${page.id}`);
  }
  const bodies = new Map();
  for (const file of manifest.files) {
    await assertSafeOutputPath(staging, file);
    const body = await readFile(join(staging, file));
    if (digest(body) !== manifest.fileHashes[file])
      throw new Error(`Generated hash mismatch: ${file}`);
    bodies.set(file, body);
  }
  const persisted = JSON.parse(await readFile(join(staging, 'marketing-manifest.json'), 'utf8'));
  if (JSON.stringify(persisted) !== JSON.stringify(manifest))
    throw new Error('Staged manifest does not match the release.');
  const base = new URL(manifest.origin + manifest.basePath);
  const incoming = new Map(manifest.pages.map((page) => [page.path, new Set()]));
  for (const file of manifest.files.filter((path) => path.endsWith('.html'))) {
    const html = bodies.get(file).toString('utf8');
    const route = file.endsWith('index.html') ? file.slice(0, -10) : file;
    const page = manifest.pages.find((entry) => entry.path === route);
    if (!page && file !== '404.html') throw new Error(`Unregistered generated HTML: ${file}`);
    const canonical = new URL(route, base).href;
    const actual = decode(html.match(/<link rel="canonical" href="([^"]+)"/)?.[1] || '');
    if (actual !== canonical) throw new Error(`Generated canonical mismatch: ${file}`);
    if ((html.match(/<h1[ >]/g) || []).length !== 1)
      throw new Error(`Generated page needs one heading: ${file}`);
    const noindex = /<meta name="robots" content="[^"]*noindex/.test(html);
    if (noindex === Boolean(page?.indexable))
      throw new Error(`Generated indexing mismatch: ${file}`);
    const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
    if (new Set(ids).size !== ids.length)
      throw new Error(`Duplicate generated element ID: ${file}`);
    for (const [, raw] of html.matchAll(/(?:href|src|poster)="([^"]+)"/g)) {
      const link = new URL(decode(raw), canonical);
      if (link.origin !== base.origin) continue;
      if (!link.pathname.startsWith(base.pathname))
        throw new Error(`Generated link escapes the base path: ${file}`);
      const targetRoute = decodeURIComponent(link.pathname.slice(base.pathname.length));
      const target =
        targetRoute.endsWith('/') || !targetRoute ? `${targetRoute}index.html` : targetRoute;
      if (!files.has(target)) throw new Error(`Broken generated link from ${file}: ${target}`);
      if (incoming.has(targetRoute) && targetRoute !== route) incoming.get(targetRoute).add(route);
      if (link.hash && target.endsWith('.html')) {
        const fragment = decodeURIComponent(link.hash.slice(1));
        const targetIds = [
          ...bodies
            .get(target)
            .toString('utf8')
            .matchAll(/\sid="([^"]+)"/g),
        ].map((match) => match[1]);
        if (!targetIds.includes(fragment))
          throw new Error(`Broken generated fragment from ${file}: ${target}#${fragment}`);
      }
    }
    if (page)
      for (const download of page.downloads || []) {
        if (!files.has(download.path) || bodies.get(download.path).length !== download.size)
          throw new Error(`Invalid generated download: ${page.id}`);
      }
  }
  const sitemap = bodies.get('sitemap.xml')?.toString('utf8') || '';
  const locations = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => decode(match[1]));
  const expected = manifest.pages
    .filter((page) => page.indexable)
    .map((page) => new URL(page.path, base).href);
  if (
    locations.length !== expected.length ||
    new Set(locations).size !== locations.length ||
    expected.some((value) => !locations.includes(value))
  )
    throw new Error('Generated sitemap does not match indexable canonical pages.');
  for (const page of manifest.pages.filter((entry) => entry.programmatic)) {
    const links = incoming.get(page.path);
    if (
      !links.has('templates/') ||
      ![...links].some((path) => !['resources/', 'templates/'].includes(path))
    )
      throw new Error(`Programmatic resource lacks contextual discovery: ${page.id}`);
  }
  return bodies;
}

/** Promote only validated, manifest-owned files. Git publishes the complete revision. */
export async function promoteGeneratedOutput(staging, output, manifest, previousManifest) {
  const bodies = await validateGeneratedOutput(staging, manifest);
  const paths = [...manifest.files, 'marketing-manifest.json'];
  // Reject every unsafe target before any output file changes.
  for (const path of paths) {
    await assertSafeOutputPath(output, path);
    try {
      if (!(await lstat(join(output, path))).isFile())
        throw new Error(`Generated target is not a file: ${path}`);
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }
  const write = async (path, body) => {
    const target = join(output, path);
    await mkdir(dirname(target), { recursive: true });
    const temporary = join(dirname(target), `.marketing-${randomUUID()}.tmp`);
    try {
      await writeFile(temporary, body, { flag: 'wx' });
      await rename(temporary, target);
    } finally {
      await unlink(temporary).catch((error) => {
        if (error.code !== 'ENOENT') throw error;
      });
    }
  };
  for (const [path, body] of bodies) await write(path, body);
  const cleanup = await pruneObsoleteOutput(output, previousManifest, manifest.files);
  // Publish the manifest last; interrupted local promotion cannot masquerade as verified.
  await write('marketing-manifest.json', await readFile(join(staging, 'marketing-manifest.json')));
  return cleanup;
}
