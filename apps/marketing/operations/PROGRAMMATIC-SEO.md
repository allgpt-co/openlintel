# Programmatic SEO pilot: selection and procurement

## Scope and release state

The owner has authorized public educational release of the two resources in the first cohort. They remain **pending independent practitioner review**. The release allowlist uses `releaseMode: "educational-pending-review"` and `contentBundleHash` to identify the exact authored HTML/XLSX/PDF bundles. This mode does not supply practitioner approval, analytics acceptance, intake delivery evidence or a professional certification. Public pages and downloads retain clear educational and review-status disclosures.

The verified public release contains **47 registered pages, 45 indexable URLs and 26 template downloads**. Both resources were first verified live at **2026-09-27T05:35:03Z**, from release commit `20e0577d5cd7b3d53d49e147e4f6640d7a68f6ba`; PR #27 records this evidence in the immutable publication ledger. The strict reviewed release path remains available for a later revision with completed practitioner review; its requirements are below. See the [September 27 closeout](SEO-CLOSEOUT-2026-09-27.md) for verification and remaining dependencies.

| Stable page ID              | Resource URL                                 | Job and overlap boundary                                                                                                                                                                     |
| --------------------------- | -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `purchase-order`            | `/templates/interior-design-purchase-order/` | Transfer selections into a purchasing planning record; keep supplier evidence, purchasing authority and delivery responsibility explicit. The FF&E schedule remains the selection inventory. |
| `plumbing-fixture-schedule` | `/templates/plumbing-fixture-schedule/`      | Connect fixture references, product evidence, related items and unresolved coordination checks. The specification sheet remains the detailed product record.                                 |

Both use family `selection-procurement` and cohort `selection-procurement-01`, with distinct intent keys. A lighting fixture schedule is reserved as a possible third candidate; it has no authored page, download or public route. There is no Cartesian expansion by room, city, style or product. The site has no verified product catalog or client-project dataset to support that expansion.

The operating capacity is **2–4 practitioner review hours per week**. Review the existing first six templates, then these two bundles in sequence. Engineering checks do not consume or replace that review allocation. Public educational availability does not complete this work. The business outcome remains distinct qualified studios completing conversations with observed organic-source evidence; downloads and search visibility are diagnostic measures.

AI editorial checks of all 32 resources, including both cohort pages, are complete on September 27. See [the findings and booking update](BOOKING-EDITORIAL-2026-09-27.md). This does not satisfy independent practitioner approval. Direct demo scheduling now uses the owner-supplied public TidyCal link; its operational acceptance is still separate.

## Evidence and authored inputs

`data/pseo-research-2026-09-26.json` records 45 US English seed phrases, 30 returned keyword records and six observed SERPs. Of the returned records, 24 have numeric volume and six have null volume; 15 requested phrases were omitted by the provider. Preserve those distinctions. The purchase-order and plumbing-fixture terms have modest estimated volume, and adjacent lighting terms have mixed intent. These overlapping estimates are neither expected traffic nor additive market size.

Search Console and GA4 data remain unavailable without verified OpenLintel properties and actual collection. No unrelated connected property is substituted. A missing report is not evidence of zero traffic or zero demand. Educational release does not enable analytics or discovery intake; those remain separate operational decisions requiring actual acceptance evidence.

Each resource has a source record in `content/`, stable field keys, task instructions, common mistakes, an explicit illustrative example, provenance, limitations and a useful next-step link. Original teaching identifiers are labeled. Manufacturer, model, supplier, quote, technical approval and purchasing approval are never fabricated. The plumbing example is independent of The Window Room. Unknown numeric values and source dates stay blank.

The shared generator produces an editable workbook with **Instructions**, **Blank Template** and **Worked Example**, plus a PDF preview from the same records. Field/value blocks keep wide procurement records readable. The HTML previews use the same fields. Do not replace this with prose generated from keyword permutations.

## Prepare an exact bundle

```sh
pnpm marketing:programmatic-review
# Optional alternate directory, still inside ignored output/seo/:
node apps/marketing/programmatic-review-cli.mjs --out output/seo/review-round-2
```

The command writes a private index, per-resource HTML, artifacts and `bundle.json` under ignored `output/seo/programmatic-review/`. Files use restrictive permissions and reject symlink destinations. These review files are not copied to `docs/`, the sitemap or public hubs. The private HTML is noindex; access control comes from keeping these files local or sharing them only through a restricted review location. The separate public build includes only allowlisted resources.

The bundle includes canonical hashes of authored data, substantive rendered HTML, actual download bytes and relevant source/generator/dependency fingerprints. It excludes public review credits and release bookkeeping so recording an approval does not invalidate itself. The pending-review notice sits outside the substantive article header and body. The substantive revision date remains reviewable. Fingerprinting is deliberately conservative: changes to a shared family source, renderer, generator or dependency lock can invalidate both hashes even when one artifact looks unchanged. Regenerate bundles after the final code and formatting edits.

