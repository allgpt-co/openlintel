import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  publicationHistory,
  historicalLandingIds,
  historicalPageForUrl,
  validatePublicationHistory,
  assertPublicationIdentities,
} from './publication-history.mjs';
import { createRegistry } from './registry.mjs';
import { programmaticCandidates } from './programmatic-catalog.mjs';

const initial = JSON.parse(
  await readFile(new URL('./data/publication-history.json', import.meta.url), 'utf8'),
);
const clone = (value) => JSON.parse(JSON.stringify(value));
function liveHistory() {
  const result = clone(initial);
  const entry = result.entries.find((item) => item.id === 'purchase-order');
  Object.assign(entry, {
    state: 'published',
    firstVerifiedLiveAt: '2026-09-26T00:00:00Z',
    liveCommit: 'a'.repeat(40),
    evidence: {
      auditHash: `sha256:${'b'.repeat(64)}`,
      url: 'https://openlintel.com/templates/interior-design-purchase-order/',
    },
  });
  return result;
}

test('History records all current identities and candidates without inventing first-live evidence', async () => {
  const project = JSON.parse(
    await readFile(new URL('./data/project.json', import.meta.url), 'utf8'),
  );
  const records = publicationHistory();
  assert.equal(records.length, 47);
  assert.ok(
    records.every(
      (entry) =>
        entry.firstVerifiedLiveAt === null && entry.liveCommit === null && entry.evidence === null,
    ),
  );
  assert.equal(records.filter((entry) => entry.state === 'candidate').length, 2);
  assertPublicationIdentities([...createRegistry(project), ...programmaticCandidates()]);
  const changed = { ...createRegistry(project)[0], path: 'moved/' };
  assert.throws(() => assertPublicationIdentities([changed]), /differs/);
  records[0].path = 'mutated/';
  assert.notEqual(publicationHistory()[0].path, 'mutated/');
  assert.equal(historicalLandingIds().size, 45);
  assert.ok(historicalLandingIds().has('how-it-works'));
  assert.ok(!historicalLandingIds().has('purchase-order'));
});

test('A verified first live event is allowed once; identities and prior live evidence cannot be rewritten', () => {
  const live = liveHistory();
  assert.doesNotThrow(() => validatePublicationHistory(live, { previous: initial }));
  for (const key of ['id', 'path', 'familyId', 'cohortId', 'intentKey', 'originKind']) {
    const changed = clone(live);
    const entry = changed.entries.find((item) => item.id === 'purchase-order');
    entry[key] =
      key === 'path' ? 'templates/renamed/' : key === 'originKind' ? 'legacy' : 'renamed';
    assert.throws(() => validatePublicationHistory(changed, { previous: live }));
  }
  for (const key of ['firstVerifiedLiveAt', 'liveCommit', 'evidence']) {
    const changed = clone(live);
    const entry = changed.entries.find((item) => item.id === 'purchase-order');
    entry[key] =
      key === 'firstVerifiedLiveAt'
        ? '2026-09-25T00:00:00Z'
        : key === 'liveCommit'
          ? 'c'.repeat(40)
          : { ...entry.evidence, auditHash: `sha256:${'d'.repeat(64)}` };
    assert.throws(() => validatePublicationHistory(changed, { previous: live }), /rewrite/);
  }
  const removed = clone(live);
  removed.entries = removed.entries.filter((item) => item.id !== 'purchase-order');
  assert.throws(() => validatePublicationHistory(removed, { previous: live }), /remove or rewrite/);
  const retired = clone(live);
  retired.entries.find((item) => item.id === 'purchase-order').state = 'retired';
  assert.doesNotThrow(() => validatePublicationHistory(retired, { previous: live }));
  const reset = clone(retired);
  const entry = reset.entries.find((item) => item.id === 'purchase-order');
  Object.assign(entry, {
    state: 'candidate',
    firstVerifiedLiveAt: null,
    liveCommit: null,
    evidence: null,
  });
  assert.throws(() => validatePublicationHistory(reset, { previous: retired }), /rewrite/);
});

