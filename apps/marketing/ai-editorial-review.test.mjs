import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRegistry, publishedPages } from './registry.mjs';
import { verifiedReview } from './editorial-review.mjs';
import { generateDownloads } from './documents.mjs';
import { resourcePage } from './resources.mjs';
import {
  aiEditorialReviews,
  aiEditorialReview,
  assertAiEditorialReviews,
  assertAiReviewedDownloads,
} from './ai-editorial-review.mjs';

const project = JSON.parse(await readFile(new URL('./data/project.json', import.meta.url)));
const pages = publishedPages(createRegistry(project)).map((page) => ({ ...page, downloads: [] }));
const resources = pages.filter((page) => ['guide', 'template'].includes(page.kind));

test('all published resources have current AI checks without professional review claims', () => {
  assertAiEditorialReviews(pages);
  assert.equal(resources.length, aiEditorialReviews.resources.length);
  for (const page of resources) {
    assert.equal(verifiedReview(page), null);
    assert.match(resourcePage(page, pages, project), /data-ai-reviewed-revision=/);
    assert.doesNotMatch(resourcePage(page, pages, project), /data-reviewed-revision=/);
  }
});

test('changed content loses AI credit and blocks publication until actually rechecked', () => {
  const page = { ...resources[0], intro: 'A newly changed resource.' };
  assert.equal(aiEditorialReview(page), null);
  assert.doesNotMatch(resourcePage(page, pages, project), /data-ai-reviewed-revision=/);
  assert.throws(() => assertAiEditorialReviews([page]), /Missing or stale AI editorial check/);
  const records = JSON.parse(JSON.stringify(aiEditorialReviews));
  records.reviewerType = 'professional';
  assert.equal(aiEditorialReview(resources[0], records), null);
});

test('AI artifact evidence rejects changed bytes even when the source revision is unchanged', async () => {
  const page = resources.find((entry) => entry.id === 'design-brief');
  const files = await generateDownloads(page);
  assertAiReviewedDownloads(page, files);
  assert.throws(
    () =>
      assertAiReviewedDownloads(page, [
        { ...files[0], buffer: Buffer.from('changed') },
        ...files.slice(1),
      ]),
    /Changed download bytes/,
  );
});
