import { readFileSync } from 'node:fs';
import { config, loadSiteConfig } from './config.mjs';

const rawHistory = JSON.parse(
  readFileSync(new URL('./data/publication-history.json', import.meta.url), 'utf8'),
);
export const normalizeLandingId = (value) => value.replace(/\/+$/, '').replaceAll('/', '-');
const slug = (value) => typeof value === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
const immutable = ['id', 'path', 'familyId', 'cohortId', 'intentKey', 'originKind'];
export function validatePublicationHistory(value, { previous } = {}) {
  if (value?.schemaVersion !== 1 || !Array.isArray(value.entries))
    throw new Error('Invalid publication history.');
  const ids = new Set(),
    paths = new Set(),
    landingIds = new Set(),
    intents = new Set();
  for (const entry of value.entries) {
    const landingId = typeof entry.id === 'string' ? normalizeLandingId(entry.id) : '';
    if (
      !slug(landingId) ||
      ids.has(entry.id) ||
      landingIds.has(landingId) ||
      paths.has(entry.path) ||
      (entry.path !== '' && !/^[a-z0-9-]+(?:\/[a-z0-9-]+)*\/$/.test(entry.path || '')) ||
      !['familyId', 'cohortId', 'intentKey'].every((key) => slug(entry[key])) ||
      intents.has(entry.intentKey) ||
      !['legacy', 'programmatic'].includes(entry.originKind) ||
      !['legacy', 'candidate', 'published', 'retired'].includes(entry.state) ||
      (entry.originKind === 'legacy' && entry.state === 'candidate') ||
      (entry.originKind === 'programmatic' && entry.state === 'legacy')
    )
      throw new Error(`Invalid or reassigned publication identity: ${entry.id}`);
    const live = entry.firstVerifiedLiveAt;
    const complete =
      live !== null &&
      typeof live === 'string' &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(live) &&
      Number.isFinite(Date.parse(live)) &&
      new Date(live).toISOString() === live.replace('Z', '.000Z') &&
      Date.parse(live) <= Date.now() &&
      /^[a-f0-9]{40}$/.test(entry.liveCommit || '') &&
      /^sha256:[a-f0-9]{64}$/.test(entry.evidence?.auditHash || '');
    if (complete) {
      let location;
      try {
        location = new URL(entry.evidence.url);
      } catch {
        throw new Error('Invalid publication evidence URL.');
      }
      if (
        location.protocol !== 'https:' ||
        location.username ||
        location.password ||
        location.search ||
        location.hash ||
        !['https://openlintel.com', 'https://www.openlintel.com'].includes(location.origin) ||
        location.pathname !== `/${entry.path}`
      )
        throw new Error('Invalid publication evidence URL.');
    }
    const unknown = live === null && entry.liveCommit === null && entry.evidence === null;
    if (
      (!complete && !unknown) ||
      (entry.state === 'candidate' && !unknown) ||
      (entry.originKind === 'programmatic' &&
        ['published', 'retired'].includes(entry.state) &&
        !complete)
    )
      throw new Error(
        `Publication needs verified live evidence, not an inferred date: ${entry.id}`,
      );
    ids.add(entry.id);
    paths.add(entry.path);
    landingIds.add(landingId);
    intents.add(entry.intentKey);
  }
  if (previous) {
    validatePublicationHistory(previous);
    for (const old of previous.entries) {
      const next = value.entries.find((entry) => entry.id === old.id);
      if (
        !next ||
        immutable.some((key) => next[key] !== old[key]) ||
        (old.firstVerifiedLiveAt !== null &&
          ['firstVerifiedLiveAt', 'liveCommit', 'evidence'].some(
            (key) => JSON.stringify(next[key]) !== JSON.stringify(old[key]),
          )) ||
        (old.state !== 'candidate' && next.state === 'candidate') ||
        (old.state !== 'legacy' && next.state === 'legacy')
      )
        throw new Error(
          `Publication history cannot remove or rewrite prior identity/evidence: ${old.id}`,
        );
    }
  }
  return value;
}
validatePublicationHistory(rawHistory);
export function publicationHistory() {
  return rawHistory.entries.map((entry) => ({
    ...JSON.parse(JSON.stringify(entry)),
    landingId: normalizeLandingId(entry.id),
  }));
}
export function assertPublicationIdentities(pages, history = rawHistory) {
  validatePublicationHistory(history);
  const isPublic = (page) => page.status === undefined || page.status === 'published';
  const publicIds = new Set(pages.filter(isPublic).map((page) => page.id));
  for (const page of pages) {
    const entry = history.entries.find((item) => item.id === page.id);
    if (
      !entry ||
      ['id', 'path', 'familyId', 'cohortId', 'intentKey'].some((key) => page[key] !== entry[key])
    )
      throw new Error(`Registry identity differs from publication history: ${page.id}`);
    if (isPublic(page) && entry.state === 'retired')
      throw new Error(`Retired publication identity cannot remain public: ${page.id}`);
    if (
      isPublic(page) &&
      entry.state === 'candidate' &&
      (!page.programmatic || !/^sha256:[a-f0-9]{64}$/.test(page.approvedBundleHash || ''))
    )
      throw new Error(`Candidate publication identity needs release approval: ${page.id}`);
  }
  for (const entry of history.entries)
    if (['legacy', 'published'].includes(entry.state) && !publicIds.has(entry.id))
      throw new Error(`Active publication identity must remain public or be retired: ${entry.id}`);
  return true;
}
export function historicalLandingIds() {
  return new Set(
    publicationHistory()
      .filter((entry) => entry.state !== 'candidate')
      .map((entry) => entry.landingId),
  );
}
export function historicalPageForUrl(
  value,
  { origin = config.origin, basePath = config.base } = {},
) {
  const site = loadSiteConfig({ MARKETING_ORIGIN: origin, MARKETING_BASE_PATH: basePath });
  let page;
  try {
    page = new URL(value);
  } catch {
    return null;
  }
  const host = new URL(site.origin);
  const hosts = new Set([host.hostname]);
  if (['openlintel.com', 'www.openlintel.com'].includes(host.hostname)) {
    hosts.add('openlintel.com');
    hosts.add('www.openlintel.com');
  }
  if (
    !hosts.has(page.hostname) ||
    page.protocol !== host.protocol ||
    page.port !== host.port ||
    page.username ||
    page.password ||
    !page.pathname.startsWith(site.base)
  )
    return null;
  const path = page.pathname.slice(site.base.length);
  return publicationHistory().find((entry) => entry.path === path) || null;
}
