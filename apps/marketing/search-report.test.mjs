import test from 'node:test';
import assert from 'node:assert/strict';
import {
  comparisonPeriods,
  contextPeriod,
  isOpenLintelSite,
  isOpenLintelStream,
  collectSearchReport,
} from './search-report.mjs';
import {
  classifyQuery,
  collectRows,
  rollupSearchRows,
  sourceStatus,
  categorizeAcquisition,
  rollupAcquisition,
  classifyPage,
  publicationGroups,
  cohortGscFilters,
} from './search-report-data.mjs';

const now = new Date('2026-09-26T17:00:00Z');
const gaEnv = { OPENLINTEL_GA4_PROPERTY_ID: '123', OPENLINTEL_GA_ACCESS_TOKEN: 'ga-token' };
const gscEnv = {
  OPENLINTEL_GSC_SITE: 'sc-domain:openlintel.com',
  OPENLINTEL_GSC_ACCESS_TOKEN: 'gsc-token',
};
const ok = (value) => ({ ok: true, json: async () => value });
const stream = (id, uri) => ({
  name: `properties/123/dataStreams/${id}`,
  webStreamData: { defaultUri: uri },
});
function fixture({
  streams = [stream('456', 'https://openlintel.com/')],
  custom = [],
  override,
} = {}) {
  const calls = [];
  const fetcher = async (url, options) => {
    const body =
      options.body && typeof options.body === 'string' ? JSON.parse(options.body) : undefined;
    calls.push({ url, body, options });
    const replaced = override?.(url, body, options);
    if (replaced) return replaced;
    if (url.includes('/sites') && !url.includes('/sites/'))
      return ok({
        siteEntry: [
          { siteUrl: gscEnv.OPENLINTEL_GSC_SITE, permissionLevel: 'siteOwner' },
          { siteUrl: 'https://openlintel.com/', permissionLevel: 'siteOwner' },
        ],
      });
    if (url.includes('dataStreams')) return ok({ dataStreams: streams });
    if (url.endsWith('/metadata'))
      return ok({ dimensions: custom.map((name) => ({ apiName: `customEvent:${name}` })) });
    if (url.includes('analyticsadmin'))
      return ok({ timeZone: 'America/Chicago', currencyCode: 'USD' });
    if (url.includes(':runReport'))
      return ok({ rows: [], rowCount: 0, metadata: { subjectToThresholding: true } });
    return ok({ rows: [] });
  };
  return { calls, fetcher };
}

test('Reporting windows are adjacent 28-day periods and inclusive 90-day context with freshness buffer', () => {
  assert.deepEqual(comparisonPeriods(new Date('2026-09-15T17:00:00Z')), [
    { name: 'current', startDate: '2026-08-16', endDate: '2026-09-12' },
    { name: 'previous', startDate: '2026-07-19', endDate: '2026-08-15' },
  ]);
  assert.deepEqual(contextPeriod(new Date('2026-09-15T17:00:00Z')), {
    name: 'context90',
    startDate: '2026-06-15',
    endDate: '2026-09-12',
  });
});

test('Explicit property guards refuse unrelated and spoofed properties without data requests', async () => {
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
  assert.ok(isOpenLintelStream(stream('456', 'https://app.openlintel.com/')));
  assert.ok(!isOpenLintelStream(stream('456', 'https://app.openlintel.com.evil.test/')));
  await assert.rejects(
    collectSearchReport({ GA_PROPERTY_ID: '123', GSC_SITE_URL: 'sc-domain:other.com' }),
    /Generic environment properties/,
  );
  const { fetcher, calls } = fixture();
  const result = await collectSearchReport(
    { OPENLINTEL_GSC_SITE: 'sc-domain:other.com', OPENLINTEL_GA4_PROPERTY_ID: 'G-WRONG' },
    fetcher,
    now,
  );
  assert.equal(result.status, 'unavailable');
  assert.match(result.gsc.reason, /must be the OpenLintel/);
  assert.match(result.ga4.reason, /must be numeric/);
  assert.equal(calls.length, 0);
});

