import test from 'node:test';
import assert from 'node:assert/strict';
import { aggregateStudioOutcomes, parseRegisterCsv } from './studio-outcomes.mjs';

const period = {
  startDate: '2026-09-01',
  endDate: '2026-09-30',
  now: new Date('2026-10-01T12:00:00Z'),
};
const lead = (overrides = {}) => ({
  lead_id: 'receipt-1',
  studio_id: 'studio-1',
  received_at: '2026-09-02T12:00:00Z',
  status: 'completed',
  studio_name: 'Private studio',
  email: 'private@example.com',
  qualified_at: '2026-09-03T12:00:00Z',
  qualification_note: 'Operator verified residential practice and current use case.',
  completed_at: '2026-09-10T12:00:00Z',
  attribution_classification: 'observed_organic_sourced',
  observed_source: 'google',
  observed_medium: 'organic-search',
  first_known_at: '2026-09-01',
  source_evidence: JSON.stringify({
    channel: 'organic-search',
    provider: 'google',
    first_known_date: '2026-09-01',
    landing_page: 'client-questionnaire',
    organic_assisted: false,
  }),
  ...overrides,
});

test('Primary KPI deduplicates contacts and repeat completions by stable studio ID', () => {
  const result = aggregateStudioOutcomes(
    [
      lead(),
      lead({ lead_id: 'receipt-2', completed_at: '2026-09-15T14:00:00-05:00' }),
      lead({ lead_id: 'receipt-3', studio_id: 'studio-2' }),
    ],
    period,
  );
  assert.equal(result.acceptedRequests, 3);
  assert.equal(result.distinctStudios.completed, 2);
  assert.equal(result.observedOrganicQualifiedCompletedStudios, 2);
  assert.equal(result.organicEvidenceCoverageRate, 1);
  for (const privateValue of ['Private studio', 'private@example.com', 'studio-1', 'receipt-1'])
    assert.ok(!JSON.stringify(result).includes(privateValue));
});

test('Only receipt-backed requests and dated qualified completions enter outcome counts', () => {
  const result = aggregateStudioOutcomes(
    [
      lead({ lead_id: 'a', studio_id: '' }),
      lead({ lead_id: 'b', received_at: '' }),
      lead({ lead_id: 'c', qualified_at: '' }),
      lead({ lead_id: 'd', qualification_note: '' }),
      lead({ lead_id: 'e', qualified_at: '2026-08-01T00:00:00Z' }),
      lead({ lead_id: 'f', completed_at: '2026-09-01T00:00:00Z' }),
      lead({ lead_id: 'g', completed_at: '2026-10-02T00:00:00Z' }),
      lead({ lead_id: 'h', completed_at: '2026-09-10' }),
      lead({ lead_id: 'i', received_at: '2026-02-30T00:00:00Z' }),
      lead({ lead_id: 'j', status: 'spam' }),
    ],
    period,
  );
  assert.equal(result.observedOrganicQualifiedCompletedStudios, 0);
  assert.equal(result.distinctStudios.completed, 0);
  assert.equal(result.invalidRequests, 1);
  assert.equal(result.diagnostics.invalidReceipts, 2);
  assert.equal(result.diagnostics.missingStudioIds, 1);
  assert.equal(result.organicEvidenceCoverageRate, null);
  assert.equal(result.status, 'needs_review');
});

