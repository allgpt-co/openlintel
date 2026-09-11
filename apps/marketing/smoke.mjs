import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const source = dirname(fileURLToPath(import.meta.url));
const root = resolve(source, '../..');
const output = resolve(root, 'output/playwright');
mkdirSync(output, { recursive: true });
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
const configPath = resolve(output, 'smoke.config.json');
writeFileSync(configPath, JSON.stringify(browserConfig));
// The CLI expects a function expression, without a statement-ending semicolon.
const browserCodePath = resolve(output, 'browser-smoke.code');
writeFileSync(
  browserCodePath,
  readFileSync(resolve(source, 'browser-smoke.js'), 'utf8').trim().replace(/;$/, ''),
);
const cli = (...args) => {
  const result = execFileSync(
    'npx',
    ['--yes', '--package=@playwright/cli@0.1.19', 'playwright-cli', '-s=openlintel-smoke', ...args],
    { cwd: root, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 },
  );
  process.stdout.write(result);
  if (/### Error/.test(result)) throw new Error('Browser verification reported an error');
};
try {
  cli(
    'open',
    process.env.MARKETING_PREVIEW_URL || 'http://localhost:4173/',
    '--config',
    configPath,
  );
  cli('snapshot');
  cli('run-code', '--filename', browserCodePath);
} finally {
  cli('close');
}
