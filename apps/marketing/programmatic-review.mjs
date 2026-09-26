import { createHash, randomUUID } from 'node:crypto';
import { readFile, lstat, mkdir, open, rename, unlink } from 'node:fs/promises';
import { constants } from 'node:fs';
import { dirname, resolve, relative, join, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateDownloads } from './documents.mjs';
import { resourcePage } from './resources.mjs';
import { editorialRevision } from './editorial-review.mjs';
import { growthConfig } from './growth-config.mjs';
import {
  PROGRAMMATIC_FAMILIES,
  validateProgrammaticCandidates,
  assertProgrammaticRelease,
} from './programmatic-catalog.mjs';

export const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
export const sha256 = (value) => `sha256:${createHash('sha256').update(value).digest('hex')}`;
export function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value && typeof value === 'object')
    return `{${Object.keys(value)
      .sort()
      .filter((key) => value[key] !== undefined)
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`)
      .join(',')}}`;
  if (
    value === null ||
    ['string', 'boolean'].includes(typeof value) ||
    (typeof value === 'number' && Number.isFinite(value))
  )
    return JSON.stringify(value);
  throw new Error('Review data must contain explicit JSON values; use null for unknown values.');
}
const bookkeeping = new Set([
  'review',
  'downloads',
  'status',
  'indexable',
  'approvedBundleHash',
  'releaseEvidence',
  'publicationGates',
  'programmaticRelated',
  'published',
  'firstVerifiedLiveAt',
  'liveCommit',
  'publicationEvidence',
  'evidence',
]);
export const authoredProgrammaticData = (page) =>
  Object.fromEntries(Object.entries(page).filter(([key]) => !bookkeeping.has(key)));

function substantiveHtml(html) {
  const header = html.match(/<header class="article-header">[\s\S]*?<\/header>/)?.[0];
  const body = html.match(
    /<article class="resource-body">([\s\S]*?)<section class="article-sources">/,
  )?.[1];
  if (!header || !body)
    throw new Error('Review renderer must expose the substantive resource header and body.');
  return `${header}\n${body}`.replace(/\r\n/g, '\n');
}
async function fingerprintFile(path, workspaceRoot) {
  if (!/^(?:[a-zA-Z0-9_.-]+\/)*[a-zA-Z0-9_.-]+$/.test(path) || path.split('/').includes('..'))
    throw new Error('Unsafe review dependency path.');
  let current = resolve(workspaceRoot);
  for (const part of path.split('/')) {
    current = join(current, part);
    if ((await lstat(current)).isSymbolicLink())
      throw new Error('Review dependencies cannot be symlinks.');
  }
  return { path, hash: sha256(await readFile(current)) };
}
export async function familyFingerprints(familyId, { workspaceRoot = repositoryRoot } = {}) {
  const family = PROGRAMMATIC_FAMILIES[familyId];
  if (!family) throw new Error('Unknown programmatic family.');
  // Renderer modules are conservatively fingerprinted in full: shared substantive
  // changes cannot hide behind an unchanged example. Public chrome is not rendered.
  const paths = [
    ...family.sourcePaths,
    ...family.generatorPaths,
    ...family.assetPaths,
    'apps/marketing/resources.mjs',
    'apps/marketing/editorial-review.mjs',
    'apps/marketing/programmatic-review.mjs',
    'apps/marketing/programmatic-catalog.mjs',
    'apps/marketing/presentation-assets.mjs',
    'pnpm-lock.yaml',
  ];
  return Promise.all(
    [...new Set(paths)].sort().map((path) => fingerprintFile(path, workspaceRoot)),
  );
}

export async function createReviewBundle({
  page,
  project,
  registry,
  workspaceRoot = repositoryRoot,
  downloadGenerator = generateDownloads,
  renderer = resourcePage,
  fingerprintProvider = familyFingerprints,
}) {
  validateProgrammaticCandidates([page]);
  const clean = { ...authoredProgrammaticData(page), status: 'draft', indexable: false };
  const downloads = await downloadGenerator(clean);
  const seen = new Set();
  for (const item of downloads) {
    if (
      !/^assets\/downloads\/templates\/[a-z0-9-]+\.(xlsx|pdf)$/.test(item.path || '') ||
      seen.has(item.path) ||
      !Buffer.isBuffer(item.buffer) ||
      item.size !== item.buffer.length ||
      !['XLSX', 'PDF'].includes(item.format) ||
      !['workbook', 'preview'].includes(item.variant) ||
      !item.path.endsWith(`.${item.format.toLowerCase()}`)
    )
      throw new Error('Invalid review artifact.');
    seen.add(item.path);
  }
  if (
    !downloads.some((item) => item.format === 'XLSX') ||
    !downloads.some((item) => item.format === 'PDF')
  )
    throw new Error('Programmatic candidates require editable XLSX and PDF review artifacts.');
  clean.downloads = downloads.map(({ path, label, format, variant, size }) => ({
    path,
    label,
    format,
    variant,
    size,
  }));
  // Related cards and availability copy are release chrome, not the reviewed task.
  const html = renderer({ ...clean, related: [] }, registry, project, { pilotEnabled: false });
  const contentHtml = substantiveHtml(html);
  const fingerprints = await fingerprintProvider(page.familyId, { workspaceRoot });
  if (
    !Array.isArray(fingerprints) ||
    !fingerprints.length ||
    fingerprints.some((item) => !item.path || !/^sha256:[a-f0-9]{64}$/.test(item.hash || ''))
  )
    throw new Error('Missing substantive generator fingerprints.');
  const manifest = {
    schemaVersion: 1,
    id: page.id,
    path: page.path,
    familyId: page.familyId,
    cohortId: page.cohortId,
    intentKey: page.intentKey,
    editorialRevision: editorialRevision(clean),
    authoredHash: sha256(canonicalJson(authoredProgrammaticData(clean))),
    substantiveHtmlHash: sha256(contentHtml),
    artifacts: downloads
      .map(({ path, format, variant, buffer, size }) => ({
        path,
        format,
        variant,
        size,
        hash: sha256(buffer),
      }))
      .sort((a, b) => a.path.localeCompare(b.path)),
    dependencies: [...fingerprints].sort((a, b) => a.path.localeCompare(b.path)),
  };
  return {
    bundleHash: sha256(canonicalJson(manifest)),
    manifest,
    html,
    substantiveHtml: contentHtml,
    downloads,
  };
}

export async function verifyProgrammaticPublication({
  pages,
  project,
  registry = pages,
  bundleFactory = createReviewBundle,
  growthSettings = growthConfig,
}) {
  const result = [];
  for (const page of pages.filter((item) => item.programmatic)) {
    if (!growthSettings.pilotEnabled || !growthSettings.analyticsEnabled)
      throw new Error(
        'Programmatic publication requires configured discovery intake and analytics.',
      );
    assertProgrammaticRelease(
      page,
      registry.filter((item) => !item.programmatic),
    );
    const bundle = await bundleFactory({ page, project, registry });
    if (
      bundle.bundleHash !== page.approvedBundleHash ||
      bundle.bundleHash !== page.review.reviewedBundleHash
    )
      throw new Error(`Reviewed programmatic output changed; publication blocked: ${page.id}`);
    result.push({ id: page.id, approvedBundleHash: bundle.bundleHash, manifest: bundle.manifest });
  }
  return result;
}

export function verifyProgrammaticArtifacts(verification, downloads) {
  const actual = downloads
    .map(({ path, format, variant, buffer, size }) => ({
      path,
      format,
      variant,
      size,
      hash: sha256(buffer),
    }))
    .sort((a, b) => a.path.localeCompare(b.path));
  if (
    !verification?.manifest?.artifacts ||
    canonicalJson(actual) !== canonicalJson(verification.manifest.artifacts)
  )
    throw new Error(
      `Generated programmatic artifacts differ from reviewed output: ${verification?.id}`,
    );
  return true;
}

export function verifyProgrammaticRenderedContent(verification, html) {
  if (sha256(substantiveHtml(html)) !== verification?.manifest?.substantiveHtmlHash)
    throw new Error(
      `Rendered programmatic content differs from reviewed output: ${verification?.id}`,
    );
  return true;
}

// The private preview writer supports binary Office/PDF files. Each file is
// atomically replaced with mode 0600; all parent components reject symlinks.
export async function writePrivateReviewFile(path, content, workspaceRoot = repositoryRoot) {
  const workspace = resolve(workspaceRoot);
  const allowed = resolve(workspace, 'output/seo');
  const target = resolve(workspace, path);
  if (!target.startsWith(allowed + sep))
    throw new Error('Review bundles must stay in ignored output/seo/.');
  let current = workspace;
  if ((await lstat(current)).isSymbolicLink()) throw new Error('Refusing a symlink workspace.');
  for (const part of relative(workspace, dirname(target)).split(sep)) {
    current = join(current, part);
    try {
      const stat = await lstat(current);
      if (stat.isSymbolicLink() || !stat.isDirectory())
        throw new Error('Refusing symlink/non-directory review output.');
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      await mkdir(current, { mode: 0o700 });
    }
  }
  try {
    const stat = await lstat(target);
    if (stat.isSymbolicLink() || !stat.isFile())
      throw new Error('Refusing symlink/non-file review output.');
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  const temporary = join(dirname(target), `.review-${randomUUID()}.tmp`);
  let handle;
  try {
    handle = await open(
      temporary,
      constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | (constants.O_NOFOLLOW || 0),
      0o600,
    );
    await handle.writeFile(content);
    await handle.close();
    handle = undefined;
    await rename(temporary, target);
  } finally {
    await handle?.close();
    await unlink(temporary).catch((error) => {
      if (error.code !== 'ENOENT') throw error;
    });
  }
  return target;
}
