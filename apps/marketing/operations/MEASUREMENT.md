# Measurement and qualification contract

## Business truth

Primary KPI: distinct qualified residential studios completing a discovery conversation with documented **observed organic-source evidence**. Self-reported organic outcomes are reported separately. One studio counts once in the reporting period; several contacts or repeat meetings do not multiply outcomes within that period. Monthly counts are not lifetime-unique studio counts.

A qualified prospect is a real residential design practice/professional with a relevant documentation, materials, revision or handoff problem, influence over adoption, willingness to evaluate active-development software, and a credible current/upcoming use case. US is the acquisition priority, not a prohibition on other countries. Personal email domains do not disqualify a sole practitioner.

Register states: `new`, `contacted`, `qualified`, `scheduled`, `completed`, `pilot_decision`, with `spam`/`not_qualified` separately. The owner records dates and qualification reasons. A calendar booking is not a completed conversation. No scoring/enrichment automation is required for v1.

Attribution labels:

- `observed_organic_sourced`: first-known consented acquisition was an identifiable search referral.
- `self_reported_organic`: the person reports search without equivalent observed evidence.
- `organic_assisted`: an observed later search visit assisted another acquisition journey; can overlap another category, so report separately.
- `unknown`: insufficient evidence, including refused analytics or stripped referrers.

The 90-day first-known window begins only after consent. Never backfill pre-consent history, equate direct with organic, or join Search Console queries to individual leads. Allowlisted page IDs and categorical source labels avoid retaining raw referrer paths or free-text query strings. Record self-report separately from observed evidence; neither overrides the other silently.

## Manual intake reconciliation

Keep the register private and access-limited; the checked-in CSV is a blank schema, not a live lead store. Copy only accepted, non-spam Formspree submissions, deduplicating by the provider submission ID as `lead_id`. The provider receipt timestamp becomes `received_at`; do not infer a receipt from a thanks-page visit. Assign an owner and `new` status after verifying receipt.

Assign a stable private `studio_id` after manual identity review. Several contacts at one practice share that ID; personal email domains, matching names, or matching websites are not sufficient automatic identity evidence. Preserve source receipts when merging duplicate studio identities and document the decision privately. The working Sheet and CSV have 30 columns: the original 28 stay in place, followed by `studio_id` in column 29 (AC) and `pilot_decision_at` in column 30 (AD). CSV import is by header, not column position. Record the actual timezone-bearing `pilot_decision_at` for period-specific decisions; do not infer it from a later edit.

| Accepted form field | Register field |
| --- | --- |
| `name` | `contact_name` |
| `studio` | `studio_name` |
| `email`, `role`, `country`, `website` | Same-named columns |
| `challenge` | `workflow_challenge` |
| `timing` | `project_timing` |
| `discovery` | `self_reported_source` |
| `source_evidence` | `source_evidence` (preserve original categorical JSON or `unknown`) |

Parse valid evidence separately: `provider` → `observed_source`, `channel` → `observed_medium`, `first_known_date` → `first_known_at`, `landing_page` → `landing_page_id`, `organic_assisted` → same-named column. These are browser-observed categories, not identity verification or exact first-visit timestamps. For absent, malformed or `unknown` evidence, leave observation columns unknown. Use `attribution_classification` for the labels above; never replace the raw evidence with a classification. Keep assisted status separate because it may overlap sourced outcomes. Self-reported discovery text is not a reliable automatic channel classifier.

The browser's organic channel is `organic-search`; preserve that exact value in `observed_medium`. It is distinct from GA4's session medium `organic`. Keep `first_known_at` as the original `YYYY-MM-DD` date. For observed or assisted attribution, the outcome checker requires coherent provider/channel fields matching the preserved JSON, a known registry landing-page ID, an explicit boolean `organic_assisted`, and evidence younger than 90 days at the **original receipt**. Completion can happen later. Since browser evidence retains a date rather than an exact timestamp, the 90-day boundary is checked conservatively. A true assisted flag alone is insufficient; a valid initial direct/referral record may still be organic-assisted.

Treat contact/free-text fields as untrusted. In a spreadsheet, paste/import them as literal text, never formulas; do not follow submitted links automatically. Use the receipt timestamp and documented retention policy to set `retention_review_at`. Qualification, contact, scheduling, completion and pilot-decision fields are populated only after the actual corresponding action, never from browser events.

## Browser events

| Event | Meaning | Not evidence of |
| --- | --- | --- |
| `resource_download` | Initiated known resource download; ID/format/variant | File opening, use, or a qualified lead |
| `sample_project_start` | Opened sample | Completed workflow or trial activation |
| `sample_chapter_view` | Active known chapter | Full reading or project completion |
| `pilot_cta_click` | Selected pilot invitation | Valid form submission |
| `pilot_form_start` | Began form interaction | Qualification |
| `generate_lead` | AJAX intake acceptance with analytics consent | Validated lead, booking, attendance or revenue |
| `repository_click` | Selected repository/setup/contribution link | Installation or active use |

