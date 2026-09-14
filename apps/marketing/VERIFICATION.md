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
