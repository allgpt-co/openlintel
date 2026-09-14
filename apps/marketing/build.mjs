import process from 'node:process';
import console from 'node:console';
import { readFile, mkdir, writeFile, readdir, copyFile } from 'node:fs/promises';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config, absolute, esc } from './config.mjs';
import { shell } from './components.mjs';
import { home, workflow, sample, audience, openSource, summary } from './pages.mjs';
import { drawingSvg } from './drawings.mjs';
import { createRegistry, publishedPages } from './registry.mjs';
import { hub, resourcePage, diagramLabels, diagramSvg } from './resources.mjs';
import { generateDownloads } from './documents.mjs';

const source = dirname(fileURLToPath(import.meta.url));
export const output = resolve(process.env.MARKETING_OUT_DIR || join(source, '../../docs'));
const project = JSON.parse(await readFile(join(source, 'data/project.json'), 'utf8'));
const pages = publishedPages(createRegistry(project));
const written = [];
async function emit(path, content) {
  const target = join(output, path);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, content);
  written.push(path);
}
async function assets(directory, relative = '') {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    const target = join('assets', relative, entry.name);
    if (entry.isDirectory()) await assets(path, join(relative, entry.name));
    else if (!entry.name.endsWith('-original.png')) {
      await mkdir(dirname(join(output, target)), { recursive: true });
      await copyFile(path, join(output, target));
      written.push(target);
    }
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
      : ['guide', 'template'].includes(page.kind)
        ? resourcePage(page, pages, project)
        : renderers[page.id]();
  await emit(`${page.path}index.html`, shell(page, content));
}
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
  '\uFEFF' + rows.map((row) => row.map(csvCell).join(',')).join('\r\n') + '\r\n',
);
await emit(
  'sitemap.xml',
  `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${pages.map((page) => `<url><loc>${esc(absolute(page.path))}</loc>${page.modified ? `<lastmod>${page.modified}</lastmod>` : ''}</url>`).join('')}</urlset>\n`,
);
await emit('robots.txt', `User-agent: *\nAllow: /\nSitemap: ${absolute('sitemap.xml')}\n`);
await emit('.nojekyll', '');
await emit(
  'marketing-manifest.json',
  JSON.stringify(
    {
      generator: 'OpenLintel marketing',
      basePath: config.base,
      pages: pages.map(({ id, path, kind, wave, downloads }) => ({
        id,
        path,
        kind,
        wave,
        downloads,
      })),
      files: written.sort(),
    },
    null,
    2,
  ) + '\n',
);
console.log(
  `Built ${pages.length} HTML pages, ${pages.filter((p) => p.kind === 'template').length} editable resources, and sample downloads in ${output}`,
);
