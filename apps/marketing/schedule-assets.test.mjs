import test from 'node:test';
import assert from 'node:assert/strict';
import ExcelJS from 'exceljs';
import JSZip from 'jszip';
import { readFile } from 'node:fs/promises';
import { resourcePage } from './resources.mjs';
import { createRegistry, publishedPages } from './registry.mjs';
import { purchaseOrderDraft } from './content/purchase-order.mjs';
import { plumbingFixtureDraft } from './content/plumbing-fixture.mjs';
import { scheduleRecords, createSchedulePdf } from './schedule-assets.mjs';
import { generateDownloads } from './documents.mjs';

for (const factory of [purchaseOrderDraft, plumbingFixtureDraft]) {
  const page = factory();
  test(`${page.id}: deterministic, editable workbook and PDF share every authored record`, async () => {
    const files = await generateDownloads(page);
    assert.deepEqual(
      files.map(({ format, variant }) => [format, variant]),
      [
        ['XLSX', 'workbook'],
        ['PDF', 'preview'],
      ],
    );
    const again = await generateDownloads({
      ...page,
      status: 'published',
      indexable: true,
      downloads: [{ path: 'generated-only' }],
      releaseEvidence: { live: 'operational metadata' },
    });
    files.forEach((file, index) => assert.deepEqual(file.buffer, again[index].buffer));
    const archive = await JSZip.loadAsync(files[0].buffer, { checkCRC32: true });
    assert.ok(!Object.keys(archive.files).some((name) => /vbaProject|externalLinks/.test(name)));
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(files[0].buffer);
    assert.deepEqual(
      workbook.worksheets.map((sheet) => sheet.name),
      ['Instructions', 'Blank Template', 'Worked Example'],
    );
    for (const sheet of workbook.worksheets) {
      assert.equal(sheet.pageSetup.paperSize, 1);
      assert.equal(sheet.pageSetup.orientation, 'portrait');
    }
    const blank = workbook.getWorksheet('Blank Template');
    blank.eachRow((row) => {
      if (!row.getCell(1).isMerged)
        assert.ok(
          row.getCell(2).value == null || row.getCell(2).value === '',
          'blank inputs remain blank',
        );
    });
    const actual = [];
    workbook.getWorksheet('Worked Example').eachRow((row) => {
      if (!row.getCell(1).isMerged) actual.push([row.getCell(1).value, row.getCell(2).value ?? '']);
    });
    const expected = scheduleRecords(page).flatMap((record) =>
      record.sections.flatMap((section) =>
        section.fields.map((field) => [field.label, field.value]),
      ),
    );
    assert.deepEqual(actual, expected, 'XLSX field values preserve the same authored records');
    const editable = blank.getCell('B4');
    editable.value = 'PRIVATE EDIT CHECK';
    const reopened = new ExcelJS.Workbook();
    await reopened.xlsx.load(await workbook.xlsx.writeBuffer());
    assert.equal(reopened.getWorksheet('Blank Template').getCell('B4').value, 'PRIVATE EDIT CHECK');
    const pdf = files[1].buffer.toString('latin1');
    assert.ok(pdf.startsWith('%PDF-'));
    assert.match(pdf, /\/MediaBox \[0 0 612(?:\.0*)? 792(?:\.0*)?\]/);
    const pages = 2 + page.rows.length * page.recordSections.length;
    assert.equal((pdf.match(/\/Type \/Page\b/g) || []).length, pages);
    assert.match(pdf, /Unresolved \/ not entered/);
    assert.match(pdf, /Reference notes/);
    assert.match(pdf, /PRIVATE DRAFT/);
  });
}

test('candidate identities preserve responsibility, provenance and draft state', () => {
  const po = purchaseOrderDraft();
  const plumbing = plumbingFixtureDraft();
  for (const page of [po, plumbing]) {
    assert.equal(page.status, 'draft');
    assert.equal(page.indexable, false);
    assert.ok(page.sources.length);
    assert.match(page.exampleProvenance, /Authored by OpenLintel/);
    assert.ok(!page.review);
  }
  for (const key of [
    'requestedDate',
    'confirmedDate',
    'designApproval',
    'authority',
    'supplier',
    'model',
    'quote',
  ])
    assert.ok(po.columns.some((column) => column.key === key));
  assert.match(plumbing.exampleNotice, /Independent of The Window Room/);
  assert.equal(plumbing.rows.length, 2);
  assert.ok(
    plumbing.rows.every(
      (row) =>
        row[plumbing.columns.findIndex((column) => column.key === 'manufacturer')] ===
        'Not selected',
    ),
  );
  const malformed = { ...plumbing, recordSections: [{ title: 'Incomplete', keys: ['reference'] }] };
  assert.throws(() => createSchedulePdf(malformed), /exactly once/);
});

test('draft previews show independent provenance, actual record layout and related links', async () => {
  const project = JSON.parse(
    await readFile(new URL('./data/project.json', import.meta.url), 'utf8'),
  );
  const registry = publishedPages(createRegistry(project));
  const page = plumbingFixtureDraft();
  page.downloads = (await generateDownloads(page)).map(
    ({ buffer: _buffer, ...download }) => download,
  );
  const html = resourcePage(page, registry, project);
  assert.match(html, /Original illustrative Powder Room Study/);
  assert.match(html, /Independent of The Window Room/);
  assert.match(html, /Connect the review decisions/);
  assert.match(html, /Record 2/);
  assert.match(html, /Unresolved \/ not entered/);
  assert.doesNotMatch(
    html,
    /Twenty editable rows|Follow the corresponding chapter of The Window Room/,
  );
  assert.doesNotMatch(html, /Worked example spreadsheet; scroll horizontally/);
});
