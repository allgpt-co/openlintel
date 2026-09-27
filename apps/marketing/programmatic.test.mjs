import test from 'node:test';
import { Buffer } from 'node:buffer';
import { URL } from 'node:url';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, rm, mkdir, symlink, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRegistry, publishedPages, validateRegistry } from './registry.mjs';
import { editorialRevision } from './editorial-review.mjs';
import { publicationHistory } from './publication-history.mjs';
import {
  programmaticCandidates,
  approvedProgrammaticPages,
  validateProgrammaticCandidates,
  FIRST_SIX_REVIEW_IDS,
  PROGRAMMATIC_GATES,
  PROGRAMMATIC_RESERVATIONS,
  PROGRAMMATIC_RELEASE_ALLOWLIST,
} from './programmatic-catalog.mjs';
import {
  createReviewBundle,
  verifyProgrammaticPublication,
  writePrivateReviewFile,
  sha256,
  canonicalJson,
  verifyProgrammaticArtifacts,
  verifyProgrammaticRenderedContent,
} from './programmatic-review.mjs';
import { generatePrivateReviewBundles } from './programmatic-review-cli.mjs';

const project = JSON.parse(await readFile(new URL('./data/project.json', import.meta.url), 'utf8'));
const registry = createRegistry(project);
const legacyRegistry = registry
  .filter((page) => !page.programmatic)
  .map((page) => {
    const copy = { ...page };
    delete copy.programmaticRelated;
    return copy;
  });
const clone = (value) => JSON.parse(JSON.stringify(value));
const unreleasedHistory = () =>
  publicationHistory().map((entry) =>
    entry.originKind === 'programmatic'
      ? {
          ...entry,
          state: 'candidate',
          firstVerifiedLiveAt: null,
          liveCommit: null,
          evidence: null,
        }
      : entry,
  );
function reviewed(page, bundleHash) {
  return {
    state: 'verified',
    reviewerName: 'Test fixture reviewer',
    reviewerRole: 'Test fixture role',
    scope: 'TEST ONLY: not a real review',
    permissionToPublish: true,
    reviewedRevision: editorialRevision(page),
    reviewedAt: page.modified,
    sourcesCheckedAt: page.modified,
    ...(bundleHash ? { reviewedBundleHash: bundleHash } : {}),
  };
}
function approvalFixture(page, bundleHash) {
  const legacy = legacyRegistry.map((item) =>
    FIRST_SIX_REVIEW_IDS.includes(item.id) ? { ...item, review: reviewed(item) } : item,
  );
  const evidence = Object.fromEntries(
    PROGRAMMATIC_GATES.map((gate) => [
      gate,
      {
        state: 'verified',
        verifiedAt: `${page.modified}T00:00:00Z`,
        evidenceHash: sha256(`TEST ONLY ${gate}`),
      },
    ]),
  );
  evidence.firstSixReviews = FIRST_SIX_REVIEW_IDS.map((id) => ({
    id,
    reviewedRevision: editorialRevision(legacy.find((item) => item.id === id)),
  }));
  evidence.artifactCompatibility.bundleHash = bundleHash;
  return {
    legacy,
    release: {
      id: page.id,
      approvedBundleHash: bundleHash,
      review: reviewed(page, bundleHash),
      evidence,
    },
  };
}
const fingerprintProvider = async () => [
  { path: 'fixture-generator.mjs', hash: sha256('TEST generator v1') },
];
async function fixtureBundle(page, options = {}) {
  return createReviewBundle({ page, project, registry, fingerprintProvider, ...options });
}

