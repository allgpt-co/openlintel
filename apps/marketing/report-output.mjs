import { lstat, mkdir, open, rename, unlink } from 'node:fs/promises';
import { constants } from 'node:fs';
import { dirname, relative, resolve, sep, join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

// Operational exports never enter the public output. Replace files atomically so
// a previous permissive mode or leaf symlink cannot expose report contents.
export async function writePrivateReport(path, value, workspaceRoot = repositoryRoot) {
  const workspace = resolve(workspaceRoot);
  const allowed = resolve(workspace, 'output/seo');
  const target = resolve(workspace, path);
  if (!target.startsWith(allowed + sep))
    throw new Error('Reports must stay in ignored output/seo/.');
  let current = workspace;
  for (const segment of relative(workspace, dirname(target)).split(sep)) {
    current = join(current, segment);
    try {
      const stat = await lstat(current);
      if (stat.isSymbolicLink() || !stat.isDirectory())
        throw new Error('Refusing report output through a symbolic link or non-directory.');
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      await mkdir(current, { mode: 0o700 });
    }
  }
  try {
    const stat = await lstat(target);
    if (stat.isSymbolicLink() || !stat.isFile())
      throw new Error('Refusing a symbolic-link or non-file report destination.');
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  const temporary = join(dirname(target), `.report-${randomUUID()}.tmp`);
  let handle;
  try {
    handle = await open(
      temporary,
      constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY | (constants.O_NOFOLLOW || 0),
      0o600,
    );
    await handle.writeFile(JSON.stringify(value, null, 2) + '\n');
    await handle.close();
    handle = undefined;
    await rename(temporary, target);
  } finally {
    await handle?.close();
    await unlink(temporary).catch((error) => {
      if (error.code !== 'ENOENT') throw error;
    });
  }
  return target;
}
