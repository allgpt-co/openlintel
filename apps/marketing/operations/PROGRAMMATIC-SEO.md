# Programmatic SEO pilot: selection and procurement

## Scope and release state

The first cohort contains two separately authored educational resources for US-first residential design studios. The implementation prepares private, reviewable HTML/XLSX/PDF bundles; it does not supply the missing practitioner approvals or operational evidence. `data/programmatic-release.json` is deliberately empty. The default public build remains 45 registered pages, 43 indexable URLs and 22 template downloads.

| Stable page ID | Candidate URL | Job and overlap boundary |
| --- | --- | --- |
| `purchase-order` | `/templates/interior-design-purchase-order/` | Transfer reviewed selections into an order record; keep supplier evidence, purchasing authority and delivery responsibility explicit. The FF&E schedule remains the selection inventory. |
| `plumbing-fixture-schedule` | `/templates/plumbing-fixture-schedule/` | Connect fixture references, product evidence, related items and unresolved coordination checks. The specification sheet remains the detailed product record. |

Both use family `selection-procurement` and cohort `selection-procurement-01`, with distinct intent keys. A lighting fixture schedule is reserved as a possible third candidate; it has no authored page, download or public route. There is no Cartesian expansion by room, city, style or product. The site has no verified product catalog or client-project dataset to support that expansion.

The operating capacity is **2–4 practitioner review hours per week**. Review the existing first six templates, then these two bundles in sequence. Engineering checks do not consume or replace that review allocation. The business outcome remains distinct qualified studios completing conversations with observed organic-source evidence; downloads and search visibility are diagnostic measures.

## Evidence and authored inputs

`data/pseo-research-2026-09-26.json` records 45 US English seed phrases, 30 returned keyword records and six observed SERPs. Of the returned records, 24 have numeric volume and six have null volume; 15 requested phrases were omitted by the provider. Preserve those distinctions. The purchase-order and plumbing-fixture terms have modest estimated volume, and adjacent lighting terms have mixed intent. These overlapping estimates are neither expected traffic nor additive market size.

Search Console and GA4 data remain unavailable without verified OpenLintel properties and actual collection. No unrelated connected property is substituted. A missing report is not evidence of zero traffic or zero demand.

Each candidate has a source record in `content/`, stable field keys, task instructions, common mistakes, an explicit illustrative example, provenance, limitations and a useful next-step link. Original teaching identifiers are labeled. Manufacturer, model, supplier, quote, technical approval and purchasing approval are never fabricated. The plumbing example is independent of The Window Room. Unknown numeric values and source dates stay blank.

The shared generator produces an editable workbook with **Instructions**, **Blank Template** and **Worked Example**, plus a PDF preview from the same records. Field/value blocks keep wide procurement records readable. The HTML previews use the same fields. Do not replace this with prose generated from keyword permutations.

## Prepare and review an exact bundle

```sh
pnpm marketing:programmatic-review
# Optional alternate directory, still inside ignored output/seo/:
node apps/marketing/programmatic-review-cli.mjs --out output/seo/review-round-2
```

The command writes a private index, per-candidate HTML, artifacts and `bundle.json` under ignored `output/seo/programmatic-review/`. Files use restrictive permissions and reject symlink destinations. They are not copied to `docs/`, the sitemap or public hubs. The private HTML is noindex; access control comes from keeping these files local or sharing them only through a restricted review location.

The bundle includes canonical hashes of authored data, substantive rendered HTML, actual download bytes and relevant source/generator/dependency fingerprints. It excludes public review credits and release bookkeeping so recording an approval does not invalidate itself. The substantive revision date remains reviewable. Fingerprinting is deliberately conservative: changes to a shared family source, renderer, generator or dependency lock can invalidate both approvals even when one artifact looks unchanged. Regenerate bundles after the final code and formatting edits.

The practitioner reviews the exact HTML and files, confirms field usability, missing-information handling, scope and artifact compatibility, and records the scope/date and bundle hash. Publish a named credit only with actual permission. Record evidence in the restricted operations register; put only the permitted credit and evidence references in source. Never paste identities from test fixtures into release records.

Before adding either ID to the release allowlist, complete:

1. Current practitioner review of the existing specification sheet, FF&E schedule, finish schedule, client questionnaire, budget and proposal.
2. Candidate review matching both its authored revision and exact generated bundle hash.
3. Verified intent and overlap assessment against existing pages, with one owner URL per intent.
4. Working discovery intake, monitored receipt reconciliation, named operational responsibility and privacy readiness.
5. Verified marketing measurement configuration, real runtime acceptance and OpenLintel reporting access.
6. Artifact compatibility evidence for the exact final workbook and PDF, with remaining platform limitations stated.

The allowlist accepts approval information for known authored candidates; it cannot inject arbitrary pages or replace their content. Evidence gates are `intent`, `overlap`, `intake`, `measurement` and `artifactCompatibility`, each with a verified state, completed UTC timestamp and SHA-256 evidence reference. Compatibility evidence also needs `bundleHash` matching `approvedBundleHash`, and its verification cannot predate the substantive revision. `firstSixReviews` references the six current authored revisions. The `review` record uses the existing permissioned editorial-review fields plus `reviewedBundleHash`; `approvedBundleHash` must match the regenerated bundle. Evidence hashes identify retained records; software cannot establish that a human review or provider acceptance actually occurred.

## Build, publish and record first live evidence

