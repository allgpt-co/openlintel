import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { writePrivateReport } from './report-output.mjs';
import { createRegistry, publishedPages } from './registry.mjs';
import {
  REPORT_LIMITS,
  capture,
  classifyPage,
  classifyQuery,
  collectRows,
  rollupSearchRows,
  rollupAcquisition,
  sourceStatus,
} from './search-report-data.mjs';

const DAY = 86_400_000;
const TARGET_HOSTS = ['openlintel.com', 'www.openlintel.com'];
const APP_HOSTS = ['app.openlintel.com'];
const SEARCH_SEGMENTS = {
  propertyGlobal: [],
  marketingGlobal: [
    {
      dimension: 'page',
      operator: 'includingRegex',
      expression: '^https://(www\\.)?openlintel\\.com/',
    },
  ],
  marketingUS: [
    {
      dimension: 'page',
      operator: 'includingRegex',
      expression: '^https://(www\\.)?openlintel\\.com/',
    },
    { dimension: 'country', operator: 'equals', expression: 'usa' },
  ],
  appGlobal: [
    {
      dimension: 'page',
      operator: 'includingRegex',
      expression: '^https://app\\.openlintel\\.com/',
    },
  ],
};

export function comparisonPeriods(now = new Date()) {
  const end = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) - 3 * DAY,
  );
  const date = (offset) => new Date(end.getTime() - offset * DAY).toISOString().slice(0, 10);
  return [
    { name: 'current', startDate: date(27), endDate: date(0) },
    { name: 'previous', startDate: date(55), endDate: date(28) },
  ];
}
export function contextPeriod(now = new Date()) {
  const [{ endDate }] = comparisonPeriods(now);
  return {
    name: 'context90',
    startDate: new Date(Date.parse(endDate) - 89 * DAY).toISOString().slice(0, 10),
    endDate,
  };
}
export function isOpenLintelSite(site) {
  if (site === 'sc-domain:openlintel.com') return true;
  try {
    const u = new URL(site);
    return (
      u.protocol === 'https:' &&
      TARGET_HOSTS.includes(u.hostname) &&
      u.pathname === '/' &&
      !u.search &&
      !u.hash &&
      !u.username &&
      !u.password &&
      !u.port
    );
  } catch {
    return false;
  }
}
function streamHosts(stream) {
  try {
    const u = new URL(stream.webStreamData?.defaultUri || '');
    if (
      u.protocol !== 'https:' ||
      u.pathname !== '/' ||
      u.search ||
      u.hash ||
      u.username ||
      u.password ||
      u.port
    )
      return [];
    return TARGET_HOSTS.includes(u.hostname)
      ? TARGET_HOSTS
      : APP_HOSTS.includes(u.hostname)
        ? APP_HOSTS
        : [];
  } catch {
    return [];
  }
}
export function isOpenLintelStream(stream) {
  return streamHosts(stream).length > 0;
}

async function jsonRequest(url, token, body, fetcher) {
  let response;
  try {
    response = await fetcher(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      method: body ? 'POST' : 'GET',
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: AbortSignal.timeout(30_000),
    });
  } catch {
    throw new Error(
      'Google API request failed or timed out; credentials and response bodies were not logged.',
    );
  }
  if (!response.ok)
    throw new Error(
      `Google API HTTP ${response.status}; check property access, read-only scopes and quota. Response body was not logged.`,
    );
  try {
    return await response.json();
  } catch {
    throw new Error('Google API returned unreadable JSON; response body was not logged.');
  }
}
async function refreshAccessToken(env, fetcher) {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET || !env.GOOGLE_REFRESH_TOKEN) return null;
  let response;
  try {
    response = await fetcher('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: env.GOOGLE_CLIENT_ID,
        client_secret: env.GOOGLE_CLIENT_SECRET,
        refresh_token: env.GOOGLE_REFRESH_TOKEN,
        grant_type: 'refresh_token',
      }),
      signal: AbortSignal.timeout(30_000),
    });
  } catch {
    throw new Error('OAuth refresh failed or timed out; credentials were not logged.');
  }
  if (!response.ok)
    throw new Error(`OAuth refresh HTTP ${response.status}; credentials were not logged.`);
  let result;
  try {
    result = await response.json();
  } catch {
    throw new Error('OAuth refresh returned unreadable JSON.');
  }
  if (!result.access_token) throw new Error('OAuth refresh did not return an access token.');
  return result.access_token;
}

