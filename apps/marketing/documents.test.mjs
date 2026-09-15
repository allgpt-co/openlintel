import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import JSZip from 'jszip';
import { templateDefinitions } from './content/templates.mjs';
import { generateDownloads } from './documents.mjs';

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
