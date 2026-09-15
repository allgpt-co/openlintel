# OpenLintel marketing website

Six core marketing pages, six pilot/trust/privacy pages, 32 professional resource pages, a printable summary, and a custom 404, built independently of the application. The creative direction is **Your vision. In every detail.** The intended audience is international residential design studios and architects.

## Build and preview

Use Node 20+ and the repository's pinned pnpm 9.15.4:

```sh
pnpm marketing:build
pnpm marketing:preview
```

Preview at `http://localhost:4173`. Set `PORT` to use a different port. Install the workspace’s pinned dependencies first (`npx --yes pnpm@9.15.4 install --frozen-lockfile`). The static build uses Node plus pinned build-only Office document libraries; there are no browser framework dependencies or build-time network calls. If the global pnpm version differs, run `npx --yes pnpm@9.15.4 marketing:build`, or run `node apps/marketing/build.mjs` directly.

The source renderer writes 45 registered HTML documents (six core pages, six pilot/trust/privacy pages, a printable summary, two resource hubs, eighteen guides, and twelve template pages), plus a custom `404.html`, shared assets, sample drawings, seven teaching diagrams, and 18 editable Office downloads into `docs/`. Generated output is checked in for GitHub Pages compatibility. Edit marketing source and rebuild; do not hand-edit generated pages.

Existing `docs/CNAME`, `docs/architecture.md`, and `docs/development.md` are preserved. The renderer overwrites only its named output paths; it never cleans the output directory recursively. `docs/marketing-manifest.json` lists generated files. A versioned ownership manifest records file hashes. Removing a route prunes only unchanged files proven to belong to a prior versioned build; legacy manifests, modified artifacts, and unrelated files cannot authorize deletion. Route redirects remain a separately verified hosting operation.

## Configuration

Defaults: canonical origin `https://openlintel.com`, base path `/`, repository `allgpt-co/openlintel`.

```sh
MARKETING_BASE_PATH=/openlintel/ MARKETING_ORIGIN=https://allgpt-co.github.io MARKETING_OUT_DIR=/tmp/openlintel-site node apps/marketing/build.mjs
MARKETING_BASE_PATH=/openlintel/ MARKETING_OUT_DIR=/tmp/openlintel-site node apps/marketing/preview.mjs
```

The second configuration previews at `http://localhost:4173/openlintel/`. Use the same base path for build and preview. Canonical URLs, social metadata, navigation, downloads, and the sitemap all follow the configuration.

## Source organization

- `config.mjs`: core page metadata, canonical origin, and URL helpers.
- `registry.mjs`: keyed page registry, publication states, related resources, and topic clusters.
- `content/`: separately authored guide content and shared template field/example definitions.
- `resources.mjs`: hubs, article layouts, worked-example previews, and teaching diagrams.
- `documents.mjs`: reproducible DOCX/XLSX generation and budget calculation helpers.
- `components.mjs`: shared document shell, navigation, footer, image and table helpers.
- `pages.mjs`: homepage, workflow, sample, audience, open-source, and summary content.
- `drawings.mjs`: deterministic sample SVGs with review labels and references.
- `data/project.json`: shared brief, dimensions, concepts, drawing references, and materials. The table, printable summary, and CSV are generated from this fixture.
- `assets/site.css` and `assets/site.js`: responsive design and progressive enhancement.
- `data/image-prompts.json`: exact prompts and generation provenance.

The sample has five URL fragments: `#brief`, `#design`, `#drawings`, `#materials`, and `#handoff`. Quiet Oak is the fixed selected route. Deep Olive is a comparison study and does not replace downstream artifacts. No production API is called. There is no hosted product signup or external font request. The pilot form and optional GA4 integration are implemented but disabled by default; activation requires verified public IDs, a real contact email, and explicit operational/privacy readiness checks. See [the launch runbook](operations/LAUNCH.md).

## Visual assets

Five original concept images were created with the built-in `image_gen.imagegen` tool on 2026-09-11. The master room was used as the reference for its empty-room view, alternative finish study, reading-corner detail, and material still life. They describe a fictional project and are labeled as illustrative. They are not images from a completed client project or a live application session.

