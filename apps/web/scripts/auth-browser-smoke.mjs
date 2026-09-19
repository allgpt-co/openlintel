/* global process, fetch, AbortSignal, setTimeout */
import { execFileSync, spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { createServer } from 'node:net';
import { mkdirSync, readFileSync, writeFileSync, openSync, closeSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { once } from 'node:events';

const app = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const root = resolve(app, '../..');
const output = resolve(root, 'output/playwright');
const port = Number(process.env.AUTH_SMOKE_PORT || 3187);
if (!Number.isInteger(port) || port < 1024 || port > 65535)
  throw new Error('Invalid AUTH_SMOKE_PORT');
const base = `http://localhost:${port}`;
const require = createRequire(resolve(app, 'package.json'));
const next = require.resolve('next/dist/bin/next');
mkdirSync(output, { recursive: true });
const configPath = resolve(output, 'auth-smoke.config.json');
writeFileSync(
  configPath,
  JSON.stringify({
    browser: {
      browserName: 'chromium',
      launchOptions: {
        headless: true,
        ...(process.env.AUTH_BROWSER_EXECUTABLE
          ? { executablePath: process.env.AUTH_BROWSER_EXECUTABLE }
          : {}),
        ...(process.env.AUTH_BROWSER_NO_SANDBOX === '1' ? { args: ['--no-sandbox'] } : {}),
      },
      contextOptions: { viewport: { width: 1440, height: 1000 } },
    },
  }),
);
const cli = (...args) => {
  const result = execFileSync(
    'npx',
    [
      '--yes',
      '--package=@playwright/cli@0.1.19',
      'playwright-cli',
      '-s=openlintel-auth-smoke',
      ...args,
    ],
    { cwd: root, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 },
  );
  process.stdout.write(result);
  if (result.includes('### Error')) throw new Error('Browser smoke check failed');
};
// Never accidentally test against another application already on this port.
const probe = createServer();
probe.listen(port, '127.0.0.1');
await once(probe, 'listening');
await new Promise((resolveClose, reject) =>
  probe.close((error) => (error ? reject(error) : resolveClose())),
);
for (const configured of [false, true]) {
  const log = openSync(
    resolve(output, `auth-${configured ? 'configured' : 'closed'}-server.log`),
    'w',
    0o600,
  );
  const server = spawn(
    process.execPath,
    [next, 'dev', '--hostname', '127.0.0.1', '--port', String(port)],
    {
      cwd: app,
      detached: true,
      stdio: ['ignore', log, log],
      env: {
        ...process.env,
        WATCHPACK_POLLING: 'true',
        NEXT_TELEMETRY_DISABLED: '1',
        AUTH_SECRET: 'local-browser-fixture-not-a-production-secret',
        AUTH_URL: base,
        DATABASE_URL: 'postgresql://local:local@127.0.0.1:5999/local',
        GOOGLE_CLIENT_ID: configured ? 'local-google-id' : '',
        GOOGLE_CLIENT_SECRET: configured ? 'local-google-secret' : '',
        GITHUB_CLIENT_ID: configured ? 'local-github-id' : '',
        GITHUB_CLIENT_SECRET: configured ? 'local-github-secret' : '',
      },
    },
  );
  closeSync(log);
  try {
    const deadline = Date.now() + 180_000;
    let ready = false;
    while (Date.now() < deadline && server.exitCode === null) {
      try {
        ready = (await fetch(`${base}/auth/signin`, { signal: AbortSignal.timeout(10_000) })).ok;
      } catch {
        /* Starting. */
      }
      if (ready) break;
      await new Promise((resolveDelay) => setTimeout(resolveDelay, 1000));
    }
    if (!ready)
      throw new Error(
        'Fixture server did not become ready; inspect output/playwright/auth-*-server.log',
      );
    const code = readFileSync(resolve(app, 'scripts/auth-browser-smoke.js'), 'utf8')
      .replaceAll('__EXPECTED_PROVIDERS__', JSON.stringify(configured ? ['google', 'github'] : []))
      .replaceAll('__BASE_URL__', JSON.stringify(base))
      .trim()
      .replace(/;$/, '');
    const codePath = resolve(output, 'auth-browser-smoke.code');
    writeFileSync(codePath, code);
    cli('open', `${base}/auth/signin`, '--config', configPath);
    cli('snapshot');
    cli('run-code', '--filename', codePath);
  } finally {
    try {
      cli('close');
    } finally {
      if (server.exitCode === null) {
        const exited = once(server, 'exit');
        process.kill(-server.pid, 'SIGTERM');
        await exited;
      }
    }
  }
}