Only the consented browser path emits events. No-JavaScript native submissions remain present in Formspree and the register but are not retroactively fabricated in GA4. All GA4 enhanced-measurement events must be disabled to avoid duplication. Direct thanks-page visits never generate a lead event. Known chapters are not virtual page views.

No contact fields, studio names, challenge text, document contents, arbitrary URLs, or user-supplied query/hash strings go to GA4. Advertiser features stay denied. The consent preference itself is necessary preference storage; attribution storage is optional and cleared on withdrawal. Automated tests intercept all vendor calls rather than submit production data.

In the verified GA4 property, register needed event-scoped custom dimensions before relying on parameter breakdowns: `page_id`, `resource_id`, `resource_format`, `resource_variant`, `chapter_id`, `source_page_id`, `destination`, `acquisition_channel`, and `acquisition_provider`. Use low-cardinality allowlisted values only. These browser acquisition dimensions describe first-known consented evidence and are not replacements for GA4 session attribution. No user-scoped lead identifiers or contact dimensions are allowed. Confirm receipt in the real property before launch; registration cannot recover previously unregistered reporting detail automatically.

## Reporting

Use Search Console for Google clicks/impressions/indexing, consent-aware GA4 for observed organic sessions/journeys, and the register for actual business outcomes. Preserve unavailable fields as unknown; do not turn missing permissions or empty provider rankings into a zero baseline.

The read-only reporting CLI verifies the exact OpenLintel GSC property is accessible and checks a GA4 property's web-stream URL before requesting reports. GA4 data stays restricted to matching stream IDs and explicit marketing/app host segments even if a property also hosts unrelated streams. All-channel/source-medium baselines and organic-only reports remain distinct. It intentionally ignores shared generic `GSC_SITE_URL`/`GA_PROPERTY_ID` environment configuration. Domain-level GSC totals can include the app; marketing and app segments must not be silently mixed with marketing-only GA reports.

Credential precedence is an explicit `OPENLINTEL_GSC_ACCESS_TOKEN` / `OPENLINTEL_GA_ACCESS_TOKEN`, then a successfully refreshed Google OAuth token, then the generic `GSC_ACCESS_TOKEN` / `GA_ACCESS_TOKEN` fallback. Explicit OpenLintel tokens are never replaced by shared refresh credentials. Property IDs and stream ownership are still verified independently of token selection.

```sh
export OPENLINTEL_GSC_SITE=sc-domain:openlintel.com
export OPENLINTEL_GA4_PROPERTY_ID='<numeric property ID, not G- measurement ID>'
export OPENLINTEL_INSPECT_URLS=priority # optional bounded, read-only URL Inspection
# Set OPENLINTEL_GA4_ACTIVATED_AT only to the actual collection activation date.
# Read-only access tokens, or Google OAuth refresh credentials, remain in environment.
npx --yes pnpm@9.15.4 marketing:search-report
```

Output is private ignored JSON in `output/seo/`. Report periods are adjacent 28-day windows ending three UTC days before execution, plus 90-day daily context. GSC uses final data and Pacific dates; GA4 uses the property's timezone, recorded in output. Exact period dates are recorded in every report, including when local and UTC dates differ. Preserve actual activation dates: a newly enabled tag cannot recover past uncollected visits.

Schema version 2 exposes per-provider and per-table status, pagination bounds, missing configuration and returned metadata. Successful source results survive sibling-source/report failures. A missing property, unavailable custom dimension, thresholded result or failed request is not a zero baseline. Detail rows remain bounded even with pagination; GSC can omit anonymized queries and internally limited rows. Independent totals are authoritative for property totals, not the sum of query rows. Do not expect GSC clicks and consenting GA sessions to match. Reports expose neither raw OAuth responses nor credentials.

Each paginated table is capped at five pages of 1,000 rows. `empty` means an available provider response returned no rows for that report; `unavailable` means usable results could not be obtained. `partial` includes truncation, inconsistent or missing GA row counts, and incomplete reporting coverage. Missing required GA custom dimensions retain table status `not_registered` and make an otherwise available provider report partial. Complete data-query failure is unavailable even when property metadata was readable. An absent optional app stream is `not_configured`; it is not substituted with the marketing stream or assigned a zero traffic count. The CLI saves usable partial results before exiting with status 1; this exit status must not cause a scheduler to discard the saved report.

Required scorecard views are independent totals, US/global and device cuts, daily trends, page/query pairs, brand/nonbrand/ambiguous query classifications, and registry content clusters. Preserve ambiguous `open lintel` uses for review. Registered GA custom dimensions support resource/format/variant, sample chapter and CTA-source views. Report `generate_lead` explicitly; aggregate `keyEvents` can include other configured key events. Categorized identifiable AI referrals are an all-channel diagnostic, not Google organic traffic or inferred AI-qualified leads.