test('An unrelated GA stream cannot receive report or data-metadata queries', async () => {
  const { fetcher, calls } = fixture({ streams: [stream('789', 'https://example.com/')] });
  const result = await collectSearchReport(gaEnv, fetcher, now);
  assert.equal(result.ga4.status, 'unavailable');
  assert.match(result.ga4.reason, /refusing to query/);
  assert.equal(calls.length, 1);
});

test('All-channel, organic and US GA reports isolate verified marketing and app stream/hostname pairs', async () => {
  const { fetcher, calls } = fixture({
    streams: [
      stream('456', 'https://openlintel.com/'),
      stream('789', 'https://app.openlintel.com/'),
      stream('900', 'https://unrelated.example/'),
    ],
  });
  const result = await collectSearchReport(
    { ...gaEnv, OPENLINTEL_GA4_ACTIVATED_AT: '2026-09-20' },
    fetcher,
    now,
  );
  assert.equal(result.ga4.timeZone, 'America/Chicago');
  assert.equal(result.ga4.activationDate, '2026-09-20');
  const requests = calls.filter((call) => call.url.includes(':runReport')).map((call) => call.body);
  assert.ok(requests.length > 12);
  for (const request of requests) {
    const expressions = request.dimensionFilter.andGroup.expressions;
    const hosts = expressions[0].filter.inListFilter.values;
    const ids = expressions[1].filter.inListFilter.values;
    assert.deepEqual(ids, hosts.includes('app.openlintel.com') ? ['789'] : ['456']);
    assert.deepEqual(
      hosts,
      ids[0] === '789' ? ['app.openlintel.com'] : ['openlintel.com', 'www.openlintel.com'],
    );
    assert.ok(request.dateRanges.length === 2 || request.dateRanges[0].name === 'context90');
  }
  assert.ok(requests.some((request) => request.dimensionFilter.andGroup.expressions.length === 2));
  assert.ok(
    requests.some(
      (request) =>
        request.dimensionFilter.andGroup.expressions[2]?.filter.stringFilter?.value ===
        'Organic Search',
    ),
  );
  assert.ok(
    requests.some(
      (request) =>
        request.dimensionFilter.andGroup.expressions[3]?.filter.stringFilter?.value === 'US',
    ),
  );
  assert.equal(result.ga4.reports.downloads.status, 'not_registered');
  assert.equal(result.ga4.reports.overview.status, 'empty');
  assert.equal(result.ga4.reports.overview.pageMetadata[0].subjectToThresholding, true);
});

test('Missing optional app stream is not configured without reusing the marketing stream', async () => {
  const { fetcher, calls } = fixture();
  const result = await collectSearchReport(gaEnv, fetcher, now);
  assert.equal(result.ga4.segments.app.status, 'not_configured');
  for (const call of calls.filter((call) => call.body?.dimensionFilter))
    assert.ok(!JSON.stringify(call.body).includes('app.openlintel.com'));
});

test('Only registered custom dimensions are queried and event names are constrained', async () => {
  const { fetcher, calls } = fixture({
    custom: [
      'resource_id',
      'resource_format',
      'resource_variant',
      'chapter_id',
      'source_page_id',
      'page_id',
    ],
  });
  const result = await collectSearchReport(gaEnv, fetcher, now);
  assert.equal(result.ga4.reports.downloads.status, 'empty');
  const download = calls.find((call) =>
    call.body?.dimensions?.some((dimension) => dimension.name === 'customEvent:resource_variant'),
  ).body;
  assert.deepEqual(
    download.dimensionFilter.andGroup.expressions.at(-1).filter.inListFilter.values,
    ['resource_download'],
  );
  assert.ok(
    download.dimensions.some((dimension) => dimension.name === 'customEvent:resource_format'),
  );
});

