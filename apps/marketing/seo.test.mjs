import process from 'node:process';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, URL } from 'node:url';
import { createRegistry, publishedPages } from './registry.mjs';
import { shell, documentTitle } from './components.mjs';
import { resourcePage } from './resources.mjs';
import { home } from './pages.mjs';
import { aiEditorialReview, aiEditorialReviews } from './ai-editorial-review.mjs';

// Search-demand alignment (2026-10-02 Search Console / GA4 / DataForSEO review). These tests
// pin the title, snippet, linking, and content decisions so a later edit cannot silently undo them.

const source = dirname(fileURLToPath(import.meta.url));
const project = JSON.parse(await readFile(new URL('./data/project.json', import.meta.url)));
const registry = publishedPages(createRegistry(project));
const byId = Object.fromEntries(registry.map((page) => [page.id, page]));
const page = (id) => {
  assert.ok(byId[id], `registry has ${id}`);
  return byId[id];
};
const withDownloads = (entry) => ({
  ...entry,
  downloads: [
    {
      path: `assets/downloads/templates/${entry.slug}.xlsx`,
      label: 'Download editable workbook',
      format: 'XLSX',
      size: 1024,
    },
  ],
});
const titleOf = (html) => html.match(/<title>(.*?)<\/title>/)?.[1];
const schemaOf = (html) =>
  JSON.parse(html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1]);

test('Template document titles name the editable format; H1 and titles that already do stay put', () => {
  const ffe = withDownloads(page('ffe-schedule'));
  const html = shell(ffe, '');
  assert.equal(titleOf(html), 'FF&amp;E schedule template (Excel) — OpenLintel');
  assert.match(html, /<meta property="og:title" content="FF&amp;E schedule template \(Excel\)">/);
  assert.match(resourcePage(ffe, registry, project), /<h1>FF&amp;E schedule template<\/h1>/);
  assert.equal(
    titleOf(shell(page('design-brief'), '')),
    'Interior design brief template (Word) — OpenLintel',
  );
  assert.equal(
    documentTitle(page('presentation')),
    'Interior design presentation templates (PPTX and DOCX)',
    'A title that already names its formats is left alone',
  );
  assert.equal(
    documentTitle(page('spec-sheet')),
    'Interior design spec sheet template (specification sheet, Excel)',
  );
  assert.equal(page('spec-sheet').title, 'Interior design spec sheet template');
  assert.equal(documentTitle(page('rcp-guide')), page('rcp-guide').title, 'Guides unchanged');
});

test('Template pages offer a real download control in the header, above the fold', () => {
  const html = resourcePage(withDownloads(page('ffe-schedule')), registry, project);
  const header = html.match(/<header class="article-header">(.*?)<\/header>/s)[1];
  assert.match(header, /<a class="button"[^>]*data-resource-download[^>]*download>/);
  assert.match(header, /href="#download"/);
  assert.match(html, /<section id="download"/);
});

test('Guides re-pointed at confirmed search demand carry the new titles and a fresh modified date', () => {
  assert.equal(
    page('ffe-guide').title,
    'What is FF&E in interior design? Meaning, examples, and schedules',
  );
  assert.equal(
    page('project-management').title,
    'Interior design project management: phases, approvals, and handoff',
  );
  assert.equal(
    page('drawing-checklist').title,
    'Interior design drawings: the full set and a drawing checklist',
  );
  for (const id of [
    'ffe-guide',
    'project-management',
    'drawing-checklist',
    'measure-room',
    'rcp-guide',
    'concept-vs-documents',
  ])
    assert.equal(page(id).modified, '2026-10-02', `${id} records its content revision`);
  assert.equal(page('elevation-guide').modified, '2026-09-15', 'Unedited guides keep their date');
});

test('FF&E guide defines the term, its neighbours, and schedule vocabulary without overclaiming', () => {
  const guide = page('ffe-guide');
  assert.match(guide.intro, /^FF&E stands for furniture, fixtures, and equipment\./);
  const terms = guide.sections.find((s) => s.id === 'terms');
  assert.ok(terms, 'terms section');
  assert.match(terms.paragraphs[0], /[Aa]ccounting definitions often limit FF&E to movable items/);
  assert.ok(terms.items.some((item) => item.startsWith('OS&E:')));
  const glossary = guide.sections.find((s) => s.id === 'glossary');
  assert.ok(glossary, 'glossary section');
  assert.ok(glossary.items.length >= 5);
});

test('Room measurement guide opens with an ordered step list that links to the survey checklist', () => {
  const guide = page('measure-room');
  assert.equal(guide.sections[0].id, 'steps');
  assert.equal(guide.sections[0].ordered, true);
  assert.ok(guide.sections[0].items.length >= 6);
  assert.ok(
    guide.sections[0].links.some(
      (l) => l.href === 'templates/interior-design-site-survey-checklist/',
    ),
  );
  const html = resourcePage(guide, registry, project);
  assert.match(html, /<section id="steps"><h2>[^<]+<\/h2>(?:<p>.*?<\/p>)*<ol><li>/s);
});

