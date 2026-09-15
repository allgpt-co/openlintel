import { createHash } from 'node:crypto';
import { lstat, readFile, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { loadSiteConfig } from './config.mjs';

export const digest = (value) => createHash('sha256').update(value).digest('hex');
const safePath = (path) =>
  typeof path === 'string' &&
  /^(?:[A-Za-z0-9_-][A-Za-z0-9_.-]*\/)*[A-Za-z0-9_.-]+$/.test(path) &&
  !path.split('/').some((part) => part === '.' || part === '..');

// A legacy/no-hash manifest cannot prove ownership and is deliberately not pruned.
export function validateOwnershipManifest(manifest) {
  if (
    !manifest ||
    manifest.generator !== 'OpenLintel marketing' ||
    manifest.schemaVersion !== 2 ||
    !Array.isArray(manifest.pages) ||
    !Array.isArray(manifest.files) ||
    !manifest.fileHashes ||
    typeof manifest.fileHashes !== 'object' ||
    Array.isArray(manifest.fileHashes) ||
    typeof manifest.origin !== 'string' ||
    typeof manifest.basePath !== 'string' ||
    typeof manifest.indexable !== 'boolean' ||
    manifest.pages.length === 0
  )
    return false;
  try {
    const site = loadSiteConfig({
      MARKETING_ORIGIN: manifest.origin,
      MARKETING_BASE_PATH: manifest.basePath,
    });
    if (site.origin !== manifest.origin || site.base !== manifest.basePath) return false;
  } catch {
    return false;
  }
  const pages = new Set();
  for (const page of manifest.pages) {
    if (
      typeof page.path !== 'string' ||
      (page.path !== '' && !/^[a-z0-9-]+(?:\/[a-z0-9-]+)*\/$/.test(page.path)) ||
      pages.has(page.path) ||
      typeof page.indexable !== 'boolean'
    )
      return false;
    pages.add(page.path);
  }
  const unique = new Set();
  for (const file of manifest.files) {
    const permitted =
      ['.nojekyll', 'sitemap.xml', 'robots.txt', '404.html'].includes(file) ||
      (file.endsWith('index.html') && pages.has(file.slice(0, -'index.html'.length))) ||
      /^assets\/(?:[A-Za-z0-9_-]+\/)*[A-Za-z0-9_.-]+\.(?:css|js|svg|webp|png|woff2|xlsx|docx|csv|txt)$/.test(
        file,
      );
    if (
      !safePath(file) ||
      !permitted ||
      unique.has(file) ||
      !/^[a-f0-9]{64}$/.test(manifest.fileHashes[file] || '')
    )
      return false;
    unique.add(file);
  }
  return manifest.files.length > 0;
}

export async function assertSafeOutputPath(output, path) {
  if (!safePath(path)) throw new Error(`Unsafe generated path: ${path}`);
  let current = output;
  for (const segment of ['', ...path.split('/')]) {
    if (segment) current = join(current, segment);
    try {
      if ((await lstat(current)).isSymbolicLink())
        throw new Error(`Refusing generated output through symbolic link: ${current}`);
    } catch (error) {
      if (error.code === 'ENOENT') return;
      throw error;
    }
  }
}

export async function pruneObsoleteOutput(output, previous, currentFiles) {
  const result = { removed: [], preserved: [], trusted: validateOwnershipManifest(previous) };
  if (!result.trusted) return result;
  const current = new Set(currentFiles);
  for (const path of previous.files.filter((file) => !current.has(file))) {
    try {
      await assertSafeOutputPath(output, path);
      const target = join(output, path);
      if (
        !(await lstat(target)).isFile() ||
        digest(await readFile(target)) !== previous.fileHashes[path]
      ) {
        result.preserved.push(path);
        continue;
      }
      await unlink(target);
      result.removed.push(path);
    } catch (error) {
      if (error.code !== 'ENOENT') result.preserved.push(path);
    }
  }
  // Never recursively delete directories: they may contain hand-maintained documentation.
  return result;
}