test('Both authorized educational resources are public with review pending; lighting remains only a reservation', () => {
  const candidates = programmaticCandidates();
  assert.equal(registry.length, 47);
  assert.equal(registry.filter((page) => page.indexable).length, 45);
  assert.equal(legacyRegistry.length, 45);
  assert.equal(PROGRAMMATIC_RELEASE_ALLOWLIST.length, 2);
  assert.deepEqual(
    candidates.map((page) => page.id),
    ['purchase-order', 'plumbing-fixture-schedule'],
  );
  assert.ok(
    candidates.every(
      (page) =>
        page.status === 'draft' &&
        !page.indexable &&
        page.familyId === 'selection-procurement' &&
        page.cohortId === 'selection-procurement-01',
    ),
  );
  assert.deepEqual(
    approvedProgrammaticPages(project, { legacyPages: legacyRegistry, allowlist: [] }),
    [],
  );
  for (const page of registry.filter((item) => item.programmatic)) {
    assert.equal(page.releaseMode, 'educational-pending-review');
    assert.match(page.contentBundleHash, /^sha256:[a-f0-9]{64}$/);
    for (const key of ['review', 'releaseEvidence', 'approvedBundleHash'])
      assert.ok(!(key in page));
  }
  assert.ok(
    registry
      .find((page) => page.id === 'spec-sheet')
      .programmaticRelated.includes('purchase-order'),
  );
  assert.ok(
    PROGRAMMATIC_RESERVATIONS.some((item) => item.intentKey === 'lighting-fixture-schedule'),
  );
  assert.ok(!candidates.some((page) => page.id.includes('lighting')));
});

test('Candidate identity, intent ownership, provenance and data completeness fail closed', () => {
  const page = programmaticCandidates()[0];
  for (const change of [
    { id: 'spec-sheet' },
    { path: registry.find((item) => item.id === 'spec-sheet').path },
    { intentKey: 'spec-sheet' },
    { title: registry[0].title },
    { familyId: 'invented' },
    { rows: [['missing columns']] },
    { provenance: { ...page.provenance, sourceVersion: '2020-01-01' } },
    { provenance: { ...page.provenance, classification: 'real-client' } },
  ])
    assert.throws(() => validateProgrammaticCandidates([{ ...page, ...change }], legacyRegistry));
  assert.throws(() => validateProgrammaticCandidates([page, page]), /duplicate/);
  assert.throws(
    () =>
      approvedProgrammaticPages(project, {
        legacyPages: legacyRegistry,
        allowlist: [{ id: page.id }],
      }),
    /approval/,
  );
  assert.throws(
    () =>
      approvedProgrammaticPages(project, {
        legacyPages: legacyRegistry,
        allowlist: [{ id: 'lighting-fixture-schedule' }],
      }),
    /Unknown/,
  );
});

test('Exact bundle approval, real evidence slots and all first-six current revisions are mandatory', async () => {
  const [candidate, second] = programmaticCandidates();
  const bundle = await fixtureBundle(candidate);
  const { legacy, release } = approvalFixture(candidate, bundle.bundleHash);
  const secondRelease = approvalFixture(second, (await fixtureBundle(second)).bundleHash).release;
  const select = (entry = release, existing = legacy) =>
    approvedProgrammaticPages(project, {
      legacyPages: existing,
      allowlist: [entry, secondRelease],
    });
  const selected = select();
  const [page] = selected;
  assert.equal(page.status, 'published');
  assert.equal(page.indexable, true);
  assert.doesNotThrow(() => validateRegistry([...legacy, ...selected]));
  assert.throws(() => select(release, legacyRegistry), /first six/);
  assert.throws(() => select({ ...release, releaseMode: 'unknown-mode' }));
  for (const gate of PROGRAMMATIC_GATES) {
    const changed = clone(release);
    changed.evidence[gate].state = 'pending';
    assert.throws(() => select(changed), /gates remain unresolved/);
  }
  const stale = clone(release);
  stale.evidence.firstSixReviews[0].reviewedRevision = sha256('stale');
  assert.throws(() => select(stale), /first six/);
  const future = clone(release);
  future.evidence.intake.verifiedAt = '2999-01-01T00:00:00Z';
  assert.throws(() => select(future), /gates/);
  const invalidDate = clone(release);
  invalidDate.evidence.intake.verifiedAt = '2026-02-30T00:00:00Z';
  assert.throws(() => select(invalidDate), /gates/);
  const unpermitted = clone(release);
  unpermitted.review.permissionToPublish = false;
  assert.throws(() => select(unpermitted), /Incomplete or stale/);
  for (const compatibility of [
    { bundleHash: undefined },
    { bundleHash: sha256('a previously reviewed artifact') },
    { verifiedAt: '2020-01-01T00:00:00Z' },
  ]) {
    const changed = clone(release);
    Object.assign(changed.evidence.artifactCompatibility, compatibility);
    assert.throws(() => select(changed), /compatibility evidence must cover/);
  }
  const growthSettings = { pilotEnabled: true, analyticsEnabled: true };
  await assert.rejects(
    () => verifyProgrammaticPublication({ pages: [...legacy, page], project }),
    /configured discovery/,
  );
  await assert.doesNotReject(() =>
    verifyProgrammaticPublication({
      pages: [...legacy, page],
      project,
      growthSettings,
      bundleFactory: (input) => createReviewBundle({ ...input, fingerprintProvider }),
    }),
  );
  await assert.rejects(
    () =>
      verifyProgrammaticPublication({
        pages: [...legacy, page],
        project,
        growthSettings,
        bundleFactory: async () => ({ bundleHash: sha256('changed artifact') }),
      }),
    /publication blocked/,
  );
});

