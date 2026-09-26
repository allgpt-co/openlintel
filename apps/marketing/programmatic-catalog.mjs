import { readFileSync } from 'node:fs';
import { purchaseOrderDraft } from './content/purchase-order.mjs';
import { plumbingFixtureDraft } from './content/plumbing-fixture.mjs';
import { editorialRevision, verifiedReview } from './editorial-review.mjs';
import { publicationHistory, validatePublicationHistory } from './publication-history.mjs';

export const FIRST_SIX_REVIEW_IDS = Object.freeze([
  'spec-sheet',
  'ffe-schedule',
  'finish-schedule',
  'client-questionnaire',
  'budget',
  'proposal',
]);
export const PROGRAMMATIC_GATES = Object.freeze([
  'intent',
  'overlap',
  'intake',
  'measurement',
  'artifactCompatibility',
]);
export const PROGRAMMATIC_FAMILIES = Object.freeze({
  'selection-procurement': {
    sourcePaths: [
      'apps/marketing/content/purchase-order.mjs',
      'apps/marketing/content/plumbing-fixture.mjs',
    ],
    generatorPaths: ['apps/marketing/documents.mjs', 'apps/marketing/schedule-assets.mjs'],
    assetPaths: [],
  },
});
export const PROGRAMMATIC_COHORTS = Object.freeze({
  'selection-procurement-01': Object.freeze(['purchase-order', 'plumbing-fixture-schedule']),
});
// A reservation is not an authored candidate, route, or promise of publication.
export const PROGRAMMATIC_RESERVATIONS = Object.freeze([
  { intentKey: 'lighting-fixture-schedule', state: 'reserved' },
]);
const releaseFile = JSON.parse(
  readFileSync(new URL('./data/programmatic-release.json', import.meta.url), 'utf8'),
);
if (releaseFile.schemaVersion !== 1 || !Array.isArray(releaseFile.releases))
  throw new Error('Invalid programmatic release allowlist.');
export const PROGRAMMATIC_RELEASE_ALLOWLIST = Object.freeze(releaseFile.releases);

export function programmaticCandidates() {
  return [
    [purchaseOrderDraft(), 'purchase-order', 'apps/marketing/content/purchase-order.mjs'],
    [
      plumbingFixtureDraft(),
      'plumbing-fixture-schedule',
      'apps/marketing/content/plumbing-fixture.mjs',
    ],
  ].map(([page, intentKey, sourcePath]) => ({
    ...page,
    programmatic: true,
    familyId: 'selection-procurement',
    cohortId: 'selection-procurement-01',
    intentKey,
    provenance: {
      classification: 'illustrative',
      ownership: 'OpenLintel authored educational structure',
      sourceVersion: page.modified,
      sourcePath,
      limitations:
        'No real project, supplier, quote, order, measured installation, or professional approval is represented.',
    },
    status: 'draft',
    indexable: false,
  }));
}

const hashPattern = /^sha256:[a-f0-9]{64}$/;
const validSlug = (value) => typeof value === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
const isEvidence = (value) =>
  value?.state === 'verified' &&
  hashPattern.test(value.evidenceHash || '') &&
  typeof value.verifiedAt === 'string' &&
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(value.verifiedAt) &&
  Number.isFinite(Date.parse(value.verifiedAt)) &&
  new Date(value.verifiedAt).toISOString() === value.verifiedAt.replace('Z', '.000Z') &&
  Date.parse(value.verifiedAt) <= Date.now();