function inspectionUrls(value, site, registry) {
  if (!value) return [];
  const origin = site.startsWith('sc-domain:') ? 'https://openlintel.com/' : site;
  const paths = [
    '',
    'resources/',
    'templates/',
    ...[
      'client-questionnaire',
      'spec-sheet',
      'ffe-schedule',
      'finish-schedule',
      'budget',
      'proposal',
    ].map((id) => registry.find((page) => page.id === id).path),
    ...registry
      .filter((page) => page.kind === 'guide')
      .slice(0, 2)
      .map((page) => page.path),
  ];
  const urls = [
    ...new Set(
      value === 'priority'
        ? paths.map((path) => new URL(path, origin).href)
        : value.split(',').map((url) => url.trim()),
    ),
  ];
  if (urls.length > REPORT_LIMITS.inspections)
    throw new Error(
      `At most ${REPORT_LIMITS.inspections} URL inspections may be requested per run.`,
    );
  for (const value of urls) {
    let u;
    try {
      u = new URL(value);
    } catch {
      throw new Error('Inspection URLs must be valid HTTPS OpenLintel URLs.');
    }
    if (
      u.protocol !== 'https:' ||
      !TARGET_HOSTS.includes(u.hostname) ||
      u.username ||
      u.password ||
      u.port ||
      u.search ||
      u.hash ||
      (!site.startsWith('sc-domain:') && u.origin !== new URL(site).origin) ||
      !registry.some((page) => page.indexable && `/${page.path}` === u.pathname)
    )
      throw new Error(
        'Inspection URLs must be indexable registry pages covered by the selected OpenLintel property.',
      );
  }
  return urls;
}