For educational release, record the regenerated hash as `contentBundleHash` with `releaseMode: "educational-pending-review"`. It verifies content identity, not professional correctness. Do not add `review`, `evidence` or `approvedBundleHash` to imply completion of the reviewed path. The allowlist can release known authored resources; it cannot inject arbitrary pages or replace their content.

## Complete the reviewed release path

The practitioner reviews the exact HTML and files, confirms field usability, missing-information handling, scope and artifact compatibility, and records the scope/date and bundle hash. Publish a named credit only with actual permission. Record evidence in the restricted operations register; put only the permitted credit and evidence references in source. Never paste identities from test fixtures into release records.

Before claiming a reviewed release, complete:

1. Current practitioner review of the existing specification sheet, FF&E schedule, finish schedule, client questionnaire, budget and proposal.
2. Resource review matching both its authored revision and exact generated bundle hash.
3. Verified intent and overlap assessment against existing pages, with one owner URL per intent.
4. Working discovery intake, monitored receipt reconciliation, named operational responsibility and privacy readiness.
5. Verified marketing measurement configuration, real runtime acceptance and OpenLintel reporting access.
6. Artifact compatibility evidence for the exact final workbook and PDF, with remaining platform limitations stated.

The strict reviewed path retains `approvedBundleHash`, the permissioned `review` record and its `reviewedBundleHash`, and release evidence. Evidence gates are `intent`, `overlap`, `intake`, `measurement` and `artifactCompatibility`, each with a verified state, completed UTC timestamp and SHA-256 evidence reference. Compatibility evidence also needs `bundleHash` matching `approvedBundleHash`, and its verification cannot predate the substantive revision. `firstSixReviews` references the six current authored revisions. `approvedBundleHash` must match the regenerated bundle. Evidence hashes identify retained records; software cannot establish that a human review or provider acceptance actually occurred.

## Build, publish and record first live evidence

The registry keeps resources private unless a valid educational or reviewed allowlist entry releases them. The first release requires both members of the initial cohort; later releases can retire individual pages once verified live history exists. A public resource receives hub discovery and contextual links from existing relevant resources. Every page carries stable `familyId`, `cohortId` and `intentKey` metadata; earlier pages use the `legacy` family/cohort.

The build generates into a disposable staging directory, then verifies ownership hashes, canonical/indexing directives, links/fragments, downloads, sitemap membership and resource discovery before updating `docs/`. Generation or validation failures leave the current output intact. Promotion uses individual atomic file replacements and writes the manifest last; it is not a filesystem-wide transaction. Publish the complete checked Git revision. Unrelated Markdown and CNAME files are preserved. Obsolete files are removed only when a trusted previous manifest proves their ownership and unchanged hash.

The output manifest is version 3. Ownership and production-audit readers still accept version 2, enabling safe migration. A programmatic entry carries its release mode and corresponding content or approval bundle hash, alongside family/cohort/intent metadata. Educational metadata must not be relabeled as reviewed approval.

`data/publication-history.json` is the durable identity ledger. Keep retired IDs and paths; do not recycle them for new intent. The initial 45 pages have unknown first-publication dates. A prior deployment audit does not establish their first-publication date. Keep each new record in `candidate` state until live evidence exists. After publishing, verify the actual commit and HTTPS bytes with the production audit, then record the actual first verified live timestamp, commit and audit evidence. Never use build time or merge time as a substitute. Keep the first verified live evidence immutable across later revisions, including a later practitioner-reviewed revision.

CI runs `publication-history-cli.mjs` against the pull request base or push predecessor, with full Git history available. It permits the initial migration when that commit has no ledger, but rejects unreadable predecessors, reassigned IDs and rewritten evidence. To review a local change against a specific prior commit, run `node apps/marketing/publication-history-cli.mjs --base <full-commit-sha>`.

The build rejects a retired identity still present in public output, and requires an active identity removed from the registry to be marked retired. An allowlisted resource may enter its first build before the live audit exists. Live evidence URLs must identify the exact resource path on the production OpenLintel hosts using standard HTTPS; preview prefixes and alternate ports are rejected.

```sh
pnpm marketing:lint
pnpm marketing:check
pnpm marketing:build
pnpm marketing:preview
pnpm marketing:smoke
pnpm marketing:growth-smoke
# After an actual deployment, against its checked manifest:
pnpm marketing:production-check
```

Rollback uses a checked revert and republishing the previous generated output. Preserve historical IDs and records. If a URL is deliberately retired, decide its redirect separately; deleting a file does not configure a hosting redirect.

## Cohort measurement and expansion decisions

[The measurement contract](MEASUREMENT.md) owns query filters, qualification and source attribution. Search reports use schema version 3; private outcome reports use version 2. Existing event names and private CSV columns remain unchanged. A cohort marked `released` has verified public availability; it does not imply practitioner approval, tracking readiness or completed business outcomes.

