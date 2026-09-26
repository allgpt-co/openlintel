# Programmatic SEO implementation verification — September 26, 2026

The prior SEO release is deployed: PR #24 merged as `dd52074b89e1c0be86f7768c7cce93f32ef4d18d`, GitHub Pages built that revision, and its production audit passed **824/824**. The dated pre-deployment entries below remain historical. The validation below was recorded for the programmatic implementation on `programmatic-seo-pilot-20260926` before its commit and deployment. Subsequent merge/Pages status must be established from the PR, deployed commit and production audit; local checks alone do not establish publication.

## Implemented scope

- Two private selection/procurement candidates: purchase-order planning and a residential plumbing-fixture schedule. Each has a shared authored definition, HTML preview, editable three-sheet XLSX and PDF preview. Research provenance is retained in `data/pseo-research-2026-09-26.json`; there is no runtime provider dependency.
- Exact-bundle approval covers authored content, substantive HTML, artifact bytes and conservative source/generator/dependency fingerprints. New publications require current first-six reviews, candidate permissioned review, intent/overlap/intake/measurement/compatibility evidence, and enabled verified integration configuration. The real release allowlist remains empty.
- Final release review also enforces registry/history retirement agreement, exact production evidence URLs, compatibility evidence bound to the approved bundle and revision date, and completeness of the initial two-page cohort. These controls are covered by regression tests; no actual review evidence was supplied.
- Builds generate and validate all output in a temporary directory before promoting owned files. The manifest is v3; v2 ownership/audit compatibility remains. History preserves 47 stable identities: 45 legacy entries with unknown first-live dates and two never-released candidates. CI compares history to the event's prior commit to reject identity/evidence rewrites.
- Search reporting v3 adds family/cohort GSC and GA cuts; outcome reporting v2 globally deduplicates qualified studios before assigning earliest observed organic cohort credit. Independent review fixed pre-live attribution, incompatible GSC property scope and mixed legacy-date clocks. Unknown, out-of-scope and not-released states remain distinct from measured zero.
- [The pilot runbook](operations/PROGRAMMATIC-SEO.md) records operating capacity, commands, release evidence and 30/60/90-day decisions. The private checklist has eight added implementation/review/release/measurement tasks. Actual reviews and release gates remain pending.

## Current validation

- **112/112 automated tests pass**, including a disposable full 47-page build with synthetic test-only approvals and enabled fixture configuration. Both candidates have hub and contextual links, correct manifest metadata and exact reviewed XLSX/PDF bytes. Post-preflight workbook corruption fails before promotion; all previous public bytes remain unchanged. No synthetic review reaches the real catalog or public output.
- Marketing ESLint, scoped Prettier and `git diff --check` pass. No dependency or lockfile changes. The history CLI passes real-Git predecessor tests and recognizes this as the initial ledger migration.
- Canonical `docs/` regenerated. Repeated root output has identical manifest and bytes for all **119 generated files**. Every existing public HTML, asset and download hash is unchanged from main. Only the public manifest metadata changes. Inventory remains **45 registered pages, 43 indexable URLs and 22 template downloads**.
- Local served audits pass **775/775 at `/` and 775/775 at `/openlintel/`**. Root and subpath Playwright suites pass all 45 pages at five viewport widths, keyboard/history/print/no-JavaScript checks and all downloads, with zero browser errors or failed requests. The configured growth suite passes with vendor requests intercepted; no real submissions or analytics collection occur.
- Private candidate HTML passes at 360, 768 and 1440 pixels, remains noindex, and serves all four intended artifacts. Both full-page previews were visually inspected. Long hash/URL wrapping and spacing between download links were corrected in the private wrapper.
- LibreOffice 24.2.7.2 opens, edits, saves and reopens both new workbooks. All **11 authored PDF pages and 19 workbook print pages** were inspected without clipping. Example values, explicit zero and unrelated blanks survive editing. All 22 legacy downloads remain byte-identical.
- Both final XLSX files convert to private native Google Sheets with all three tabs, example records, unresolved blanks, numeric values and nonnegative validation preserved. Explicit zero was written, read back and cleared in each blank template. Owner-only sharing was verified. Native formatting metadata was inspected; Google-rendered layout and Sheets print pagination were not verified. Microsoft Office desktop was not tested.