test('The first release requires the complete registered cohort; verified history permits later partial releases', async () => {
  const candidates = programmaticCandidates();
  const fixtures = await Promise.all(
    candidates.map(async (page) => approvalFixture(page, (await fixtureBundle(page)).bundleHash)),
  );
  const legacyPages = fixtures[0].legacy;
  const allowlist = fixtures.map((fixture) => fixture.release);
  const initialHistory = unreleasedHistory();
  assert.equal(
    approvedProgrammaticPages(project, { legacyPages, allowlist, history: initialHistory }).length,
    2,
  );
  for (const release of allowlist)
    assert.throws(
      () =>
        approvedProgrammaticPages(project, {
          legacyPages,
          allowlist: [release],
          history: initialHistory,
        }),
      /Initial programmatic cohort/,
    );
  // Supplying only one candidate cannot silently redefine the registered cohort.
  assert.throws(
    () =>
      approvedProgrammaticPages(project, {
        legacyPages,
        allowlist: [allowlist[0]],
        candidates: [candidates[0]],
        history: initialHistory,
      }),
    /Initial programmatic cohort/,
  );
  assert.deepEqual(approvedProgrammaticPages(project, { legacyPages, allowlist: [] }), []);
  for (const state of ['published', 'retired']) {
    const history = unreleasedHistory();
    const prior = history.find((entry) => entry.id === candidates[1].id);
    Object.assign(prior, {
      state,
      firstVerifiedLiveAt: '2026-09-26T00:00:00Z',
      liveCommit: 'a'.repeat(40),
      evidence: {
        auditHash: sha256('TEST ONLY live audit'),
        url: `https://openlintel.com/${prior.path}`,
      },
    });
    assert.equal(
      approvedProgrammaticPages(project, { legacyPages, allowlist: [allowlist[0]], history })
        .length,
      1,
    );
    prior.firstVerifiedLiveAt = null;
    assert.throws(
      () => approvedProgrammaticPages(project, { legacyPages, allowlist: [allowlist[0]], history }),
      /verified live evidence/,
    );
  }
});

