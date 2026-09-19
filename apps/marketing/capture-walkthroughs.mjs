/**
 * Record actual local marketing pages, never the application or a customer project.
 * Requires npx, Chromium, and FFmpeg with libx264/libass/libwebp support.
 * All temporary browser material stays in ignored output/playwright/walkthroughs/.
 */
import process from 'node:process';
import console from 'node:console';
import { setTimeout, clearTimeout } from 'node:timers';
import { execFileSync, spawn } from 'node:child_process';
import { mkdir, mkdtemp, readFile, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const source = dirname(fileURLToPath(import.meta.url));
const root = resolve(source, '../..');
const working = resolve(root, 'output/playwright/walkthroughs');
const destination = join(source, 'assets/videos');
const ffmpeg = process.env.MARKETING_FFMPEG || 'ffmpeg';
const session = `openlintel-walkthrough-${process.pid}`;
const duration = 50;
const videos = [
  {
    id: 'window-room-walkthrough',
    title: 'The Window Room: brief to illustrative handoff',
    route: 'sample-project/',
    scenes: [
      {
        end: 7,
        text: 'The Window Room: a fictional educational website walkthrough.\nNot a live application demo or a customer result.',
        action: '',
      },
      {
        end: 14,
        text: '1 / Brief: record the room, dimensions and design priorities.\nThe existing conditions shown here belong to a fictional example.',
        action: "await page.locator('#brief .brief-details').scrollIntoViewIfNeeded();",
      },
      {
        end: 24,
        text: '2 / Design: compare the illustrated concepts and selected direction.\nThe images are AI-generated illustrations, not verified room designs.',
        action:
          "await page.locator('[data-chapter-link=design]').click(); await page.locator('[data-concept]').nth(1).click(); await page.waitForTimeout(3000); await page.locator('[data-concept]').first().click();",
      },
      {
        end: 33,
        text: '3 / Drawings: follow the same references from plan to elevation.\nThese authored illustrations are pending review, not construction documents.',
        action:
          "await page.locator('[data-chapter-link=drawings]').click(); await page.waitForTimeout(3500); await page.locator('[data-drawing]').nth(1).click();",
      },
      {
        end: 41,
        text: '4 / Materials: connect item references, applications and quantities.\nSample quantities and specifications require project-specific review.',
        action:
          "await page.locator('[data-chapter-link=materials]').click(); await page.locator('#materials table').scrollIntoViewIfNeeded();",
      },
      {
        end: 50,
        text: '5 / Handoff: explore the sample drawing and schedule downloads.\nFictional educational website; not a live app demo or a customer result.',
        action:
          "await page.locator('[data-chapter-link=handoff]').click(); await page.locator('#handoff .download-list').scrollIntoViewIfNeeded();",
      },
    ],
  },
  {
    id: 'template-workflow-walkthrough',
    title: 'Professional templates: preview, coordinate and download',
    route: 'templates/interior-design-spec-sheet/',
    scenes: [
      {
        end: 8,
        text: 'Editable templates: a fictional educational website walkthrough.\nNot a live application demo or a customer result.',
        action: '',
      },
      {
        end: 17,
        text: '1 / Specification sheet: preview item identity and unresolved requirements.\nThe worked example is educational and remains pending professional review.',
        action:
          "await page.getByRole('link', { name: 'Worked example & fields', exact: true }).click();",
      },
      {
        end: 25,
        text: '2 / Download the editable workbook without an account or upload.\nIt contains instructions, a blank template and a worked example.',
        action:
          "await page.locator('#download').scrollIntoViewIfNeeded(); const downloadEvent = page.waitForEvent('download'); await page.locator('[data-resource-download]').first().click(); const download = await downloadEvent; await download.saveAs(DOWNLOAD_PATH); downloads.push(download.suggestedFilename());",
      },
      {
        end: 34,
        text: '3 / FF&E schedule: carry item references into room and quantity fields.\nCoordinate references; do not assume the files synchronize automatically.',
        action:
          "await page.goto(BASE + 'templates/ffe-schedule/'); await page.getByRole('link', { name: 'Worked example & fields', exact: true }).click();",
      },
      {
        end: 43,
        text: '4 / Finish schedule: connect each surface with its proposed finish.\nKeep source information, units and review status explicit.',
        action:
          "await page.goto(BASE + 'templates/finish-schedule/'); await page.getByRole('link', { name: 'Worked example & fields', exact: true }).click();",
      },
      {
        end: 50,
        text: 'Download a copy, adapt it locally and obtain project-specific review.\nFictional educational website; not a live app demo or a customer result.',
        action: "await page.locator('#download').scrollIntoViewIfNeeded();",
      },
    ],
  },
];

function cli(...args) {
  const result = execFileSync(
    'npx',
    ['--yes', '--package=@playwright/cli@0.1.19', 'playwright-cli', `-s=${session}`, ...args],
    {
      cwd: root,
      encoding: 'utf8',
      maxBuffer: 8 * 1024 * 1024,
      timeout: 120000,
    },
  );
  process.stdout.write(result);
  if (/### Error/.test(result)) throw new Error('Browser capture failed; see Playwright output.');
  return result;
}
function timestamp(seconds, ass = false) {
  return ass
    ? `0:${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}.00`
    : `00:${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}.000`;
}
function encode(...args) {
  execFileSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-y', ...args], {
    cwd: working,
    stdio: 'inherit',
    timeout: 120000,
  });
}

