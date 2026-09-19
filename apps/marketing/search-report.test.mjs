import test from 'node:test';
import assert from 'node:assert/strict';
import {
  comparisonPeriods,
  isOpenLintelSite,
  isOpenLintelStream,
  collectSearchReport,
} from './search-report.mjs';

test('Search reporting uses adjacent complete 28-day periods with a freshness buffer', () => {
  assert.deepEqual(comparisonPeriods(new Date('2026-09-15T17:00:00Z')), [
    { name: 'current', startDate: '2026-08-16', endDate: '2026-09-12' },
    { name: 'previous', startDate: '2026-07-19', endDate: '2026-08-15' },
  ]);
});
test('Property guards refuse unrelated or spoofed properties', async () => {
  for (const value of [
    'sc-domain:openlintel.com',
    'https://openlintel.com/',
    'https://www.openlintel.com',
  ])
    assert.ok(isOpenLintelSite(value));
  for (const value of [
    'https://openlintel.com.evil.test/',
    'http://openlintel.com/',
    'https://openlintel.com/private/',
    'https://user@openlintel.com/',
    'sc-domain:example.com',
    'https://openlintel.com/?secret=yes',
  ])
    assert.ok(!isOpenLintelSite(value));
  assert.ok(isOpenLintelStream({ webStreamData: { defaultUri: 'https://openlintel.com' } }));
  await assert.rejects(
    collectSearchReport({ GA_PROPERTY_ID: '123', GSC_SITE_URL: 'sc-domain:other.com' }),
    /Generic environment properties/,
  );
  await assert.rejects(
    collectSearchReport({ OPENLINTEL_GSC_SITE: 'sc-domain:other.com' }),
    /must be the OpenLintel/,
  );
});
test('Unrelated GA stream cannot receive a report query', async () => {
  const calls = [];
  const fetcher = async (url) => {
    calls.push(url);
    return {
      ok: true,
      json: async () => ({
        dataStreams: [{ webStreamData: { defaultUri: 'https://example.com' } }],
      }),
    };
  };
  await assert.rejects(
    collectSearchReport(
      { OPENLINTEL_GA4_PROPERTY_ID: '123', GA_ACCESS_TOKEN: 'test-token' },
      fetcher,
    ),
    /refusing to query/,
  );
  assert.equal(calls.length, 1);
  assert.ok(!calls[0].includes('analyticsdata'));
});
test('Matched GA reports are restricted to OpenLintel hostnames and organic acquisition', async () => {
  const reports = [];
  const fetcher = async (url, options) => {
    if (url.includes('dataStreams'))
      return {
        ok: true,
        json: async () => ({
          dataStreams: [
            {
              name: 'properties/123/dataStreams/456',
              webStreamData: { defaultUri: 'https://openlintel.com/' },
            },
          ],
        }),
      };
    if (url.includes('runReport')) reports.push(JSON.parse(options.body));
    return { ok: true, json: async () => ({ timeZone: 'America/Chicago', rows: [] }) };
  };
  const result = await collectSearchReport(
    { OPENLINTEL_GA4_PROPERTY_ID: '123', GA_ACCESS_TOKEN: 'test-token' },
    fetcher,
  );
  assert.equal(result.ga4.timeZone, 'America/Chicago');
  assert.equal(reports.length, 5);
  for (const request of reports) {
    assert.equal(request.dateRanges.length, 2);
    assert.deepEqual(request.dimensionFilter.andGroup.expressions[1].filter.inListFilter.values, [
      '456',
    ]);
    assert.deepEqual(request.dimensionFilter.andGroup.expressions[0].filter.inListFilter.values, [
      'openlintel.com',
      'www.openlintel.com',
    ]);
    assert.equal(
      request.dimensionFilter.andGroup.expressions[2].filter.stringFilter.value,
      'Organic Search',
    );
  }
});

test('Explicit OpenLintel tokens are never replaced by shared OAuth refresh credentials', async () => {
  const calls = [];
  const fetcher = async (url, options) => {
    calls.push(url);
    assert.equal(options.headers.Authorization, 'Bearer explicit-token');
    return {
      ok: true,
      json: async () => ({
        siteEntry: [{ siteUrl: 'sc-domain:openlintel.com', permissionLevel: 'siteOwner' }],
        rows: [],
      }),
    };
  };
  await collectSearchReport(
    {
      OPENLINTEL_GSC_SITE: 'sc-domain:openlintel.com',
      OPENLINTEL_GSC_ACCESS_TOKEN: 'explicit-token',
      GOOGLE_CLIENT_ID: 'unused',
      GOOGLE_CLIENT_SECRET: 'unused',
      GOOGLE_REFRESH_TOKEN: 'unused',
    },
    fetcher,
  );
  assert.ok(!calls.some((url) => url.includes('oauth2')));
});
