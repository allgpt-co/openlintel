import process from 'node:process';
import console from 'node:console';
import { readFile, mkdir, writeFile, readdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config, absolute, esc } from './config.mjs';
import { shell, pageIntro, button } from './components.mjs';
import { home, workflow, sample, audience, openSource, summary } from './pages.mjs';
import { drawingSvg } from './drawings.mjs';
import { createRegistry, publishedPages } from './registry.mjs';
import { hub, resourcePage, diagramLabels, diagramSvg } from './resources.mjs';
import { generateDownloads } from './documents.mjs';
import { moodBoardScene, sceneSvg } from './presentation-assets.mjs';
import { renderGrowthPage } from './growth-pages.mjs';
import { assertSafeOutputPath, digest } from './owned-output.mjs';
import { promoteGeneratedOutput } from './release-output.mjs';
import {
  verifyProgrammaticPublication,
  verifyProgrammaticArtifacts,
  verifyProgrammaticRenderedContent,
} from './programmatic-review.mjs';
import { assertPublicationIdentities } from './publication-history.mjs';

const source = dirname(fileURLToPath(import.meta.url));
export const output = resolve(process.env.MARKETING_OUT_DIR || join(source, '../../docs'));
const staging = await mkdtemp(join(tmpdir(), 'openlintel-release-'));
try {
  const project = JSON.parse(await readFile(join(source, 'data/project.json'), 'utf8'));
  const pages = publishedPages(createRegistry(project));
  assertPublicationIdentities(pages);
  const verified = new Map(
    (await verifyProgrammaticPublication({ pages, project, registry: pages })).map((entry) => [
      entry.id,
      entry,
    ]),
  );
  const written = [];
  const fileHashes = {};
  let previousManifest;
  try {
    previousManifest = JSON.parse(await readFile(join(output, 'marketing-manifest.json'), 'utf8'));
  } catch (error) {
    if (error.code !== 'ENOENT')
      console.warn('Previous manifest is unreadable; no obsolete files will be removed.');
  }
  async function emit(path, content) {
    await assertSafeOutputPath(staging, path);
    const target = join(staging, path);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, content);
    written.push(path);
    fileHashes[path] = digest(content);
  }
  async function assets(directory, relative = '') {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      const target = join('assets', relative, entry.name);
      if (entry.isDirectory()) await assets(path, join(relative, entry.name));
      else if (entry.isFile() && !entry.name.endsWith('-original.png'))
        await emit(target, await readFile(path));
    }
  }

  // Only explicitly owned files are written. Existing Markdown and CNAME are preserved.
  await assets(join(source, 'assets'));
  const renderers = {
    home: () => home(project),
    'how-it-works/': () => workflow(project),
    'sample-project/': () => sample(project),
    'for-design-studios/': () => audience('studio'),
    'for-architects/': () => audience('architect'),
    'open-source/': openSource,
    summary: () => summary(project),
  };
  // Hubs render before leaf pages; populate every download list first so hub cards
  // accurately describe all delivered formats rather than just the primary format.
  for (const page of pages.filter((entry) => entry.kind === 'template')) {
    const downloads = await generateDownloads(page);
    if (page.programmatic) verifyProgrammaticArtifacts(verified.get(page.id), downloads);
    for (const download of downloads) await emit(download.path, download.buffer);
    page.downloads = downloads.map(({ path, label, format, variant, size }) => ({
      path,
      label,
      format,
      variant,
      size,
    }));
  }
  for (const page of pages) {
    const content =
      page.kind === 'hub'
        ? hub(page, pages)
        : page.kind === 'growth'
          ? renderGrowthPage(page)
          : ['guide', 'template'].includes(page.kind)
            ? resourcePage(page, pages, project)
            : renderers[page.id]();
    if (page.programmatic) verifyProgrammaticRenderedContent(verified.get(page.id), content);
    await emit(`${page.path}index.html`, shell(page, content));
  }
  await emit(
    '404.html',
    shell(
      {
        id: 'not-found',
        path: '404.html',
        kind: 'utility',
        indexable: false,
        title: 'Page not found',
        description:
          'This page could not be found. Return to OpenLintel or browse the interior design resource library.',
      },
      pageIntro(
        'Page not found',
        'This page isn’t here.',
        'The address may have changed or the page may no longer exist.',
        button('Browse the resource library', 'resources/'),
      ),
    ),
  );
  for (const type of Object.keys(diagramLabels))
    await emit(`assets/diagrams/${type}.svg`, diagramSvg(type));
  for (const direction of ['quiet-oak', 'deep-olive'])
    await emit(
      `assets/diagrams/mood-board-${direction}.svg`,
      await sceneSvg(
        moodBoardScene(direction),
        `${direction === 'quiet-oak' ? 'Quiet Oak' : 'Deep Olive'} - illustrative mood board`,
      ),
    );
  for (const drawing of project.drawings)
    await emit(`assets/downloads/${drawing.filename}`, drawingSvg(project, drawing.id));
  const csvCell = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`;
  const rows = [
    [
      'Project',
      'Status',
      'Concept',
      'Reference',
      'Selection',
      'Application',
      'Sample quantity',
      'Unit',
      'Review note',
    ],
    ...project.materials.map((m) => [
      project.name,
      `${project.label}; pending review`,
      'Quiet Oak',
      m.id,
      m.name,
      m.application,
      m.quantity,
      m.unit,
      m.note,
    ]),
  ];
  await emit(
    'assets/downloads/window-room-materials.csv',
    // Match the repository's LF normalization so checked-in download hashes stay valid.
    '\uFEFF' + rows.map((row) => row.map(csvCell).join(',')).join('\n') + '\n',
  );
  await emit(
    'sitemap.xml',
    `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${pages
      .filter((page) => config.indexable && page.indexable)
      .map(
        (page) =>
          `<url><loc>${esc(absolute(page.path))}</loc>${page.modified ? `<lastmod>${page.modified}</lastmod>` : ''}</url>`,
      )
      .join('')}</urlset>\n`,
  );
  await emit('robots.txt', `User-agent: *\nAllow: /\nSitemap: ${absolute('sitemap.xml')}\n`);
  await emit('.nojekyll', '');
  const manifest = {
    generator: 'OpenLintel marketing',
    schemaVersion: 3,
    origin: config.origin,
    basePath: config.base,
    indexable: config.indexable,
    pages: pages.map(
      ({
        id,
        path,
        kind,
        wave,
        downloads,
        indexable,
        published,
        modified,
        familyId,
        cohortId,
        intentKey,
        programmatic,
        approvedBundleHash,
      }) => ({
        id,
        path,
        kind,
        wave,
        downloads,
        indexable: config.indexable && indexable,
        published,
        modified,
        familyId,
        cohortId,
        intentKey,
        ...(programmatic ? { programmatic: true, approvedBundleHash } : {}),
      }),
    ),
    files: [...written].sort(),
    fileHashes: { ...fileHashes },
  };
  await emit('marketing-manifest.json', JSON.stringify(manifest, null, 2) + '\n');
  const cleanup = await promoteGeneratedOutput(staging, output, manifest, previousManifest);
  if (cleanup.removed.length)
    console.log(
      `Removed ${cleanup.removed.length} unchanged, previously generated obsolete files.`,
    );
  if (cleanup.preserved.length)
    console.warn(
      `Preserved modified or unsafe obsolete files; review manually: ${cleanup.preserved.join(', ')}`,
    );
  console.log(
    `Built ${pages.length} HTML pages, ${pages.filter((p) => p.kind === 'template').length} editable resources, and sample downloads in ${output}`,
  );
} finally {
  await rm(staging, { recursive: true, force: true });
}