async function collectGsc({ site, token, periods, context, registry, inspections, fetcher }) {
  if (!token) throw new Error('A read-only Search Console access token is required.');
  const sites = await jsonRequest(
    'https://www.googleapis.com/webmasters/v3/sites',
    token,
    undefined,
    fetcher,
  );
  if (
    !sites.siteEntry?.some(
      (entry) =>
        entry.siteUrl === site &&
        ['siteOwner', 'siteFullUser', 'siteRestrictedUser'].includes(entry.permissionLevel),
    )
  )
    throw new Error('The selected OpenLintel GSC property is not verified and accessible.');
  const endpoint = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(site)}`;
  const source = {
    site,
    timeZone: 'America/Los_Angeles',
    segments: {},
    periods: {},
    daily90: {},
    inspections: { status: 'not_requested' },
  };
  const tables = [];
  for (const [segment, filters] of Object.entries(SEARCH_SEGMENTS)) {
    if (segment === 'appGlobal' && !site.startsWith('sc-domain:')) {
      source.segments[segment] = {
        status: 'out_of_scope',
        reason: 'The selected URL-prefix property does not cover app.openlintel.com.',
      };
      continue;
    }
    const segmentResult = { filters, periods: {} };
    for (const { name, startDate, endDate } of periods) {
      const result = {};
      for (const [key, dimensions] of [
        ['totals', []],
        ['queries', ['query']],
        ['queryPages', ['query', 'page']],
        ['pages', ['page']],
        ['countries', ['country']],
        ['devices', ['device']],
      ]) {
        result[key] = await collectRows(
          (startRow, rowLimit) =>
            jsonRequest(
              `${endpoint}/searchAnalytics/query`,
              token,
              {
                startDate,
                endDate,
                type: 'web',
                dataState: 'final',
                aggregationType: 'auto',
                dimensions,
                startRow,
                rowLimit,
                ...(filters.length
                  ? { dimensionFilterGroups: [{ groupType: 'and', filters }] }
                  : {}),
              },
              fetcher,
            ),
          'gsc',
        );
        tables.push(result[key]);
      }
      result.queryIntent = rollupSearchRows(result.queries, (row) => classifyQuery(row.keys[0]));
      result.contentClusters = rollupSearchRows(
        result.pages,
        (row) => classifyPage(row.keys[0], registry).cluster,
      );
      segmentResult.periods[name] = result;
    }
    segmentResult.daily90 = await collectRows(
      (startRow, rowLimit) =>
        jsonRequest(
          `${endpoint}/searchAnalytics/query`,
          token,
          {
            startDate: context.startDate,
            endDate: context.endDate,
            dimensions: ['date'],
            type: 'web',
            dataState: 'final',
            startRow,
            rowLimit,
            ...(filters.length ? { dimensionFilterGroups: [{ groupType: 'and', filters }] } : {}),
          },
          fetcher,
        ),
      'gsc',
    );
    tables.push(segmentResult.daily90);
    segmentResult.status = sourceStatus([
      ...Object.values(segmentResult.periods).flatMap(Object.values),
      segmentResult.daily90,
    ]);
    source.segments[segment] = segmentResult;
  }
  // Preserve the original independent property-period interface.
  source.periods = source.segments.propertyGlobal.periods;
  source.daily90 = source.segments.propertyGlobal.daily90;
  source.sitemaps = await capture(() =>
    jsonRequest(`${endpoint}/sitemaps`, token, undefined, fetcher),
  );
  tables.push(source.sitemaps);
  if (inspections.length) {
    source.inspections = { status: 'available', urls: {} };
    for (const inspectionUrl of inspections) {
      const result = await capture(() =>
        jsonRequest(
          'https://searchconsole.googleapis.com/v1/urlInspection/index:inspect',
          token,
          {
            inspectionUrl,
            siteUrl: site,
            languageCode: 'en-US',
          },
          fetcher,
        ),
      );
      source.inspections.urls[inspectionUrl] = result;
      tables.push(result);
    }
    source.inspections.status = sourceStatus(Object.values(source.inspections.urls));
  }
  return { ...source, status: sourceStatus(tables) };
}

const names = (values) => values.map((name) => ({ name }));
const inList = (fieldName, values) => ({ filter: { fieldName, inListFilter: { values } } });
const exact = (fieldName, value) => ({
  filter: { fieldName, stringFilter: { matchType: 'EXACT', value } },
});
const and = (...expressions) => ({ andGroup: { expressions } });
const GA_STANDARD = [
  ['overview', [], ['sessions', 'totalUsers', 'engagedSessions', 'keyEvents']],
  [
    'acquisition',
    ['sessionDefaultChannelGroup', 'sessionSourceMedium'],
    ['sessions', 'engagedSessions', 'keyEvents'],
  ],
  ['landingPages', ['landingPage'], ['sessions', 'engagedSessions', 'keyEvents']],
  ['countries', ['country'], ['sessions', 'engagedSessions']],
  ['devices', ['deviceCategory'], ['sessions', 'engagedSessions']],
  ['events', ['eventName'], ['eventCount']],
];
const GA_CUSTOM = [
  ['downloads', ['resource_id', 'resource_format', 'resource_variant'], ['resource_download']],
  ['chapters', ['chapter_id'], ['sample_chapter_view']],
  ['ctaSources', ['source_page_id'], ['pilot_cta_click']],
  ['intakeEvents', ['page_id'], ['pilot_form_start', 'generate_lead']],
];
async function collectGa({ property, token, periods, context, activationDate, fetcher }) {
  if (!token) throw new Error('A read-only Google Analytics access token is required.');
  const admin = `https://analyticsadmin.googleapis.com/v1beta/properties/${property}`;
  const data = `https://analyticsdata.googleapis.com/v1beta/properties/${property}`;
  const streams = [];
  let pageToken = '';
  for (let page = 0; page < 10; page++) {
    const result = await jsonRequest(
      `${admin}/dataStreams?pageSize=200${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ''}`,
      token,
      undefined,
      fetcher,
    );
    streams.push(...(result.dataStreams || []));
    pageToken = result.nextPageToken || '';
    if (!pageToken) break;
  }
  if (pageToken)
    throw new Error(
      'GA4 stream verification exceeded its pagination limit; no report data was queried.',
    );
  const verified = streams.filter(isOpenLintelStream).map((stream) => {
    const id = stream.name?.match(new RegExp(`^properties/${property}/dataStreams/(\\d+)$`))?.[1];
    if (!id) throw new Error('Verified GA4 stream returned no valid stream ID.');
    return { id, hosts: streamHosts(stream) };
  });
  if (!verified.length)
    throw new Error(
      'Selected GA4 property has no verified OpenLintel web stream; refusing to query report data.',
    );
  const adminMetadata = await capture(() => jsonRequest(admin, token, undefined, fetcher));
  const dataMetadata = await capture(() =>
    jsonRequest(`${data}/metadata`, token, undefined, fetcher),
  );
  const dimensions = new Set(
    dataMetadata.data?.dimensions?.map((dimension) => dimension.apiName) || [],
  );
  const source = {
    property,
    streamIds: verified.map((stream) => stream.id),
    timeZone: adminMetadata.data?.timeZone || null,
    currencyCode: adminMetadata.data?.currencyCode || null,
    activationDate: activationDate || null,
    activationDateSource: activationDate ? 'operator_configuration' : 'unavailable',
    metadata: { property: adminMetadata, dimensions: dataMetadata },
    segments: {},
  };
  const tables = [];
  for (const [surface, hosts] of [
    ['marketing', TARGET_HOSTS],
    ['app', APP_HOSTS],
  ]) {
    // Stream and host form a pair. An app stream cannot contaminate marketing reports,
    // and matching a marketing stream does not establish ownership of an app stream.
    const ids = verified
      .filter((stream) => stream.hosts.some((host) => hosts.includes(host)))
      .map((stream) => stream.id);
    if (!ids.length) {
      source.segments[surface] = {
        status: surface === 'app' ? 'not_configured' : 'unavailable',
        reason: 'No matching verified web stream for this surface; no traffic count inferred.',
      };
      if (surface === 'marketing') tables.push(source.segments[surface]);
      continue;
    }
    const base = and(inList('hostName', hosts), inList('streamId', ids));
    const segment = { hosts, streamIds: ids, reports: {} };
    for (const [channel, extra] of [
      ['allChannels', []],
      ['organic', [exact('sessionDefaultChannelGroup', 'Organic Search')]],
      [
        'organicUS',
        [exact('sessionDefaultChannelGroup', 'Organic Search'), exact('countryId', 'US')],
      ],
    ]) {
      const filter = and(...base.andGroup.expressions, ...extra);
      const reports = {};
      const request = (dimensions, metrics, dateRanges = periods, eventNames) =>
        collectRows(
          (offset, limit) =>
            jsonRequest(
              `${data}:runReport`,
              token,
              {
                dateRanges,
                dimensions: names(dimensions),
                metrics: names(metrics),
                offset: String(offset),
                limit: String(limit),
                dimensionFilter: eventNames
                  ? and(...filter.andGroup.expressions, inList('eventName', eventNames))
                  : filter,
                returnPropertyQuota: true,
              },
              fetcher,
            ),
          'ga4',
        );
      for (const [key, dimensions, metrics] of GA_STANDARD) {
        reports[key] = await request(dimensions, metrics);
        tables.push(reports[key]);
      }
      if (channel === 'allChannels') {
        reports.acquisitionCategories = rollupAcquisition(reports.acquisition);
        tables.push(reports.acquisitionCategories);
      }
      reports.daily90 = await request(
        ['date'],
        ['sessions', 'engagedSessions', 'keyEvents'],
        [context],
      );
      tables.push(reports.daily90);
      for (const [key, custom, events] of GA_CUSTOM) {
        const required = custom.map((name) => `customEvent:${name}`);
        const missing = required.filter((name) => !dimensions.has(name));
        reports[key] =
          dataMetadata.status !== 'available'
            ? { status: 'unavailable', reason: 'Custom dimension metadata is unavailable.' }
            : missing.length
              ? {
                  status: 'not_registered',
                  missingDimensions: missing,
                  reason:
                    'Register event-scoped dimensions before relying on this breakdown; historical detail cannot be backfilled.',
                }
              : await request(['eventName', ...required], ['eventCount'], periods, events);
        tables.push(reports[key]);
      }
      segment.reports[channel] = reports;
    }
    segment.status = sourceStatus(Object.values(segment.reports).flatMap(Object.values));
    source.segments[surface] = segment;
  }
  // Existing consumers can continue to locate marketing organic reports here.
  source.reports = source.segments.marketing.reports?.organic || {};
  const dataStatus = sourceStatus(tables);
  return {
    ...source,
    status:
      dataStatus === 'unavailable'
        ? 'unavailable'
        : sourceStatus([...tables, adminMetadata, dataMetadata]),
  };
}

