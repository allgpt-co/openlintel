import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { config } from './config.mjs';
import { programmaticCandidates } from './programmatic-catalog.mjs';
import { createRegistry, publishedPages } from './registry.mjs';
import { createReviewBundle, writePrivateReviewFile } from './programmatic-review.mjs';

export async function generatePrivateReviewBundles({
  output = 'output/seo/programmatic-review',
  workspaceRoot,
} = {}) {
  const project = JSON.parse(
    await readFile(new URL('./data/project.json', import.meta.url), 'utf8'),
  );
  const registry = publishedPages(createRegistry(project));
  const results = [];
  for (const page of programmaticCandidates(project)) {
    const bundle = await createReviewBundle({ page, project, registry });
    const directory = `${output}/${page.id}`;
    const relativeArtifactHtml = bundle.html
      .replace(/href="[^" ]*\/assets\/downloads\/templates\/([^"/]+)"/g, 'href="artifacts/$1"')
      .replace(/href="(\/[^" ]*)"/g, (_, path) => `href="${config.origin}${path}"`);
    const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="robots" content="noindex,nofollow"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Private review: ${page.id}</title><link rel="icon" href="data:,"><style>*{box-sizing:border-box}body{overflow-wrap:anywhere;font:16px/1.55 system-ui;max-width:1100px;margin:2rem auto;padding:1rem}table{border-collapse:collapse}th,td{border:1px solid #aaa;padding:.5rem}a{color:#70402a}.table-scroll{overflow:auto}.download-actions{display:flex;flex-wrap:wrap;gap:1rem}dt{font-weight:700}section{margin:2rem 0}</style></head><body><p>PRIVATE CANDIDATE · NOT APPROVED OR RELEASED · ${bundle.bundleHash}</p>${relativeArtifactHtml}</body></html>`;
    await writePrivateReviewFile(`${directory}/index.html`, html, workspaceRoot);
    for (const artifact of bundle.downloads)
      await writePrivateReviewFile(
        `${directory}/artifacts/${artifact.path.split('/').at(-1)}`,
        artifact.buffer,
        workspaceRoot,
      );
    await writePrivateReviewFile(
      `${directory}/bundle.json`,
      JSON.stringify(
        {
          ...bundle.manifest,
          bundleHash: bundle.bundleHash,
          publicationState: 'pending',
          requiredGates: [
            'first-six-practitioner-reviews',
            'candidate-exact-bundle-review',
            'intent',
            'overlap',
            'intake',
            'measurement',
            'artifactCompatibility',
          ],
        },
        null,
        2,
      ) + '\n',
      workspaceRoot,
    );
    results.push({
      id: page.id,
      bundleHash: bundle.bundleHash,
      directory,
      artifacts: bundle.downloads.length,
    });
  }
  await writePrivateReviewFile(
    `${output}/index.json`,
    JSON.stringify({ state: 'private-review-only', candidates: results }, null, 2) + '\n',
    workspaceRoot,
  );
  return results;
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const args = process.argv.slice(2);
  if (args.length && (args[0] !== '--out' || args.length !== 2))
    throw new Error(
      'Usage: node apps/marketing/programmatic-review-cli.mjs [--out output/seo/review-directory]',
    );
  const result = await generatePrivateReviewBundles({ output: args[1] });
  console.log(JSON.stringify({ state: 'private-review-only', candidates: result }, null, 2));
}