test('Provider failures preserve successful sibling reports and never fabricate missing zeros', async () => {
  for (const broken of ['gsc', 'ga4']) {
    const { fetcher } = fixture({
      override: (url) =>
        (broken === 'gsc' && url.includes('webmasters')) ||
        (broken === 'ga4' && url.includes('analyticsadmin'))
          ? { ok: false, status: 403 }
          : null,
    });
    const result = await collectSearchReport({ ...gaEnv, ...gscEnv }, fetcher, now);
    assert.equal(result.status, 'partial');
    assert.equal(result[broken].status, 'unavailable');
    assert.ok(!('rows' in result[broken]));
    assert.equal(
      result[broken === 'gsc' ? 'ga4' : 'gsc'].status,
      broken === 'gsc' ? 'partial' : 'available',
    );
  }
});

test('A failed custom dimension lookup does not discard successful standard reports', async () => {
  const { fetcher } = fixture({
    override: (url) => (url.endsWith('/metadata') ? { ok: false, status: 403 } : null),
  });
  const result = await collectSearchReport(gaEnv, fetcher, now);
  assert.equal(result.ga4.status, 'partial');
  assert.equal(result.ga4.reports.overview.status, 'empty');
  assert.equal(result.ga4.reports.downloads.status, 'unavailable');
});

test('Independent GSC totals, US filters, query intent and content clusters use the right source rows', async () => {
  const { fetcher, calls } = fixture({
    override: (url, body) => {
      if (!url.includes('searchAnalytics')) return null;
      const keys = body.dimensions?.join(',');
      if (keys === 'query')
        return ok({
          rows: ['openlintel', 'open lintel size', 'design questionnaire'].map((query) => ({
            keys: [query],
            clicks: 2,
            impressions: 10,
            position: 3,
            ctr: 0.2,
          })),
        });
      if (keys === 'page')
        return ok({
          rows: [
            {
              keys: ['https://openlintel.com/templates/interior-design-client-questionnaire/'],
              clicks: 2,
              impressions: 10,
              position: 3,
              ctr: 0.2,
            },
          ],
        });
      if (keys === '')
        return ok({ rows: [{ clicks: 20, impressions: 90, position: 4, ctr: 20 / 90 }] });
      return ok({ rows: [] });
    },
  });
  const result = await collectSearchReport(gscEnv, fetcher, now);
  const current = result.gsc.periods.current;
  assert.equal(current.totals.rows[0].clicks, 20);
  assert.deepEqual(
    current.queryIntent.rows.map((row) => row.key),
    ['brand', 'ambiguous', 'nonbrand'],
  );
  assert.equal(current.contentClusters.rows[0].key, 'discover');
  const queries = calls
    .filter((call) => call.url.includes('searchAnalytics'))
    .map((call) => call.body);
  assert.ok(queries.some((query) => query.dimensions.length === 0 && !query.dimensionFilterGroups));
  assert.ok(
    queries.some((query) =>
      query.dimensionFilterGroups?.[0].filters.some(
        (filter) => filter.dimension === 'country' && filter.expression === 'usa',
      ),
    ),
  );
  assert.ok(
    queries.some(
      (query) =>
        query.dimensions[0] === 'date' && query.startDate === result.contextPeriod.startDate,
    ),
  );
});

test('URL-prefix GSC excludes the app; optional inspection URLs are registry-bound and read-only', async () => {
  const { fetcher, calls } = fixture();
  const result = await collectSearchReport(
    {
      ...gscEnv,
      OPENLINTEL_GSC_SITE: 'https://openlintel.com/',
      OPENLINTEL_INSPECT_URLS: 'priority',
    },
    fetcher,
    now,
  );
  assert.equal(result.gsc.segments.appGlobal.status, 'out_of_scope');
  const inspections = calls.filter((call) => call.url.includes('index:inspect'));
  assert.equal(inspections.length, 11);
  assert.ok(
    inspections.some((call) => call.body.inspectionUrl.endsWith('/templates/ffe-schedule/')),
  );
  assert.ok(calls.every((call) => ['GET', 'POST'].includes(call.options.method)));
  const rejected = await collectSearchReport(
    { ...gscEnv, OPENLINTEL_INSPECT_URLS: 'https://evil.test/' },
    fetcher,
    now,
  );
  assert.equal(rejected.gsc.status, 'unavailable');
  assert.match(rejected.gsc.reason, /Inspection URLs/);
});