test('Observed, self-reported, assisted and unknown acquisition remain separate', () => {
  const result = aggregateStudioOutcomes(
    [
      lead(),
      lead({
        lead_id: 'b',
        studio_id: 'b',
        attribution_classification: 'self_reported_organic',
        self_reported_source: 'Found through search',
        source_evidence: 'unknown',
      }),
      lead({
        lead_id: 'c',
        studio_id: 'c',
        attribution_classification: 'unknown',
        self_reported_source: 'Google maybe',
        source_evidence: 'unknown',
      }),
      lead({ lead_id: 'd', studio_id: 'd', observed_source: 'not-google' }),
      lead({
        lead_id: 'e',
        studio_id: 'e',
        organic_assisted: 'true',
        source_evidence: JSON.stringify({
          channel: 'organic-search',
          provider: 'google',
          first_known_date: '2026-09-01',
          landing_page: 'client-questionnaire',
          organic_assisted: true,
        }),
      }),
    ],
    period,
  );
  assert.deepEqual(result.completedConversationAttribution, {
    observed_organic_sourced: 2,
    self_reported_organic: 1,
    unknown: 2,
    mixed: 0,
  });
  assert.equal(result.organicAssistedCompletedStudios, 1);
  assert.equal(result.observedOrganicQualifiedCompletedStudios, 2);
  assert.equal(result.organicEvidenceCoverageRate, 0.6);
});

test('Conflicting source classifications do not silently upgrade a studio to organic', () => {
  const result = aggregateStudioOutcomes(
    [
      lead(),
      lead({
        lead_id: 'receipt-2',
        attribution_classification: 'self_reported_organic',
        self_reported_source: 'Search',
        source_evidence: 'unknown',
      }),
    ],
    period,
  );
  assert.equal(result.distinctStudios.completed, 1);
  assert.equal(result.completedConversationAttribution.mixed, 1);
  assert.equal(result.observedOrganicQualifiedCompletedStudios, 0);
  assert.equal(result.status, 'needs_review');
});

test('Exact repeated receipts are deduplicated; conflicting copies are excluded for reconciliation', () => {
  const result = aggregateStudioOutcomes(
    [
      lead(),
      lead(),
      lead({ lead_id: 'receipt-2' }),
      lead({ lead_id: 'receipt-2', studio_id: 'different-studio' }),
    ],
    period,
  );
  assert.equal(result.acceptedRequests, 1);
  assert.equal(result.diagnostics.duplicateLeadRows, 2);
  assert.equal(result.diagnostics.conflictingLeadIds, 1);
});

test('Period counts use actual event timestamps, and pilot decisions require their own dates', () => {
  const result = aggregateStudioOutcomes(
    [
      lead({
        received_at: '2026-08-01T00:00:00Z',
        first_known_at: '2026-07-31',
        source_evidence: 'unknown',
        pilot_decision: 'follow-up',
      }),
      lead({
        lead_id: 'receipt-2',
        studio_id: 'studio-2',
        completed_at: '2026-08-31T23:30:00-02:00',
        qualified_at: '2026-08-30T00:00:00Z',
        received_at: '2026-08-29T00:00:00Z',
        pilot_decision: 'evaluate',
        pilot_decision_at: '2026-09-12T12:00:00Z',
      }),
    ],
    period,
  );
  assert.equal(result.acceptedRequests, 0);
  assert.equal(result.distinctStudios.completed, 2);
  assert.equal(result.distinctStudios.qualified, 1);
  assert.equal(result.distinctStudios.pilotDecisions, 1);
  assert.equal(result.diagnostics.missingPilotDecisionTimestamp, 1);
});

test('CSV parser preserves quoted evidence, commas and multiline notes without evaluation', () => {
  const rows = parseRegisterCsv(
    'lead_id,studio_id,note,source_evidence\r\na,b,"first, line\nsecond ""line""","{""channel"":""organic-search""}"\r\n',
  );
  assert.equal(rows[0].note, 'first, line\nsecond "line"');
  assert.deepEqual(JSON.parse(rows[0].source_evidence), { channel: 'organic-search' });
  assert.throws(() => parseRegisterCsv('lead_id,studio_id\na,"open'), /Unclosed/);
  assert.throws(() => parseRegisterCsv('lead_id,studio_id\na,"b"x'), /Malformed/);
  assert.throws(() => parseRegisterCsv('lead_id,studio_id\na'), /row width/);
  assert.throws(() => parseRegisterCsv('lead_id,email\na,b'), /studio_id/);
});