test('Educational publication verifies exact content without implying practitioner or operational approval', async () => {
  const candidates = programmaticCandidates();
  const bundles = await Promise.all(candidates.map((page) => fixtureBundle(page)));
  const allowlist = candidates.map((page, index) => ({
    id: page.id,
    releaseMode: 'educational-pending-review',
    contentBundleHash: bundles[index].bundleHash,
  }));
  const select = (entries = allowlist) =>
    approvedProgrammaticPages(project, {
      legacyPages: legacyRegistry,
      allowlist: entries,
      history: unreleasedHistory(),
    });
  const pages = select();
  assert.doesNotThrow(() => validateRegistry([...legacyRegistry, ...pages]));
  for (const page of pages)
    for (const key of ['review', 'releaseEvidence', 'approvedBundleHash'])
      assert.ok(!(key in page));
  const growthSettings = { pilotEnabled: false, analyticsEnabled: false };
  const verify = (entries = pages) =>
    verifyProgrammaticPublication({
      pages: [...legacyRegistry, ...entries],
      project,
      growthSettings,
      bundleFactory: (input) => createReviewBundle({ ...input, fingerprintProvider }),
    });
  const verified = await verify();
  assert.equal(verified.length, 2);
  for (let index = 0; index < pages.length; index++) {
    assert.equal(verifyProgrammaticArtifacts(verified[index], bundles[index].downloads), true);
    assert.equal(verifyProgrammaticRenderedContent(verified[index], bundles[index].html), true);
    const changed = bundles[index].downloads.map((file, fileIndex) => ({
      ...file,
      buffer: fileIndex
        ? file.buffer
        : Buffer.concat([file.buffer, Buffer.from('unreviewed change')]),
    }));
    assert.throws(() => verifyProgrammaticArtifacts(verified[index], changed), /differ/);
  }
  for (const extra of [
    { releaseMode: 'unknown-mode' },
    { releaseMode: undefined },
    { contentBundleHash: undefined },
    { contentBundleHash: 'not-a-hash' },
    { approvedBundleHash: sha256('not an approval') },
    { review: {} },
    { evidence: {} },
    { releaseEvidence: {} },
  ])
    assert.throws(() => select([{ ...allowlist[0], ...extra }, allowlist[1]]));
  assert.throws(
    () => select([{ ...allowlist[0], id: 'lighting-fixture-schedule' }, allowlist[1]]),
    /Unknown/,
  );
  const stale = pages.map((page, index) =>
    index ? page : { ...page, contentBundleHash: sha256('previous content') },
  );
  await assert.rejects(() => verify(stale), /changed|mismatch|publication blocked/);
  const changed = clone(pages);
  changed[0].rows[0][0] += ' altered after release';
  await assert.rejects(() => verify(changed), /changed|mismatch|publication blocked/);
});

test('Bundles are deterministic across release bookkeeping but change with content, files, renderers and generators', async () => {
  const page = programmaticCandidates()[0];
  const initial = await fixtureBundle(page);
  const duplicate = await fixtureBundle(page);
  assert.equal(initial.bundleHash, duplicate.bundleHash);
  const verification = { id: page.id, manifest: initial.manifest };
  assert.equal(verifyProgrammaticArtifacts(verification, initial.downloads), true);
  assert.equal(verifyProgrammaticRenderedContent(verification, initial.html), true);
  assert.throws(
    () => verifyProgrammaticArtifacts(verification, initial.downloads.slice(0, 1)),
    /differ/,
  );
  assert.throws(
    () =>
      verifyProgrammaticRenderedContent(
        verification,
        initial.html.replace('How to use this template', 'Unreviewed change'),
      ),
    /differs/,
  );
  const released = {
    ...page,
    status: 'published',
    indexable: true,
    downloads: [{ size: 999 }],
    approvedBundleHash: initial.bundleHash,
    review: reviewed(page, initial.bundleHash),
    releaseEvidence: { arbitrary: 'operational' },
    published: '2026-09-26',
    firstVerifiedLiveAt: '2026-09-26T01:00:00Z',
    liveCommit: 'a'.repeat(40),
  };
  assert.equal((await fixtureBundle(released)).bundleHash, initial.bundleHash);
  const educational = {
    ...page,
    status: 'published',
    indexable: true,
    releaseMode: 'educational-pending-review',
    contentBundleHash: initial.bundleHash,
  };
  assert.equal((await fixtureBundle(educational)).bundleHash, initial.bundleHash);
  const content = clone(page);
  content.rows[0][0] += ' Changed';
  assert.notEqual((await fixtureBundle(content)).bundleHash, initial.bundleHash);
  assert.notEqual(
    (
      await fixtureBundle(page, {
        fingerprintProvider: async () => [
          { path: 'fixture-generator.mjs', hash: sha256('formula changed') },
        ],
      })
    ).bundleHash,
    initial.bundleHash,
  );
  const editedDownloads = initial.downloads.map((item, index) => ({
    ...item,
    buffer: index ? item.buffer : Buffer.concat([item.buffer, Buffer.from('changed')]),
    size: item.size + (index ? 0 : 7),
  }));
  assert.throws(() => verifyProgrammaticArtifacts(verification, editedDownloads), /differ/);
  assert.notEqual(
    (await fixtureBundle(page, { downloadGenerator: async () => editedDownloads })).bundleHash,
    initial.bundleHash,
  );
  assert.notEqual(
    (
      await fixtureBundle(page, {
        renderer: () =>
          initial.html.replace('How to use this template', 'Changed substantive instructions'),
      })
    ).bundleHash,
    initial.bundleHash,
  );
  const unrelated = registry.map((item) => ({ ...item, title: 'An unrelated hub title changed' }));
  assert.equal((await fixtureBundle(page, { registry: unrelated })).bundleHash, initial.bundleHash);
  assert.equal(
    canonicalJson({ b: 2, a: { d: 4, c: 3 } }),
    canonicalJson({ a: { c: 3, d: 4 }, b: 2 }),
  );
  await assert.rejects(
    () => fixtureBundle(page, { fingerprintProvider: async () => [] }),
    /fingerprints/,
  );
});