test('Unknown dates, incomplete evidence, impossible timestamps and reassigned paths are rejected', () => {
  for (const change of [
    { firstVerifiedLiveAt: null },
    { firstVerifiedLiveAt: '2026-02-30T00:00:00Z' },
    { firstVerifiedLiveAt: '2999-01-01T00:00:00Z' },
    { liveCommit: 'short' },
    { evidence: null },
    {
      evidence: {
        auditHash: `sha256:${'b'.repeat(64)}`,
        url: 'https://evil.example/templates/interior-design-purchase-order/',
      },
    },
  ]) {
    const altered = liveHistory();
    Object.assign(
      altered.entries.find((item) => item.id === 'purchase-order'),
      change,
    );
    assert.throws(() => validatePublicationHistory(altered));
  }
  const duplicate = clone(initial);
  duplicate.entries[1].path = duplicate.entries[0].path;
  assert.throws(() => validatePublicationHistory(duplicate), /identity/);
  const falseLive = clone(initial);
  falseLive.entries.find((item) => item.id === 'purchase-order').state = 'published';
  assert.throws(() => validatePublicationHistory(falseLive), /verified live evidence/);
});

test('Historical URL mapping isolates host, protocol, port and base path while preserving known retired identities', () => {
  const path = 'templates/interior-design-spec-sheet/';
  const actual = initial.entries.find((item) => item.id === 'spec-sheet').path;
  assert.ok(path);
  assert.equal(
    historicalPageForUrl(`https://openlintel.com/${actual}?utm_source=test`).id,
    'spec-sheet',
  );
  assert.equal(historicalPageForUrl(`https://www.openlintel.com/${actual}`).id, 'spec-sheet');
  assert.equal(
    historicalPageForUrl(`https://openlintel.com/preview/${actual}`, { basePath: '/preview/' }).id,
    'spec-sheet',
  );
  assert.equal(
    historicalPageForUrl(`https://example.test/nested/${actual}`, {
      origin: 'https://example.test',
      basePath: '/nested/',
    }).id,
    'spec-sheet',
  );
  for (const url of [
    `https://app.openlintel.com/${actual}`,
    `https://evil.example/${actual}`,
    `http://openlintel.com/${actual}`,
    `https://openlintel.com:8443/${actual}`,
    `https://name:password@openlintel.com/${actual}`,
  ])
    assert.equal(historicalPageForUrl(url), null);
  assert.equal(
    historicalPageForUrl(`https://openlintel.com/${actual}`, { basePath: '/preview/' }),
    null,
  );
  assert.equal(
    historicalPageForUrl('https://openlintel.com/templates/interior-design-purchase-order/').state,
    'candidate',
  );
});

test('Retiring a live page requires matching registry removal while approved first launches await their audit', async () => {
  const project = JSON.parse(
    await readFile(new URL('./data/project.json', import.meta.url), 'utf8'),
  );
  const pages = createRegistry(project);
  const history = clone(initial);
  const retired = history.entries.find((entry) => entry.id === 'spec-sheet');
  retired.state = 'retired';
  assert.throws(() => assertPublicationIdentities(pages, history), /Retired.*public/);
  const removed = pages.filter((page) => page.id !== 'spec-sheet');
  assert.throws(
    () => assertPublicationIdentities(removed, initial),
    /must remain public or be retired/,
  );
  assert.doesNotThrow(() => assertPublicationIdentities(removed, history));
  const candidate = { ...programmaticCandidates()[0], status: 'published' };
  assert.throws(
    () => assertPublicationIdentities([...pages, candidate], initial),
    /release approval/,
  );
  candidate.approvedBundleHash = `sha256:${'a'.repeat(64)}`;
  assert.doesNotThrow(() => assertPublicationIdentities([...pages, candidate], initial));
  const live = liveHistory();
  assert.throws(() => assertPublicationIdentities(pages, live), /must remain public or be retired/);
  assert.doesNotThrow(() => assertPublicationIdentities([...pages, candidate], live));
});

test('Live evidence must identify the exact production resource URL without alternate ports or preview prefixes', () => {
  for (const url of [
    'https://openlintel.com/preview/templates/interior-design-purchase-order/',
    'https://openlintel.com:8443/templates/interior-design-purchase-order/',
    'https://www.openlintel.com:8443/templates/interior-design-purchase-order/',
    'https://openlintel.com/templates/interior-design-purchase-order/?test=1',
    'https://openlintel.com/templates/interior-design-purchase-order/#example',
  ]) {
    const altered = liveHistory();
    altered.entries.find((entry) => entry.id === 'purchase-order').evidence.url = url;
    assert.throws(() => validatePublicationHistory(altered), /evidence URL/);
  }
  const www = liveHistory();
  www.entries.find((entry) => entry.id === 'purchase-order').evidence.url =
    'https://www.openlintel.com/templates/interior-design-purchase-order/';
  assert.doesNotThrow(() => validatePublicationHistory(www));
});
