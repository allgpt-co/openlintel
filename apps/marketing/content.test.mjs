import test from 'node:test';
import { URL } from 'node:url';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRegistry } from './registry.mjs';
import { resourcePage, editorialDate } from './resources.mjs';
import { workflowGuides } from './content/workflow-guides.mjs';
import { url, esc } from './config.mjs';

const project = JSON.parse(await readFile(new URL('./data/project.json', import.meta.url)));
const registry = createRegistry(project);
const templates = registry.filter((page) => page.kind === 'template');
const guides = registry.filter((page) => page.kind === 'guide');
const withDownloads = (page) => ({
  ...page,
  downloads:
    page.format === 'xlsx'
      ? [
          {
            path: `assets/downloads/templates/${page.slug}.xlsx`,
            label: 'Download editable workbook',
            format: 'XLSX',
            size: 1024,
          },
        ]
      : ['blank', 'example'].map((variant) => ({
          path: `assets/downloads/templates/${page.slug}-${variant}.docx`,
          label: `Download ${variant}`,
          format: 'DOCX',
          size: 1024,
        })),
});

test('Existing 12 templates and 18 guides have original task-specific examples and compatible fields', () => {
  assert.equal(templates.length, 12);
  assert.equal(guides.length, 18);
  const titles = new Set();
  for (const page of [...templates, ...guides]) {
    assert.ok(
      page.sections.some((section) => section.table),
      `${page.id} includes a useful example`,
    );
    assert.ok(page.pilot, `${page.id} has an after-value invitation`);
    const sections = new Set();
    for (const section of page.sections) {
      assert.ok(!sections.has(section.id), `${page.id}: distinct section identifiers`);
      sections.add(section.id);
      if (section.table) {
        assert.ok(section.table.caption);
        assert.ok(section.table.rows.length >= 3);
        for (const row of section.table.rows)
          assert.equal(row.length, section.table.headers.length);
      }
      for (const link of section.links || []) {
        assert.ok(
          registry.some((entry) => entry.path === link.href),
          `${page.id}: registered contextual link ${link.href}`,
        );
      }
    }
    if (page.kind === 'template') {
      assert.ok(!titles.has(page.sections[0].title), 'Template example purpose is distinct');
      titles.add(page.sections[0].title);
      assert.match(page.unitsNote, /US|USD/);
      if (page.format === 'xlsx')
        for (const row of page.rows) assert.equal(row.length, page.columns.length);
      else assert.ok(page.fields.every((field) => field.label && field.help && field.example));
    }
  }
});

test('Six new guides own different workflows, provide worked tables, and retain honest examples', () => {
  assert.deepEqual(
    workflowGuides.map((page) => page.id),
    [
      'concept-vs-documents',
      'brief-to-schedules',
      'specification-change',
      'handoff-package',
      'approval-states',
      'software-evaluation',
    ],
  );
  const sets = new Set(
    workflowGuides.map((page) => page.sections.map((section) => section.title).join('|')),
  );
  assert.equal(sets.size, 6);
  for (const page of workflowGuides) {
    assert.ok(page.sections.length >= 4);
    const prose = JSON.stringify(page.sections);
    assert.match(prose, /illustrative|fictional|teaching/i);
    assert.ok(page.checklist.length >= 3);
  }
  const handoff = workflowGuides.find((page) => page.id === 'handoff-package');
  assert.match(JSON.stringify(handoff), /not WR-03/);
  const evaluation = workflowGuides.find((page) => page.id === 'software-evaluation');
  assert.match(JSON.stringify(evaluation), /not proof of a live export/);
  assert.match(JSON.stringify(evaluation), /does not guarantee access or pilot admission/);
});

test('Resource rendering preserves ungated downloads, data attributes, source dates, and review disclosures', () => {
  for (const page of [...templates.map(withDownloads), ...guides]) {
    const html = resourcePage(page, registry, project);
    assert.ok(
      html.includes(`<time datetime="${page.modified}">${editorialDate(page.modified)}</time>`),
    );
    assert.ok(html.includes(`href="${url('about/')}"`));
    assert.ok(html.includes(`href="${url('editorial-policy/')}"`));
    assert.match(html, /have not received independent professional review/);
    assert.match(html, /<th scope="col">/);
    assert.match(html, /<th scope="row">/);
    assert.match(html, /tabindex="0" role="region"/);
    const pilotPosition = html.indexOf('data-pilot-cta');
    assert.ok(
      pilotPosition > html.indexOf('class="article-sources"'),
      'Pilot CTA follows educational value and disclosure',
    );
    assert.ok(html.includes(`data-pilot-cta data-source-page-id="${page.id}"`));
    assert.doesNotMatch(html, /<form/);
    if (page.kind === 'template') {
      const downloadTags = [...html.matchAll(/<a [^>]*data-resource-download[^>]*>/g)].map(
        (match) => match[0],
      );
      assert.equal(downloadTags.length, page.downloads.length);
      for (const [index, tag] of downloadTags.entries()) {
        assert.ok(tag.includes(`data-resource-id="${page.id}"`));
        assert.ok(tag.includes(`data-resource-format="${page.format}"`));
        assert.ok(
          tag.includes(
            `data-resource-variant="${page.format === 'xlsx' ? 'workbook' : index === 0 ? 'blank' : 'example'}"`,
          ),
        );
        assert.match(tag, / download>/);
      }
      assert.ok(pilotPosition > html.indexOf('data-resource-download'));
    }
    const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
    assert.equal(new Set(ids).size, ids.length, `${page.id} has unique rendered IDs`);
  }
});

test('Editorial dates are valid UTC dates rather than a hardcoded label', () => {
  assert.equal(editorialDate('2026-09-15'), 'September 15, 2026');
  assert.equal(editorialDate('2028-02-29'), 'February 29, 2028');
  for (const invalid of ['2026-02-29', '2026-13-01', '2026-09-15<script>', '', undefined]) {
    assert.throws(() => editorialDate(invalid), /editorial date/);
  }
});

test('Authored comparison cells and headings are escaped, and storyboard format is explicit', () => {
  const unsafe = '<img src=x onerror=alert(1)>';
  const page = JSON.parse(JSON.stringify(guides[0]));
  page.sections.at(-1).table.headers[0] = unsafe;
  page.sections.at(-1).table.rows[0][0] = unsafe;
  const html = resourcePage(page, registry, project);
  assert.ok(html.includes(esc(unsafe)));
  assert.ok(!html.includes(unsafe));
  const storyboard = templates.find((entry) => entry.id === 'presentation');
  assert.match(storyboard.title, /storyboard.*DOCX/);
  assert.match(storyboard.use, /not a PowerPoint deck/);
  assert.ok(
    storyboard.path.endsWith('/interior-design-presentation/'),
    'Preserve the established URL',
  );
});
