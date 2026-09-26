import test from 'node:test';
import { URL } from 'node:url';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRegistry, validateRegistry } from './registry.mjs';
import { editorialRevision } from './editorial-review.mjs';
import { loadGrowthConfig } from './growth-config.mjs';
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

test('Review credits require permission, exact unchanged content, and completed dated source checks', () => {
  const page = JSON.parse(JSON.stringify(guides[1]));
  page.review = {
    state: 'verified',
    reviewerName: 'Test reviewer <name>',
    reviewerRole: 'Test role',
    scope: 'Test-only editorial assessment',
    permissionToPublish: true,
    reviewedRevision: editorialRevision(page),
    reviewedAt: page.modified,
    sourcesCheckedAt: page.modified,
  };
  assert.doesNotThrow(() => validateRegistry([page, ...registry.filter((p) => p.id !== page.id)]));
  const html = resourcePage(page, registry, project);
  assert.match(html, /Test reviewer &lt;name&gt;/);
  assert.match(html, /data-reviewed-revision="sha256:/);
  assert.match(html, /Test-only editorial assessment/);
  assert.doesNotMatch(html, /have not received independent professional review/);
  for (const change of [
    { permissionToPublish: false },
    { reviewerName: '' },
    { reviewedAt: '2026-02-30' },
    { reviewedAt: '2999-01-01' },
    { sourcesCheckedAt: '2025-01-01' },
    { reviewedRevision: 'sha256:old' },
  ]) {
    assert.throws(
      () => resourcePage({ ...page, review: { ...page.review, ...change } }, registry, project),
      /Incomplete or stale verified review/,
    );
  }
  const changed = JSON.parse(JSON.stringify(page));
  changed.sections[0].paragraphs[0] += ' Changed after review on the same day.';
  assert.throws(
    () => resourcePage(changed, registry, project),
    /Incomplete or stale verified review/,
  );
  assert.throws(
    () =>
      validateRegistry([
        { ...page, review: undefined, sources: [{ title: 'Unsafe', url: 'javascript:alert(1)' }] },
      ]),
    /Invalid source URL/,
  );
});

test('Mixed download formats retain each file’s format and variant, and closed intake offers availability', () => {
  const page = withDownloads(templates.find((entry) => entry.id === 'client-questionnaire'));
  page.downloads.push({
    path: 'assets/downloads/templates/questionnaire.pdf',
    label: 'Print the blank questionnaire',
    format: 'PDF',
    variant: 'blank',
    size: 2048,
  });
  const html = resourcePage(page, registry, project, loadGrowthConfig({}));
  assert.match(html, /data-resource-format="pdf" data-resource-variant="blank"/);
  assert.match(html, /Check discovery availability/);
  assert.match(html, /Discovery requests are not open yet/);
  assert.doesNotMatch(html, />Request a (?:pilot )?discovery conversation</);
  const open = resourcePage(page, registry, project, { pilotEnabled: true });
  assert.match(open, />Request a discovery conversation</);
});

test('Guide revision dates belong to individual authored entries', () => {
  assert.equal(guides.find((page) => page.id === 'mood-board').modified, '2026-09-26');
  assert.equal(guides.find((page) => page.id === 'material-board').modified, '2026-09-15');
  assert.ok(workflowGuides.every((page) => page.modified === '2026-09-15'));
});

test('Authored comparison cells are escaped and presentation formats retain the existing URL', () => {
  const unsafe = '<img src=x onerror=alert(1)>';
  const page = JSON.parse(JSON.stringify(guides[0]));
  page.sections.at(-1).table.headers[0] = unsafe;
  page.sections.at(-1).table.rows[0][0] = unsafe;
  const html = resourcePage(page, registry, project);
  assert.ok(html.includes(esc(unsafe)));
  assert.ok(!html.includes(unsafe));
  const storyboard = templates.find((entry) => entry.id === 'presentation');
  assert.match(storyboard.title, /PPTX and DOCX/);
  assert.match(storyboard.use, /editable text, palette swatches/);
  assert.match(storyboard.use, /companion DOCX is a planning storyboard/);
  assert.ok(
    storyboard.path.endsWith('/interior-design-presentation/'),
    'Preserve the established URL',
  );
});