Local evidence remains under ignored `output/seo/` and `output/playwright/`, including exact bundle manifests, artifact hashes, native compatibility results, served audits and browser screenshots. Files containing private Google IDs remain outside tracked source. These checks establish implementation and compatibility evidence, not practitioner approval.

## Remaining release gates

All 30 existing practitioner reviews and both new candidate reviews remain pending. Discovery intake and analytics remain disabled until real operational/account acceptance. Verified OpenLintel GA4/GSC reporting access and actual acquisition outcomes are still unavailable. Neither candidate is in the public registry, sitemap or downloads; milestone clocks have not started. See [the pilot runbook](operations/PROGRAMMATIC-SEO.md), [launch runbook](operations/LAUNCH.md) and [analytics acceptance](operations/ANALYTICS-ACCEPTANCE.md).

---

# SEO implementation verification — September 26, 2026

This entry records the current source changes. The dated sections below are preserved as historical evidence and do not establish the status of this release candidate.

## Current implementation and verified baseline

- The pre-change local baseline passed **42/42 automated tests**. A read-only audit of the previously deployed production build on September 25, 2026 (September 26 UTC) passed **796/796 checks**, including the public host, HTTPS, redirects and reviewed files. This supersedes the historical unresolved-DNS status below. It is not evidence that the new changes are deployed.
- The public URL inventory remains **45 registered pages plus the custom 404**, with **43 indexable sitemap URLs**. Source adds two editable eight-slide PPTX decks and two PDFs to the original twelve DOCX and six XLSX downloads, plus two assembled mood-board SVGs. The existing presentation and mood-board URLs remain unchanged. DOCX/XLSX print layouts use US Letter; diagrams and worked examples retain their stated nominal units and review limitations.
- Closed discovery intake now offers availability information, with no pilot CTA event when intake is disabled. About, Privacy and editorial corrections use the published contact consistently. A displayed contact does not bypass verified contact, provider, ownership or privacy requirements. The hosted application is described as experimental; its landing metadata defaults to noindex, and sign-in remains noindex.
- Optional review credits require actual permission, reviewer identity and scope, valid completed dates, and an exact authored-content hash. Actual download generation was checked in memory across all twelve template definitions: appending generated file metadata preserves the hash. No practitioner review was invented or marked complete. Guide revision dates belong to individual authored records.
- Search reporting adds explicit host/stream segments, bounded pagination, independent totals, US/global cuts, 90-day context, content/query groupings, registered custom-event detail and optional read-only URL Inspection. Private outcome reporting deduplicates studio records and emits aggregate counts with data-quality diagnostics. Independent review and the final regression suite verified reporting corrections, including unknown and partial states.

## Final local validation

Verified September 26, 2026, before deployment:

- `node --test apps/marketing/*.test.mjs`: **76/76 passed**, including reporting failures, receipt-relative source evidence, studio deduplication, review hashes, draft exclusion and mixed-format generation.
- Marketing ESLint, affected application-file ESLint, scoped Prettier and `git diff --check`: passed. Pinned pnpm 9.15.4 accepted the frozen lockfile offline in an isolated copy of all seven workspace manifests; this did not reinstall the working environment.
- Canonical `docs/` regenerated. A separate root build produced an identical manifest and identical bytes for all **119 generated files**. The subdirectory build also passed.
- Served-output audits: **775/775 checks at `/` and 775/775 at `/openlintel/`**, explicitly local previews. The previous live production result remains the pre-change 796/796 baseline; these new artifacts have not been deployed.
- Playwright CLI smoke passed for both paths: all 45 pages at 360, 390, 768, 1024 and 1440 px, sample chapters/history, keyboard/focus, print, no-JavaScript access, reduced motion, 200% zoom and all **22 template downloads** plus three sample downloads. Both runs reported zero browser errors and zero failed requests.
- Configured growth fixture passed consent acceptance/rejection/withdrawal, cross-tab teardown, source/consent expiry, blocked storage, accepted-only conversions, provider failure paths and native no-JavaScript submission. Actual XLSX, both PPTX and both PDF downloads completed and each emitted exactly one correctly classified mock event. All provider requests were intercepted; no live submission or Google collection occurred. Deliberate 422/network/429 failure cases produced expected browser console messages.
- LibreOffice 24.2.7.2 opened all 18 DOCX/XLSX files and converted them to 54 US Letter pages. Representative first-six print pages were inspected after fixing narrow print text. Both eight-slide PPTX decks opened; native title and shape-color edits survived save/reopen. All 16 slide renders and all ten PDF pages were visually inspected without clipping. Budget recalculation preserved positive totals, overruns, explicit zero and missing inputs.
- A private Google Slides import retained eight slides and native editable objects; all eight native slide thumbnails were visually inspected. Its structural issue check returned zero issues. The connector PDF export was unavailable, so native thumbnails supplied the rendering evidence.
- A private Google Sheets budget import retained formulas and recalculated total 2,500 / remaining -1,000, explicit zero / zero and missing quantity / blank. Test inputs were then cleared. This tested the same calculation logic before final print-width changes; it does not certify final Sheets print pagination or every workbook. Microsoft Office desktop was not tested.

