import { readFileSync } from 'node:fs';
import { editorialRevision } from './editorial-review.mjs';
import { digest } from './owned-output.mjs';

// An AI editorial check never supplies page.review or a professional release approval.
export const aiEditorialReviews = JSON.parse(
  readFileSync(new URL('./data/ai-editorial-reviews.json', import.meta.url), 'utf8'),
);

export function aiEditorialReview(page, records = aiEditorialReviews) {
  const entry = records.resources?.find((record) => record.id === page.id);
  const date = entry?.reviewedAt;
  // Each record names the model that performed it; older records inherit the file-level name.
  const reviewerName = entry?.reviewerName ?? records.reviewerName;
  if (
    records.schemaVersion !== 1 ||
    records.reviewerType !== 'ai' ||
    typeof reviewerName !== 'string' ||
    !reviewerName.trim() ||
    !entry ||
    entry.path !== page.path ||
    entry.editorialRevision !== editorialRevision(page) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(date || '') ||
    !Number.isFinite(Date.parse(date)) ||
    new Date(date).toISOString().slice(0, 10) !== date ||
    date < page.modified ||
    date > new Date().toISOString().slice(0, 10) ||
    !entry.finding?.trim() ||
    !['checked', 'corrected'].includes(entry.outcome)
  )
    return null;
  return { ...entry, reviewerName };
}

export function assertAiEditorialReviews(pages, records = aiEditorialReviews) {
  if (new Set(records.resources?.map((record) => record.id)).size !== records.resources?.length)
    throw new Error('Duplicate AI editorial review records.');
  for (const page of pages.filter((entry) => ['guide', 'template'].includes(entry.kind))) {
    if (!aiEditorialReview(page, records))
      throw new Error(
        `Missing or stale AI editorial check for ${page.id}; review the changed content.`,
      );
  }
}

export function assertAiReviewedDownloads(page, downloads, records = aiEditorialReviews) {
  const review = aiEditorialReview(page, records);
  if (
    !review ||
    review.artifacts?.length !== downloads.length ||
    downloads.some(
      (file) =>
        !review.artifacts.some(
          (entry) => entry.path === file.path && entry.sha256 === digest(file.buffer),
        ),
    )
  )
    throw new Error(`Changed download bytes for AI editorial check: ${page.id}.`);
}
