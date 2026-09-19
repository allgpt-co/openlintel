import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { loadGrowthConfig } from './growth-config.mjs';
import { growthPages, renderGrowthPage, renderGrowthChrome } from './growth-pages.mjs';

const ready = {
  MARKETING_PILOT_ENABLED: '1',
  MARKETING_FORMSPREE_ID: 'testform',
  MARKETING_FORMSPREE_VERIFIED: '1',
  MARKETING_OPERATIONS_READY: '1',
  MARKETING_PRIVACY_REVIEWED: '1',
  MARKETING_CONTACT_EMAIL: 'test@example.test',
  MARKETING_ANALYTICS_ENABLED: '1',
  MARKETING_GA4_ID: 'G-TEST123456',
  MARKETING_GA4_VERIFIED: '1',
};
const find = (id) => growthPages.find((p) => p.id === id);

test('integrations default off, without exposing unverified public identifiers', () => {
  const settings = loadGrowthConfig({
    MARKETING_FORMSPREE_ID: 'testform',
    MARKETING_GA4_ID: 'G-TEST123456',
  });
  assert.equal(settings.pilotEnabled, false);
  assert.equal(settings.analyticsEnabled, false);
  assert.equal(settings.formEndpoint, '');
  assert.equal(settings.measurementId, '');
  const body = renderGrowthPage(find('pilot'), settings);
  assert.match(body, /Requests are not open yet/);
  assert.doesNotMatch(body, /<form\b|formspree\.io/);
  assert.doesNotMatch(
    renderGrowthChrome(find('pilot'), settings),
    /testform|G-TEST|googletagmanager\.com/,
  );
  assert.match(renderGrowthPage(find('privacy'), settings), /Google Analytics is not enabled/);
});

test('each required release prerequisite is enforced independently', () => {
  for (const key of [
    'MARKETING_FORMSPREE_ID',
    'MARKETING_FORMSPREE_VERIFIED',
    'MARKETING_OPERATIONS_READY',
    'MARKETING_PRIVACY_REVIEWED',
    'MARKETING_CONTACT_EMAIL',
  ]) {
    const env = { ...ready };
    delete env[key];
    assert.throws(() => loadGrowthConfig(env), /Pilot release requires/);
  }
  for (const key of [
    'MARKETING_GA4_ID',
    'MARKETING_GA4_VERIFIED',
    'MARKETING_PRIVACY_REVIEWED',
    'MARKETING_CONTACT_EMAIL',
  ]) {
    const env = { ...ready, MARKETING_PILOT_ENABLED: '0' };
    delete env[key];
    assert.throws(() => loadGrowthConfig(env), /Analytics release requires/);
  }
});

test('reject URLs, property IDs, unsafe email, and ambiguous booleans', () => {
  for (const env of [
    { MARKETING_FORMSPREE_ID: 'https://example.test/f/secret' },
    { MARKETING_GA4_ID: '123456789' },
    { MARKETING_GA4_ID: 'G-TEST123456?secret' },
    { MARKETING_CONTACT_EMAIL: 'a@example.test\nbcc:x@example.test' },
    { MARKETING_CONTACT_EMAIL: '<script>@example.test' },
    { MARKETING_ANALYTICS_ENABLED: 'true' },
  ])
    assert.throws(() => loadGrowthConfig(env));
});

test('released form is native HTML with labeled fields, no upload and accepted-only success', () => {
  const settings = loadGrowthConfig(ready);
  const html = renderGrowthPage(find('pilot'), settings);
  assert.match(html, /<form[^>]+action="https:\/\/formspree.io\/f\/testform" method="POST"/);
  for (const name of ['name', 'email', 'studio', 'role', 'challenge']) {
    assert.match(html, new RegExp(`(?:input|select|textarea)[^>]+id="pilot-${name}"[^>]+required`));
    assert.match(html, new RegExp(`<label for="pilot-${name}"`));
    assert.match(html, new RegExp(`id="pilot-${name}-error"`));
  }
  assert.doesNotMatch(html, /type="file"|work email|name="password"|type="checkbox"/i);
  assert.match(html, /name="source_evidence" value="unknown"/);
  assert.match(html, /data-pilot-success hidden/);
  assert.match(renderGrowthPage(find('privacy'), settings), /The request form sends/);
  assert.match(renderGrowthPage(find('privacy'), settings), /up to 90 days/);
});

test('all six routes have unique metadata and thanks does not assert submission', () => {
  assert.equal(growthPages.length, 6);
  assert.equal(new Set(growthPages.map((p) => p.id)).size, 6);
  for (const record of growthPages) {
    assert.ok(record.title && record.description && record.path);
    const html = renderGrowthPage(record, loadGrowthConfig({}));
    assert.equal((html.match(/<h1>/g) || []).length, 1);
    assert.doesNotMatch(html, /undefined|\[object Object\]/);
  }
  assert.equal(find('pilot-thanks').indexable, false);
  assert.match(
    renderGrowthPage(find('pilot-thanks'), loadGrowthConfig({})),
    /Visiting this page alone does not submit/,
  );
});

test('config JSON serialization cannot terminate its script element', () => {
  const html = renderGrowthChrome(
    { ...find('pilot'), title: '</script><script>alert(1)</script>' },
    loadGrowthConfig({}),
  );
  assert.equal((html.match(/<script/g) || []).length, 1);
  assert.match(html, /\\u003c\/script>/);
});

test('runtime integration boundary is consent-only, no preconsent storage or unsanitized GA URLs', async () => {
  const source = await readFile(new URL('./assets/growth.js', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /sessionStorage|gtag\([^\n]*(?:location\.href|document\.referrer)/);
  assert.match(source, /if \(!analyticsEnabled \|\| consent\?\.choice !== 'accepted'/);
  assert.match(source, /analyticsFrame\?\.remove\(\)/);
  assert.match(source, /ga-disable-/);
  assert.match(source, /window\.addEventListener\('storage'/);
  assert.match(source, /referrerPolicy:\s*'no-referrer'/);
});