// Ignore generic property IDs in shared environments; verify each explicitly
// selected source before data queries. Provider failures cannot erase siblings.
export async function collectSearchReport(env = process.env, fetcher = fetch, now = new Date()) {
  const site = env.OPENLINTEL_GSC_SITE;
  const property = env.OPENLINTEL_GA4_PROPERTY_ID?.replace(/^properties\//, '');
  if (!site && !property)
    throw new Error(
      'Set OPENLINTEL_GSC_SITE and/or OPENLINTEL_GA4_PROPERTY_ID after verifying ownership. Generic environment properties are deliberately ignored.',
    );
  const project = JSON.parse(
    await readFile(new URL('./data/project.json', import.meta.url), 'utf8'),
  );
  const registry = publishedPages(createRegistry(project));
  const periods = comparisonPeriods(now);
  const context = contextPeriod(now);
  const needsRefresh =
    (site && !env.OPENLINTEL_GSC_ACCESS_TOKEN) || (property && !env.OPENLINTEL_GA_ACCESS_TOKEN);
  const refreshed = needsRefresh ? await capture(() => refreshAccessToken(env, fetcher)) : {};
  const report = {
    schemaVersion: 2,
    generatedAt: now.toISOString(),
    periods,
    contextPeriod: context,
    target: 'openlintel.com',
    limits: REPORT_LIMITS,
    caveats: [
      'Unavailable data is not zero. Empty rows mean the provider returned no rows for these filters, not proof of no activity.',
      'GSC final-data windows end three UTC days before execution. GSC dates use Pacific Time; GA4 dates use its property timezone.',
      'GSC pagination yields bounded top rows and omits anonymized queries. Request totals independently; never sum query rows to reproduce totals.',
      'GSC page-filtered totals aggregate by page and may differ from property totals. Segments overlap and must not be added together.',
      'GA4 metadata retains thresholding, sampling, data-loss and timezone signals for each returned page. Successful pagination does not remove privacy suppression.',
      'Only verified stream/hostname pairs are reported. An app without its own matching verified stream is not configured for reporting; it has no inferred zero traffic count.',
      'Search clicks and consented GA4 sessions measure different things. GA4 activation is operator-reported and historical missing collection cannot be recovered.',
      'Spaced open lintel queries are ambiguous and require manual review; cluster and intent summaries cover returned rows only.',
      'Downloads and accepted submissions are microconversions, not qualified or completed conversations. Use the private studio outcome report for business outcomes.',
      'Generative AI impressions require a separate available export and overlap Web search; do not add them to Web totals.',
      'AI-referral categories use only bounded all-channel source/medium rows and exact allowlisted referral domains. They remain separate from Google organic and do not identify every AI-assisted discovery.',
    ],
  };
  for (const [key, configured, operation] of [
    [
      'gsc',
      site,
      async () => {
        if (!isOpenLintelSite(site))
          throw new Error('GSC property must be the OpenLintel domain or its HTTPS root URL.');
        const token = env.OPENLINTEL_GSC_ACCESS_TOKEN || refreshed.data || env.GSC_ACCESS_TOKEN;
        if (!token && refreshed.reason) throw new Error(refreshed.reason);
        return collectGsc({
          site,
          token,
          periods,
          context,
          registry,
          inspections: inspectionUrls(env.OPENLINTEL_INSPECT_URLS, site, registry),
          fetcher,
        });
      },
    ],
    [
      'ga4',
      property,
      async () => {
        if (!/^\d+$/.test(property))
          throw new Error('GA4 property ID must be numeric (not a G- measurement ID).');
        const token = env.OPENLINTEL_GA_ACCESS_TOKEN || refreshed.data || env.GA_ACCESS_TOKEN;
        if (!token && refreshed.reason) throw new Error(refreshed.reason);
        const activationDate = env.OPENLINTEL_GA4_ACTIVATED_AT;
        if (
          activationDate &&
          (!/^\d{4}-\d{2}-\d{2}$/.test(activationDate) ||
            !Number.isFinite(Date.parse(activationDate)) ||
            new Date(activationDate).toISOString().slice(0, 10) !== activationDate)
        )
          throw new Error('GA4 activation date must be an actual date in YYYY-MM-DD format.');
        return collectGa({ property, token, periods, context, activationDate, fetcher });
      },
    ],
  ]) {
    if (!configured) report[key] = { status: 'not_configured' };
    else {
      const result = await capture(operation);
      report[key] = result.data || result;
    }
  }
  report.status = [report.gsc, report.ga4].every((source) =>
    ['unavailable', 'not_configured'].includes(source.status),
  )
    ? 'unavailable'
    : sourceStatus([report.gsc, report.ga4]);
  return report;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    if (process.argv.includes('--help')) {
      console.log(
        'OPENLINTEL_GSC_SITE=sc-domain:openlintel.com OPENLINTEL_GA4_PROPERTY_ID=<numeric-id> node apps/marketing/search-report.mjs [--out output/seo/search-report.json]\nOptional: OPENLINTEL_INSPECT_URLS=priority (or up to 15 registered URLs separated by commas), OPENLINTEL_GA4_ACTIVATED_AT=YYYY-MM-DD. Read-only verified-property reports; credentials stay in environment. No sitemap submission or indexing requests.',
      );
    } else {
      const index = process.argv.indexOf('--out');
      if (index !== -1 && !process.argv[index + 1]) throw new Error('--out requires a path.');
      const output = resolve(
        index !== -1 ? process.argv[index + 1] : 'output/seo/search-report.json',
      );
      const report = await collectSearchReport();
      await writePrivateReport(output, report);
      console.log(
        `Saved ${report.status} report to ${output}. GSC: ${report.gsc.status}; GA4: ${report.ga4.status}. No business attribution was inferred.`,
      );
      if (report.status !== 'available') process.exitCode = 1;
    }
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