The report paths are `gsc.segments.{propertyGlobal,marketingGlobal,marketingUS,appGlobal}` and `ga4.segments.{marketing,app}.reports.{allChannels,organic,organicUS}`. All-channel `acquisitionCategories` derives period-specific counts from the bounded acquisition rows. It identifies exact allowlisted AI domains with referral medium, keeps Google organic separate, and preserves `unknown` and `other_or_unclassified` rows. Missing categories have no inferred zero. It does not identify all AI discovery, arbitrary campaign labels, or Google's AI search features. Custom dimension breakdowns currently cover downloads, sample chapters, CTA source and intake events; registering additional event dimensions does not automatically add new report tables.

Optional URL Inspection accepts `priority` or up to 15 comma-separated, indexable registry URLs covered by the selected property. It records Google's canonical, last crawl and indexing verdict. It neither submits URLs nor proves whole-site index coverage. Sitemap submission remains an owner action after deployment/access checks. A sitemap does not guarantee indexing.

## Private outcome aggregation

```sh
node apps/marketing/studio-outcomes.mjs \
  --input /private/path/accepted-leads.csv \
  --start 2026-09-01 --end 2026-09-30 \
  --out output/seo/studio-outcomes.json
```

Use an authorized local CSV or JSON array export only. Include available historical receipt rows, not just the current month's completed contacts: source classification reconciles all valid non-spam receipts for a studio through the reporting window end. An earlier unknown source and a later organic contact become `mixed`, requiring reconciliation before the studio can count in the observed-organic KPI. Receipts after the reporting window do not rewrite that window's classification. Preserve original evidence when recording a reconciliation; do not replace it merely to improve a KPI.

The CLI produces aggregate counts and diagnostics, not identities. Supply actual timezone-bearing receipt, qualification, scheduling, completion and decision timestamps, such as `2026-09-26T14:30:00-05:00`; date-only stage values are not accepted. Qualification requires its recorded reason and cannot predate receipt. Completion cannot predate qualification, and counted pilot decisions require a valid preceding completion. Stage counts use their own event dates in UTC and are not a same-cohort funnel.

Exact duplicate receipt rows count once. Conflicting copies of a receipt ID are excluded until reconciled. Missing studio IDs, invalid dates, unsupported claimed attribution and mixed studio classifications appear in diagnostics or `needs_review` status. Ordinary unavailable source evidence stays `unknown`; it does not automatically imply an erroneous record. `observedOrganicQualifiedCompletedStudios` is the primary KPI, while self-reported and mixed counts stay in `completedConversationAttribution`. Assisted outcomes can overlap sourced outcomes and must not be added to them. `organicEvidenceCoverageRate` is observed-plus-self-reported organic completed studios divided by all completed studios. It measures organic evidence coverage, not known attribution across every channel, and is `null` when there are no completed studios.

Counts reflect only the supplied register. `acceptedRequests` counts valid non-spam receipts in the period; `invalidRequests` counts supplied rows explicitly marked `spam`. An accepted-only export cannot establish total rejected or spam submissions. Reconcile those and response times from the provider/operations records for the weekly scorecard; the aggregation CLI does not calculate response time. Do not join search queries to identifiable leads or copy raw rows into source control.

## Real collection acceptance

Complete [the actual Google-runtime checklist](ANALYTICS-ACCEPTANCE.md) before interpreting session attribution or engagement. Current mocked tests demonstrate consent shutdown and allowlisted arguments, not Google processing. Specifically validate internal navigation after organic entry and active/background behavior of the isolated tag. Fix any demonstrated failure before relying on the affected metric. Collection remains disabled until the verified stream and actual operational readiness are established.

The Google Generative AI report is a separate manual export when available; it reports supported AI impressions overlapping Web search. Do not add those impressions to Web totals or infer AI-specific qualified leads from them.

Weekly scorecard: availability; valid/invalid requests; response time; search clicks by brand/nonbrand and cluster; US/non-US; consenting sessions; downloads; pilot requests; source-coverage rate; qualified/completed conversations; pilot decisions. Review `openlintel`/`open lintel` brand variants manually for ambiguous generic uses rather than silently classifying all names as brand.

Initial month-six planning target: five observed organic-sourced qualified completed conversations per month, not a forecast. Example assumptions of 1% request ×50% qualification ×70% attendance imply ~1,430 relevant sessions for five conversations. Replace assumptions after real observations; never sum overlapping keyword volumes to justify traffic.

## Decisions

- Impression growth without clicks: evaluate SERP intent, position and device before changing snippets.
- Clicks without task engagement: improve artifact usefulness or correct audience mismatch.
- Downloads without pilot interest: interview users and evaluate the offer, not merely CTA color.
- Unqualified requests: tighten positioning; do not count higher volume as success.
- Qualified requests without attendance: fix response/scheduling.
- No indexing: verify access, canonical/indexing rules and distinct usefulness before more publication.
- Small samples: report counts/uncertainty; no statistically unsupported A/B winners.

Sources: [Search Analytics query](https://developers.google.com/webmaster-tools/v1/searchanalytics/query), [GA4 API schema](https://developers.google.com/analytics/devguides/reporting/data/v1/api-schema), [basic consent](https://developers.google.com/tag-platform/security/concepts/consent-mode), [Generative AI report](https://support.google.com/webmasters/answer/16984139).
