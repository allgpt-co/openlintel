// Builds a disposable integration fixture; every third-party request is mocked by Playwright.
import { execFileSync, spawn } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const source = dirname(fileURLToPath(import.meta.url));
const root = resolve(source, '../..');
const artifacts = resolve(root, 'output/playwright');
const output = mkdtempSync(resolve(tmpdir(), 'openlintel-growth-'));
const port = process.env.MARKETING_GROWTH_TEST_PORT || '4175';
const env = {
  ...process.env,
  MARKETING_OUT_DIR: output,
  MARKETING_ORIGIN: `http://localhost:${port}`,
  MARKETING_BASE_PATH: '/openlintel/',
  MARKETING_NOINDEX: 'true',
  MARKETING_PILOT_ENABLED: '1',
  MARKETING_FORMSPREE_ID: 'testform',
  MARKETING_FORMSPREE_VERIFIED: '1',
  MARKETING_OPERATIONS_READY: '1',
  MARKETING_PRIVACY_REVIEWED: '1',
  MARKETING_CONTACT_EMAIL: 'test@example.test',
  MARKETING_ANALYTICS_ENABLED: '1',
  MARKETING_GA4_ID: 'G-TEST123456',
  MARKETING_GA4_VERIFIED: '1',
  PORT: port,
};
mkdirSync(artifacts, { recursive: true });
execFileSync(process.execPath, [resolve(source, 'build.mjs')], {
  cwd: root,
  env,
  stdio: 'inherit',
});
const server = spawn(process.execPath, [resolve(source, 'preview.mjs')], {
  cwd: root,
  env,
  stdio: ['ignore', 'pipe', 'inherit'],
});
await new Promise((resolveReady, reject) => {
  server.stdout.on('data', () => resolveReady());
  server.on('error', reject);
  server.on('exit', (code) => reject(new Error(`Preview exited: ${code}`)));
});
const browserConfig = {
  browser: {
    browserName: 'chromium',
    launchOptions: {
      headless: true,
      ...(process.env.MARKETING_BROWSER_NO_SANDBOX === '1'
        ? { chromiumSandbox: false, args: ['--no-sandbox'] }
        : {}),
      ...(process.env.MARKETING_BROWSER_EXECUTABLE
        ? { executablePath: process.env.MARKETING_BROWSER_EXECUTABLE }
        : {}),
    },
    contextOptions: { viewport: { width: 1440, height: 1000 } },
  },
};
const configPath = resolve(artifacts, 'growth.config.json');
writeFileSync(configPath, JSON.stringify(browserConfig));
const codePath = resolve(artifacts, 'growth-browser-smoke.code');
writeFileSync(
  codePath,
  readFileSync(resolve(source, 'growth-browser-smoke.js'), 'utf8').trim().replace(/;$/, ''),
);
const cli = (...args) => {
  const result = execFileSync(
    'npx',
    [
      '--yes',
      '--package=@playwright/cli@0.1.19',
      'playwright-cli',
      '-s=openlintel-growth',
      ...args,
    ],
    { cwd: root, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 },
  );
  process.stdout.write(result);
  if (/### Error/.test(result)) throw new Error('Growth browser verification reported an error');
};
try {
  cli('open', `http://localhost:${port}/openlintel/`, '--config', configPath);
  cli('snapshot');
  cli('run-code', '--filename', codePath);
} finally {
  try {
    cli('close');
  } finally {
    server.kill();
    rmSync(output, { recursive: true, force: true });
  }
}