test('Explicit source credentials survive sibling OAuth refresh failure without logging token or error body', async () => {
  const { fetcher, calls } = fixture({
    override: (url, _body, options) => {
      if (url.includes('oauth2')) throw new Error('private-refresh-token');
      assert.equal(options.headers.Authorization, 'Bearer gsc-token');
      return null;
    },
  });
  const result = await collectSearchReport(
    {
      ...gscEnv,
      OPENLINTEL_GA4_PROPERTY_ID: '123',
      GOOGLE_CLIENT_ID: 'private',
      GOOGLE_CLIENT_SECRET: 'private',
      GOOGLE_REFRESH_TOKEN: 'private-refresh-token',
    },
    fetcher,
    now,
  );
  assert.equal(result.gsc.status, 'available');
  assert.equal(result.ga4.status, 'unavailable');
  assert.ok(!JSON.stringify(result).includes('private-refresh-token'));
  assert.ok(!JSON.stringify(result).includes('gsc-token'));
  assert.equal(calls.filter((call) => call.url.includes('oauth2')).length, 1);
});

test('Bounded pagination distinguishes empty, capped, partial and unavailable data', async () => {
  const limits = { pageSize: 2, maxPages: 2 };
  const capped = await collectRows(async () => ({ rows: [{}, {}] }), 'gsc', limits);
  assert.equal(capped.status, 'partial');
  assert.equal(capped.rows.length, 4);
  assert.equal(capped.completeness.complete, null);
  assert.equal(capped.completeness.reason, 'row_cap_reached');
  const partial = await collectRows(
    async (offset) => {
      if (offset) throw new Error('Page failed');
      return { rows: [{}, {}] };
    },
    'gsc',
    limits,
  );
  assert.equal(partial.status, 'partial');
  assert.equal(partial.rows.length, 2);
  const unavailable = await collectRows(
    async () => {
      throw new Error('No access');
    },
    'ga4',
    limits,
  );
  assert.equal(unavailable.status, 'unavailable');
  assert.ok(!('rows' in unavailable));
  const empty = await collectRows(async () => ({ rows: [], rowCount: 0 }), 'ga4', limits);
  assert.equal(empty.status, 'empty');
  const full = await collectRows(async () => ({ rows: [{}, {}], rowCount: 2 }), 'ga4', limits);
  assert.equal(full.status, 'available');
  assert.equal(full.completeness.complete, true);
});

test('Intent and weighted summaries keep ambiguity and null denominators explicit', () => {
  assert.equal(classifyQuery('Open Lintel measurements'), 'ambiguous');
  assert.equal(classifyQuery('openlintel.com templates'), 'brand');
  const result = rollupSearchRows(
    {
      status: 'available',
      rows: [
        { clicks: 1, impressions: 10, position: 2 },
        { clicks: 2, impressions: 20, position: 5 },
      ],
    },
    () => 'cluster',
  );
  assert.equal(result.rows[0].position, 4);
  assert.equal(result.rows[0].ctr, 0.1);
  assert.equal(rollupSearchRows({ status: 'unavailable' }, () => '').status, 'unavailable');
});

