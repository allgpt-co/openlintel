import { readFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { writePrivateReport } from './report-output.mjs';
import { createRegistry, publishedPages } from './registry.mjs';

const SOURCES = new Set(['google', 'bing', 'duckduckgo', 'yahoo', 'brave']);
const LABELS = ['observed_organic_sourced', 'self_reported_organic', 'unknown', 'mixed'];
const LANDING_PAGES = new Set(
  publishedPages(
    createRegistry(
      JSON.parse(readFileSync(new URL('./data/project.json', import.meta.url), 'utf8')),
    ),
  ).map((page) => page.id.replace(/\/+$/, '').replaceAll('/', '-')),
);
const DAY = 86_400_000;
function coherentAcquisition(channel, provider) {
  if (channel === 'organic-search') return SOURCES.has(provider);
  if (channel === 'direct') return provider === 'none';
  if (channel === 'ai-referral') return provider === 'ai-assistant';
  if (channel === 'referral') return provider === 'other';
  return (
    ['paid-search', 'paid-social', 'email', 'social'].includes(channel) && provider === 'campaign'
  );
}

function timestamp(value) {
  if (
    typeof value !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value)
  )
    return null;
  const number = Date.parse(value);
  if (!Number.isFinite(number)) return null;
  const day = value.slice(0, 10);
  if (new Date(day).toISOString().slice(0, 10) !== day) return null;
  return number;
}
function evidenceFor(record) {
  let evidence;
  try {
    evidence = JSON.parse(record.source_evidence);
  } catch {
    evidence = null;
  }
  const firstKnown = record.first_known_at;
  const validDate =
    typeof firstKnown === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(firstKnown) &&
    Number.isFinite(Date.parse(firstKnown)) &&
    new Date(firstKnown).toISOString().slice(0, 10) === firstKnown;
  const received = timestamp(record.received_at);
  const evidenceAge = validDate && received !== null ? received - Date.parse(firstKnown) : null;
  const validEvidence =
    evidenceAge !== null &&
    evidenceAge >= 0 &&
    evidenceAge < 90 * DAY &&
    evidence?.first_known_date === firstKnown &&
    LANDING_PAGES.has(evidence?.landing_page) &&
    typeof evidence?.organic_assisted === 'boolean' &&
    coherentAcquisition(evidence?.channel, evidence?.provider) &&
    evidence?.channel === record.observed_medium &&
    evidence?.provider === record.observed_source &&
    (!record.landing_page_id || record.landing_page_id === evidence.landing_page);
  const observed =
    validEvidence &&
    record.attribution_classification === 'observed_organic_sourced' &&
    record.observed_medium === 'organic-search' &&
    SOURCES.has(record.observed_source) &&
    evidence?.channel === 'organic-search' &&
    evidence?.provider === record.observed_source;
  const selfReported =
    record.attribution_classification === 'self_reported_organic' &&
    Boolean(record.self_reported_source?.trim());
  return {
    label: observed
      ? 'observed_organic_sourced'
      : selfReported
        ? 'self_reported_organic'
        : 'unknown',
    assisted:
      validEvidence &&
      [true, 'true'].includes(record.organic_assisted) &&
      evidence?.organic_assisted === true,
  };
}

export function parseRegisterCsv(text) {
  const lines = [];
  let row = [],
    field = '',
    quoted = false,
    closed = false;
  for (let index = 0; index < text.length; index++) {
    const char = text[index];
    if (quoted) {
      if (char === '"' && text[index + 1] === '"') {
        field += '"';
        index++;
      } else if (char === '"') {
        quoted = false;
        closed = true;
      } else field += char;
    } else if (char === '"' && !field && !closed) quoted = true;
    else if (char === ',') {
      row.push(field);
      field = '';
      closed = false;
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && text[index + 1] === '\n') index++;
      row.push(field);
      if (row.some((value) => value !== '')) lines.push(row);
      row = [];
      field = '';
      closed = false;
    } else {
      if (closed || char === '"')
        throw new Error('Malformed CSV quoting; input contents were not logged.');
      field += char;
    }
  }
  if (quoted) throw new Error('Unclosed CSV field; input contents were not logged.');
  row.push(field);
  if (row.some((value) => value !== '')) lines.push(row);
  const headers = lines.shift() || [];
  if (
    !headers.includes('studio_id') ||
    !headers.includes('lead_id') ||
    new Set(headers).size !== headers.length
  )
    throw new Error('Register needs unique column names including lead_id and studio_id.');
  return lines.map((values) => {
    if (values.length !== headers.length)
      throw new Error(
        'Register row width does not match its header; input contents were not logged.',
      );
    return Object.fromEntries(headers.map((name, index) => [name, values[index]]));
  });
}

