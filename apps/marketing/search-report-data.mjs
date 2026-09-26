// Pure reporting helpers keep provider limits and derived data explicit.
import { config } from './config.mjs';
export const REPORT_LIMITS = { pageSize: 1000, maxPages: 5, inspections: 15 };

export function classifyQuery(query) {
  const value = String(query).trim().toLowerCase();
  if (/\bopenlintel\b|\bopenlintel\.com\b/.test(value)) return 'brand';
  // Spaced wording can refer to an architectural opening; require human review.
  if (/\bopen[\s-]+lintel\b/.test(value)) return 'ambiguous';
  return 'nonbrand';
}

export function classifyPage(
  value,
  registry,
  { origin = config.origin, basePath = config.base } = {},
) {
  try {
    const page = new URL(value);
    if (page.hostname === 'app.openlintel.com') return { surface: 'app', cluster: 'app' };
    if (page.origin !== new URL(origin).origin) return { surface: 'other', cluster: 'unmapped' };
    const base = `/${basePath.replace(/^\/+|\/+$/g, '')}/`.replace('//', '/');
    if (!page.pathname.startsWith(base)) return { surface: 'other', cluster: 'unmapped' };
    const record = registry.find((item) => `${base}${item.path}` === page.pathname);
    return {
      surface: 'marketing',
      pageId: record?.id || null,
      cluster: record?.cluster || record?.kind || 'unmapped',
      familyId: record?.familyId || null,
      cohortId: record?.cohortId || null,
    };
  } catch {
    return { surface: 'unknown', cluster: 'unmapped' };
  }
}

export function publicationGroups(
  entries,
  { origin = config.origin, basePath = config.base, now = new Date() } = {},
) {
  const result = { families: {}, cohorts: {} };
  for (const [kind, field] of [
    ['families', 'familyId'],
    ['cohorts', 'cohortId'],
  ]) {
    for (const entry of entries) {
      if (!entry[field]) continue;
      (result[kind][entry[field]] ||= { id: entry[field], pages: [] }).pages.push(entry);
    }
    for (const group of Object.values(result[kind])) {
      const released = group.pages.filter(
        (page) =>
          page.state !== 'candidate' &&
          (page.cohortId === 'legacy' ||
            (['published', 'retired'].includes(page.state) &&
              page.firstVerifiedLiveAt &&
              Date.parse(page.firstVerifiedLiveAt) <= now.getTime())),
      );
      const times =
        group.id === 'legacy'
          ? []
          : released.map((page) => Date.parse(page.firstVerifiedLiveAt)).filter(Number.isFinite);
      group.status =
        group.id === 'legacy'
          ? 'legacy_date_unknown'
          : !released.length
            ? 'not_released'
            : released.length === group.pages.length
              ? 'released'
              : 'partially_released';
      group.pageIds = group.pages.map((page) => page.id);
      group.pendingPageIds = group.pages
        .filter((page) => !released.includes(page))
        .map((page) => page.id);
      group.urls = released.map(
        (page) => new URL(`${basePath.replace(/\/?$/, '/')}${page.path}`, origin).href,
      );
      group.landingPaths = group.urls.map((url) => new URL(url).pathname);
      group.firstVerifiedLiveAt = times.length ? new Date(Math.min(...times)).toISOString() : null;
      group.ageDays = times.length
        ? Math.floor((now.getTime() - Math.min(...times)) / 86_400_000)
        : null;
      group.minimumPageAgeDays = times.length
        ? Math.floor((now.getTime() - Math.max(...times)) / 86_400_000)
        : null;
      delete group.pages;
    }
  }
  return result;
}

export function cohortGscFilters(group, site, us = false) {
  if (
    !site.startsWith('sc-domain:') &&
    group.urls.some((url) => !url.startsWith(site.endsWith('/') ? site : `${site}/`))
  )
    return null;
  const escape = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const expression = `^(?:${group.urls.map(escape).join('|')})$`;
  if (expression.length > 4096)
    throw new Error(
      'Cohort URL filter exceeds the Google expression limit; split the reporting cohort.',
    );
  return [
    { dimension: 'page', operator: 'includingRegex', expression },
    ...(us ? [{ dimension: 'country', operator: 'equals', expression: 'usa' }] : []),
  ];
}