test('Legacy reviews ignore derived navigation but still invalidate changed authored content', () => {
  const page = registry.find((item) => item.id === 'spec-sheet');
  assert.equal(
    editorialRevision(page),
    editorialRevision({ ...page, programmaticRelated: ['purchase-order'] }),
  );
  assert.notEqual(
    editorialRevision(page),
    editorialRevision({ ...page, intro: `${page.intro} Changed.` }),
  );
});

test('Private review output rejects public paths and symlink escapes, and writes protected binary files', async () => {
  const workspace = await mkdtemp(join(tmpdir(), 'ol-review-private-'));
  try {
    await assert.rejects(
      () => writePrivateReviewFile('docs/leak.pdf', Buffer.from('secret'), workspace),
      /output\/seo/,
    );
    await assert.rejects(
      () =>
        writePrivateReviewFile('output/seo/../../docs/leak.pdf', Buffer.from('secret'), workspace),
      /output\/seo/,
    );
    const path = await writePrivateReviewFile(
      'output/seo/fixture/a.pdf',
      Buffer.from('private bytes'),
      workspace,
    );
    assert.equal((await stat(path)).mode & 0o777, 0o600);
    assert.equal(await readFile(path, 'utf8'), 'private bytes');
    await mkdir(join(workspace, 'outside'));
    await symlink(join(workspace, 'outside'), join(workspace, 'output/seo/escape'));
    await assert.rejects(
      () => writePrivateReviewFile('output/seo/escape/a.pdf', 'secret', workspace),
      /symlink/,
    );
    await symlink(path, join(workspace, 'output/seo/fixture/link.pdf'));
    await assert.rejects(
      () => writePrivateReviewFile('output/seo/fixture/link.pdf', 'secret', workspace),
      /symlink/,
    );
  } finally {
    await rm(workspace, { recursive: true, force: true });
  }
});

test('Private CLI produces review copies without changing public selection or implying approval', async () => {
  const workspace = await mkdtemp(join(tmpdir(), 'ol-review-cli-'));
  try {
    const results = await generatePrivateReviewBundles({ workspaceRoot: workspace });
    assert.equal(results.length, 2);
    for (const item of results) {
      assert.equal(item.artifacts, 2);
      const html = await readFile(join(workspace, item.directory, 'index.html'), 'utf8');
      assert.match(html, /noindex,nofollow/);
      assert.match(html, /PRIVATE REVIEW COPY · PRACTITIONER APPROVAL PENDING/);
      assert.match(html, /href="artifacts\/[^"]+\.xlsx"/);
      assert.match(html, /href="artifacts\/[^"]+\.pdf"/);
      const bundle = JSON.parse(
        await readFile(join(workspace, item.directory, 'bundle.json'), 'utf8'),
      );
      assert.equal(bundle.publicationState, 'selected-for-publication');
      assert.equal(bundle.reviewState, 'pending');
      assert.ok(bundle.reviewedReleaseRequirements.includes('candidate-exact-bundle-review'));
      assert.ok(bundle.reviewedReleaseRequirements.includes('first-six-practitioner-reviews'));
      assert.equal(bundle.requiredGates, undefined);
      assert.equal(bundle.bundleHash, item.bundleHash);
      assert.ok(bundle.dependencies.some((item) => item.path === 'pnpm-lock.yaml'));
      assert.ok(bundle.dependencies.some((item) => item.path.endsWith('schedule-assets.mjs')));
    }
    assert.equal(publishedPages(createRegistry(project)).length, 47);
  } finally {
    await rm(workspace, { recursive: true, force: true });
  }
});
