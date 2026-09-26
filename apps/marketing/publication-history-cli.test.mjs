import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { checkPublicationHistory } from './publication-history-cli.mjs';

const execute = promisify(execFile);
const original = JSON.parse(
  await readFile(new URL('./data/publication-history.json', import.meta.url), 'utf8'),
);
const ledger = 'apps/marketing/data/publication-history.json';
async function fixture(run) {
  const repositoryRoot = await mkdtemp(join(tmpdir(), 'ol-ledger-git-'));
  const git = async (...args) =>
    (await execute('git', args, { cwd: repositoryRoot })).stdout.trim();
  const save = async (data) => {
    await mkdir(join(repositoryRoot, 'apps/marketing/data'), { recursive: true });
    await writeFile(join(repositoryRoot, ledger), JSON.stringify(data));
  };
  try {
    await git('init', '--quiet');
    await git('config', 'user.email', 'fixture@example.invalid');
    await git('config', 'user.name', 'Test fixture');
    await git(
      '-c',
      'commit.gpgsign=false',
      'commit',
      '--allow-empty',
      '--quiet',
      '-m',
      'Fixture baseline',
    );
    const first = await git('rev-parse', 'HEAD');
    await save(original);
    await run({ repositoryRoot, git, save, first });
  } finally {
    await rm(repositoryRoot, { recursive: true, force: true });
  }
}

test('CI ledger comparison permits initial introduction but rejects unknown revisions and injected revision syntax', async () => {
  await fixture(async ({ repositoryRoot, first }) => {
    assert.equal(
      (await checkPublicationHistory({ repositoryRoot, baseSha: first })).state,
      'initial-ledger',
    );
    assert.equal((await checkPublicationHistory({ repositoryRoot })).state, 'initial-repository');
    await assert.rejects(() =>
      checkPublicationHistory({ repositoryRoot, baseSha: 'f'.repeat(40) }),
    );
    for (const baseSha of ['HEAD~1', '--help', '$(touch bad)', 'main;echo unsafe', '123'])
      await assert.rejects(
        () => checkPublicationHistory({ repositoryRoot, baseSha }),
        /full lowercase commit SHA/,
      );
  });
});

test('CI compares real prior Git data and fails deleted/reassigned identities or malformed predecessor JSON', async () => {
  await fixture(async ({ repositoryRoot, git, save }) => {
    await git('add', ledger);
    await git('-c', 'commit.gpgsign=false', 'commit', '--quiet', '-m', 'Fixture ledger');
    const baseSha = await git('rev-parse', 'HEAD');
    assert.equal((await checkPublicationHistory({ repositoryRoot, baseSha })).state, 'compared');
    const changed = JSON.parse(JSON.stringify(original));
    changed.entries[0].path = 'reassigned/';
    await save(changed);
    await assert.rejects(
      () => checkPublicationHistory({ repositoryRoot, baseSha }),
      /rewrite prior identity/,
    );
    await save(original);
    await writeFile(join(repositoryRoot, ledger), '{broken json');
    await git('add', ledger);
    await git('-c', 'commit.gpgsign=false', 'commit', '--quiet', '-m', 'Fixture malformed ledger');
    const malformed = await git('rev-parse', 'HEAD');
    await save(original);
    await assert.rejects(
      () => checkPublicationHistory({ repositoryRoot, baseSha: malformed }),
      SyntaxError,
    );
  });
});
