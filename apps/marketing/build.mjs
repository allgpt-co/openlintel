import process from 'node:process';
import console from 'node:console';
import { readFile, mkdir, writeFile, readdir } from 'node:fs/promises';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config, absolute, esc } from './config.mjs';
import { shell, pageIntro, button } from './components.mjs';
import { home, workflow, sample, audience, openSource, summary } from './pages.mjs';
import { drawingSvg } from './drawings.mjs';
import { createRegistry, publishedPages } from './registry.mjs';
import { hub, resourcePage, diagramLabels, diagramSvg } from './resources.mjs';
import { generateDownloads } from './documents.mjs';
import { renderGrowthPage } from './growth-pages.mjs';
import { assertSafeOutputPath, digest, pruneObsoleteOutput } from './owned-output.mjs';

const source = dirname(fileURLToPath(import.meta.url));
export const output = resolve(process.env.MARKETING_OUT_DIR || join(source, '../../docs'));
const project = JSON.parse(await readFile(join(source, 'data/project.json'), 'utf8'));
const pages = publishedPages(createRegistry(project));
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
  await assertSafeOutputPath(output, path);
  const target = join(output, path);
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
for (const page of pages) {
  if (page.kind === 'template') {
    const downloads = await generateDownloads(page);
    for (const download of downloads) await emit(download.path, download.buffer);
    page.downloads = downloads.map(({ path, label, format, size }) => ({
      path,
      label,
      format,
      size,
    }));
  }
  const content =
    page.kind === 'hub'
      ? hub(page, pages)
      : page.kind === 'growth'
        ? renderGrowthPage(page)
        : ['guide', 'template'].includes(page.kind)
          ? resourcePage(page, pages, project)
          : renderers[page.id]();
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
const cleanup = await pruneObsoleteOutput(output, previousManifest, written);
if (cleanup.removed.length)
  console.log(`Removed ${cleanup.removed.length} unchanged, previously generated obsolete files.`);
if (cleanup.preserved.length)
  console.warn(
    `Preserved modified or unsafe obsolete files; review manually: ${cleanup.preserved.join(', ')}`,
  );
await emit(
  'marketing-manifest.json',
  JSON.stringify(
    {
      generator: 'OpenLintel marketing',
      schemaVersion: 2,
      origin: config.origin,
      basePath: config.base,
      indexable: config.indexable,
      pages: pages.map(({ id, path, kind, wave, downloads, indexable, published, modified }) => ({
        id,
        path,
        kind,
        wave,
        downloads,
        indexable: config.indexable && indexable,
        published,
        modified,
      })),
      files: written.sort(),
      fileHashes,
    },
    null,
    2,
  ) + '\n',
);
console.log(
  `Built ${pages.length} HTML pages, ${pages.filter((p) => p.kind === 'template').length} editable resources, and sample downloads in ${output}`,
);