test('GA row counts inconsistent with empty, short or changing pages remain partial', async () => {
  for (const rows of [undefined, [], [{}]]) {
    const result = await collectRows(async () => ({ rows, rowCount: 5 }), 'ga4', {
      pageSize: 2,
      maxPages: 3,
    });
    assert.equal(result.status, 'partial');
    assert.equal(result.completeness.complete, false);
    assert.equal(result.completeness.reason, 'response_row_count_mismatch');
  }
  const changed = await collectRows(
    async (offset) => ({ rows: [{}, {}], rowCount: offset ? 6 : 5 }),
    'ga4',
    { pageSize: 2, maxPages: 3 },
  );
  assert.equal(changed.status, 'partial');
  assert.equal(changed.rows.length, 4);
  const missingLaterCount = await collectRows(
    async (offset) => (offset ? { rows: [{}] } : { rows: [{}, {}], rowCount: 5 }),
    'ga4',
    { pageSize: 2, maxPages: 3 },
  );
  assert.equal(missingLaterCount.status, 'partial');
  assert.equal(missingLaterCount.completeness.reason, 'response_row_count_mismatch');
  assert.equal(missingLaterCount.rows.length, 3);
  const unknown = await collectRows(async () => ({ rows: [] }), 'ga4');
  assert.equal(unknown.status, 'partial');
  assert.equal(unknown.completeness.complete, null);
  assert.equal(unknown.completeness.reason, 'row_count_unavailable');
});

test('Status distinguishes total failure, missing required registration and optional unconfigured surfaces', () => {
  assert.equal(sourceStatus([{ status: 'unavailable' }, { status: 'unavailable' }]), 'unavailable');
  assert.equal(
    sourceStatus([{ status: 'unavailable' }, { status: 'not_registered' }]),
    'unavailable',
  );
  assert.equal(sourceStatus([{ status: 'empty' }, { status: 'not_registered' }]), 'partial');
  assert.equal(sourceStatus([{ status: 'available' }, { status: 'not_configured' }]), 'available');
});

test('All GA data-request failures produce unavailable even when administrative metadata succeeded', async () => {
  const { fetcher } = fixture({
    override: (url) => (url.includes(':runReport') ? { ok: false, status: 403 } : null),
  });
  const result = await collectSearchReport(gaEnv, fetcher, now);
  assert.equal(result.ga4.metadata.property.status, 'available');
  assert.equal(result.ga4.status, 'unavailable');
  assert.equal(result.ga4.segments.marketing.status, 'unavailable');
  assert.equal(result.status, 'unavailable');
});

test('Fresh OAuth outranks generic stale tokens, while explicit OpenLintel tokens stay authoritative', async () => {
  for (const source of ['gsc', 'ga4']) {
    const requests = [];
    const { fetcher: base } = fixture();
    const fetcher = async (url, options) => {
      if (url.includes('oauth2')) return ok({ access_token: 'fresh-token' });
      requests.push(options.headers.Authorization);
      return base(url, options);
    };
    const configured =
      source === 'gsc'
        ? { OPENLINTEL_GSC_SITE: gscEnv.OPENLINTEL_GSC_SITE, GSC_ACCESS_TOKEN: 'stale-token' }
        : { OPENLINTEL_GA4_PROPERTY_ID: '123', GA_ACCESS_TOKEN: 'stale-token' };
    const result = await collectSearchReport(
      {
        ...configured,
        GOOGLE_CLIENT_ID: 'id',
        GOOGLE_CLIENT_SECRET: 'secret',
        GOOGLE_REFRESH_TOKEN: 'refresh',
      },
      fetcher,
      now,
    );
    assert.ok(requests.length);
    assert.ok(requests.every((value) => value === 'Bearer fresh-token'));
    assert.ok(['available', 'partial'].includes(result[source].status));
  }
  const { fetcher, calls } = fixture();
  await collectSearchReport(
    {
      ...gscEnv,
      GOOGLE_CLIENT_ID: 'id',
      GOOGLE_CLIENT_SECRET: 'secret',
      GOOGLE_REFRESH_TOKEN: 'refresh',
      GSC_ACCESS_TOKEN: 'generic-token',
    },
    fetcher,
    now,
  );
  assert.ok(!calls.some((call) => call.url.includes('oauth2')));
  assert.ok(calls.every((call) => call.options.headers.Authorization === 'Bearer gsc-token'));
});