test('Observed evidence must have a known landing page and a valid receipt-relative 90-day window', () => {
  const evidence = JSON.parse(lead().source_evidence);
  for (const change of [
    { first_known_date: '2020-09-01' },
    { first_known_date: '2026-06-04' },
    { first_known_date: '2026-09-03' },
    { landing_page: undefined },
    { landing_page: 'made-up-page' },
    { organic_assisted: undefined },
    { provider: 'campaign' },
  ]) {
    const modified = { ...evidence, ...change };
    const result = aggregateStudioOutcomes(
      [
        lead({
          first_known_at: modified.first_known_date,
          source_evidence: JSON.stringify(modified),
        }),
      ],
      period,
    );
    assert.equal(result.observedOrganicQualifiedCompletedStudios, 0);
    assert.equal(result.completedConversationAttribution.unknown, 1);
    assert.equal(result.status, 'needs_review');
  }
  const delayed = aggregateStudioOutcomes([lead({ completed_at: '2027-02-01T12:00:00Z' })], {
    startDate: '2027-02-01',
    endDate: '2027-02-28',
    now: new Date('2027-03-01T00:00:00Z'),
  });
  assert.equal(delayed.observedOrganicQualifiedCompletedStudios, 1);
});

test('Earlier incomplete or out-of-period contacts prevent silent organic upgrading of the same studio', () => {
  for (const previousCompletion of ['', '2026-08-15T12:00:00Z']) {
    const result = aggregateStudioOutcomes(
      [
        lead({
          lead_id: 'initial-receipt',
          status: 'new',
          received_at: '2026-08-01T12:00:00Z',
          qualified_at: previousCompletion ? '2026-08-02T12:00:00Z' : '',
          completed_at: previousCompletion,
          attribution_classification: 'unknown',
          source_evidence: 'unknown',
        }),
        lead(),
      ],
      period,
    );
    assert.equal(result.distinctStudios.completed, 1);
    assert.equal(result.completedConversationAttribution.mixed, 1);
    assert.equal(result.observedOrganicQualifiedCompletedStudios, 0);
    assert.equal(result.status, 'needs_review');
  }
});

test('Later receipts do not rewrite a historical reporting window', () => {
  const result = aggregateStudioOutcomes(
    [
      lead(),
      lead({
        lead_id: 'later',
        status: 'new',
        received_at: '2026-10-01T01:00:00Z',
        qualified_at: '',
        completed_at: '',
        attribution_classification: 'unknown',
        source_evidence: 'unknown',
      }),
    ],
    period,
  );
  assert.equal(result.observedOrganicQualifiedCompletedStudios, 1);
});

test('Assisted evidence requires coherent original acquisition, dates and known landing page', () => {
  for (const source_evidence of [
    JSON.stringify({ organic_assisted: true }),
    JSON.stringify({
      ...JSON.parse(lead().source_evidence),
      landing_page: undefined,
      organic_assisted: true,
    }),
    JSON.stringify({
      ...JSON.parse(lead().source_evidence),
      channel: 'direct',
      provider: 'google',
      organic_assisted: true,
    }),
  ]) {
    const result = aggregateStudioOutcomes(
      [lead({ organic_assisted: true, source_evidence })],
      period,
    );
    assert.equal(result.organicAssistedCompletedStudios, 0);
    assert.equal(result.status, 'needs_review');
  }
  for (const [channel, provider] of [
    ['direct', 'none'],
    ['referral', 'other'],
  ]) {
    const result = aggregateStudioOutcomes(
      [
        lead({
          attribution_classification: 'organic_assisted',
          observed_medium: channel,
          observed_source: provider,
          organic_assisted: true,
          source_evidence: JSON.stringify({
            channel,
            provider,
            first_known_date: '2026-09-01',
            landing_page: 'home',
            organic_assisted: true,
          }),
        }),
      ],
      period,
    );
    assert.equal(result.organicAssistedCompletedStudios, 1);
    assert.equal(result.observedOrganicQualifiedCompletedStudios, 0);
    assert.equal(result.status, 'available');
  }
});
