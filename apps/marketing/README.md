# OpenLintel marketing website

Six static marketing pages and a five-chapter illustrative project, built independently of the application. The creative direction is **Your vision. In every detail.** The intended audience is international residential design studios and architects.

## Build and preview

Use Node 20+ and the repository's pinned pnpm 9.15.4:

```sh
pnpm marketing:build
pnpm marketing:preview
```

Preview at `http://localhost:4173`. Set `PORT` to use a different port. The build uses only Node built-ins and does not require installing app dependencies. If the global pnpm version differs, run `npx --yes pnpm@9.15.4 marketing:build`, or run `node apps/marketing/build.mjs` directly.

The source renderer writes seven HTML documents (six pages plus a printable summary), shared browser assets, an SVG furnished plan, an SVG joinery elevation, and a materials CSV into `docs/`. Generated output is checked in for GitHub Pages compatibility. Edit marketing source and rebuild; do not hand-edit generated pages.

Existing `docs/CNAME`, `docs/architecture.md`, and `docs/development.md` are preserved. The renderer overwrites only its named output paths; it never cleans the output directory recursively. `docs/marketing-manifest.json` lists generated files. Removing or renaming a route requires explicitly removing that obsolete generated route as part of the change.

## Configuration

Defaults: canonical origin `https://openlintel.com`, base path `/`, repository `allgpt-co/openlintel`.

```sh
MARKETING_BASE_PATH=/openlintel/ MARKETING_ORIGIN=https://allgpt-co.github.io MARKETING_OUT_DIR=/tmp/openlintel-site node apps/marketing/build.mjs
MARKETING_BASE_PATH=/openlintel/ MARKETING_OUT_DIR=/tmp/openlintel-site node apps/marketing/preview.mjs
```

The second configuration previews at `http://localhost:4173/openlintel/`. Use the same base path for build and preview. Canonical URLs, social metadata, navigation, downloads, and the sitemap all follow the configuration.

## Source organization

- `config.mjs`: routes, titles, descriptions, canonical origin, URL helpers.
- `components.mjs`: shared document shell, navigation, footer, image and table helpers.
- `pages.mjs`: homepage, workflow, sample, audience, open-source, and summary content.
- `drawings.mjs`: deterministic sample SVGs with review labels and references.
- `data/project.json`: shared brief, dimensions, concepts, drawing references, and materials. The table, printable summary, and CSV are generated from this fixture.
- `assets/site.css` and `assets/site.js`: responsive design and progressive enhancement.
- `data/image-prompts.json`: exact prompts and generation provenance.

The sample has five URL fragments: `#brief`, `#design`, `#drawings`, `#materials`, and `#handoff`. Quiet Oak is the fixed selected route. Deep Olive is a comparison study and does not replace downstream artifacts. No production API is called. There is no sign-up, lead form, third-party analytics, or external font request.

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

The browser suite checks all seven documents at 360, 390, 768, 1024, and 1440 pixels; captures desktop/mobile screenshots; walks all chapters; compares concepts; expands drawings; checks Escape and focus restoration; exercises browser history, reload, all downloads, and print invocation; verifies mobile navigation, JavaScript-disabled reading, reduced motion, and 200% zoom. Screenshots and audit reports are local artifacts under ignored `output/playwright/`.

## Publication and rollback

The static output is compatible with the repository's existing `docs/` hosting structure. Verify the actual GitHub Pages source configuration and DNS before publication; the configured custom domain was not resolving during initial discovery. Do not infer that the app is hosted from the presence of its source code.

Publish a reviewed commit containing the generated output, then request all six public routes, the printable summary, and downloads over HTTPS. Check canonical URLs against the deployed hostname. Roll back by reverting the marketing commit and republishing the prior static output. The application deployment workflow is unchanged.