export function aggregateStudioOutcomes(records, { startDate, endDate, now = new Date() }) {
  for (const value of [startDate, endDate]) {
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(value || '') ||
      !Number.isFinite(Date.parse(value)) ||
      new Date(value).toISOString().slice(0, 10) !== value
    )
      throw new Error('Outcome dates must be actual YYYY-MM-DD dates.');
  }
  if (startDate > endDate) throw new Error('Outcome start date must not follow its end date.');
  if (!Array.isArray(records)) throw new Error('Register JSON must be an array of records.');
  const start = Date.parse(startDate),
    end = Date.parse(endDate) + 86_400_000;
  const inPeriod = (value) =>
    value !== null && value >= start && value < end && value <= now.getTime();
  const diagnostics = {
    duplicateLeadRows: 0,
    conflictingLeadIds: 0,
    invalidReceipts: 0,
    missingStudioIds: 0,
    invalidQualification: 0,
    invalidCompletion: 0,
    missingPilotDecisionTimestamp: 0,
    unsupportedAttribution: 0,
    conflictingStudioAttribution: 0,
  };
  const byLead = new Map();
  const conflicts = new Set();
  for (const record of records) {
    if (!record || typeof record !== 'object' || !record.lead_id?.trim()) {
      diagnostics.invalidReceipts++;
      continue;
    }
    if (byLead.has(record.lead_id)) {
      diagnostics.duplicateLeadRows++;
      if (JSON.stringify(byLead.get(record.lead_id)) !== JSON.stringify(record))
        conflicts.add(record.lead_id);
    } else byLead.set(record.lead_id, record);
  }
  diagnostics.conflictingLeadIds = conflicts.size;
  let acceptedRequests = 0,
    invalidRequests = 0;
  const stages = {
    qualified: new Set(),
    scheduled: new Set(),
    completed: new Set(),
    pilotDecisions: new Set(),
  };
  const studioEvidence = new Map();
  for (const [id, record] of byLead) {
    if (conflicts.has(id)) continue;
    const received = timestamp(record.received_at);
    if (received === null || received > now.getTime()) {
      diagnostics.invalidReceipts++;
      continue;
    }
    if (record.status === 'spam') {
      if (inPeriod(received)) invalidRequests++;
      continue;
    }
    if (inPeriod(received)) acceptedRequests++;
    if (!record.studio_id?.trim()) {
      diagnostics.missingStudioIds++;
      continue;
    }
    const studio = record.studio_id.trim();
    // Reconcile all receipt-backed contacts through the reporting window, including
    // earlier contacts without qualifications or completions. A later organic visit
    // cannot silently replace an unknown initial source for the same studio.
    if (received < end) {
      const evidence = evidenceFor(record);
      if (
        (record.attribution_classification &&
          record.attribution_classification !== 'unknown' &&
          evidence.label === 'unknown' &&
          record.attribution_classification !== 'organic_assisted') ||
        ([true, 'true'].includes(record.organic_assisted) && !evidence.assisted)
      )
        diagnostics.unsupportedAttribution++;
      const value = studioEvidence.get(studio) || { labels: new Set(), assisted: false };
      value.labels.add(evidence.label);
      value.assisted ||= evidence.assisted;
      studioEvidence.set(studio, value);
    }
    const qualified = timestamp(record.qualified_at);
    const qualificationValid =
      qualified !== null &&
      qualified >= received &&
      qualified <= now.getTime() &&
      Boolean(record.qualification_note?.trim()) &&
      record.status !== 'not_qualified';
    if (!qualificationValid) {
      if (record.qualified_at || record.completed_at) diagnostics.invalidQualification++;
      continue;
    }
    if (inPeriod(qualified)) stages.qualified.add(studio);
    const scheduled = timestamp(record.scheduled_at);
    if (scheduled !== null && scheduled >= qualified && inPeriod(scheduled))
      stages.scheduled.add(studio);
    const completion = timestamp(record.completed_at);
    if (
      record.completed_at &&
      (completion === null || completion < qualified || completion > now.getTime())
    )
      diagnostics.invalidCompletion++;
    if (completion !== null && completion >= qualified && inPeriod(completion)) {
      stages.completed.add(studio);
    }
    const decision = timestamp(record.pilot_decision_at);
    if (record.pilot_decision && decision === null) diagnostics.missingPilotDecisionTimestamp++;
    if (
      record.pilot_decision?.trim() &&
      decision !== null &&
      completion !== null &&
      completion >= qualified &&
      decision >= completion &&
      inPeriod(decision)
    )
      stages.pilotDecisions.add(studio);
  }
  const classifications = Object.fromEntries(LABELS.map((label) => [label, 0]));
  let organicAssisted = 0;
  for (const studioId of stages.completed) {
    const studio = studioEvidence.get(studioId);
    const label = studio.labels.size === 1 ? [...studio.labels][0] : 'mixed';
    classifications[label]++;
    if (studio.assisted) organicAssisted++;
  }
  diagnostics.conflictingStudioAttribution = classifications.mixed;
  return {
    schemaVersion: 1,
    generatedAt: now.toISOString(),
    period: { startDate, endDate, timeZone: 'UTC' },
    status: Object.values(diagnostics).some(Boolean) ? 'needs_review' : 'available',
    acceptedRequests,
    invalidRequests,
    distinctStudios: Object.fromEntries(
      Object.entries(stages).map(([key, value]) => [key, value.size]),
    ),
    completedConversationAttribution: classifications,
    observedOrganicQualifiedCompletedStudios: classifications.observed_organic_sourced,
    organicAssistedCompletedStudios: organicAssisted,
    organicEvidenceCoverageRate: stages.completed.size
      ? (classifications.observed_organic_sourced + classifications.self_reported_organic) /
        stages.completed.size
      : null,
    diagnostics,
    caveats: [
      'Explicit private studio_id values are assigned by an operator; names, emails and domains are never used for automatic identity matching.',
      'Only accepted provider receipts belong in this register. Duplicate conflicting lead IDs are excluded until the operator reconciles them.',
      'Stages count distinct studios whose actual stage timestamps fall in the UTC reporting window; they are not a same-cohort funnel.',
      'A completed outcome requires a valid earlier qualification timestamp and qualification note; browser events cannot create outcomes.',
      'Multiple contacts or completions from the same studio count once per window. Mixed source classifications are excluded from the observed-only primary KPI pending review.',
      'Studio source classifications reconcile all valid non-spam receipts through the window end, including earlier contacts without completions. Include available receipt history when exporting the register.',
      'Observed and assisted evidence needs a known landing page and coherent provider/channel within 90 days of the original receipt; completion may happen later. Evidence dates have day precision, so boundary-day evidence is excluded conservatively.',
      'Observed, self-reported and unknown labels are separate. Organic-assisted counts can overlap sourced counts and must not be added to them.',
      'A zero is a count from the supplied register, not proof that all receipts or outcomes were recorded. Missing source coverage is null when there are no completed studios.',
    ],
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const option = (name) => {
      const index = process.argv.indexOf(name);
      return index === -1 ? undefined : process.argv[index + 1];
    };
    if (process.argv.includes('--help'))
      console.log(
        'node apps/marketing/studio-outcomes.mjs --input <private-register.csv|json> --start YYYY-MM-DD --end YYYY-MM-DD [--out output/seo/studio-outcomes.json]\nReads only the explicitly supplied private register. Writes aggregate counts only; no names, emails or studio IDs appear in the report.',
      );
    else {
      const input = option('--input');
      if (!input || input.startsWith('--'))
        throw new Error('--input requires an explicit private CSV or JSON register.');
      const text = await readFile(resolve(input), 'utf8');
      let records;
      try {
        records = input.endsWith('.json') ? JSON.parse(text) : parseRegisterCsv(text);
      } catch {
        throw new Error('Register could not be parsed; no input content was logged.');
      }
      const report = aggregateStudioOutcomes(records, {
        startDate: option('--start'),
        endDate: option('--end'),
      });
      const output = resolve(option('--out') || 'output/seo/studio-outcomes.json');
      await writePrivateReport(output, report);
      console.log(
        `Saved aggregate-only studio outcome report to ${output}; status: ${report.status}.`,
      );
    }
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
