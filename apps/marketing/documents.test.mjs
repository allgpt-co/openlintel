import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { URL } from 'node:url';
import JSZip from 'jszip';
import ExcelJS from 'exceljs';
import { templateDefinitions } from './content/templates.mjs';
import { generateDownloads } from './documents.mjs';

test('blank Word templates do not end with an empty spacer paragraph', async () => {
  const project = JSON.parse(
    await readFile(new URL('./data/project.json', import.meta.url), 'utf8'),
  );
  for (const definition of templateDefinitions(project).filter((item) => item.format === 'docx')) {
    const [download] = await generateDownloads(definition);
    const archive = await JSZip.loadAsync(download.buffer);
    const xml = await archive.file('word/document.xml').async('string');
    const paragraphs = [...xml.matchAll(/<w:p(?:\s[^>]*)?>[\s\S]*?<\/w:p>/g)];
    assert.match(
      paragraphs.at(-1)?.[0] || '',
      /\[Enter your project information here\. Leave unknowns explicit\.\]/,
      `${definition.slug} should end with its final editable response, not a spacer`,
    );
  }
});

test('spreadsheet worked examples do not format unused rows into blank printed pages', async () => {
  const project = JSON.parse(
    await readFile(new URL('./data/project.json', import.meta.url), 'utf8'),
  );
  const templates = templateDefinitions(project).filter((item) => item.format === 'xlsx');
  for (const definition of templates) {
    const [download] = await generateDownloads(definition);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(download.buffer);
    assert.ok(workbook.getWorksheet('Blank Template').rowCount >= 25);
    const example = workbook.getWorksheet('Worked Example');
    if (definition.budget) {
      assert.equal(example.getCell('G27').value.formula, 'SUM(G6:G25)');
    } else {
      const finalRow = 5 + Math.max(1, definition.rows.length);
      assert.equal(example.rowCount, finalRow, definition.slug);
      assert.equal(
        example.autoFilter,
        `A5:${example.getColumn(definition.columns.length).letter}${finalRow}`,
      );
    }
  }
});

test('Office visible and modified dates follow substantive editorial revision', async () => {
  const project = JSON.parse(
    await readFile(new URL('./data/project.json', import.meta.url), 'utf8'),
  );
  const templates = templateDefinitions(project);
  for (const format of ['docx', 'xlsx']) {
    const definition = {
      ...templates.find((item) => item.format === format),
      modified: '2026-10-03',
    };
    const [download] = await generateDownloads(definition);
    const archive = await JSZip.loadAsync(download.buffer);
    const props = await archive.file('docProps/core.xml').async('string');
    assert.match(props, /<dcterms:modified[^>]*>2026-10-03T00:00:00/);
    if (format === 'docx')
      assert.match(await archive.file('word/document.xml').async('string'), /October 3, 2026/);
  }
});