For each family/cohort, retain independent GSC page-filtered totals, global/US and complete-period comparisons, GA landing-page-filtered acquisition, and event detail by the existing `page_id` dimension. Shared artifacts must be attributed by the page that emitted the event, not the filename alone. Query detail is incomplete and must not replace independent totals. Report access failures, missing custom dimensions, truncation, unavailable collection and candidate-not-released states explicitly.

Deduplicate and qualify studios globally before calculating cohort outcomes. Attribute a qualified studio to its earliest valid observed organic acquisition evidence and stable historical page identity after reconciling source evidence across receipts. Tied/mixed earliest evidence is unassigned. An assisted flag alone gives no family credit. Assigned cohort counts plus legacy and unassigned buckets reconcile to the global observed-organic outcome, without double counting studios across cohorts.

The following are chosen pilot operating thresholds, not Google requirements or traffic forecasts. Start clocks from verified live evidence; report the age of each page if release dates differ. Missing access pauses an evidence-based decision, not the publication clock or preparation work. If collection starts later, disclose its shorter observation window and hold decisions that lack sufficient evidence.

| Checkpoint          | Required evidence                                                                                                                                                      | Decision                                                                                                                                                                                                                   |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Educational release | Owner authorization; both exact content bundles identified; pending-review disclosures; technical checks pass                                                          | Publish the two-page educational cohort and record actual live evidence after deployment. Keep practitioner and operational work pending.                                                                                  |
| Reviewed release    | Both final bundles approved; first six reviews complete; intake, measurement and artifact compatibility accepted                                                       | Change to the strict reviewed path only with actual evidence. Preserve the original publication clock.                                                                                                                     |
| Day 30              | Both URLs indexed with intended Google-selected canonicals; no technical or intent conflict                                                                            | Repair indexing/discovery problems before considering another page. Hold when indexing evidence is unavailable.                                                                                                            |
| Day 60              | At least 100 relevant US nonbrand impressions and five clicks across the cohort in the reviewed complete period; two documented practitioner uses; no material overlap | May prepare the reserved lighting candidate for separate review. Hold expansion when exposure or practitioner evidence is insufficient. Do not infer success from broad or consumer-intent queries.                        |
| Day 90              | At least one qualified completed conversation, or two qualified accepted conversations with documented follow-up                                                       | Decide whether to propose another bounded cohort. If a complete measurable period lacks business evidence, improve or consolidate these resources before expansion. Missing collection or intake readiness remains a hold. |

Inspect the specific queries and page pairs behind aggregate gains. Compare each new owner URL against the FF&E schedule, specification sheet, room-data record and procurement guide: shared relevant queries need distinct jobs, and an aggregate gain must not conceal displacement of an existing useful page. Inspect canonical/indexing status before calling a traffic shift cannibalization. Changing titles to chase unrelated impressions is not cohort success. Use the latest complete periods and document any comparison-period or attribution coverage limitation. Do not launch a wider family from downloads alone.

## Remaining work and ownership

| Work                                                      | Current state / completion evidence                                                                                                                                                                                                          | Responsible role                |
| --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| Public educational HTML/XLSX/PDF and contextual discovery | Complete: PR #26; final 47-page / 45-indexable / 26-download production audit passed 866/866                                                                                                                                                 | Engineering + release owner     |
| First-live ledger entries for both new URLs               | Complete: PR #27 records actual September 27 05:35:03 UTC production evidence, release commit and audit hash                                                                                                                                 | Release owner                   |
| First six reviews and two exact-bundle reviews            | Pending; allocate 2–4 hours/week, retain actual scope/date/hash and permission before naming reviewers                                                                                                                                       | Practitioner + content          |
| Workbook and PDF compatibility                            | Current XLSX files passed LibreOffice edit/save/reopen and native Google Sheets cell/validation/edit/readback checks; published PDF and LibreOffice print layouts inspected. Excel desktop and Google visual-layout checks remain unverified | Content + QA                    |
| OpenLintel GA4 and GSC access                             | Obtain verified property/stream access; missing data remains unavailable                                                                                                                                                                     | Growth + property owner         |
| Real analytics acceptance                                 | Complete the consent/runtime checklist before enabling collection; preserve actual activation date                                                                                                                                           | Growth + privacy                |
| Real discovery intake                                     | Verify delivery, attribution, monitoring, ownership and private receipt reconciliation before enabling requests                                                                                                                              | Operations + privacy            |
| Cohort search and qualified-studio reporting              | Implemented; populate only from actual provider data and authorized private records                                                                                                                                                          | Growth + operations             |
| Day 30/60/90 decisions and overlap checks                 | Due October 27, November 26 and December 26, 2026; hold where access, sample size or readiness prevents a supported decision                                                                                                                 | Growth + practitioner + founder |

Keep assigned people, review evidence, compatibility copies and actual customer records in the private working register. This runbook records roles and requirements, not invented staffing or completed reviews. Public availability alone completes none of the remaining professional or operational acceptance work.