Ignored verification artifacts are under `output/seo/` and `output/playwright/`, including the release test log, root/subpath served reports, browser logs, native Google validation and artifact-review evidence. These machine and interoperability checks do not replace practitioner review.

## Remaining external gates

These changes have not established a deployment, accessible OpenLintel GA4/GSC reporting properties, actual Google-runtime collection, real Formspree delivery, completed discovery conversations, practitioner reviews, or outreach. Pilot and analytics activation require the actual readiness checks in [the launch runbook](operations/LAUNCH.md) and [analytics acceptance record](operations/ANALYTICS-ACCEPTANCE.md). The purchase-order resource remains an unpublished draft. Preserve historical provider observations and mark missing data unavailable rather than zero.

---

# SEO implementation verification — September 15, 2026

## Current local release candidate

- **45 registered pages plus a custom 404**: six core pages, six pilot/trust/privacy pages, two hubs, eighteen guides, twelve templates, and one printable summary. **43 indexable sitemap URLs**; summary, confirmation and 404 are intentionally noindex. Existing URLs are preserved.
- **37 automated tests passed**, covering root/subpath builds, metadata and publication rules, content integrity, Office generation/revision dates, form activation gates, conservative hash-owned cleanup, real preview routing, production-audit failure regressions, verified-property analytics reporting, and private report permissions/symlink defenses.
- Full Playwright CLI smoke passed at both `/` and `/openlintel/`: all 45 pages at 360, 390, 768, 1024 and 1440 px; all five sample chapters; history, keyboard/focus, print, no-JavaScript reading, reduced motion, 200% zoom, and all 18 Office plus three sample downloads. Zero browser errors or failed requests. Metadata-only copy/date refinements and CSV newline normalization were subsequently rechecked by the static and served-output suites.
- Separate configured growth fixture passed across five viewport sizes: actual Formspree JSON success contract, validation/rejection/malformed/rate-limit/network paths, native no-JavaScript POST, direct confirmation without conversion, no pre-consent analytics, allowlisted PII-free events, consent/attribution expiry, blocked storage, cross-tab withdrawal/timer teardown, and marketing-only cookie removal. Vendor requests were intercepted; **no live submissions or Google collection** were sent. Mocked integration tests do not prove real provider delivery or GA behavior.
- Served-output audits passed **715/715 checks** for root and subpath previews. These are explicitly local checks, not production signoff. Checks cover public routes and physical files, exact reviewed bytes, MIME types, canonical/indexing directives, sitemap membership, genuine 404s and trailing-slash redirects.
- Source lint and code formatting passed. Repeated builds are deterministic. The CSV now follows the repository's LF policy so Git normalization cannot invalidate its deployed SHA-256. CI verifies that checked-in `docs/` artifacts match the source build and public release configuration, without deploying or contacting integration vendors.
- Original CNAME, technical Markdown and application deployment workflow are preserved. Internal operations materials, blank register schemas, research evidence and analytics exports are not copied into public assets. Existing 18 Office files remain parseable, macro-free and deterministic; **LibreOffice visual rendering and Lighthouse were not rerun for this release**. Earlier results below are historical, not current scores.
- Representative pilot desktop/mobile and guide screenshots were visually reviewed. The existing visual identity and ungated resource access are retained. All practitioner-review assignments remain pending; automated checks do not certify professional correctness.

## External status and remaining gates

Read-only GitHub inspection confirmed Pages serves `main:/docs`, with `openlintel.com` configured, HTTPS enforcement false and no certificate returned. Public DNS checks found no apex address records and an unresolved www host. The public release audit **failed with ENOTFOUND**. A built Pages status is not proof of this local revision being deployed.