export function validateProgrammaticCandidates(candidates, existing = []) {
  const ids = new Set(existing.map((page) => page.id));
  const paths = new Set(existing.map((page) => page.path));
  const intents = new Set(existing.map((page) => page.intentKey).filter(Boolean));
  const titles = new Set(existing.map((page) => page.title?.trim().toLowerCase()).filter(Boolean));
  for (const page of candidates) {
    if (
      !page.programmatic ||
      !PROGRAMMATIC_FAMILIES[page.familyId] ||
      !validSlug(page.id) ||
      !validSlug(page.cohortId) ||
      !PROGRAMMATIC_COHORTS[page.cohortId]?.includes(page.id) ||
      !validSlug(page.intentKey) ||
      !/^templates\/[a-z0-9-]+\/$/.test(page.path || '') ||
      ids.has(page.id) ||
      paths.has(page.path) ||
      intents.has(page.intentKey) ||
      !page.title ||
      titles.has(page.title.trim().toLowerCase())
    )
      throw new Error(`Invalid or duplicate programmatic identity/intent: ${page.id}`);
    if (
      page.provenance?.classification !== 'illustrative' ||
      !page.provenance?.ownership ||
      page.provenance.sourceVersion !== page.modified ||
      !PROGRAMMATIC_FAMILIES[page.familyId].sourcePaths.includes(page.provenance.sourcePath) ||
      !page.provenance.limitations ||
      !Array.isArray(page.columns) ||
      !page.columns.length ||
      !Array.isArray(page.rows) ||
      !page.rows.length ||
      page.rows.some((row) => !Array.isArray(row) || row.length !== page.columns.length)
    )
      throw new Error(`Incomplete programmatic evidence/data: ${page.id}`);
    ids.add(page.id);
    paths.add(page.path);
    intents.add(page.intentKey);
    titles.add(page.title.trim().toLowerCase());
  }
  return candidates;
}

export function assertProgrammaticRelease(page, legacyPages = []) {
  if (
    !page.programmatic ||
    !hashPattern.test(page.approvedBundleHash || '') ||
    !verifiedReview(page) ||
    page.review.reviewedBundleHash !== page.approvedBundleHash
  )
    throw new Error(
      `Programmatic publication requires exact-bundle practitioner approval: ${page.id}`,
    );
  if (!PROGRAMMATIC_GATES.every((gate) => isEvidence(page.releaseEvidence?.[gate])))
    throw new Error(`Programmatic publication gates remain unresolved: ${page.id}`);
  const compatibility = page.releaseEvidence.artifactCompatibility;
  if (
    compatibility.bundleHash !== page.approvedBundleHash ||
    Date.parse(compatibility.verifiedAt) < Date.parse(`${page.modified}T00:00:00Z`)
  )
    throw new Error(
      `Artifact compatibility evidence must cover the exact current bundle: ${page.id}`,
    );
  const reviews = page.releaseEvidence.firstSixReviews;
  if (
    !Array.isArray(reviews) ||
    reviews.length !== FIRST_SIX_REVIEW_IDS.length ||
    !FIRST_SIX_REVIEW_IDS.every((id) => {
      const resource = legacyPages.find((item) => item.id === id);
      const evidence = reviews.find((item) => item.id === id);
      return (
        resource &&
        verifiedReview(resource) &&
        evidence?.reviewedRevision === editorialRevision(resource)
      );
    })
  )
    throw new Error('The first six existing templates still require current practitioner reviews.');
  return page;
}

export function approvedProgrammaticPages(
  project,
  {
    legacyPages = [],
    allowlist = PROGRAMMATIC_RELEASE_ALLOWLIST,
    candidates = programmaticCandidates(project),
    history = publicationHistory(),
  } = {},
) {
  validateProgrammaticCandidates(candidates, legacyPages);
  validatePublicationHistory({ schemaVersion: 1, entries: history });
  if (!Array.isArray(allowlist)) throw new Error('Invalid programmatic release allowlist.');
  const seen = new Set();
  const approved = allowlist.map((release) => {
    const candidate = candidates.find((page) => page.id === release.id);
    if (!candidate || seen.has(release.id))
      throw new Error(`Unknown or duplicate programmatic release: ${release.id}`);
    seen.add(release.id);
    // Release records can approve an existing candidate, never override its authored fields.
    const page = {
      ...candidate,
      status: 'published',
      indexable: true,
      approvedBundleHash: release.approvedBundleHash,
      review: release.review,
      releaseEvidence: release.evidence,
    };
    return assertProgrammaticRelease(page, legacyPages);
  });
  for (const cohortId of new Set(approved.map((page) => page.cohortId))) {
    const members = PROGRAMMATIC_COHORTS[cohortId];
    const previouslyReleased = history.some(
      (entry) =>
        members.includes(entry.id) &&
        entry.cohortId === cohortId &&
        entry.originKind === 'programmatic' &&
        ['published', 'retired'].includes(entry.state) &&
        entry.firstVerifiedLiveAt !== null,
    );
    if (!previouslyReleased && members.some((id) => !seen.has(id)))
      throw new Error(`Initial programmatic cohort requires approval of every member: ${cohortId}`);
  }
  return approved;
}