test('AI referral categories remain bounded, period-specific and separate from Google organic and unknowns', () => {
  const table = {
    status: 'partial',
    completeness: { complete: false, reason: 'row_cap_reached' },
    dimensionHeaders: ['sessionDefaultChannelGroup', 'sessionSourceMedium', 'dateRange'].map(
      (name) => ({ name }),
    ),
    metricHeaders: ['sessions', 'engagedSessions', 'keyEvents'].map((name) => ({ name })),
    rows: [
      ['Referral', 'chatgpt.com / referral', 'current', '4', '2', '1'],
      ['Referral', 'chat.openai.com / referral', 'current', '2', '1', '0'],
      ['Referral', 'chatgpt.com / referral', 'previous', '1', '1', '0'],
      ['Organic Search', 'google / organic', 'current', '3', '2', '1'],
      ['Unassigned', '(not set) / (not set)', 'current', '2', '0', '0'],
      ['Referral', 'chatgpt.com.evil.test / referral', 'current', '1', '0', '0'],
    ].map((row) => ({
      dimensionValues: row.slice(0, 3).map((value) => ({ value })),
      metricValues: row.slice(3).map((value) => ({ value })),
    })),
  };
  const result = rollupAcquisition(table);
  assert.equal(result.status, 'partial');
  assert.equal(result.completeness.reason, 'row_cap_reached');
  assert.equal(
    result.rows.find((row) => row.category === 'ai_referral' && row.period === 'current').sessions,
    6,
  );
  assert.equal(
    result.rows.find((row) => row.category === 'ai_referral' && row.period === 'previous').sessions,
    1,
  );
  assert.equal(result.rows.find((row) => row.category === 'google_organic').sessions, 3);
  assert.equal(result.rows.find((row) => row.category === 'unknown').sessions, 2);
  assert.equal(result.rows.find((row) => row.category === 'other_or_unclassified').sessions, 1);
  assert.equal(
    categorizeAcquisition('Organic Search', 'chatgpt.com / organic').category,
    'unknown',
  );
  assert.equal(rollupAcquisition({ status: 'unavailable' }).status, 'unavailable');
});

const cohortHistory = [
  {
    id: 'published-cohort-page',
    path: 'templates/published-cohort-page/',
    state: 'published',
    familyId: 'selection-procurement',
    cohortId: 'cohort-one',
    firstVerifiedLiveAt: '2026-09-01T00:00:00Z',
    modified: '2026-09-25',
  },
  {
    id: 'unreleased-page',
    path: 'templates/unreleased-page/',
    state: 'candidate',
    familyId: 'future-family',
    cohortId: 'future-cohort',
    firstVerifiedLiveAt: null,
  },
];

test('Publication groups use verified first-live evidence, preserve pending cohorts and classify subpaths by configured site', () => {
  const site = { origin: 'https://openlintel.com', basePath: '/preview/' };
  const groups = publicationGroups(cohortHistory, { ...site, now });
  assert.equal(groups.cohorts['cohort-one'].ageDays, 25);
  assert.deepEqual(groups.cohorts['cohort-one'].landingPaths, [
    '/preview/templates/published-cohort-page/',
  ]);
  assert.equal(groups.cohorts['future-cohort'].status, 'not_released');
  assert.equal(groups.cohorts['future-cohort'].ageDays, null);
  const registry = [{ ...cohortHistory[0], cluster: 'coordinate' }];
  assert.equal(
    classifyPage('https://openlintel.com/preview/templates/published-cohort-page/', registry, site)
      .cohortId,
    'cohort-one',
  );
  assert.equal(
    classifyPage('https://openlintel.com/templates/published-cohort-page/', registry, site).surface,
    'other',
  );
  assert.equal(
    classifyPage(
      'https://openlintel.com.evil.test/preview/templates/published-cohort-page/',
      registry,
      site,
    ).surface,
    'other',
  );
  assert.equal(
    classifyPage('https://other.example/preview/templates/published-cohort-page/', registry, {
      ...site,
      origin: 'https://other.example',
    }).pageId,
    'published-cohort-page',
  );
});