This local verification did not change DNS/hosting settings, submit a sitemap, activate a real pilot form, create a GA property, send outreach, or establish traffic uplift. Commit, merge and deployment state must be checked separately in GitHub; passing local checks is not proof of public availability. Pilot intake and analytics remain disabled pending verified account/contact details, real delivery/runtime checks, operational ownership, privacy review and the release checks in [the launch runbook](operations/LAUNCH.md). Six-month editorial review, outreach, pilot outcomes and reporting remain ongoing external work.

---

## Resource-library verification — September 14, 2026

This section covers the new resource library. The Lighthouse results below are historical measurements of the earlier site and have **not** been rerun for this expansion.

- 33 HTML documents: seven existing documents plus 26 new pages (two hubs, twelve guides, twelve templates).
- 18 editable Office downloads: six XLSX workbooks and twelve DOCX files (six blank/example pairs).
- Static checks pass for both root and `/openlintel/` builds, including link/fragment resolution, unique headings/titles/descriptions, canonicals, sitemap coverage, structured data, hub/related inbound links, manifest byte sizes, preserved files, and the compressed page budget.
- Office archives parse successfully, contain the expected fields/sheets, are macro-free, and regenerate with identical SHA-256 hashes. Budget tests cover known values, missing inputs, zero values, rounding, and negative variance.
- Playwright CLI checks all 33 pages at 360, 390, 768, 1024, and 1440 px. Existing sample interactions remain covered. Resource navigation, download filenames/byte sizes, no-JavaScript reading, print styles, keyboard access, reduced motion, and 200% zoom pass without browser errors or failed requests.
- A complete browser run also passed against the `/openlintel/` subdirectory preview.
- Source ESLint and Prettier checks pass; the frozen dependency lockfile validates. A repeat full build produces byte-identical owned outputs. The largest combined compressed HTML/CSS/JS payload is 16,330 bytes, below the 200,000-byte budget (images and fonts excluded).
- Browser review found and fixed desktop navigation overflow at 200% zoom after adding Resources. The navigation now wraps without changing the mobile menu behavior.
- Representative screenshots are in ignored `output/playwright/`. No GA4 or other external browser requests were introduced.
- All 18 Office files opened and rendered in LibreOffice 24.2.7, extracted into `/tmp` for verification only (not a project dependency). Representative questionnaire and spreadsheet pages were visually reviewed. An edited budget recalculated to 2,500 total and -1,000 variance; zero remained zero and missing prices remained unresolved. Spreadsheet instructions print without horizontal page splitting; Word review notes no longer leave an orphaned heading. Artifacts are in ignored `output/playwright/office/`.
- Production DNS/HTTPS, hosting publication, and Search Console access remain unverified. No production deployment or traffic uplift is claimed.

# Verification — 11 September 2026

The marketing site was built and checked locally. It has not been published to GitHub Pages or the custom domain.

## Completed checks

- Static builds at `/` and `/openlintel/`: passed. Seven HTML documents, all local links and fragment targets, unique titles/headings/IDs, responsive image candidates, download references, and the compressed code budget were checked.
- Existing CNAME and technical Markdown preservation: passed in disposable build fixtures and confirmed against the repository diff.
- Browser smoke suite: passed for all seven documents and all five sample chapters at 360, 390, 768, 1024, and 1440 pixels. No page-level horizontal overflow.
- Guided journey: concept comparison, the fixed Quiet Oak downstream selection, both drawings, modal Escape/focus restoration, browser Back/Forward, refresh, mobile chapter selection, and professional navigation passed.
- Handoff: all three downloads completed. The printable summary opened and its print action invoked the browser's print function.
- Progressive enhancement: all five chapters, both concepts, navigation, and downloads were available with JavaScript disabled. Reduced motion and 200% zoom in a 1280-pixel desktop viewport passed.
- Browser errors and failed HTTP requests during the smoke suite: zero.
- Source formatting, JavaScript syntax, SVG XML parsing, and `git diff --check`: passed.
- Manual visual review: homepage, workflow, audience pages, open-source page, sample, mobile materials view, and furnished-plan SVG. Corrected a mobile table container sizing issue and a wall-path error in the drawing during review.

## Local mobile Lighthouse audits