Original images and responsive WebP variants are saved in `assets/images/`. Only WebP variants are published. Responsive sizes are 480, 960, and 1536 pixels wide, encoded at quality 82 with Sharp. To regenerate a derivative after intentionally updating an original:

```sh
npx --yes --package=sharp-cli sharp -i apps/marketing/assets/images/room-original.png -o apps/marketing/assets/images/room-960.webp -f webp -q 82 resize 960
```

The image-generation prompts are the authoring source for semantic visual changes; drawings and labels are authored as SVG/HTML. Keep windows, flooring, room proportions, and selected materials consistent across variants. The SVGs illustrate nominal dimensions and always remain marked pending review and do not scale.

Cormorant Garamond and Manrope are self-hosted WOFF2 subsets containing Latin text, punctuation, and arrow ranges. Original font sources are Google Fonts; both families' OFL license files are distributed with the fonts. To add another language, regenerate font subsets with its glyph coverage.

## Verification

```sh
pnpm marketing:check
pnpm marketing:smoke
```

The static check builds into disposable directories at both `/` and `/openlintel/`, verifies preservation of existing files, resolves local links and fragment IDs, checks unique headings/titles/IDs and responsive image files, validates sample references, and enforces the 200 KB compressed HTML/CSS/JS budget.

Run the preview before the browser smoke suite. It uses the pinned Playwright CLI 0.1.19 through `npx`; its first run may download the CLI. Supply `MARKETING_BROWSER_EXECUTABLE` if Chrome is not available at the CLI's default location. For container environments that cannot support Chromium sandboxing, the smoke runner supports `MARKETING_BROWSER_NO_SANDBOX=1` for the local preview only. `MARKETING_PREVIEW_URL` overrides the preview origin/base path.

The browser suite checks all 45 registered documents at 360, 390, 768, 1024, and 1440 pixels; captures representative desktop/mobile screenshots; walks all chapters; compares concepts; expands drawings; checks Escape and focus restoration; exercises browser history, reload, all downloads, and print invocation; verifies mobile navigation, JavaScript-disabled reading, reduced motion, and 200% zoom, plus all 18 Office downloads, resource navigation, print layouts, and no unexpected external requests in the default disabled build. A separate `pnpm marketing:growth-smoke` suite builds an enabled fixture in a disposable directory and intercepts vendor requests to test form acceptance, errors, attribution and consent without sending real leads or analytics. Screenshots and audit reports are local artifacts under ignored `output/playwright/`.

## Publication and rollback

The static output is compatible with the repository's existing `docs/` hosting structure. Verify the actual GitHub Pages source configuration and DNS before publication; the configured custom domain was not resolving during initial discovery. Do not infer that the app is hosted from the presence of its source code.

Publish a reviewed commit containing the generated output, then request every route from `docs/marketing-manifest.json` and all downloads over HTTPS. Check canonical URLs against the deployed hostname. Roll back by reverting the marketing commit and republishing the prior static output. The application deployment workflow is unchanged.

## Resource library authoring

- `/resources/` groups all guides and templates by project stage; `/templates/` lists the twelve editable resources.
- Templates use a single definition for the web preview, field help, blank files, and worked examples. Six XLSX workbooks contain Instructions, Blank Template, and Worked Example sheets; six DOCX resources each have a blank and example file. No PDF or PowerPoint downloads are promised.
- The original sample fixture remains unchanged. Added narrative, prices, and diagrams are explicitly labeled teaching extensions. The RCP diagram is not an additional original project drawing. Guides do not claim professional certification or independent expert review.
- Registry `status: 'published'` means eligible for static output, not already deployed. Drafts are omitted; a published page cannot reference a draft through `related`. Route removal uses the versioned hash-backed ownership policy described above; valid redirects are not created automatically.
- `wave` records the agreed editorial sequence (16 / 8 / 8 resource pages). All three waves are authored and included in this local build. Publishing remains a separate operational action; no DNS, hosting, or account settings are changed by the build.
- Update `modified` only after a substantive editorial change. There is no fabricated production `datePublished`. Office creation/ZIP timestamps remain reproducible; modified metadata and the visible document revision date follow the resource’s substantive editorial modification, not build time.
- DOCX/XLSX files are macro-free. Budget input columns are C/E/F/H; calculated columns are G/I. Blank quantity or price leaves totals unresolved. Subtotals cover known lines only; examples use USD teaching figures, not market prices or tax advice. Files are editable, not password-protected.
- Download metadata includes actual byte size. Preview MIME types support Office formats. Resource content remains static, ungated, and usable without JavaScript. No uploads are introduced. Optional pilot intake supports native form submission; optional analytics uses basic opt-in and never gates access to resources or the form.