test('Partial release retains pending members and youngest-page age while legacy ages stay unknown', () => {
  const entries = [
    ...cohortHistory,
    {
      ...cohortHistory[0],
      id: 'newer-page',
      path: 'templates/newer-page/',
      firstVerifiedLiveAt: '2026-09-20T00:00:00Z',
    },
    {
      ...cohortHistory[1],
      id: 'pending-sibling',
      cohortId: 'cohort-one',
      familyId: 'selection-procurement',
    },
    {
      id: 'home',
      path: '',
      state: 'legacy',
      cohortId: 'legacy',
      familyId: 'legacy',
      firstVerifiedLiveAt: null,
    },
  ];
  const groups = publicationGroups(entries, { now });
  assert.equal(groups.cohorts['cohort-one'].status, 'partially_released');
  assert.equal(groups.cohorts['cohort-one'].ageDays, 25);
  assert.equal(groups.cohorts['cohort-one'].minimumPageAgeDays, 6);
  assert.equal(groups.cohorts['cohort-one'].urls.length, 2);
  assert.deepEqual(groups.cohorts['cohort-one'].pendingPageIds, ['pending-sibling']);
  assert.equal(groups.cohorts.legacy.status, 'legacy_date_unknown');
  assert.equal(groups.cohorts.legacy.ageDays, null);
  assert.deepEqual(groups.cohorts.legacy.urls, ['https://openlintel.com/']);
  const partiallyDatedLegacy = publicationGroups(
    [
      ...entries,
      {
        id: 'older-page',
        path: 'older-page/',
        state: 'legacy',
        cohortId: 'legacy',
        familyId: 'legacy',
        firstVerifiedLiveAt: '2026-09-01T00:00:00Z',
      },
    ],
    { now },
  );
  assert.equal(partiallyDatedLegacy.cohorts.legacy.ageDays, null);
  assert.equal(partiallyDatedLegacy.cohorts.legacy.minimumPageAgeDays, null);
  assert.equal(partiallyDatedLegacy.cohorts.legacy.firstVerifiedLiveAt, null);
  assert.equal(cohortGscFilters(groups.cohorts['cohort-one'], 'https://www.openlintel.com/'), null);
});

