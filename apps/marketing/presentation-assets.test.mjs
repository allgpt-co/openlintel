import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { posix } from 'node:path';
import JSZip from 'jszip';
import ExcelJS from 'exceljs';
import {
  createPresentation,
  createPresentationPdf,
  createQuestionnairePdf,
  presentationScenes,
  moodBoardScene,
  sceneSvg,
} from './presentation-assets.mjs';
import { templateDefinitions } from './content/templates.mjs';
import { purchaseOrderDraft } from './content/purchase-order.mjs';
import { createRegistry, publishedPages } from './registry.mjs';
import { generateDownloads } from './documents.mjs';

const project = JSON.parse(await readFile(new URL('./data/project.json', import.meta.url), 'utf8'));

test('PPTX contains eight native editable slides with valid internal relationships', async () => {
  for (const example of [false, true]) {
    const buffer = await createPresentation(example);
    assert.deepEqual(await createPresentation(example), buffer, 'PPTX bytes are repeatable');
    const archive = await JSZip.loadAsync(buffer, { checkCRC32: true });
    const names = Object.keys(archive.files);
    const slideNames = names.filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name));
    assert.equal(slideNames.length, 8);
    for (const name of slideNames) {
      const source = await archive.file(name).async('string');
      assert.ok((source.match(/<p:sp>/g) || []).length >= 8, `${name}: separate native objects`);
      assert.match(source, /<a:t>/, `${name}: editable text`);
      assert.match(source, /<a:prstGeom prst="rect"/, `${name}: editable shapes`);
      assert.ok((source.match(/<p:pic>/g) || []).length <= 1, 'No full-slide image flattening');
    }
    const board = await archive.file('ppt/slides/slide3.xml').async('string');
    assert.ok(
      (board.match(/<p:sp>/g) || []).length > 15,
      'Palette, labels and rationale are distinct objects',
    );
    assert.match(board, example ? /Retained oak/ : /\[Swatch 1\]/);
    assert.match(board, example ? /Quiet Oak/ : /Direction A/);
    assert.ok(names.some((name) => /^ppt\/media\/.+\.(png|jpe?g)$/.test(name)) === example);
    for (const name of names.filter((name) => name.endsWith('.rels'))) {
      const source = await archive.file(name).async('string');
      for (const match of source.matchAll(/<Relationship\b[^>]*Target="([^"]+)"[^>]*>/g)) {
        if (match[0].includes('TargetMode="External"')) continue;
        const base = name === '_rels/.rels' ? '' : posix.dirname(posix.dirname(name));
        const target = match[1].startsWith('/')
          ? match[1].slice(1)
          : posix.normalize(posix.join(base, match[1]));
        assert.ok(archive.file(target), `${name}: resolves ${target}`);
      }
    }
    assert.ok(!names.some((name) => /vbaProject|externalLinks/.test(name)));
  }
});

test('authored board exports are self-contained vectors with original image references', async () => {
  for (const direction of ['quiet-oak', 'deep-olive']) {
    const svg = await sceneSvg(moodBoardScene(direction), direction);
    assert.match(svg, /viewBox="0 0 960 540"/);
    assert.match(svg, /data:image\/webp;base64,/);
    assert.match(svg, /Palette swatches are illustrative/);
    assert.ok((svg.match(/<rect /g) || []).length >= 7);
    assert.ok(!/href="https?:/.test(svg));
  }
  for (const example of [false, true])
    for (const [index, scene] of presentationScenes(example).entries()) {
      for (const node of scene) {
        assert.ok(
          node.x >= 0 && node.y >= 0 && node.x + node.w <= 960 && node.y + node.h <= 540,
          `Slide ${index + 1}: object within canvas`,
        );
      }
    }
});

test('PDF previews have deterministic bytes, complete page trees and intended paper sizes', async () => {
  const definition = templateDefinitions(project).find(
    (item) => item.id === 'client-questionnaire',
  );
  const questionnaire = createQuestionnairePdf(definition);
  assert.deepEqual(createQuestionnairePdf(definition), questionnaire);
  const slides = await createPresentationPdf();
  assert.deepEqual(await createPresentationPdf(), slides);
  for (const [buffer, count, mediaBox] of [
    [questionnaire, 2, /\/MediaBox \[0 0 612(?:\.0*)? 792(?:\.0*)?\]/],
    [slides, 8, /\/MediaBox \[0 0 960(?:\.0*)? 540(?:\.0*)?\]/],
  ]) {
    const source = buffer.toString('latin1');
    assert.ok(source.startsWith('%PDF-'));
    assert.match(source, /startxref\n\d+\n%%EOF$/);
    assert.equal((source.match(/\/Type \/Page\b/g) || []).length, count);
    assert.match(source, mediaBox);
  }
});

test('mixed-format entries preserve original filenames and use format-specific variants', async () => {
  const presentation = templateDefinitions(project).find((item) => item.id === 'presentation');
  const downloads = await generateDownloads(presentation);
  assert.deepEqual(
    downloads.map(({ format, variant }) => [format, variant]),
    [
      ['DOCX', 'blank'],
      ['DOCX', 'example'],
      ['PPTX', 'blank'],
      ['PPTX', 'example'],
      ['PDF', 'preview'],
    ],
  );
  assert.ok(downloads[0].path.endsWith('interior-design-presentation-blank.docx'));
  assert.ok(downloads[1].path.endsWith('interior-design-presentation-example.docx'));
  for (const item of downloads) assert.equal(item.size, item.buffer.length);
});

test('Office resources use US Letter while preserving unresolved costs and formulas', async () => {
  for (const definition of templateDefinitions(project)) {
    const [download] = await generateDownloads(definition);
    if (definition.format === 'docx') {
      const archive = await JSZip.loadAsync(download.buffer);
      assert.match(
        await archive.file('word/document.xml').async('string'),
        /w:w="12240" w:h="15840"/,
      );
    } else {
      const book = new ExcelJS.Workbook();
      await book.xlsx.load(download.buffer);
      for (const sheet of book.worksheets) assert.equal(sheet.pageSetup.paperSize, 1);
      if (definition.budget) {
        const blank = book.getWorksheet('Blank Template');
        assert.match(blank.getCell('G6').formula, /IF\(OR\(C6="",E6=""\),""/);
        assert.equal(book.getWorksheet('Worked Example').getCell('G27').result, 1850);
      }
    }
  }
});

test('purchase-order draft stays outside all public routes until its evidence gates are met', async () => {
  const draft = purchaseOrderDraft();
  assert.equal(draft.status, 'draft');
  assert.equal(draft.indexable, false);
  assert.equal(draft.publicationGates.length, 3);
  assert.ok(!createRegistry(project).some((page) => page.id === draft.id));
  assert.ok(!publishedPages(createRegistry(project)).some((page) => page.path === draft.path));
  const [download] = await generateDownloads(draft);
  const book = new ExcelJS.Workbook();
  await book.xlsx.load(download.buffer);
  assert.equal(book.getWorksheet('Blank Template').getCell('A6').value, null);
  assert.match(book.getWorksheet('Worked Example').getCell('J6').value, /not ordered/);
});