### Research and launch checklist

`data/seo-research-2026-09-14.json` preserves DataForSEO keyword metrics, observed SERPs, assumptions, and the complete URL-to-keyword map. It is internal evidence, not a runtime API or public asset. Missing metrics remain null. Search-volume estimates overlap and must not be summed into a traffic forecast.

Before publishing:

1. GitHub Pages was verified on September 15 as serving `main:/docs`. Verify the current source commit and settings again; the application deployment workflow remains separate.
2. Resolve `openlintel.com`, verify HTTPS, and ensure the canonical origin matches the production hostname. If using the existing GitHub Pages approach, confirm the selected branch and `/docs` source in repository settings rather than assuming it is configured.
3. Complete editorial/project-professional review as appropriate, run the static and browser checks, and publish a reviewed commit including generated files. No new automatic deployment workflow is added.
4. Fetch all manifest routes, downloads, `robots.txt`, and `sitemap.xml` on production. Confirm successful status codes and no accidental authentication or noindex headers.
5. Verify access to **OpenLintel’s** Search Console property; do not reuse the unrelated property discovered in the environment. Submit the sitemap and inspect representative hub, guide, and template URLs.
6. Record the real publication date. Review indexing after 2–4 weeks and compare complete 28-day periods near days 60 and 90, grouped by topic cluster and non-branded query. Investigate intent overlap before merging pages.
7. Downloads and sample clicks are measured only after a verified GA4 integration is enabled and a visitor consents. Search Console cannot report these interactions. Qualified completed conversations are recorded in the private lead register, not inferred from GA4 events.

Rollback by reverting the reviewed marketing change and republishing the prior static output. Keep the app deployment workflow untouched.


## SEO implementation and operations

- `growth-config.mjs`, `growth-pages.mjs`, and `assets/growth.*`: pilot/trust/privacy pages, fail-closed release configuration, native/AJAX Formspree intake, consent and allowlisted event instrumentation. Public configuration is documented in `.env.example`; it is not automatically loaded.
- `owned-output.mjs`: versioned artifact ownership and conservative cleanup. `marketing-manifest.json` includes origin, effective indexability, and SHA256 hashes for verifying the reviewed output.
- `production-check.mjs`: bounded, GET-only deployed status/hash/canonical/sitemap/404/redirect audit; exits nonzero on failed gates. Use `--url http://localhost:4173/` for a local-only check, not production signoff.
- `search-report.mjs`: read-only, verified OpenLintel property reports. Ignores unrelated shared property IDs. Reports stay in ignored `output/seo/` and never enter the public build.
- [Operations](operations/README.md): six-month roadmap, exact qualification/measurement rules, launch activation and rollback, blank private-register templates, pending professional-review tracker.

Commands:

```sh
pnpm marketing:lint              # scoped Node/browser source lint
pnpm marketing:check             # all marketing *.test.mjs suites
pnpm marketing:growth-smoke      # disposable configured fixture; mocked external services
pnpm marketing:production-check # actual public domain; fails while DNS/HTTPS are unresolved
pnpm marketing:search-report     # verified explicit properties and read-only OAuth required
```

Current publication prerequisites are external: domain resolution/HTTPS, real integration IDs and delivery, correct Google property access, operational ownership, privacy review, and practitioner review. Code/tests do not complete these attestations. The sample remains fictional; no reviewer, case study, customer result, video, backlink, or live application availability has been fabricated.