await mkdir(working, { recursive: true });
await mkdir(destination, { recursive: true });
execFileSync(ffmpeg, ['-version'], { stdio: 'ignore' });
const site = await mkdtemp(join(tmpdir(), 'openlintel-walkthrough-site-'));
// Explicitly disable live integrations, including when a caller's shell contains activation flags.
const env = {
  ...process.env,
  MARKETING_OUT_DIR: site,
  MARKETING_BASE_PATH: '/',
  MARKETING_NOINDEX: 'true',
  MARKETING_PILOT_ENABLED: '0',
  MARKETING_ANALYTICS_ENABLED: '0',
  MARKETING_FORMSPREE_ID: '',
  MARKETING_FORMSPREE_VERIFIED: '0',
  MARKETING_GA4_ID: '',
  MARKETING_GA4_VERIFIED: '0',
  MARKETING_CONTACT_EMAIL: '',
  MARKETING_OPERATIONS_READY: '0',
  MARKETING_PRIVACY_REVIEWED: '0',
};
execFileSync(process.execPath, [join(source, 'build.mjs')], { cwd: root, env, stdio: 'inherit' });
const preview = spawn(process.execPath, [join(source, 'preview.mjs')], {
  cwd: root,
  env: { ...env, PORT: '0' },
  stdio: ['ignore', 'pipe', 'inherit'],
});
const base = await new Promise((accept, reject) => {
  const timer = setTimeout(() => reject(new Error('Preview startup timeout')), 10000);
  preview.once('error', reject);
  preview.once('exit', (code) => {
    clearTimeout(timer);
    reject(new Error(`Preview exited: ${code}`));
  });
  preview.stdout.on('data', (data) => {
    const match = data.toString().match(/http:\/\/localhost:\d+\//);
    if (match) {
      clearTimeout(timer);
      accept(match[0]);
    }
  });
});
const browserConfig = {
  browser: {
    browserName: 'chromium',
    launchOptions: {
      headless: true,
      ...(process.env.MARKETING_BROWSER_EXECUTABLE
        ? { executablePath: process.env.MARKETING_BROWSER_EXECUTABLE }
        : {}),
      ...(process.env.MARKETING_BROWSER_NO_SANDBOX === '1'
        ? { chromiumSandbox: false, args: ['--no-sandbox'] }
        : {}),
    },
    contextOptions: {
      viewport: { width: 1280, height: 800 },
      deviceScaleFactor: 1,
      reducedMotion: 'reduce',
      acceptDownloads: true,
    },
  },
};
const configPath = join(working, 'browser.config.json');
await writeFile(configPath, JSON.stringify(browserConfig));
const results = [];
try {
  cli('open', 'about:blank', '--config', configPath);
  cli(
    'run-code',
    `async page => { await page.context().route('**/*', route => route.request().url().startsWith(${JSON.stringify(base)}) ? route.continue() : route.abort()); }`,
  );
  for (const video of videos) {
    cli('goto', base + video.route);
    cli('snapshot');
    const raw = join(working, `${video.id}.webm`);
    const downloadPath = join(working, 'downloaded-specification.xlsx');
    const code = `async page => {
      const BASE = ${JSON.stringify(base)};
      const DOWNLOAD_PATH = ${JSON.stringify(downloadPath)};
      const downloads = [];
      await page.evaluate(async () => { await document.fonts.ready; });
      await page.waitForTimeout(750);
      await page.screencast.start({ path: ${JSON.stringify(raw)}, size: { width: 1280, height: 800 } });
      const started = Date.now();
      try {
        ${video.scenes.map((scene) => `${scene.action}\nawait page.waitForTimeout(Math.max(0, ${scene.end * 1000} - (Date.now() - started)));`).join('\n')}
      } finally { await page.screencast.stop(); }
      return { elapsedMs: Date.now() - started, downloads };
    }`;
    const codePath = join(working, `${video.id}.code.js`);
    await writeFile(codePath, code);
    await writeFile(
      join(working, `${video.id}.capture.log`),
      cli('run-code', '--filename', codePath),
    );
    let start = 0;
    const vtt = [
      'WEBVTT',
      '',
      ...video.scenes.flatMap((scene) => {
        const cue = [`${timestamp(start)} --> ${timestamp(scene.end)}`, scene.text, ''];
        start = scene.end;
        return cue;
      }),
    ].join('\n');
    start = 0;
    const ass = `[Script Info]\nScriptType: v4.00+\nPlayResX: 1280\nPlayResY: 920\nWrapStyle: 2\n\n[V4+ Styles]\nFormat: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\nStyle: Default,DejaVu Sans,25,&H00FFFFFF,&H00FFFFFF,&H00191919,&H00191919,0,0,0,0,100,100,0,0,1,0,0,2,28,28,26,1\n\n[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n${video.scenes
      .map((scene) => {
        const line = `Dialogue: 0,${timestamp(start, true)},${timestamp(scene.end, true)},Default,,0,0,0,,${scene.text.replaceAll('\n', '\\N')}`;
        start = scene.end;
        return line;
      })
      .join('\n')}\n`;
    await writeFile(join(working, `${video.id}.ass`), ass);
    await writeFile(join(destination, `${video.id}.vtt`), vtt);
    start = 0;
    await writeFile(
      join(destination, `${video.id}-transcript.txt`),
      `${video.title}\n\nSilent screen recording of the actual OpenLintel educational website.\nCaptions describe the visible actions. The Window Room is fictional; room images are AI-generated concepts.\nAuthored drawings and worked examples are pending professional review. This is not a live application demonstration, customer case study or construction instruction.\n\n${video.scenes
        .map((scene) => {
          const line = `[${timestamp(start)} - ${timestamp(scene.end)}]\n${scene.text}\n`;
          start = scene.end;
          return line;
        })
        .join(
          '\n',
        )}\n${video.id === 'template-workflow-walkthrough' ? 'This recording downloads a real local XLSX file. It does not demonstrate editing in spreadsheet software or automatic synchronization between files.' : 'This recording explores authored sample references. It does not demonstrate automated drawing generation or an application export.'}\nNo client information is submitted; external browser network requests are blocked.\n`,
    );
    const mp4 = join(destination, `${video.id}.mp4`);
    encode(
      '-i',
      raw,
      '-vf',
      `fps=15,pad=1280:920:0:0:color=0x191919,ass=${video.id}.ass`,
      '-t',
      String(duration),
      '-an',
      '-c:v',
      'libx264',
      '-preset',
      'slow',
      '-crf',
      '27',
      '-pix_fmt',
      'yuv420p',
      '-movflags',
      '+faststart',
      '-map_metadata',
      '-1',
      mp4,
    );
    encode(
      '-ss',
      '2',
      '-i',
      mp4,
      '-frames:v',
      '1',
      '-c:v',
      'libwebp',
      '-quality',
      '85',
      join(destination, `${video.id}-poster.webp`),
    );
    for (const seconds of [2, 10, 20, 28, 38, 46]) {
      encode(
        '-ss',
        String(seconds),
        '-i',
        mp4,
        '-frames:v',
        '1',
        join(working, `${video.id}-${seconds}.png`),
      );
    }
    const bytes = (await stat(mp4)).size;
    if (bytes >= 3_000_000)
      throw new Error(`${video.id} exceeds the 3 MB publication budget (${bytes} bytes).`);
    results.push({
      id: video.id,
      durationSeconds: duration,
      width: 1280,
      height: 920,
      bytes,
      sourceRoute: video.route,
    });
  }
  const downloaded = await readFile(join(working, 'downloaded-specification.xlsx'));
  if (downloaded.subarray(0, 2).toString() !== 'PK')
    throw new Error('Downloaded XLSX is not an Office ZIP archive.');
  await writeFile(
    join(working, 'capture-results.json'),
    JSON.stringify(
      {
        recordedAt: new Date().toISOString(),
        results,
        downloadedWorkbookBytes: downloaded.length,
        externalBrowserRequests: 'blocked',
      },
      null,
      2,
    ) + '\n',
  );
  console.log(JSON.stringify(results, null, 2));
} finally {
  try {
    cli('close');
  } finally {
    preview.kill('SIGTERM');
  }
}