test('Project management guide tabulates records per phase and links the timeline and approval guide', () => {
  const phases = page('project-management').sections.find((s) => s.id === 'phases');
  assert.ok(phases?.table, 'phase table');
  assert.deepEqual(phases.table.headers, [
    'Phase',
    'What is tracked',
    'Decision that closes the phase',
  ]);
  assert.ok(phases.table.rows.length >= 4);
  const hrefs = phases.links.map((l) => l.href);
  assert.ok(hrefs.includes('templates/interior-design-project-timeline/'));
  assert.ok(hrefs.includes('resources/interior-design-approval-states/'));
});

test('Drawing checklist guide describes the drawing set before the checklist', () => {
  const guide = page('drawing-checklist');
  assert.equal(guide.sections[0].id, 'set');
  assert.ok(guide.sections[0].items.some((item) => /reflected ceiling plan/i.test(item)));
});

test('Reflected ceiling plan guide explains common symbols and exposes its diagram plus a raster image', () => {
  const guide = page('rcp-guide');
  assert.ok(guide.sections.some((s) => s.id === 'symbols'));
  const article = schemaOf(shell(guide, '')).find((s) => s['@type'] === 'Article');
  assert.ok(Array.isArray(article.image), 'diagram guides list two images');
  assert.equal(article.image[0]['@type'], 'ImageObject');
  assert.equal(article.image[0].url, 'https://openlintel.com/assets/diagrams/rcp.svg');
  assert.ok(article.image[0].caption.length > 20);
  assert.match(article.image[1], /materials-1536\.webp$/);
  const mood = schemaOf(shell(page('mood-board'), '')).find((s) => s['@type'] === 'Article');
  assert.equal(typeof mood.image, 'string', 'Photo-led guides keep the shared social image');
});

test('AI concept guide addresses ChatGPT and image generators without a trend claim', () => {
  const generators = page('concept-vs-documents').sections.find((s) => s.id === 'generators');
  assert.ok(generators, 'generators section');
  assert.match(generators.title, /ChatGPT/);
  assert.match(generators.paragraphs[0], /^Some studios use/);
});

test('Homepage hero names the category in its first paragraph', () => {
  const hero = home(project).match(/<p class="hero-description">(.*?)<\/p>/)[1];
  assert.match(hero, /^Open-source, AI-assisted interior design software/);
});

test('Every guide links a template and a same-stage guide; every template links a guide', () => {
  for (const entry of registry.filter((p) => ['guide', 'template'].includes(p.kind))) {
    const related = [...new Set([...(entry.related || []), ...(entry.programmaticRelated || [])])]
      .map((id) => byId[id])
      .filter(Boolean);
    assert.ok(
      related.some((r) => r.kind === 'guide'),
      `${entry.id} links at least one guide`,
    );
    if (entry.kind === 'guide') {
      assert.ok(
        related.some((r) => r.kind === 'template'),
        `${entry.id} links at least one template`,
      );
      assert.ok(
        related.some((r) => r.kind === 'guide' && r.cluster === entry.cluster),
        `${entry.id} links a guide in the same stage (${entry.cluster})`,
      );
    }
  }
});

test('AI editorial checks name the model that performed them, per record', () => {
  const review = aiEditorialReview(page('ffe-guide'));
  assert.ok(review, 'current record for the revised FF&E guide');
  assert.equal(review.reviewerName, 'Claude (Anthropic)');
  assert.equal(review.reviewedAt, '2026-10-02');
  assert.match(
    resourcePage(page('ffe-guide'), registry, project),
    /AI-assisted editorial check by Claude \(Anthropic\)/,
  );
  const legacy = aiEditorialReview(page('material-board'));
  assert.equal(legacy.reviewerName, aiEditorialReviews.reviewerName, 'older records keep theirs');
  assert.match(
    resourcePage(page('material-board'), registry, project),
    /AI-assisted editorial check by OpenAI Codex/,
  );
  const records = JSON.parse(JSON.stringify(aiEditorialReviews));
  records.resources.find((r) => r.id === 'ffe-guide').reviewerName = '';
  records.reviewerName = '';
  assert.equal(aiEditorialReview(page('ffe-guide'), records), null, 'a nameless check is invalid');
});

test('Build emits llms.txt listing every indexable template and guide with its honest review status', async () => {
  const output = await mkdtemp(join(tmpdir(), 'openlintel-llms-'));
  try {
    execFileSync(process.execPath, [join(source, 'build.mjs')], {
      env: {
        ...Object.fromEntries(
          Object.entries(process.env).filter(([k]) => !k.startsWith('MARKETING_')),
        ),
        MARKETING_OUT_DIR: output,
      },
      stdio: 'pipe',
    });
    const text = await readFile(join(output, 'llms.txt'), 'utf8');
    assert.match(text, /^# OpenLintel\n/);
    assert.match(text, /have not received independent professional review/);
    assert.doesNotMatch(text, /reviewed editorially/);
    assert.match(text, /\n## Templates\n/);
    assert.match(text, /\n## Guides\n/);
    for (const entry of registry.filter(
      (p) => ['guide', 'template'].includes(p.kind) && p.indexable,
    ))
      assert.ok(
        text.includes(
          `- [${documentTitle(entry)}](https://openlintel.com/${entry.path}): ${entry.description}`,
        ),
        `llms.txt lists ${entry.path}`,
      );
    assert.ok(!text.includes('/pilot/thanks/'), 'noindex pages are not listed');
    assert.match(await readFile(join(output, 'marketing-manifest.json'), 'utf8'), /"llms\.txt"/);
  } finally {
    await rm(output, { recursive: true, force: true });
  }
});
