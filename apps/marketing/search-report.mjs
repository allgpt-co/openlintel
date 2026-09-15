import { resolve } from 'node:path';
import { writePrivateReport } from './report-output.mjs';
import { pathToFileURL } from 'node:url';

const DAY = 86_400_000;
const TARGET_HOSTS = new Set(['openlintel.com', 'www.openlintel.com']);
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
export function isOpenLintelSite(site) {
  if (site === 'sc-domain:openlintel.com') return true;
  try {
    const u = new URL(site);
    return (
      u.protocol === 'https:' &&
      TARGET_HOSTS.has(u.hostname) &&
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
export function isOpenLintelStream(stream) {
  return isOpenLintelSite(stream.webStreamData?.defaultUri || '');
}

async function jsonRequest(url, token, body, fetcher = fetch) {
  const response = await fetcher(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    method: body ? 'POST' : 'GET',
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok)
    throw new Error(
      `Google API HTTP ${response.status}; check property access and read-only OAuth scopes. No token or response body has been logged.`,
    );
  return response.json();
}
async function refreshAccessToken(env, fetcher) {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET || !env.GOOGLE_REFRESH_TOKEN) return null;
  const response = await fetcher('https://oauth2.googleapis.com/token', {
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
  if (!response.ok)
    throw new Error(`OAuth refresh HTTP ${response.status}; credentials were not logged.`);
  const result = await response.json();
  if (!result.access_token) throw new Error('OAuth refresh did not return an access token.');
  return result.access_token;
}

// Explicit OpenLintel-only configuration prevents silently reporting on unrelated
// GA_PROPERTY_ID / GSC_SITE_URL values present in a shared agent environment.
export async function collectSearchReport(env = process.env, fetcher = fetch) {
  const site = env.OPENLINTEL_GSC_SITE;
  const property = env.OPENLINTEL_GA4_PROPERTY_ID?.replace(/^properties\//, '');
  if (!site && !property)
    throw new Error(
      'Set OPENLINTEL_GSC_SITE and/or OPENLINTEL_GA4_PROPERTY_ID after verifying ownership. Generic environment properties are deliberately ignored.',
    );
  if (site && !isOpenLintelSite(site))
    throw new Error('GSC property must be the OpenLintel domain or its HTTPS root URL.');
  if (property && !/^\d+$/.test(property))
    throw new Error('GA4 property ID must be numeric (not a G- measurement ID).');
  const explicitGsc = env.OPENLINTEL_GSC_ACCESS_TOKEN;
  const explicitGa = env.OPENLINTEL_GA_ACCESS_TOKEN;
  const needsRefresh = (site && !explicitGsc) || (property && !explicitGa);
  const refreshed = needsRefresh ? await refreshAccessToken(env, fetcher) : null;
  const gscToken = explicitGsc || refreshed || env.GSC_ACCESS_TOKEN;
  const gaToken = explicitGa || refreshed || env.GA_ACCESS_TOKEN;
  const periods = comparisonPeriods();
  const report = {
    generatedAt: new Date().toISOString(),
    periods,
    target: 'openlintel.com',
    caveats: [
      'Only verified matching properties are queried. Unavailable data is not zero.',
      'GSC periods use final data and end three UTC days before execution; GSC dates use Pacific Time, GA4 uses its property timezone.',
      'Query/page rows are bounded top rows and omit anonymized queries; do not sum them to reproduce property totals.',
      'Search clicks and observed consenting-user GA4 sessions are different measures.',
      'Downloads and accepted submissions are microconversions, not qualified or completed discovery conversations.',
      'The Generative AI report must be exported separately when available; its impressions overlap Web search.',
    ],
  };
  if (site) {
    if (!gscToken) throw new Error('A read-only Search Console access token is required.');
    const sites = await jsonRequest(
      'https://www.googleapis.com/webmasters/v3/sites',
      gscToken,
      undefined,
      fetcher,
    );
    if (
      !sites.siteEntry?.some(
        (entry) => entry.siteUrl === site && entry.permissionLevel !== 'siteUnverifiedUser',
      )
    )
      throw new Error('The selected OpenLintel GSC property is not verified and accessible.');
    report.gsc = { site, periods: {} };
    const endpoint = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(site)}`;
    for (const { name, startDate, endDate } of periods) {
      const common = { startDate, endDate, type: 'web', dataState: 'final', rowLimit: 1000 };
      const result = {};
      for (const [key, dimensions] of [
        ['totals', []],
        ['queryPages', ['query', 'page']],
        ['pages', ['page']],
        ['countries', ['country']],
        ['devices', ['device']],
      ]) {
        result[key] = await jsonRequest(
          `${endpoint}/searchAnalytics/query`,
          gscToken,
          { ...common, dimensions },
          fetcher,
        );
      }
      report.gsc.periods[name] = result;
    }
    report.gsc.sitemaps = await jsonRequest(`${endpoint}/sitemaps`, gscToken, undefined, fetcher);
  }
  if (property) {
    if (!gaToken) throw new Error('A read-only Google Analytics access token is required.');
    const admin = `https://analyticsadmin.googleapis.com/v1beta/properties/${property}`;
    const streams = [];
    let pageToken = '';
    do {
      const result = await jsonRequest(
        `${admin}/dataStreams?pageSize=200${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ''}`,
        gaToken,
        undefined,
        fetcher,
      );
      streams.push(...(result.dataStreams || []));
      pageToken = result.nextPageToken || '';
    } while (pageToken);
    const matchingStreams = streams.filter(isOpenLintelStream);
    if (!matchingStreams.length)
      throw new Error(
        'Selected GA4 property has no verified OpenLintel web stream; refusing to query report data.',
      );
    const streamIds = matchingStreams.map((stream) => {
      const match = stream.name?.match(new RegExp(`^properties/${property}/dataStreams/(\\d+)$`));
      if (!match) throw new Error('Verified GA4 stream returned no valid stream ID.');
      return match[1];
    });
    const streamFilter = {
      filter: { fieldName: 'streamId', inListFilter: { values: streamIds } },
    };
    const metadata = await jsonRequest(admin, gaToken, undefined, fetcher);
    const hostnameFilter = {
      filter: { fieldName: 'hostName', inListFilter: { values: [...TARGET_HOSTS] } },
    };
    const organic = {
      andGroup: {
        expressions: [
          hostnameFilter,
          streamFilter,
          {
            filter: {
              fieldName: 'sessionDefaultChannelGroup',
              stringFilter: { matchType: 'EXACT', value: 'Organic Search' },
            },
          },
        ],
      },
    };
    const endpoint = `https://analyticsdata.googleapis.com/v1beta/properties/${property}:runReport`;
    const common = { dateRanges: periods, limit: '1000', dimensionFilter: organic };
    report.ga4 = {
      property,
      streamIds,
      timeZone: metadata.timeZone,
      currencyCode: metadata.currencyCode,
      reports: {},
    };
    for (const [key, dimensions, metrics] of [
      ['overview', [], ['sessions', 'totalUsers', 'engagedSessions', 'keyEvents']],
      ['landingPages', ['landingPage'], ['sessions', 'engagedSessions', 'keyEvents']],
      ['countries', ['country'], ['sessions', 'engagedSessions']],
      ['devices', ['deviceCategory'], ['sessions', 'engagedSessions']],
      ['events', ['eventName'], ['eventCount']],
    ]) {
      report.ga4.reports[key] = await jsonRequest(
        endpoint,
        gaToken,
        {
          ...common,
          dimensions: dimensions.map((name) => ({ name })),
          metrics: metrics.map((name) => ({ name })),
        },
        fetcher,
      );
    }
  }
  return report;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    if (process.argv.includes('--help')) {
      console.log(
        'OPENLINTEL_GSC_SITE=sc-domain:openlintel.com OPENLINTEL_GA4_PROPERTY_ID=<numeric-id> node apps/marketing/search-report.mjs [--out output/seo/search-report.json]\nRead-only verified-property reports. Credentials stay in environment; no write API or sitemap submission.',
      );
    } else {
      const report = await collectSearchReport();
      const index = process.argv.indexOf('--out');
      if (index !== -1 && !process.argv[index + 1]) throw new Error('--out requires a path.');
      const output = resolve(
        index !== -1 ? process.argv[index + 1] : 'output/seo/search-report.json',
      );
      await writePrivateReport(output, report);
      console.log(
        `Saved verified-property report to ${output}. No business-outcome attribution was inferred.`,
      );
    }
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