test('Schema3 requests independent family/cohort GSC totals and GA landing-path reports with verified stream filters', async () => {
  const { fetcher, calls } = fixture({
    custom: [
      'page_id',
      'resource_id',
      'resource_format',
      'resource_variant',
      'chapter_id',
      'source_page_id',
    ],
  });
  const result = await collectSearchReport(
    { ...gscEnv, ...gaEnv, MARKETING_BASE_PATH: '/preview/' },
    fetcher,
    now,
    { history: cohortHistory },
  );
  assert.equal(result.schemaVersion, 3);
  assert.equal(result.gsc.cohorts['future-cohort'].status, 'not_released');
  assert.ok(!('segments' in result.gsc.cohorts['future-cohort']));
  assert.equal(result.ga4.cohorts['future-cohort'].status, 'not_released');
  assert.ok(!('reports' in result.ga4.cohorts['future-cohort']));
  assert.equal(
    result.gsc.cohorts['cohort-one'].segments.global.periods.current.totals.status,
    'empty',
  );
  const cohortQueries = calls.filter(
    (call) =>
      call.url.includes('searchAnalytics') &&
      call.body.dimensionFilterGroups?.[0].filters.some((filter) =>
        filter.expression.includes('published-cohort-page'),
      ),
  );
  assert.ok(cohortQueries.some((call) => call.body.dimensions.length === 0));
  for (const { body } of cohortQueries) {
    const pattern = body.dimensionFilterGroups[0].filters.find(
      (filter) => filter.dimension === 'page',
    ).expression;
    assert.ok(
      new RegExp(pattern).test('https://openlintel.com/preview/templates/published-cohort-page/'),
    );
    assert.ok(!new RegExp(pattern).test('https://openlintel.com/templates/published-cohort-page/'));
  }
  const cohortGa = calls.filter(
    (call) =>
      call.url.includes(':runReport') &&
      call.body.dimensionFilter.andGroup.expressions.some(
        (expression) => expression.filter.fieldName === 'landingPage',
      ),
  );
  assert.ok(cohortGa.length);
  for (const { body } of cohortGa) {
    const expressions = body.dimensionFilter.andGroup.expressions;
    assert.deepEqual(
      expressions.find((item) => item.filter.fieldName === 'streamId').filter.inListFilter.values,
      ['456'],
    );
    assert.deepEqual(
      expressions.find((item) => item.filter.fieldName === 'landingPage').filter.inListFilter
        .values,
      ['/preview/templates/published-cohort-page/'],
    );
  }
  const leads = cohortGa.find((call) =>
    call.body.dimensionFilter.andGroup.expressions.some(
      (item) =>
        item.filter.fieldName === 'eventName' &&
        item.filter.inListFilter.values.includes('generate_lead'),
    ),
  );
  assert.ok(leads.body.dimensions.some((dimension) => dimension.name === 'landingPage'));
  const downloads = cohortGa.find((call) =>
    call.body.dimensions.some((dimension) => dimension.name === 'customEvent:resource_id'),
  );
  assert.ok(
    downloads.body.dimensions.some((dimension) => dimension.name === 'customEvent:page_id'),
  );
  assert.ok(!calls.some((call) => JSON.stringify(call.body || {}).includes('unreleased-page')));
});

test('Failed cohort request preserves other cohort tables and the existing provider baseline', async () => {
  const { fetcher } = fixture({
    override: (url, body) =>
      url.includes('searchAnalytics') &&
      !body.dimensions.length &&
      body.dimensionFilterGroups?.[0].filters.some((filter) =>
        filter.expression.includes('published-cohort-page'),
      )
        ? { ok: false, status: 429 }
        : null,
  });
  const result = await collectSearchReport(gscEnv, fetcher, now, { history: cohortHistory });
  assert.equal(result.gsc.status, 'partial');
  assert.equal(result.gsc.periods.current.totals.status, 'empty');
  assert.equal(
    result.gsc.cohorts['cohort-one'].segments.global.periods.current.totals.status,
    'unavailable',
  );
  assert.equal(
    result.gsc.cohorts['cohort-one'].segments.global.periods.current.queryPages.status,
    'empty',
  );
});

test('GSC URL-prefix mismatch preserves property totals without querying incompatible marketing filters', async () => {
  const { fetcher, calls } = fixture({
    override: (url) =>
      url.endsWith('/sites')
        ? ok({
            siteEntry: [{ siteUrl: 'https://www.openlintel.com/', permissionLevel: 'siteOwner' }],
          })
        : null,
  });
  const result = await collectSearchReport(
    { ...gscEnv, OPENLINTEL_GSC_SITE: 'https://www.openlintel.com/' },
    fetcher,
    now,
  );
  assert.equal(result.gsc.periods.current.totals.status, 'empty');
  assert.equal(result.gsc.segments.marketingGlobal.status, 'out_of_scope');
  assert.equal(result.gsc.segments.marketingUS.status, 'out_of_scope');
  assert.ok(!('periods' in result.gsc.segments.marketingGlobal));
  const queries = calls.filter((call) => call.url.includes('searchAnalytics'));
  assert.ok(queries.length);
  assert.ok(queries.every((call) => !call.body.dimensionFilterGroups));
});