export function rollupSearchRows(table, keyForRow) {
  if (!table.rows) return { status: 'unavailable', reason: 'Source rows are unavailable.' };
  const groups = new Map();
  for (const row of table.rows) {
    const key = keyForRow(row);
    const value = groups.get(key) || { key, clicks: 0, impressions: 0, positionWeight: 0 };
    value.clicks += row.clicks;
    value.impressions += row.impressions;
    value.positionWeight += row.position * row.impressions;
    groups.set(key, value);
  }
  return {
    status: table.status,
    basis: 'Returned source rows only; not independent property totals.',
    completeness: table.completeness,
    rows: [...groups.values()].map(({ positionWeight, ...value }) => ({
      ...value,
      ctr: value.impressions ? value.clicks / value.impressions : null,
      position: value.impressions ? positionWeight / value.impressions : null,
    })),
  };
}

// Bounded pagination retains earlier pages when a later request fails. GSC does
// not expose a full row count; reaching our cap is a possible truncation.
export async function collectRows(request, provider, limits = REPORT_LIMITS) {
  const rows = [];
  let response = {};
  let expectedTotal = null;
  const pageMetadata = [];
  for (let page = 0; page < limits.maxPages; page++) {
    try {
      response = await request(page * limits.pageSize, limits.pageSize);
    } catch (error) {
      return {
        status: page ? 'partial' : 'unavailable',
        reason: error.message,
        ...(page ? { rows } : {}),
        completeness: { complete: false, reason: 'request_failed', pagesRead: page },
        pageMetadata,
      };
    }
    const incoming = response.rows || [];
    rows.push(...incoming);
    if (response.metadata) pageMetadata.push(response.metadata);
    const total =
      provider === 'ga4' &&
      response.rowCount !== undefined &&
      response.rowCount !== null &&
      response.rowCount !== '' &&
      Number.isInteger(Number(response.rowCount)) &&
      Number(response.rowCount) >= 0
        ? Number(response.rowCount)
        : null;
    const knownTotal = total ?? expectedTotal;
    if (
      provider === 'ga4' &&
      knownTotal !== null &&
      ((expectedTotal !== null && total !== null && total !== expectedTotal) ||
        rows.length > knownTotal ||
        (incoming.length < limits.pageSize && rows.length < knownTotal))
    ) {
      return {
        ...response,
        rows,
        status: 'partial',
        completeness: {
          complete: false,
          reason: 'response_row_count_mismatch',
          pagesRead: page + 1,
          totalRows: knownTotal,
        },
        pageMetadata,
      };
    }
    if (total !== null) expectedTotal = total;
    const exhausted =
      provider === 'ga4' && expectedTotal !== null
        ? rows.length === expectedTotal
        : incoming.length < limits.pageSize;
    if (exhausted || page === limits.maxPages - 1) {
      const limited = !exhausted;
      return {
        ...response,
        rows,
        status:
          limited || (provider === 'ga4' && expectedTotal === null)
            ? 'partial'
            : rows.length
              ? 'available'
              : 'empty',
        completeness: {
          complete: provider === 'ga4' && expectedTotal !== null ? !limited : null,
          reason: limited
            ? 'row_cap_reached'
            : provider === 'gsc'
              ? 'provider_top_rows_only'
              : expectedTotal === null
                ? 'row_count_unavailable'
                : 'returned_row_count',
          pagesRead: page + 1,
          rowCap: limits.maxPages * limits.pageSize,
          ...(provider === 'ga4' ? { totalRows: expectedTotal } : {}),
        },
        pageMetadata,
      };
    }
  }
}

export async function capture(operation) {
  try {
    return { status: 'available', data: await operation() };
  } catch (error) {
    return { status: 'unavailable', reason: error.message };
  }
}

