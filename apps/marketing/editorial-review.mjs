import { createHash } from 'node:crypto';

/** Generated download sizes are not editorial revisions; authored content is. */
export function editorialRevision(page) {
  const content = Object.fromEntries(
    Object.entries(page).filter(([key]) => !['review', 'downloads'].includes(key)),
  );
  return `sha256:${createHash('sha256').update(JSON.stringify(content)).digest('hex')}`;
}

/** Public review credits are supplied only after a real, permissioned review. */
export function verifiedReview(page) {
  const review = page.review;
  if (review === undefined) return null;
  const fail = () => {
    throw new Error(`Incomplete or stale verified review for ${page.id}.`);
  };
  const validDate = (value) =>
    typeof value === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(Date.parse(value)) &&
    new Date(value).toISOString().slice(0, 10) === value;
  if (
    review?.state !== 'verified' ||
    review.permissionToPublish !== true ||
    !['reviewerName', 'reviewerRole', 'scope'].every(
      (field) => typeof review[field] === 'string' && review[field].trim(),
    ) ||
    !validDate(page.modified) ||
    review.reviewedRevision !== editorialRevision(page) ||
    !validDate(review.reviewedAt) ||
    review.reviewedAt < page.modified ||
    review.reviewedAt > new Date().toISOString().slice(0, 10) ||
    !validDate(review.sourcesCheckedAt) ||
    review.sourcesCheckedAt < page.modified ||
    review.sourcesCheckedAt > review.reviewedAt
  )
    fail();
  return review;
}
