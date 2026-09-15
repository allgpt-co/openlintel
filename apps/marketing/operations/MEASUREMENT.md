# Measurement and qualification contract

## Business truth

Primary KPI: distinct qualified residential studios completing a discovery conversation with documented organic-source evidence. One studio counts once in the reporting period; several contacts or repeat meetings do not multiply initial discovery outcomes.

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

The read-only reporting CLI verifies the exact OpenLintel GSC property is accessible and checks a GA4 property's web-stream URL before requesting reports. GA4 reports are restricted to verified OpenLintel stream IDs, OpenLintel hostnames and the Organic Search channel, even if a property also hosts unrelated streams. It intentionally ignores shared generic `GSC_SITE_URL`/`GA_PROPERTY_ID` environment configuration.

```sh
export OPENLINTEL_GSC_SITE=sc-domain:openlintel.com
export OPENLINTEL_GA4_PROPERTY_ID='<numeric property ID, not G- measurement ID>'
# Read-only access tokens, or Google OAuth refresh credentials, remain in environment.
npx --yes pnpm@9.15.4 marketing:search-report
```

Output is private ignored JSON in `output/seo/`. Report periods are adjacent 28-day windows ending three days before execution. GSC uses final data and Pacific dates; GA4 uses the property's timezone, recorded in output. Query/page reports are bounded top rows (1,000), not complete property totals; GSC totals are requested independently. Do not sum query rows to produce total clicks, or expect clicks and GA4 sessions to match. Reports expose neither raw OAuth responses nor credentials.

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
