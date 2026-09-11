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