The registry keeps candidates private until the allowlist and review checks pass. The first release requires both members of the initial cohort; later releases can retire individual pages once verified live history exists. An approved resource receives hub discovery and contextual links from existing relevant resources. Every page carries stable `familyId`, `cohortId` and `intentKey` metadata; earlier pages use the `legacy` family/cohort.

The build generates into a disposable staging directory, then verifies ownership hashes, canonical/indexing directives, links/fragments, downloads, sitemap membership and candidate discovery before updating `docs/`. Generation or validation failures leave the current output intact. Promotion uses individual atomic file replacements and writes the manifest last; it is not a filesystem-wide transaction. Publish the complete reviewed Git revision. Unrelated Markdown and CNAME files are preserved. Obsolete files are removed only when a trusted previous manifest proves their ownership and unchanged hash.

The output manifest is version 3. Ownership and production-audit readers still accept version 2, enabling safe migration. An approved programmatic entry includes its bundle hash; a missing family/cohort/intent or approval hash is rejected.

`data/publication-history.json` is the durable identity ledger. Keep retired IDs and paths; do not recycle them for new intent. The initial 45 pages have unknown first-publication dates. A prior deployment audit does not establish their first-publication date. The two new records remain `candidate` until live evidence exists. After publishing, verify the actual commit and HTTPS bytes with the production audit, then record the actual first verified live timestamp, commit and audit evidence. Never use build time or merge time as a substitute. Keep the first verified live evidence immutable across later revisions.

CI runs `publication-history-cli.mjs` against the pull request base or push predecessor, with full Git history available. It permits the initial migration when that commit has no ledger, but rejects unreadable predecessors, reassigned IDs and rewritten evidence. To review a local change against a specific prior commit, run `node apps/marketing/publication-history-cli.mjs --base <full-commit-sha>`.

The build rejects a retired identity still present in public output, and requires an active identity removed from the registry to be marked retired. An approved candidate may enter its first build before the live audit exists. Live evidence URLs must identify the exact resource path on the production OpenLintel hosts using standard HTTPS; preview prefixes and alternate ports are rejected.

```sh
pnpm marketing:lint
pnpm marketing:check
pnpm marketing:build
pnpm marketing:preview
pnpm marketing:smoke
pnpm marketing:growth-smoke
# After an actual deployment, against its reviewed manifest:
pnpm marketing:production-check
```

Rollback uses a reviewed revert and republishing the previous generated output. Preserve historical IDs and records. If a URL is deliberately retired, decide its redirect separately; deleting a file does not configure a hosting redirect.

## Cohort measurement and expansion decisions

[The measurement contract](MEASUREMENT.md) owns query filters, qualification and source attribution. Search reports use schema version 3; private outcome reports use version 2. Existing event names and private CSV columns remain unchanged.

For each family/cohort, retain independent GSC page-filtered totals, global/US and complete-period comparisons, GA landing-page-filtered acquisition, and event detail by the existing `page_id` dimension. Shared artifacts must be attributed by the page that emitted the event, not the filename alone. Query detail is incomplete and must not replace independent totals. Report access failures, missing custom dimensions, truncation, unavailable collection and candidate-not-released states explicitly.

Deduplicate and qualify studios globally before calculating cohort outcomes. Attribute a qualified studio to the earliest valid observed organic receipt and its stable historical page identity. Tied/mixed earliest evidence is unassigned. An assisted flag alone gives no family credit. Cohort counts plus unassigned counts reconcile to the global observed-organic outcome, without double counting studios across families.

The following are chosen pilot operating thresholds, not Google requirements or traffic forecasts. Start clocks from verified live evidence; report the age of each page if release dates differ. Missing access pauses an evidence-based decision, not the preparation work.

| Checkpoint | Required evidence | Decision |
| --- | --- | --- |
| Launch | Both final bundles approved; first six reviews complete; intake and measurement accepted; technical checks pass | Release the two-page cohort, record actual live evidence. |
| Day 30 | Both URLs indexed with intended Google-selected canonicals; no technical or intent conflict | Repair indexing/discovery problems before considering another page. |
| Day 60 | At least 100 relevant US nonbrand impressions and five clicks across the cohort in the reviewed complete period; two documented practitioner uses; no material overlap | May prepare the reserved lighting candidate for separate review. Do not infer success from broad or consumer-intent queries. |
| Day 90 | At least one qualified completed conversation, or two qualified accepted conversations with documented follow-up | Decide whether to propose another bounded cohort. If evidence is absent, improve or consolidate the existing resources before expansion. |

Inspect the specific queries and page pairs behind aggregate gains. Changing titles to chase unrelated impressions is not cohort success. Use the latest complete periods and document any comparison-period or attribution coverage limitation. Do not launch a wider family from downloads alone.

## Execution ownership

| Work | Status at implementation | Responsible role |
| --- | --- | --- |
| Candidate records, XLSX/PDF/HTML generation, catalog and review CLI | Implemented; private review required | Engineering + content |
| Safe build promotion, manifest metadata, identity history | Implemented; release verification required | Engineering |
| Cohort search and qualified-studio reporting | Implemented; live data access/collection required | Growth + operations |
| First six reviews and two exact-bundle reviews | Pending; allocate 2–4 hours/week | Practitioner + content |
| Real intake and analytics acceptance | Pending verified account/runtime evidence | Operations + privacy + growth |
| Publish cohort and record first live evidence | Blocked by actual release gates | Release owner |
| Day 30/60/90 decisions | Not started; anchored to actual release | Growth + practitioner + founder |

Keep assigned people, review evidence, compatibility copies and actual customer records in the private working register. This runbook records roles and requirements, not invented staffing or completed reviews.