| Page | Performance | Accessibility | Best practices | SEO | LCP | CLS | Transfer |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Homepage | 98 | 100 | 100 | 100 | 2.4 s | 0 | 386 KiB |
| Sample project, initial brief | 99 | 100 | 100 | 100 | 2.2 s | 0.024 | 315 KiB |

These are local simulated mobile measurements, not production field data. The audits used Lighthouse's default mobile throttling against the Node preview server, with headless Chromium. Full JSON reports are saved under `output/playwright/lighthouse-home.json` and `output/playwright/lighthouse-sample.json`. The initial combined homepage HTML, CSS, and JavaScript compressed to approximately 13 KB.

## Reproduction

```sh
node apps/marketing/build.mjs
node --test apps/marketing/check.test.mjs
node apps/marketing/preview.mjs
```

In another terminal, with a browser installed:

```sh
pnpm marketing:smoke
```

For this container, the smoke run used `MARKETING_BROWSER_EXECUTABLE=/opt/ms-playwright/chromium-1228/chrome-linux64/chrome` and `MARKETING_BROWSER_NO_SANDBOX=1`.

The browser suite saves screenshots and its local browser configuration under ignored `output/playwright/`. Build instructions, publishing steps, configuration options, and image/font provenance are in `README.md`. Exact image-generation prompts are in `data/image-prompts.json`.

## Release status

The static output is ready for review. Actual GitHub Pages source configuration, domain resolution, and production HTTPS routes still need verification when publishing. No production application routes, APIs, database tables, or deployment workflows were changed.

---

# Release follow-up — September 19, 2026

This dated section supersedes the earlier statement that Lighthouse and Office visual checks had not been rerun. These are **local release-candidate checks**, not production field measurements, professional editorial approval, or proof of live vendor delivery.

## Fixes and fresh verification

- Fixed a trailing spacer in blank Word templates that produced a footer-only third page in the site-survey checklist. The latest checklist renders as two pages with all fields present.
- Limited non-budget spreadsheet worked examples to their actual populated rows and filter range. This removes the room-data workbook's extra page of empty rows. Blank templates retain twenty input rows; budget formulas and subtotal rows are preserved.
- Added regression coverage for both document fixes. **39 marketing tests passed**, including the three Office generation tests. Changed document source and tests pass ESLint and Prettier; `git diff --check` passed.
- Regenerated the canonical `docs/` output. Its manifest exactly matches the independently built root fixture. Root and `/openlintel/` served-output audits each passed **715/715 checks**, including exact download hashes, MIME types, public routing, canonical tags and intentional indexing rules.
- Full Playwright CLI smoke was repeated **after the Office fixes** at both `/` and `/openlintel/`: all forty-five pages at 360, 390, 768, 1024 and 1440 px, all sample chapters and navigation, history and focus behavior, print, no-JavaScript access, reduced motion, 200% zoom, and all eighteen Office plus three sample downloads passed. Both runs reported zero browser errors and zero failed requests. Representative guide and pilot screenshots were visually reviewed.
- Repeated the configured growth browser fixture: five viewport sizes, consent and withdrawal, cross-tab shutdown, expiry, blocked storage, sanitized events, accepted-only conversions, vendor error paths, native no-JavaScript submission, downloads, and sample events passed. All third-party requests were mocked; **no real lead submissions or analytics collection were sent**.
- Reopened and converted **all eighteen current Office files** with LibreOffice 24.2.7.2. All fifty rendered pages were rasterized for review; no footer-only page remains. Representative questionnaire, survey-checklist, budget and room-data pages were visually inspected for legibility, clipping and pagination. These checks validate presentation, not the professional correctness of the planning resources.
- A disposable copy of the current budget workbook recalculated in LibreOffice to 2,500 total and -1,000 remaining for the supplied test inputs. Explicit zero remained numeric zero; missing quantity left the calculated total and remaining amount unresolved. Cached results were verified directly in the saved Office XML, without changing the published workbook.

## Fresh local mobile Lighthouse measurements

Lighthouse 13.5.0 ran against the root Node preview using Chromium 149, default simulated mobile throttling, and a 4× CPU slowdown. Each row is one local lab run, not an aggregate or a Core Web Vitals field result.

