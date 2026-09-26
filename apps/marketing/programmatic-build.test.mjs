import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, mkdir, cp, readFile, writeFile, rm, symlink } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';

const execute = promisify(execFile);
const source = dirname(fileURLToPath(import.meta.url));
const repository = resolve(source, '../..');
const hash = (buffer) => createHash('sha256').update(buffer).digest('hex');
const approvalScript = `
import { readFile,writeFile } from 'node:fs/promises';
import { createRegistry } from './apps/marketing/registry.mjs';
import { programmaticCandidates,PROGRAMMATIC_GATES,FIRST_SIX_REVIEW_IDS } from './apps/marketing/programmatic-catalog.mjs';
import { createReviewBundle,sha256 } from './apps/marketing/programmatic-review.mjs';
import { editorialRevision } from './apps/marketing/editorial-review.mjs';
const project=JSON.parse(await readFile('./apps/marketing/data/project.json','utf8'));
const registry=createRegistry(project), releases=[];
for(const page of programmaticCandidates()) {
  const bundle=await createReviewBundle({page,project,registry});
  const evidence=Object.fromEntries(PROGRAMMATIC_GATES.map(gate=>[gate,{state:'verified',verifiedAt:'2026-09-26T00:00:00Z',evidenceHash:sha256('TEST ONLY '+gate)}]));
  evidence.artifactCompatibility.bundleHash=bundle.bundleHash;
  evidence.firstSixReviews=FIRST_SIX_REVIEW_IDS.map(id=>({id,reviewedRevision:editorialRevision(registry.find(p=>p.id===id))}));
  releases.push({id:page.id,approvedBundleHash:bundle.bundleHash,evidence,review:{state:'verified',reviewerName:'TEST ONLY reviewer',reviewerRole:'Disposable fixture',scope:'TEST ONLY: no real review',permissionToPublish:true,reviewedRevision:editorialRevision(page),reviewedBundleHash:bundle.bundleHash,reviewedAt:page.modified,sourcesCheckedAt:page.modified}});
}
await writeFile('./apps/marketing/data/programmatic-release.json',JSON.stringify({schemaVersion:1,releases}));
console.log(JSON.stringify(releases.map(({id,approvedBundleHash})=>({id,approvedBundleHash}))));
`;

test(
  'A disposable approved cohort builds 47 pages and exact artifacts; post-review generation changes cannot replace output',
  { timeout: 60000 },
  async () => {
    const temporary = await mkdtemp(join(tmpdir(), 'ol-cohort-build-'));
    const realAllowlist = await readFile(join(source, 'data/programmatic-release.json'));
    try {
      await mkdir(join(temporary, 'apps'), { recursive: true });
      await cp(source, join(temporary, 'apps/marketing'), { recursive: true });
      await cp(join(repository, 'pnpm-lock.yaml'), join(temporary, 'pnpm-lock.yaml'));
      await symlink(join(repository, 'node_modules'), join(temporary, 'node_modules'));
      const registryFile = join(temporary, 'apps/marketing/registry.mjs');
      let code = await readFile(registryFile, 'utf8');
      code = code.replace(
        "import { verifiedReview } from './editorial-review.mjs';",
        "import { verifiedReview, editorialRevision } from './editorial-review.mjs';",
      );
      const marker =
        '  const approved = approvedProgrammaticPages(project, { legacyPages: legacy });';
      assert.ok(
        code.includes(marker),
        'Fixture must inject reviews immediately before the real selector.',
      );
      code = code.replace(
        marker,
        `  for(const page of legacy.filter(p=>['spec-sheet','ffe-schedule','finish-schedule','client-questionnaire','budget','proposal'].includes(p.id))) page.review={state:'verified',reviewerName:'TEST ONLY reviewer',reviewerRole:'Disposable fixture',scope:'TEST ONLY: no real review',permissionToPublish:true,reviewedRevision:editorialRevision(page),reviewedAt:page.modified,sourcesCheckedAt:page.modified};\n${marker}`,
      );
      await writeFile(registryFile, code);
      await writeFile(join(temporary, 'approve-fixture.mjs'), approvalScript);
      const env = {
        ...Object.fromEntries(
          Object.entries(process.env).filter(([key]) => !key.startsWith('MARKETING_')),
        ),
        MARKETING_OUT_DIR: join(temporary, 'public'),
        MARKETING_CONTACT_EMAIL: 'fixture@example.invalid',
        MARKETING_FORMSPREE_ID: 'testform',
        MARKETING_FORMSPREE_VERIFIED: '1',
        MARKETING_OPERATIONS_READY: '1',
        MARKETING_PRIVACY_REVIEWED: '1',
        MARKETING_PILOT_ENABLED: '1',
        MARKETING_GA4_ID: 'G-TEST123456',
        MARKETING_GA4_VERIFIED: '1',
        MARKETING_ANALYTICS_ENABLED: '1',
      };
      const approved = JSON.parse(
        (await execute(process.execPath, ['approve-fixture.mjs'], { cwd: temporary, env })).stdout,
      );
      await execute(process.execPath, ['apps/marketing/build.mjs'], { cwd: temporary, env });
      const manifestPath = join(env.MARKETING_OUT_DIR, 'marketing-manifest.json');
      const manifestBytes = await readFile(manifestPath);
      const manifest = JSON.parse(manifestBytes);
      assert.equal(manifest.pages.length, 47);
      assert.equal(manifest.pages.filter((page) => page.indexable).length, 45);
      const cohort = manifest.pages.filter((page) => page.programmatic);
      assert.equal(cohort.length, 2);
      assert.deepEqual(
        cohort.map(({ id, approvedBundleHash }) => ({ id, approvedBundleHash })),
        approved,
      );
      const hub = await readFile(join(env.MARKETING_OUT_DIR, 'templates/index.html'), 'utf8');
      const spec = manifest.pages.find((page) => page.id === 'spec-sheet');
      const context = await readFile(join(env.MARKETING_OUT_DIR, spec.path, 'index.html'), 'utf8');
      for (const page of cohort) {
        assert.ok(hub.includes(`href="/${page.path}"`));
        assert.ok(context.includes(`href="/${page.path}"`));
        assert.deepEqual(
          page.downloads.map((file) => file.format),
          ['XLSX', 'PDF'],
        );
        for (const file of page.downloads)
          assert.equal(
            hash(await readFile(join(env.MARKETING_OUT_DIR, file.path))),
            manifest.fileHashes[file.path],
          );
      }
      const buildPath = join(temporary, 'apps/marketing/build.mjs');
      let build = await readFile(buildPath, 'utf8');
      const generation = 'const downloads = await generateDownloads(page);';
      assert.ok(build.includes(generation));
      build = build.replace(
        generation,
        `${generation}\n    if(page.programmatic) downloads[0].buffer[0] ^= 1; // TEST ONLY post-preflight corruption`,
      );
      await writeFile(buildPath, build);
      await assert.rejects(
        () => execute(process.execPath, ['apps/marketing/build.mjs'], { cwd: temporary, env }),
        /artifacts differ from reviewed/,
      );
      assert.deepEqual(await readFile(manifestPath), manifestBytes);
      for (const file of manifest.files)
        assert.equal(
          hash(await readFile(join(env.MARKETING_OUT_DIR, file))),
          manifest.fileHashes[file],
        );
      assert.deepEqual(
        await readFile(join(source, 'data/programmatic-release.json')),
        realAllowlist,
      );
    } finally {
      await rm(temporary, { recursive: true, force: true });
    }
  },
);