export function sourceStatus(tables) {
  const required = tables.filter(
    (table) =>
      !['not_configured', 'not_requested', 'out_of_scope', 'not_released'].includes(table.status),
  );
  if (
    !required.length ||
    (required.some((table) => table.status === 'unavailable') &&
      required.every((table) => ['unavailable', 'not_registered'].includes(table.status)))
  )
    return 'unavailable';
  return required.some((table) =>
    ['unavailable', 'partial', 'not_registered'].includes(table.status),
  )
    ? 'partial'
    : 'available';
}

const AI_REFERRERS = {
  'chatgpt.com': 'chatgpt',
  'chat.openai.com': 'chatgpt',
  'perplexity.ai': 'perplexity',
  'claude.ai': 'claude',
  'gemini.google.com': 'gemini',
  'copilot.microsoft.com': 'copilot',
};

export function categorizeAcquisition(channel, sourceMedium) {
  const parts = String(sourceMedium || '')
    .toLowerCase()
    .split(' / ');
  const [source, medium] = parts;
  if (
    parts.length !== 2 ||
    !source ||
    !medium ||
    ['(not set)', '(data not available)'].includes(source) ||
    medium === '(not set)'
  )
    return { category: 'unknown', provider: null };
  const host = source.replace(/^www\./, '');
  if (AI_REFERRERS[host] && medium === 'referral')
    return { category: 'ai_referral', provider: AI_REFERRERS[host] };
  if (AI_REFERRERS[host]) return { category: 'unknown', provider: null };
  if (channel === 'Organic Search' && source === 'google' && medium === 'organic')
    return { category: 'google_organic', provider: 'google' };
  return { category: 'other_or_unclassified', provider: null };
}

export function rollupAcquisition(table) {
  if (!table.rows) return { status: 'unavailable', reason: 'Acquisition rows are unavailable.' };
  const dimensions = table.dimensionHeaders?.map((header) => header.name) || [];
  const metrics = table.metricHeaders?.map((header) => header.name) || [];
  const requiredDimensions = ['sessionDefaultChannelGroup', 'sessionSourceMedium', 'dateRange'];
  const requiredMetrics = ['sessions', 'engagedSessions', 'keyEvents'];
  if (
    table.rows.length &&
    (requiredDimensions.some((name) => !dimensions.includes(name)) ||
      requiredMetrics.some((name) => !metrics.includes(name)))
  )
    return {
      status: 'unavailable',
      reason: 'Acquisition response lacks required headings or comparison-period identity.',
    };
  const groups = new Map();
  let invalidRows = 0;
  for (const row of table.rows) {
    const dimension = (name) => row.dimensionValues?.[dimensions.indexOf(name)]?.value;
    const metricValues = requiredMetrics.map(
      (name) => row.metricValues?.[metrics.indexOf(name)]?.value,
    );
    if (
      !dimension('dateRange') ||
      metricValues.some(
        (value) => value === undefined || value === '' || !Number.isFinite(Number(value)),
      )
    ) {
      invalidRows++;
      continue;
    }
    const category = categorizeAcquisition(
      dimension('sessionDefaultChannelGroup'),
      dimension('sessionSourceMedium'),
    );
    const key = JSON.stringify([dimension('dateRange'), category.category, category.provider]);
    const value = groups.get(key) || {
      period: dimension('dateRange'),
      ...category,
      sessions: 0,
      engagedSessions: 0,
      keyEvents: 0,
      sourceRows: 0,
    };
    requiredMetrics.forEach((name, index) => {
      value[name] += Number(metricValues[index]);
    });
    value.sourceRows++;
    groups.set(key, value);
  }
  return {
    status: invalidRows ? 'partial' : table.status,
    basis:
      'Derived from bounded all-channel source/medium rows; periods remain separate and missing categories have no inferred zero.',
    caveat:
      'Only exact allowlisted AI domains with referral medium are identified. Unknown and other_or_unclassified rows remain separate; this does not measure all AI discovery or Google AI search features.',
    completeness: table.completeness,
    pageMetadata: table.pageMetadata,
    invalidRows,
    rows: [...groups.values()],
  };
}