| Page | Performance | Accessibility | Best practices | Preview SEO | LCP | CLS | Transfer |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Homepage | 97 | 100 | 100 | 69 | 2.50 s | <0.001 | 397 KiB |
| Sample project | 98 | 100 | 100 | 69 | 2.26 s | 0.020 | 326 KiB |
| Pilot discovery | 100 | 100 | 100 | 66 | 1.36 s | <0.001 | 66 KiB |
| Specification-change guide | 100 | 100 | 100 | 69 | 1.36 s | <0.001 | 82 KiB |
| Budget template | 100 | 100 | 100 | 66 | 1.36 s | <0.001 | 81 KiB |

The preview server deliberately sends `X-Robots-Tag: noindex, nofollow`. **That safety header is the only failed binary audit on these pages** and lowers the reported SEO score; it was not disabled to improve the score. Production crawlability must be checked independently against the deployed HTTPS host. A score of 100 on a local accessibility audit is not an exhaustive accessibility certification.

Fresh logs, Lighthouse JSON, rendered Office PDFs/PNGs and conversion evidence are under ignored `output/playwright/2026-09-19/`; served-output JSON reports are under ignored `output/seo/`. Disposable LibreOffice tooling is not a project dependency. The isolated installation emitted missing Java/language-registry warnings but successfully rendered every file; actual Microsoft Office interoperability has not been tested here.

## Boundaries that remain human or production work

All **thirty practitioner-review entries remain pending** in `operations/editorial-review.csv`; no reviewer, endorsement or client result was invented. Production DNS/HTTPS, merge/deployment state, provider activation, verified contact details, privacy/operational approval, outreach, videos, workshops and real longitudinal SEO reporting require their own evidence. Nothing in these local checks marks those tasks complete. Use the current launch runbook and GitHub release status rather than historical status statements above.

## Final recorded-tour release checks — September 19, 2026

This section supersedes the earlier September 19 note that two walkthrough videos
were still pending. Both recordings are genuine captures of the educational
marketing website, not live-application demonstrations, client work, professional
approval, or evidence of automated design output.

- Published two 50-second, 1280 × 920 H.264 recordings, each under 1 MB, with posters,
  burned-in captions, six-cue English VTT tracks, and descriptive plain-text
  transcripts. Players are on `/how-it-works/` and `/templates/`.
- New reproducible Playwright checks passed for both players at `/` and
  `/openlintel/`: real MP4 decoding/playback, native keyboard play/pause, seeking,
  playback completion, caption-track loading, transcript access, and caption/video
  downloads. Each player was checked at 375, 768 and 1440 px, with reduced motion.
  No MP4 request occurred before explicit user playback; there is no autoplay or
  external video embed. Browser exceptions and failed HTTP requests were zero.
- Visual inspection found and fixed overly small inherited caption-link styling.
  The final alternative links use at least 14 px text and 44 px-high targets,
  verified by the player smoke test at all three widths. Desktop and mobile player
  screenshots were reviewed, including visible timed captions and disclosures.
- Browser validation also found that the preview server needed MP4 byte-range
  responses for native seeking. Added bounded single-range GET handling (206),
  invalid/unsatisfiable range rejection (416), and `Accept-Ranges`. HEAD and
  unmatched If-Range requests retain full-response semantics. Regression coverage
  checks prefixes, suffixes, open ends, oversized/invalid numbers, and headers.
- Fixed the generated-output ownership allowlist for MP4/VTT and tested safe
  retirement: unchanged hash-owned media can be removed, modified media remains,
  and unsafe paths are still rejected.
- **42 marketing tests passed; marketing ESLint and `git diff --check` passed.**
  Root and `/openlintel/` served-output audits each passed **747/747 checks** after
  the final styling update. Canonical `docs/` was regenerated and its manifest
  exactly matches the independently built root fixture.
- The full 45-page/five-viewport smoke suite passed at both root and subpath after
  adding the videos, with zero browser exceptions and zero failed requests. The
  final link-sizing-only CSS adjustment was subsequently checked by the focused
  video suite at both deployment paths.

Reproduce the focused player checks against a running preview with
`node apps/marketing/video-smoke.mjs`. It accepts the same
`MARKETING_PREVIEW_URL`, `MARKETING_BROWSER_EXECUTABLE`, and
`MARKETING_BROWSER_NO_SANDBOX` options as the main smoke runner. Evidence is in
ignored `output/playwright/video-release-*.log`, player screenshots, and
`output/seo/video-*-audit.json`.

These are local release checks. Playback, byte ranges, indexing, DNS, TLS, and
vendor integrations still need production verification after publication; no
production measurement or professional editorial sign-off is claimed here.
