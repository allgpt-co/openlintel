import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFile } from 'node:fs/promises';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { validatePublicationHistory } from './publication-history.mjs';

const execute = promisify(execFile);
const workspace = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const ledgerPath = 'apps/marketing/data/publication-history.json';
const sha = /^[a-f0-9]{40}$/;
export async function checkPublicationHistory({ repositoryRoot = workspace, baseSha } = {}) {
  const git = async (args) =>
    (await execute('git', args, { cwd: repositoryRoot, maxBuffer: 8 * 1024 * 1024 })).stdout.trim();
  const current = JSON.parse(await readFile(join(repositoryRoot, ledgerPath), 'utf8'));
  validatePublicationHistory(current);
  if (baseSha !== undefined && baseSha !== '' && !sha.test(baseSha))
    throw new Error('Publication history base must be a full lowercase commit SHA.');
  let previousSha = baseSha;
  if (!previousSha || previousSha === '0'.repeat(40)) {
    // Manual dispatch and creation of a new ref have no event predecessor. Use
    // the first parent when available; only a true root commit has none.
    const ancestors = (await git(['rev-list', '--parents', '-n', '1', 'HEAD'])).split(' ');
    if (!ancestors.every((value) => sha.test(value)))
      throw new Error('Cannot identify publication history predecessor.');
    previousSha = ancestors[1];
  }
  if (!previousSha)
    return { state: 'initial-repository', baseSha: null, entries: current.entries.length };
  if ((await git(['cat-file', '-t', previousSha])) !== 'commit')
    throw new Error('Publication history base is not a commit.');
  // An absent path is distinguishable from an unknown commit, inaccessible Git
  // repository, malformed old JSON, or any other error; only absence is allowed.
  const listed = await git(['ls-tree', '--name-only', previousSha, '--', ledgerPath]);
  if (!listed)
    return { state: 'initial-ledger', baseSha: previousSha, entries: current.entries.length };
  if (listed !== ledgerPath) throw new Error('Unexpected publication history tree entry.');
  const previous = JSON.parse(await git(['show', `${previousSha}:${ledgerPath}`]));
  validatePublicationHistory(current, { previous });
  return { state: 'compared', baseSha: previousSha, entries: current.entries.length };
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const args = process.argv.slice(2);
  if (args.length && (args[0] !== '--base' || args.length !== 2))
    throw new Error('Usage: node apps/marketing/publication-history-cli.mjs [--base <commit-sha>]');
  const result = await checkPublicationHistory({
    baseSha: args[1] ?? process.env.PUBLICATION_HISTORY_BASE_SHA,
  });
  console.log(JSON.stringify(result, null, 2));
}
